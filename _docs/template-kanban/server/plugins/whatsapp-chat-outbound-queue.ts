/**
 * Consumer da fila de envio manual do painel do Chat (`_docs/CHAT/PRD.md`
 * §6.3, resolve G5/G6). Hook nativo `cloudflare:queue`, mesmo padrão de
 * `whatsapp-queue.ts`/`whatsapp-media-queue.ts`: recebe `{batch, env}`, nunca
 * um `H3Event` — todo client é montado aqui, nunca herdado de rota HTTP.
 *
 * A linha em `whatsapp_conversations` já existe (`status: 'pending'`, gravada por
 * `chatService.dispatchOutboundMessage` antes de enfileirar) — este consumer
 * NUNCA insere, só faz UPDATE do resultado REAL da Cloud API. `wamid` fica
 * registrado para o dedupe do echo do celular (G6, `handleEchoEvent.ts`).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { buildSupabaseServiceClient } from '../utils/supabase/serviceClient'
import {
  CHAT_OUTBOUND_QUEUE_SUFFIX,
  isBatchForQueue,
  type WhatsappChatOutboundQueueMessage,
} from '../utils/whatsapp/queueBindings'
import { resolveWebhookRuntimeConfig } from '../utils/whatsapp/resolveWebhookRuntimeConfig'
import { sendText } from '../utils/whatsapp/cloudApiClient'
import { notifyRealtimeRoom } from '../utils/chat/chatRoom'

/** DEVE bater com `max_retries` da fila `{{WORKER_NAME}}-chat-outbound` no `wrangler.toml`. */
const MAX_ATTEMPTS = 3

interface QueueMessage<T> {
  readonly body: T
  readonly attempts: number
  ack(): void
  retry(options?: { delaySeconds?: number }): void
}

interface QueueBatch<T> {
  readonly queue: string
  readonly messages: readonly QueueMessage<T>[]
}

interface CloudflareQueueHookPayload {
  batch: QueueBatch<WhatsappChatOutboundQueueMessage>
  env?: Record<string, unknown>
}

/**
 * O tipo do hook `cloudflare:queue` só é conhecido pelo TypeScript quando o
 * preset `cloudflare-durable` está ativo. `nuxi typecheck` roda com o preset
 * padrão (node-server) — tipado aqui via `unknown` (nunca `any`), mesmo
 * padrão dos outros consumers.
 */
interface QueueHookRegistrar {
  hook(name: 'cloudflare:queue', fn: (payload: CloudflareQueueHookPayload) => void | Promise<void>): void
}

/** Backoff linear curto — falha de rede/rate-limit da Cloud API costuma passar em segundos. */
function retryDelaySeconds(attempts: number): number {
  return Math.min(60, 15 * Math.max(1, attempts))
}

const MESSAGE_SELECT = 'id, customer_id, role, content, created_at, seq, actor, status, wamid, channel'

async function markSent(
  supabase: SupabaseClient<Database>,
  env: Record<string, unknown> | undefined,
  msg: WhatsappChatOutboundQueueMessage,
  wamid: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ status: 'sent', wamid })
    .eq('id', msg.mensagemId)
    .select(MESSAGE_SELECT)
    .single()

  if (error || !data) {
    logger.error('[chat-outbound] falha ao marcar mensagem como enviada', { mensagemId: msg.mensagemId, error: error?.message })
    return
  }

  await notifyRealtimeRoom(env, {
    topic: 'chat.message',
    payload: {
      id: data.id,
      clienteId: data.customer_id,
      role: data.role as 'user' | 'assistant',
      content: data.content,
      criadoEm: data.created_at,
      seq: data.seq,
      ator: 'humano_painel',
      status: 'sent',
      wamid: data.wamid,
      channel: data.channel ?? undefined,
    },
  })
}

async function markFailed(
  supabase: SupabaseClient<Database>,
  env: Record<string, unknown> | undefined,
  msg: WhatsappChatOutboundQueueMessage,
  motivo: string,
): Promise<void> {
  logger.error('[chat-outbound] envio falhou definitivamente', { mensagemId: msg.mensagemId, clienteId: msg.clienteId, motivo })

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ status: 'failed' })
    .eq('id', msg.mensagemId)
    .select(MESSAGE_SELECT)
    .single()

  if (error || !data) return

  await notifyRealtimeRoom(env, {
    topic: 'chat.message',
    payload: {
      id: data.id,
      clienteId: data.customer_id,
      role: data.role as 'user' | 'assistant',
      content: data.content,
      criadoEm: data.created_at,
      seq: data.seq,
      ator: 'humano_painel',
      status: 'failed',
      channel: data.channel ?? undefined,
    },
  })
}

/**
 * Envia texto + anexos. Anexo com falha é best-effort (loga e segue — não
 * pode disparar retry do texto, que já teria saído: reenviar duplicaria a
 * mensagem para o cliente). Só lança (→ retry do lote) quando NADA saiu —
 * nem texto nem nenhum anexo — porque nesse caso não há risco de duplicar.
 */
async function deliver(
  provider: Parameters<typeof sendText>[0],
  msg: WhatsappChatOutboundQueueMessage,
): Promise<string | null> {
  const recipient = { telefone: msg.telefone, lid: msg.lid }
  let wamid: string | null = null
  let algumEnviado = false

  if (msg.text) {
    wamid = await sendText(provider, recipient, msg.text)
    algumEnviado = true
  }

  for (const url of msg.attachmentUrls) {
    try {
      await sendText(provider, recipient, url)
      algumEnviado = true
    } catch (err) {
      logger.error('[chat-outbound] falha ao enviar anexo (best-effort)', {
        mensagemId: msg.mensagemId,
        url,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (!algumEnviado) {
    throw new Error('Nenhum envio (texto ou anexo) teve sucesso.')
  }
  return wamid
}

export default defineNitroPlugin((nitroApp) => {
  const hooks = nitroApp.hooks as unknown as QueueHookRegistrar

  hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    if (!isBatchForQueue(batch.queue, CHAT_OUTBOUND_QUEUE_SUFFIX)) return

    const supabase = buildSupabaseServiceClient()
    // Uma vez por lote, não por mensagem — mesma decisão dos outros consumers.
    const webhookConfig = await resolveWebhookRuntimeConfig(supabase, useRuntimeConfig())

    for (const message of batch.messages) {
      const msg = message.body

      if (!webhookConfig?.provider?.apiToken) {
        // Sem credencial não há como enviar, e a próxima tentativa veria a
        // mesma config ausente — falha definitiva, não vale reter.
        await markFailed(supabase, env, msg, 'credencial da Cloud API ausente')
        message.ack()
        continue
      }

      try {
        const wamid = await deliver(webhookConfig.provider, msg)
        await markSent(supabase, env, msg, wamid)
        message.ack()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        if (message.attempts >= MAX_ATTEMPTS) {
          await markFailed(supabase, env, msg, errorMsg)
          message.ack()
          continue
        }
        logger.warn('[chat-outbound] falha temporária, retry agendado', {
          mensagemId: msg.mensagemId,
          attempts: message.attempts,
          error: errorMsg,
        })
        message.retry({ delaySeconds: retryDelaySeconds(message.attempts) })
      }
    }
  })
})

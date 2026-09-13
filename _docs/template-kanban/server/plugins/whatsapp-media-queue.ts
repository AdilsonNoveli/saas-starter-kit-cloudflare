/**
 * Consumer da fila `whatsapp-midia` (fase 6 da §11 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`). Espelha
 * `whatsapp-queue.ts`: hook nativo `cloudflare:queue` do preset Cloudflare do
 * Nitro, recebe `{batch, env}` e nunca um `H3Event` — todo client (Supabase,
 * OpenAI, WhatsApp Cloud API) é montado aqui.
 *
 * O hook é **um só para todas as filas do Worker**: os dois consumers recebem
 * todo lote e filtram por `batch.queue`. Sem esse filtro, mensagem de mídia
 * cairia no consumer de turno e vice-versa.
 *
 * A fila é separada da do turno de propósito (§5.1): `max_concurrency = 3` é o
 * teto de gasto simultâneo com a OpenAI de mídia, independente do throughput de
 * texto, e uma falha de transcrição não re-executa o loop do agente.
 */
import OpenAI from 'openai'
import { buildSupabaseServiceClient } from '../utils/supabase/serviceClient'
import { logger } from '~/core/services/logger.service'
import { resolveAgentRuntimeConfig } from '../utils/agent/resolveAgentRuntimeConfig'
import { mediaRetryDelaySeconds, processInboundMedia } from '../utils/whatsapp/processInboundMedia'
import {
  queueBindingFrom,
  MEDIA_QUEUE_SUFFIX,
  isBatchForQueue,
  type WhatsappMediaQueueMessage,
  type WhatsappTurnQueueMessage,
} from '../utils/whatsapp/queueBindings'

/**
 * Teto por chamada à OpenAI. Generoso o bastante para transcrever um áudio
 * longo, curto o bastante para a reentrega acontecer antes de o cliente
 * desistir — a fila tem até 3 tentativas (§8.1).
 */
const OPENAI_TIMEOUT_MS = 90_000

interface QueueMessage<T> {
  readonly body: T
  /** Tentativa de entrega segundo a própria Cloudflare (1 na primeira). */
  readonly attempts: number
  ack(): void
  retry(options?: { delaySeconds?: number }): void
}

interface QueueBatch<T> {
  readonly queue: string
  readonly messages: readonly QueueMessage<T>[]
}

interface CloudflareQueueHookPayload {
  batch: QueueBatch<WhatsappMediaQueueMessage>
  env?: Record<string, unknown>
}

/**
 * O tipo do hook `cloudflare:queue` só é conhecido pelo TypeScript quando o
 * preset `cloudflare-module` está ativo — `nuxi typecheck` roda com o preset
 * padrão (node-server). Tipado via `unknown` (nunca `any`, §2), igual ao
 * consumer de turno.
 */
interface QueueHookRegistrar {
  hook(name: 'cloudflare:queue', fn: (payload: CloudflareQueueHookPayload) => void | Promise<void>): void
}


export default defineNitroPlugin((nitroApp) => {
  const hooks = nitroApp.hooks as unknown as QueueHookRegistrar

  hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    if (!isBatchForQueue(batch.queue, MEDIA_QUEUE_SUFFIX)) return

    const supabase = buildSupabaseServiceClient()
    // Uma vez por lote, não por mensagem: nem a config do agente nem a do
    // provedor mudam no meio de um batch (mesma decisão do consumer de turno).
    const runtimeConfig = await resolveAgentRuntimeConfig(supabase, useRuntimeConfig())
    // `maxRetries: 1` porque a fila já é a política de retry (§8.1): deixar o
    // SDK retentar por conta multiplicaria custo e latência por baixo dela.
    // `timeout` impede que uma chamada pendurada segure a invocação inteira.
    const openai = runtimeConfig.agent
      ? new OpenAI({ apiKey: runtimeConfig.agent.apiKey, maxRetries: 1, timeout: OPENAI_TIMEOUT_MS })
      : null

    const deps = {
      supabase,
      provider: runtimeConfig.provider,
      openai,
      modeloTranscricao: runtimeConfig.media.modeloTranscricao,
      modeloVisao: runtimeConfig.media.modeloVisao,
      turnQueue: queueBindingFrom<WhatsappTurnQueueMessage>(env, 'WHATSAPP_QUEUE'),
      env,
    }

    // Sequencial de propósito: `max_concurrency = 3` é o teto de gasto
    // simultâneo com a OpenAI (§8.1), e processar o lote em paralelo o
    // multiplicaria por `max_batch_size` sem nenhum ganho para o cliente, que
    // espera a resposta de UMA mídia.
    for (const message of batch.messages) {
      if (!message.body?.wamid) {
        // Mensagem fora do contrato (replay manual de DLQ, deploy antigo) não
        // tem o que processar — `ack` para não queimar retry num veneno.
        logger.error('[whatsapp-media] mensagem sem wamid, descartada', { attempts: message.attempts })
        message.ack()
        continue
      }

      try {
        const outcome = await processInboundMedia(deps, message.body)
        if (outcome === 'retry') {
          message.retry({ delaySeconds: mediaRetryDelaySeconds(message.attempts) })
          continue
        }
        message.ack()
      } catch (err) {
        // `processInboundMedia` só deixa escapar falha anterior ao claim
        // (Supabase fora) — a mídia ainda não foi processada e a fila precisa
        // reentregar (§8.3). `retry()` explícito em vez de "não dar ack": o
        // hook do Nitro roda dentro de `context.waitUntil`, então o desfecho
        // implícito do lote não é nosso para depender dele.
        logger.error('[whatsapp-media] falha antes do claim — devolvendo à fila', {
          wamid: message.body.wamid,
          attempts: message.attempts,
          error: err instanceof Error ? err.message : String(err),
        })
        message.retry({ delaySeconds: mediaRetryDelaySeconds(message.attempts) })
      }
    }
  })
})

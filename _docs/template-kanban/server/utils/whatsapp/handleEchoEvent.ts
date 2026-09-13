/**
 * Item (c2)(f)(g) da §0.5.2 (`_docs/em-andamento.md`) — o que fazer com um
 * echo reconhecido (loja respondendo pelo app do celular, nunca pela API:
 * echo ⇒ humano, sem desambiguação — §0.5.1). Separado da rota
 * (`server/api/whatsapp/webhook/[token].post.ts`) pelo mesmo motivo de
 * `handleInboundMessage`: testável sem `H3Event`.
 *
 * Ordem: grava sempre no histórico (item f — inclusive quando é disparo e não
 * pausa, porque é parte da conversa) → se a config estiver desligada, para
 * aqui → se não há janela de 24h aberta (loja iniciando/disparando), não
 * pausa (item c2) → pausa com a janela deslizante (item g).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { findOrCreateCustomer } from '../customers/findOrCreateCustomer'
import { HUMAN_REPLY_PREFIX } from '#shared/constants/whatsapp'
import { notifyRealtimeRoom } from '../chat/chatRoom'
import type { ParsedInboundEcho } from './parseInboundPayload'
import { hasRecentCustomerMessage, pauseCustomer } from './pauseState'
import type { PausaConfig } from './resolvePausaConfig'

export interface HandleEchoEventDeps {
  supabase: SupabaseClient<Database>
  pausaConfig: PausaConfig
  /** Binding Cloudflare (`cloudflareEnv(event)`) — transmite a mensagem/pausa no socket único. `undefined` fora do runtime Cloudflare (só deixa de transmitir ao vivo, nunca falha o processamento do echo). */
  env?: Record<string, unknown>
}

export async function handleEchoEvent(deps: HandleEchoEventDeps, echo: ParsedInboundEcho): Promise<void> {
  // (G6) A Meta ecoa de volta toda mensagem enviada pela Cloud API — inclusive
  // as que o PRÓPRIO painel acabou de mandar (`chatService.dispatchOutboundMessage`
  // → fila `chat-outbound` → `wamid` gravado na linha em
  // `whatsapp_conversations.wamid`, migration 116). Sem este check, a mesma
  // mensagem duplicava no histórico: uma linha gravada pelo painel, outra
  // por este echo. Índice único parcial (`idx_whatsapp_conversations_wamid`)
  // torna esta consulta barata e exata.
  const { data: existente } = await deps.supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('wamid', echo.wamid)
    .maybeSingle()

  if (existente) {
    logger.info('[whatsapp/webhook] echo descartado — mesmo wamid já gravado pelo painel', { wamid: echo.wamid })
    return
  }

  const customer = await findOrCreateCustomer(deps.supabase, {
    ...(echo.telefone ? { whatsapp: echo.telefone } : {}),
    ...(echo.userId ? { lid: echo.userId } : {}),
  })

  // (f) grava sempre, mesmo quando não pausa (disparo): é parte da conversa.
  // `actor: 'humano_celular'` (migration 115) distingue esta origem de
  // `humano_painel` — antes as duas gravavam o mesmo prefixo e a UI não
  // conseguia diferenciar "você respondeu pelo painel" de "pelo celular"
  // (G1/G10 de `_docs/CHAT/PRD.md`).
  const conteudo = echo.texto ? `${HUMAN_REPLY_PREFIX} ${echo.texto}` : `${HUMAN_REPLY_PREFIX} [${echo.tipo}]`
  const { data: novaMensagem, error } = await deps.supabase
    .from('whatsapp_conversations')
    .insert({ customer_id: customer.id, role: 'assistant', content: conteudo, actor: 'humano_celular' })
    .select('id, customer_id, role, content, created_at, seq')
    .single()

  if (error || !novaMensagem) {
    logger.error('[whatsapp/webhook] falha ao gravar mensagem da loja no histórico', {
      clienteId: customer.id,
      error: error?.message,
    })
  } else {
    await notifyRealtimeRoom(deps.env, {
      topic: 'chat.message',
      payload: {
        id: novaMensagem.id,
        clienteId: novaMensagem.customer_id,
        role: novaMensagem.role as 'user' | 'assistant',
        content: novaMensagem.content,
        criadoEm: novaMensagem.created_at,
        seq: novaMensagem.seq,
        ator: 'humano_celular',
      },
    })
  }

  if (!deps.pausaConfig.ativo) return

  // (c2) decisão determinística, sem modelo: só pausa se a conversa está em
  // andamento (janela de 24h do WhatsApp aberta pelo cliente).
  const janelaAberta = await hasRecentCustomerMessage(deps.supabase, customer.id)
  if (!janelaAberta) return

  // (g) janela deslizante: toda mensagem do humano reinicia a partir de agora.
  const pausadoAte = new Date(Date.now() + deps.pausaConfig.minutos * 60_000).toISOString()
  await pauseCustomer(deps.supabase, customer.id, deps.pausaConfig.minutos, 'resposta_humana')
  await notifyRealtimeRoom(deps.env, {
    topic: 'chat.conversation_updated',
    payload: { clienteId: customer.id, pausadoAte, pausadoMotivo: 'resposta_humana' },
  })
}

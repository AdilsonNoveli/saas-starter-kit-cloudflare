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
import { HUMAN_REPLY_PREFIX } from '../agent/systemPrompt'
import type { ParsedInboundEcho } from './parseInboundPayload'
import { hasRecentCustomerMessage, pauseCustomer } from './pauseState'
import type { PausaConfig } from './resolvePausaConfig'

export interface HandleEchoEventDeps {
  supabase: SupabaseClient<Database>
  pausaConfig: PausaConfig
}

export async function handleEchoEvent(deps: HandleEchoEventDeps, echo: ParsedInboundEcho): Promise<void> {
  const customer = await findOrCreateCustomer(deps.supabase, {
    ...(echo.telefone ? { whatsapp: echo.telefone } : {}),
    ...(echo.userId ? { lid: echo.userId } : {}),
  })

  // (f) grava sempre, mesmo quando não pausa (disparo): é parte da conversa.
  const conteudo = echo.texto ? `${HUMAN_REPLY_PREFIX} ${echo.texto}` : `${HUMAN_REPLY_PREFIX} [${echo.tipo}]`
  const { error } = await deps.supabase
    .from('whatsapp_conversas')
    .insert({ cliente_id: customer.id, role: 'assistant', content: conteudo })

  if (error) {
    logger.error('[whatsapp/webhook] falha ao gravar mensagem da loja no histórico', {
      clienteId: customer.id,
      error: error.message,
    })
  }

  if (!deps.pausaConfig.ativo) return

  // (c2) decisão determinística, sem modelo: só pausa se a conversa está em
  // andamento (janela de 24h do WhatsApp aberta pelo cliente).
  const janelaAberta = await hasRecentCustomerMessage(deps.supabase, customer.id)
  if (!janelaAberta) return

  // (g) janela deslizante: toda mensagem do humano reinicia a partir de agora.
  await pauseCustomer(deps.supabase, customer.id, deps.pausaConfig.minutos, 'resposta_humana')
}

/**
 * Item (d)/(e) da §0.5.2 (`_docs/em-andamento.md`) — checagem determinística
 * de pausa **antes** de qualquer enfileiramento no `WHATSAPP_QUEUE`. Ponto
 * único, chamado tanto do caminho de texto (`handleInboundMessage.ts`) quanto
 * do de mídia (`processInboundMedia.ts`, depois da transcrição/visão): os
 * dois convergem para o mesmo `appendToBurstBuffer` + `sendToQueue`, e é
 * exatamente ali — nunca antes — que a pausa precisa ser consultada.
 *
 * Também é onde o item 4 da §7.6 (transbordo) entra: mesmo estado do item (a),
 * mesmo ponto do fluxo — só a metade determinística (léxico), nunca a
 * classificação por modelo (deliberadamente fora, ver `transbordoHeuristic.ts`).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { findOrCreateCustomer } from '../customers/findOrCreateCustomer'
import { isCustomerPaused, pauseCustomer } from './pauseState'
import { resolvePausaConfig } from './resolvePausaConfig'
import { matchesTransbordoLexicon } from './transbordoHeuristic'
import { notifyRealtimeRoom } from '../chat/chatRoom'

export interface InboundTurnGate {
  readonly clienteId: string
  /** `true` ⇒ produtor NÃO deve enfileirar: a fala já foi gravada aqui dentro. */
  readonly pausado: boolean
  /**
   * `true` só quando ESTA chamada é quem acabou de disparar o transbordo via
   * léxico (`transbordoHeuristic.ts`) — nunca quando o cliente já estava
   * pausado antes desta mensagem. Distingue "acabei de escalar, mande a
   * confirmação uma vez" de "já está pausado, fique calado" — sem essa
   * distinção o chamador não tem como saber quando confirmar sem repetir a
   * cada mensagem seguinte.
   */
  readonly escalatedNow: boolean
}

async function recordCustomerMessage(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  texto: string,
  env?: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .insert({ customer_id: clienteId, role: 'user', content: texto, actor: 'cliente' })
    .select('id, customer_id, role, content, created_at, seq')
    .single()

  if (error || !data) {
    logger.error('[whatsapp] falha ao gravar fala do cliente durante a pausa', { clienteId, error: error?.message })
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
      ator: 'cliente',
    },
  })
}

/**
 * Resolve o cliente (mesmo caminho lid-first de `findOrCreateCustomer`, com
 * backfill bidirecional) e consulta/expira a pausa (§0.5.1b). Quando pausado,
 * grava a fala do cliente como `user` na hora (item e) — o caminho não-pausado
 * não grava nada aqui: quem grava o turno completo é `saveConversationTurn`,
 * no consumer, depois da resposta do agente.
 *
 * Se ainda não está pausado, checa o léxico de transbordo (item 4/§7.6). A
 * config (`resolvePausaConfig`) só é lida quando o léxico bate — a maioria das
 * mensagens não menciona nenhum dos termos, e o caminho comum continua com
 * custo zero, sem SELECT extra em `store`.
 */
export async function gateInboundTurn(
  supabase: SupabaseClient<Database>,
  identidade: { telefone: string | null, lid: string | null },
  texto: string,
  /**
   * `contacts[].profile.name` do payload inbound (`ParsedInboundMessage.nomeContato`)
   * — o "pushname" que o próprio cliente configurou no WhatsApp. Repassado cru
   * para `findOrCreateCustomer`, que sanitiza (`sanitizeContactName.ts`) e só
   * faz backfill sobre um nome-placeholder, nunca sobre um nome real já
   * salvo. Este é o ponto mais cedo do fluxo em que o cliente já foi
   * resolvido — texto e mídia convergem aqui antes de qualquer turno.
   */
  nomeContato?: string | null,
  /** Binding Cloudflare (`cloudflareEnv(event)`/`env` do consumer de fila) — transmite mensagem/escalação no socket único. */
  env?: Record<string, unknown>,
): Promise<InboundTurnGate> {
  const customer = await findOrCreateCustomer(supabase, {
    ...(identidade.telefone ? { whatsapp: identidade.telefone } : {}),
    ...(identidade.lid ? { lid: identidade.lid } : {}),
    ...(nomeContato ? { nome: nomeContato } : {}),
  })

  const jaPausado = await isCustomerPaused(supabase, customer.id)
  if (jaPausado) {
    await recordCustomerMessage(supabase, customer.id, texto, env)
    return { clienteId: customer.id, pausado: true, escalatedNow: false }
  }

  if (matchesTransbordoLexicon(texto)) {
    const pausaConfig = await resolvePausaConfig(supabase)
    if (pausaConfig.ativo) {
      const pausadoAte = new Date(Date.now() + pausaConfig.minutos * 60_000).toISOString()
      await pauseCustomer(supabase, customer.id, pausaConfig.minutos, 'transbordo')
      await notifyRealtimeRoom(env, {
        topic: 'chat.conversation_updated',
        payload: { clienteId: customer.id, pausadoAte, pausadoMotivo: 'transbordo' },
      })
      await recordCustomerMessage(supabase, customer.id, texto, env)
      return { clienteId: customer.id, pausado: true, escalatedNow: true }
    }
  }

  return { clienteId: customer.id, pausado: false, escalatedNow: false }
}

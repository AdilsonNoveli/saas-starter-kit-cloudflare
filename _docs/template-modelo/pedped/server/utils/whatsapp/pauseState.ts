/**
 * Estado único de atendimento/pausa por cliente — item 2 da §7.6 de
 * `_docs/em-andamento.md` (§0.5.2 (a)(d)(g)). `clientes.pausado_ate` é um
 * PRAZO, nunca uma flag: quem escreve o prazo (echo do humano, hoje; o
 * "assumir" manual do painel, item 3/futuro) não precisa saber quando ele
 * expira — a expiração é só o produtor observando que o prazo já passou, sem
 * cron (§0.5.1b).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'

export type PauseMotivo = 'transbordo' | 'resposta_humana' | 'manual'

/** Janela em que o WhatsApp considera uma conversa "em andamento" (§0.5.1b). */
export const CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Consulta e expira a pausa do cliente. `pausado_ate` no passado ⇒ o agente
 * volta: a linha é limpa aqui mesmo, no ponto em que a próxima mensagem do
 * cliente chega — não existe job nem timer que faça isso (§0.5.1b).
 *
 * O `WHERE pausado_ate <= now()` no UPDATE (além do `id`) é o que impede
 * clobber de uma pausa nova gravada entre a leitura e a limpeza: se um echo
 * concorrente já reiniciou a janela (item g), a condição deixa de bater e o
 * UPDATE vira no-op.
 */
export async function isCustomerPaused(
  supabase: SupabaseClient<Database>,
  clienteId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('clientes')
    .select('pausado_ate')
    .eq('id', clienteId)
    .maybeSingle()

  if (error || !data?.pausado_ate) return false
  if (new Date(data.pausado_ate).getTime() > Date.now()) return true

  const agora = new Date().toISOString()
  const { error: clearErr } = await supabase
    .from('clientes')
    .update({ pausado_ate: null, pausado_motivo: null })
    .eq('id', clienteId)
    .lte('pausado_ate', agora)

  if (clearErr) {
    logger.error('[whatsapp] falha ao expirar a pausa do cliente', { clienteId, error: clearErr.message })
  }

  return false
}

/**
 * Grava o prazo — sempre `now() + minutos`, sobrescrevendo qualquer pausa
 * anterior. É a janela deslizante do item (g): toda mensagem do humano
 * reinicia a contagem a partir de agora, nunca soma ao prazo existente.
 */
export async function pauseCustomer(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  minutos: number,
  motivo: PauseMotivo,
): Promise<void> {
  const pausadoAte = new Date(Date.now() + minutos * 60_000).toISOString()
  const { error } = await supabase
    .from('clientes')
    .update({ pausado_ate: pausadoAte, pausado_motivo: motivo })
    .eq('id', clienteId)

  if (error) {
    logger.error('[whatsapp] falha ao gravar a pausa do cliente', { clienteId, motivo, error: error.message })
  }
}

/**
 * Existe mensagem do CLIENTE (`role: 'user'`) nas últimas 24h? É o
 * discriminador da §0.5.1b: loja respondendo conversa em andamento (janela
 * aberta) pausa; loja iniciando/disparando (janela fechada) não pausa.
 *
 * Falha de leitura devolve `false` — mesma postura de `countRecentUserTurns`
 * (`conversationHistory.ts`): a pausa é proteção de UX, não porta de
 * atendimento, e um erro transitório aqui não pode travar o agente pausado
 * para sempre nem pausá-lo por engano.
 */
export async function hasRecentCustomerMessage(
  supabase: SupabaseClient<Database>,
  clienteId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('whatsapp_conversas')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('role', 'user')
    .gte('criado_em', new Date(Date.now() - CONVERSATION_WINDOW_MS).toISOString())

  return error ? false : (count ?? 0) > 0
}

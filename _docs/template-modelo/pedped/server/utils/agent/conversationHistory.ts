import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { AgentHistoryMessage } from './runAgent'

const HISTORY_LIMIT = 20

/**
 * Histórico de turno do cliente (`whatsapp_conversas`, seção 6/9 da
 * arquitetura do agente WhatsApp) — só `user`/`assistant`; tool calls são
 * andaime interno do turno, não persistem entre turnos.
 */
export async function loadConversationHistory(
  supabase: SupabaseClient<Database>,
  clienteId: string,
): Promise<AgentHistoryMessage[]> {
  const { data } = await supabase
    .from('whatsapp_conversas')
    .select('role, content')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: false })
    // Desempate obrigatório (migration 091): `criado_em` default `now()` é o
    // timestamp da TRANSAÇÃO, e `saveConversationTurn` grava user+assistant
    // num único INSERT — os dois nascem com o mesmo valor. Sem `seq` a ordem
    // é indefinida e o histórico pode sair com a resposta antes da pergunta.
    .order('seq', { ascending: false })
    .limit(HISTORY_LIMIT)

  return (data ?? [])
    .reverse()
    .map((row): AgentHistoryMessage => ({ role: row.role as 'user' | 'assistant', content: row.content }))
}

/**
 * Falas do cliente numa janela recente — base do teto de exposição do modelo
 * (`TURN_CEILING_PER_HOUR` em `guardrails.ts`).
 *
 * Conta no servidor (`head: true`), sem trafegar linha, pelo índice que já
 * existe (`cliente_id, criado_em DESC`). Custa **um** round-trip por turno, e
 * ele é aceitável: é o único jeito de saber há quanto tempo esta conversa está
 * consumindo modelo, e `loadConversationHistory` só enxerga as últimas 20
 * mensagens — não distingue 20 falas em cinco minutos de 20 em dois dias.
 *
 * Falha de leitura devolve `0`: o teto é proteção de custo, não porta de
 * atendimento, e derrubar o turno de um cliente real por causa dele seria pior
 * do que o abuso que ele evita.
 */
/**
 * Janela de julgamento de produção (`_docs/implementar/prd-laboratorio-avaliacao-agente.md`
 * §4) — MESMA query de `loadConversationHistory`, só limitada a `seq <= ateSeq`
 * e com um `LIMIT` menor. Por `seq` é exato: a versão antiga (`evaluate.ts`)
 * buscava o par por janela de tempo (`CONVERSATION_WINDOW_S`), que podia errar
 * o par certo se duas mensagens caíssem perto uma da outra.
 */
export async function loadJudgeWindow(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  ateSeq: number,
  tamanho = 6,
): Promise<AgentHistoryMessage[]> {
  const { data } = await supabase
    .from('whatsapp_conversas')
    .select('role, content')
    .eq('cliente_id', clienteId)
    .lte('seq', ateSeq)
    .order('seq', { ascending: false })
    .limit(tamanho)

  return (data ?? [])
    .reverse()
    .map((row): AgentHistoryMessage => ({ role: row.role as 'user' | 'assistant', content: row.content }))
}

export async function countRecentUserTurns(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  desde: Date,
): Promise<number> {
  const { count, error } = await supabase
    .from('whatsapp_conversas')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('role', 'user')
    .gte('criado_em', desde.toISOString())

  return error ? 0 : (count ?? 0)
}

/**
 * Devolve o `seq` da mensagem do assistente gravada — âncora exata para
 * `loadJudgeWindow` montar a janela de julgamento de produção sem depender de
 * proximidade de timestamp (migration 105, `agente_uso_tokens.seq`).
 */
export async function saveConversationTurn(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  userMessage: string,
  assistantText: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('whatsapp_conversas')
    .insert([
      { cliente_id: clienteId, role: 'user', content: userMessage },
      { cliente_id: clienteId, role: 'assistant', content: assistantText },
    ])
    .select('role, seq')

  return (data ?? []).find((row) => row.role === 'assistant')?.seq ?? null
}

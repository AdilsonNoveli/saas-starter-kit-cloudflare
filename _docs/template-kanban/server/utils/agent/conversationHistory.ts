import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { AgentHistoryMessage } from './runAgent'

const HISTORY_LIMIT = 20

/**
 * Histórico de turno do cliente (`whatsapp_conversations`, seção 6/9 da
 * arquitetura do agente WhatsApp) — só `user`/`assistant`; tool calls são
 * andaime interno do turno, não persistem entre turnos.
 */
export async function loadConversationHistory(
  supabase: SupabaseClient<Database>,
  clienteId: string,
): Promise<AgentHistoryMessage[]> {
  const { data } = await supabase
    .from('whatsapp_conversations')
    .select('role, content')
    .eq('customer_id', clienteId)
    .order('created_at', { ascending: false })
    // Desempate obrigatório (migration 091): `created_at` default `now()` é o
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
 * existe (`customer_id, created_at DESC`). Custa **um** round-trip por turno, e
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
    .from('whatsapp_conversations')
    .select('role, content')
    .eq('customer_id', clienteId)
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
    .from('whatsapp_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', clienteId)
    .eq('role', 'user')
    .gte('created_at', desde.toISOString())

  return error ? 0 : (count ?? 0)
}

export interface SavedTurnMessage {
  readonly id: string
  readonly seq: number
  readonly criadoEm: string
}

export interface SavedConversationTurn {
  readonly user: SavedTurnMessage
  readonly assistant: SavedTurnMessage
}

/**
 * Grava o par cliente/agente e devolve `id`/`seq`/`created_at` das duas
 * linhas — `assistant.seq` é a âncora exata que `loadJudgeWindow` usa para
 * montar a janela de julgamento de produção sem depender de proximidade de
 * timestamp (migration 105, `agent_token_usage.seq`); o par completo é o que
 * `whatsapp-queue.ts` precisa para transmitir o turno no socket único do
 * Chat (`notifyRealtimeRoom`) sem uma segunda consulta.
 */
export async function saveConversationTurn(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  userMessage: string,
  assistantText: string,
): Promise<SavedConversationTurn | null> {
  const { data } = await supabase
    .from('whatsapp_conversations')
    .insert([
      // `ator` (migration 115) grava a autoria explícita no momento em que o
      // escritor já sabe a origem real — elimina a inferência por prefixo de
      // texto para linhas novas (G1/G10 de `_docs/CHAT/PRD.md`).
      { customer_id: clienteId, role: 'user', content: userMessage, actor: 'cliente' },
      { customer_id: clienteId, role: 'assistant', content: assistantText, actor: 'agente_ia' },
    ])
    .select('id, role, seq, created_at')

  const rows = data ?? []
  const userRow = rows.find((row) => row.role === 'user')
  const assistantRow = rows.find((row) => row.role === 'assistant')
  if (!userRow || !assistantRow) return null

  return {
    user: { id: userRow.id, seq: userRow.seq, criadoEm: userRow.created_at },
    assistant: { id: assistantRow.id, seq: assistantRow.seq, criadoEm: assistantRow.created_at },
  }
}

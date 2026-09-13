/**
 * Motor de decisão do gatilho `kanban_stage` — irmão de `quickResponse.ts`,
 * mas propositalmente um arquivo separado: aquele decide por TEXTO de
 * mensagem inbound (`isPureGreeting`, palavra-chave), este decide por
 * MUDANÇA DE STATUS do pedido — contexto sem nenhum texto de cliente
 * envolvido. Forçar os dois no mesmo motor misturaria responsabilidades.
 *
 * Reaproveita `statusMatches` (exportada de `quickResponse.ts`) para a MESMA
 * regra de filtro por `customerStatuses` — zero duplicação dessa lógica.
 *
 * Chamado por `server/api/admin/orders/[id]/status.put.ts` via
 * `sendKanbanStageNotification.ts`, uma consulta direcionada por pedido (não
 * em lote como o motor inbound) — não precisa da avaliação preguiçosa de
 * duas camadas de `quickResponse.ts`, já é um SELECT único e filtrado.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { logger } from '~/core/services/logger.service'
import { statusMatches } from './quickResponse'
import { toAgentQuickResponse } from './agentQuickResponseMapper'
import type { AgentQuickResponse, CustomerStatus } from '#shared/types/agentQuickResponse'

export interface ResolveKanbanStageQuickResponseInput {
  readonly kanbanStageKey: string
  readonly customerStatus: CustomerStatus | null
}

/**
 * Primeira regra ATIVA de `trigger_type='kanban_stage'` para esta etapa
 * (ordenada por `sortOrder`) cujo `customerStatuses` bate com o status do
 * cliente, ou `null`. Nunca lança — erro de leitura devolve `null` (mesma
 * régua defensiva do resto do módulo de respostas rápidas): uma falha aqui
 * não pode impedir a resposta HTTP de `status.put.ts`, que já concluiu a
 * mudança de status real antes de chamar isto.
 */
export async function resolveKanbanStageQuickResponse(
  supabase: SupabaseClient<Database>,
  input: ResolveKanbanStageQuickResponseInput,
): Promise<AgentQuickResponse | null> {
  try {
    const { data, error } = await supabase
      .from('agent_quick_responses')
      .select('*')
      .eq('active', true)
      .eq('trigger_type', 'kanban_stage')
      .eq('kanban_stage_key', input.kanbanStageKey)
      .order('sort_order', { ascending: true })

    if (error) {
      logger.error('[agent] falha ao buscar resposta rápida de etapa do kanban', {
        kanbanStageKey: input.kanbanStageKey,
        error: error.message,
      })
      return null
    }

    for (const row of data ?? []) {
      const rule = toAgentQuickResponse(row)
      if (statusMatches(rule, input.customerStatus)) return rule
    }

    return null
  } catch (err) {
    logger.error('[agent] falha inesperada ao buscar resposta rápida de etapa do kanban', {
      kanbanStageKey: input.kanbanStageKey,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

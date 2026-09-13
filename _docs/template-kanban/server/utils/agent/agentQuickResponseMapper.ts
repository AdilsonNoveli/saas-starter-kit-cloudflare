/**
 * Única função que converte uma linha crua de `agent_quick_responses`
 * (snake_case, `Database['public']['Tables']['agent_quick_responses']['Row']`)
 * para `AgentQuickResponse` (camelCase). Reaproveitada por todo leitor da
 * tabela — `quickResponseService.ts` (CRUD admin), `whatsapp-queue.ts`
 * (carga em lote pro motor inbound) e `kanbanStageQuickResponse.ts` (consulta
 * direcionada pro motor outbound) — para não haver uma segunda cópia
 * divergindo se a tabela ganhar uma coluna nova.
 */
import type { Database } from '~/types/database.types'
import type { AgentQuickResponse, CustomerStatus, QuickResponseTrigger } from '#shared/types/agentQuickResponse'

export type AgentQuickResponseRow = Database['public']['Tables']['agent_quick_responses']['Row']

export function toAgentQuickResponse(row: AgentQuickResponseRow): AgentQuickResponse {
  return {
    id: row.id,
    name: row.name,
    // `trigger_type` é `text` livre no banco (migration 120) — o cast aqui é
    // seguro porque o único caminho de escrita (Zod da rota) já restringiu o valor.
    triggerType: row.trigger_type as QuickResponseTrigger,
    keywords: row.keywords,
    kanbanStageKey: row.kanban_stage_key,
    customerStatuses: row.customer_statuses as readonly CustomerStatus[] | null,
    replyText: row.reply_text,
    active: row.active,
    sortOrder: row.sort_order,
    triggerCount: row.trigger_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Contratos das Respostas Rápidas do Agente IA — regras determinísticas
 * (trigger_type + status do cliente opcional → texto) que respondem sem
 * chamar o modelo, configuráveis em `/admin/settings/quick-responses`.
 *
 * `QuickResponseTrigger` é uma union de string, não um enum do banco
 * (`agent_quick_responses.trigger_type` é `text` sem `CHECK`, migration 120) —
 * de propósito: um gatilho novo (fora do horário, aniversário, carrinho
 * abandonado — fases futuras) deve custar só código aqui + um matcher em
 * `server/utils/agent/quickResponse.ts`, nunca uma migration.
 */

/**
 * Vocabulário válido hoje — validado só aqui (Zod), nunca no banco.
 * `kanban_stage` é OUTBOUND (dispara quando o pedido muda de coluna no Kanban,
 * `server/api/admin/orders/[id]/status.put.ts`) — diferente dos outros 3, que
 * reagem a mensagem INBOUND do cliente (`server/plugins/whatsapp-queue.ts`).
 */
export const QUICK_RESPONSE_TRIGGERS = ['greeting', 'first_message', 'keyword', 'kanban_stage'] as const
export type QuickResponseTrigger = (typeof QUICK_RESPONSE_TRIGGERS)[number]

/**
 * Mesmos 5 valores de `status_cliente_enum` (`server/supabase/init.sql`),
 * já usados em `app/pages/admin/customers/[id].vue` — reaproveitados aqui
 * ao invés de duplicar uma segunda fonte de verdade do vocabulário. Em
 * PT-BR porque é o enum JÁ EXISTENTE de `clientes.status`, não um
 * identificador novo (a exceção documentada na memória do projeto).
 */
export const CUSTOMER_STATUS_VALUES = ['Novo', 'Ocasional', 'Frequente', 'VIP', 'Inativo'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUS_VALUES)[number]

/** Linha da tabela `agent_quick_responses`. */
export interface AgentQuickResponse {
  readonly id: string
  readonly name: string
  readonly triggerType: QuickResponseTrigger
  /** Só relevante quando `triggerType === 'keyword'`. */
  readonly keywords: readonly string[] | null
  /** Só relevante quando `triggerType === 'kanban_stage'` — FK para `kanban_coluna.chave`. `null` = coluna excluída, regra inerte. */
  readonly kanbanStageKey: string | null
  /** `null`/vazio = qualquer status do cliente. */
  readonly customerStatuses: readonly CustomerStatus[] | null
  readonly replyText: string
  readonly active: boolean
  readonly sortOrder: number
  readonly triggerCount: number
  readonly createdAt: string
  readonly updatedAt: string
}

/** Payload de criação — `POST /api/admin/quick-responses`. */
export interface CreateAgentQuickResponsePayload {
  readonly name: string
  readonly triggerType: QuickResponseTrigger
  readonly keywords?: readonly string[]
  readonly kanbanStageKey?: string | null
  readonly customerStatuses?: readonly CustomerStatus[]
  readonly replyText: string
  readonly active?: boolean
  /** Omitido = a regra entra no fim da lista (server calcula, ver `quickResponseService.ts`) — a página de criação não tem a lista carregada pra saber a posição. */
  readonly sortOrder?: number
}

/** Payload de atualização — `PUT /api/admin/quick-responses/:id`. */
export interface UpdateAgentQuickResponsePayload {
  readonly name?: string
  readonly triggerType?: QuickResponseTrigger
  readonly keywords?: readonly string[]
  readonly kanbanStageKey?: string | null
  readonly customerStatuses?: readonly CustomerStatus[]
  readonly replyText?: string
  readonly active?: boolean
  readonly sortOrder?: number
}

/** Payload de reordenação em lote — `PUT /api/admin/quick-responses` (upsert de `{id, sortOrder}[]`). */
export interface ReorderAgentQuickResponsesPayload {
  readonly items: readonly { readonly id: string, readonly sortOrder: number }[]
}

export interface AgentQuickResponseListResponse {
  readonly data: readonly AgentQuickResponse[]
}

/** Escrita restrita a gerente+ (mesmo corte de `CUSTOMER_DELETE_ROLES`, `#shared/types/user`) — leitura usa `STAFF_ROLES`. */
export const QUICK_RESPONSE_WRITE_ROLES = ['gerente', 'administrador', 'proprietario'] as const

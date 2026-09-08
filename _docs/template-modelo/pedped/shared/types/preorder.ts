/**
 * Pre-Order System — shared contracts between client and server.
 * Typed against migration 078 (produtos.product_type / preorder_config,
 * tables preorders / preorder_blocked_dates, RPC reserve_preorders).
 */

/**
 * Sale mode of a product (produtos.product_type). Mutually exclusive:
 * `stock` = venda imediata, `preorder` = encomenda. Sem modo híbrido.
 */
export const PRODUCT_TYPES = ['stock', 'preorder'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

/** Scheduling model. `in_person_service` is reserved for future use. */
export type SchedulingType = 'made_to_order' | 'in_person_service'

/**
 * Rules stored in produtos.preorder_config (JSONB).
 *
 * Daily capacity is NOT here (migration 113) — it lives in
 * `produtos.producao_diaria_limite`, the same column Gestão de Estoque
 * (migration 111) uses for `controle_estoque='producao_diaria'`. Encomenda
 * and estoque used to each keep their own "capacidade diária" field —
 * redundant in the admin UI and ambiguous for the agent (two possible
 * sources of the same information). One column, two consumers:
 * `reserve_preorders` (capacity per SCHEDULED date, table `preorders`) and
 * `consumir_estoque_pedido` (capacity for TODAY only, table
 * `estoque_movimentacoes`) — different tracking mechanisms because a
 * scheduled delivery date and "today" are different concepts, but the same
 * limit number.
 */
export interface PreorderConfig {
  readonly scheduling_type: SchedulingType
  readonly min_quantity: number
  readonly max_quantity: number
  readonly min_lead_days: number
  readonly max_lead_days: number
}

/**
 * Requisitos declarados pelo produto (produtos.requirements, migration 084 —
 * EPIC 2 PRD-REFATORACAO). Motor de `missing_fields` cruza isto com o estado
 * do item no carrinho para decidir o que ainda falta coletar.
 */
export interface ProductRequirements {
  /** Item exige data de entrega/retirada antes do checkout (encomenda). */
  readonly requires_date: boolean
}

/** Robust default configuration for preorder products when DB payload is missing or incomplete. */
export const DEFAULT_PREORDER_CONFIG: PreorderConfig = {
  scheduling_type: 'made_to_order',
  min_quantity: 1,
  max_quantity: 999,
  min_lead_days: 1,
  max_lead_days: 30,
}

/** Snapshot persisted in preorders.rules_snapshot (rules + effective price at purchase). */
export interface PreorderRulesSnapshot extends PreorderConfig {
  readonly unit_price: number
}

/** Row from the `preorders` table. Status lives on the parent order (kanban). */
export interface PreorderRow {
  readonly id: string
  readonly order_id: string
  readonly product_id: string
  readonly delivery_date: string
  readonly quantity: number
  readonly unit: string
  readonly rules_snapshot: PreorderRulesSnapshot
  readonly created_at: string
}

/** Row from the `preorder_blocked_dates` table. product_id NULL = global block. */
export interface PreorderBlockedDateRow {
  readonly id: string
  readonly blocked_date: string
  readonly product_id: string | null
  readonly reason: string | null
  readonly created_at: string
}

/** Response of GET /api/preorders/availability. */
export interface AvailabilityResult {
  readonly available: boolean
  readonly remaining_capacity: number
}

export type CalendarDayStatus =
  | 'available'
  | 'full'
  | 'blocked'
  | 'closed'
  | 'out_of_lead_window'

/** One day of GET /api/preorders/calendar. */
export interface CalendarDay {
  /** ISO calendar date (YYYY-MM-DD). */
  readonly date: string
  readonly status: CalendarDayStatus
  readonly remaining_capacity: number
}

/** Response of GET /api/preorders/calendar. */
export interface PreorderCalendarResponse {
  readonly month: string
  readonly days: readonly CalendarDay[]
}

/**
 * Item de encomenda enviado ao checkout: a data de entrega é escolhida NO
 * checkout (não no catálogo), por isso viaja separada do carrinho.
 */
export interface CheckoutPreorderSelection {
  readonly cart_key: string
  readonly delivery_date: string
}

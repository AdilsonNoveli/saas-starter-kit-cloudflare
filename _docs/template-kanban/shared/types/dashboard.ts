/**
 * Admin dashboard shared contracts.
 * Typed returns for dashboard RPCs:
 * `get_dashboard_metrics`, `get_dashboard_counts`, `get_top_produtos`,
 * `get_top_paginas`, `get_top_cliques`, `get_funil_conversao`.
 */

/**
 * Period presets for the dashboard date filter.
 * `custom` requires explicit `dateStart`/`dateEnd` in YYYY-MM-DD format.
 */
export const DASHBOARD_PERIODS = ['today', 'yesterday', '7d', '30d', 'custom'] as const
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]

/** Human-readable labels for each period preset (pt-BR). */
export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today:     'Hoje',
  yesterday: 'Ontem',
  '7d':      '7 dias',
  '30d':     '30 dias',
  custom:    'Personalizado',
} as const

/**
 * Main faturamento metrics returned by `get_dashboard_metrics(date, date)`.
 * Fields renamed from the original `faturamento_dia`/`total_entregues` to
 * period-agnostic names — the RPC now filters by `is_revenue_trigger` flag,
 * not by hardcoded status.
 */
export interface DashboardMetrics {
  /** Sum of valor_total for orders with is_revenue_trigger=true in the period. */
  readonly faturamento: number
  /** Count of orders with is_revenue_trigger=true in the period. */
  readonly total_pedidos: number
  readonly ticket_medio: number
}

/**
 * Auxiliary counters returned by `get_dashboard_counts(date, date)`.
 * Uses `is_cancelled`/`is_open` flags — no hardcoded status strings.
 * `leads` and `produtos_ativos` are current totals (not period-filtered).
 */
export interface DashboardCounts {
  /** Orders with is_cancelled=true created in the period. */
  readonly cancelados: number
  /** Orders with is_open=true created in the period. */
  readonly em_aberto: number
  /** Non-visitor clients created in the period. */
  readonly clientes_novos: number
  /** Total visitor-clients (all time). */
  readonly leads: number
  /** Total active products (all time). */
  readonly produtos_ativos: number
}

/** Row returned by `get_top_produtos(date, date, int)`. */
export interface TopProdutoItem {
  readonly produto_id: string
  readonly nome: string
  readonly qtde: number
}

/** Top-categories row (categoria_view events) — aggregated over the last N hours. */
export interface TopCategoriaItem {
  readonly categoria_nome: string
  readonly total: number
}

/** Top-products-click row (produto_click events) — aggregated over the last N hours. */
export interface TopProdutoClickItem {
  readonly produto_id: string
  readonly nome: string
  readonly total: number
}

/** Conversion funnel step (page_view → add_to_cart → checkout → order). */
export interface FunnelStep {
  readonly etapa: string
  readonly total: number
}

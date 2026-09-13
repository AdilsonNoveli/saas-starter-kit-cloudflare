/**
 * Order-related shared contracts between client and server.
 * Strong typing for Kanban columns, order status history and paginated history endpoint.
 */

import { z } from 'zod'

/**
 * Order status type. Since the kanban-dynamic migration, status is NOT a fixed enum:
 * it is the `chave` of a `kanban_coluna` row (FK in `pedidos.status`).
 * Validity is enforced by the FK and the column set loaded at runtime.
 */
export type OrderStatus = string

/**
 * Row from the `kanban_coluna` table. `chave` is the stable identity slug —
 * referenced by `pedidos.status` and webhooks, immutable after creation.
 *
 * Semantic flags (migration 022) replace hardcoded status strings throughout
 * the codebase. Set via the Kanban settings UI; never hardcode the slug.
 */
export interface KanbanColunaRow {
  readonly chave: string
  readonly label: string
  /** Hex color (#RRGGBB) used as the column accent. */
  readonly cor: string
  readonly ordem: number
  readonly visivel: boolean
  /** Orders in this status count towards revenue (faturamento). */
  readonly is_revenue_trigger: boolean
  /** Orders in this status are considered cancelled in dashboard counters. */
  readonly is_cancelled: boolean
  /** Orders in this status await operator action (shown as "em aberto"). */
  readonly is_open: boolean
  /** System column: protected from deletion/rename (DB trigger enforced). */
  readonly is_sistema: boolean
  /** Entry column: every new order starts here, regardless of channel. Exactly one row true; moves together with `is_sistema` via `set_principal_kanban_column`. */
  readonly is_entry: boolean
  /** Entering this column (delivery orders) triggers automatic driver assignment. */
  readonly is_delivery_dispatch: boolean
  /** "Out for delivery" state (driver assigned/dispatched). */
  readonly is_out_for_delivery: boolean
  /** Terminal "delivered" state (sets entregue_em + customer metrics). */
  readonly is_delivered: boolean
}

/**
 * Allowed origins stored in `pedido_status_historico.origem`.
 * Must match the CHECK constraint in the database.
 */
export const HISTORY_ORIGINS = [
  'admin',
  'webhook',
  'sistema',
  'catalogo',
  'integracao',
] as const
export type HistoryOrigin = (typeof HISTORY_ORIGINS)[number]

/** Row from the `pedido_status_historico` table (status transition audit). */
export interface OrderStatusHistoryRow {
  readonly id: string
  readonly pedido_id: string
  readonly status_anterior: OrderStatus | null
  readonly status_novo: OrderStatus
  readonly alterado_por: string | null
  readonly origem: HistoryOrigin
  readonly criado_em: string
}

/**
 * Query schema for `GET /api/admin/pedidos/historico`.
 *
 * - Periods: presets (`hoje`, `7d`, `30d`, `90d`) or custom range (`from`/`to` in ISO 8601).
 * - `cliente` is a typeahead — case-insensitive substring on `clientes.nome` or `telefone_whatsapp`.
 * - `valor_min`/`valor_max` filter by `valor_total`.
 * - Pagination via `page`/`pageSize`.
 */
export const HISTORY_PERIODS = ['hoje', '7d', '30d', '90d', 'custom'] as const
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number]

export const historyQuerySchema = z
  .object({
    period: z.enum(HISTORY_PERIODS).default('30d'),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    status: z.string().trim().min(1).max(60).optional(),
    cliente: z.string().trim().max(120).optional(),
    valor_min: z.coerce.number().nonnegative().optional(),
    valor_max: z.coerce.number().nonnegative().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine(
    (v) => v.period !== 'custom' || (v.from !== undefined && v.to !== undefined),
    { message: '`from` and `to` are required when period=custom.' },
  )
  .refine(
    (v) => v.valor_min === undefined || v.valor_max === undefined || v.valor_min <= v.valor_max,
    { message: '`valor_min` must not be greater than `valor_max`.' },
  )

export type HistoryQuery = z.infer<typeof historyQuerySchema>

/** Summary row used in the history listing. Items are loaded on demand (thermal receipt). */
export interface OrderHistoryItem {
  readonly id: string
  readonly short_id?: number | null
  readonly criado_em: string
  readonly entregue_em: string | null
  readonly status: OrderStatus
  readonly tipo_entrega: 'entrega' | 'retirada'
  readonly forma_pagamento: string
  readonly valor_total: number
  readonly cliente_id: string | null
  readonly cliente_nome: string | null
  readonly cliente_whatsapp: string | null
}

export interface OrderHistoryResponse {
  readonly data: readonly OrderHistoryItem[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

/** Minimal order shape consumed by the thermal receipt modal. */
export interface ReceiptOrderItem {
  readonly id: string
  readonly nome_produto_congelado: string | null
  readonly quantidade: number
  readonly subtotal: number | null
  readonly produtos: { readonly nome: string } | null
  readonly itens_pedido_opcoes?: readonly {
    readonly nome_congelado: string
    readonly preco_delta_congelado: number
    readonly valor_texto: string | null
    readonly arquivo_url: string | null
    readonly arquivo_nome_original: string | null
    /** Cliente optou por "Enviar depois" (migration 127) — só relevante quando `arquivo_url` ainda é `null`. */
    readonly deferred: boolean
  }[]
}

export interface ReceiptOrder {
  readonly id: string
  readonly short_id?: number | null
  readonly criado_em: string
  readonly status: OrderStatus
  readonly tipo_entrega: 'entrega' | 'retirada'
  readonly forma_pagamento: string
  readonly valor_subtotal: number | null
  readonly valor_total: number
  readonly valor_entrega: number | null
  readonly troco_para?: number | null
  readonly frete_gratis_aplicado: boolean | null
  readonly observacoes: string | null
  readonly clientes: { readonly nome: string | null; readonly telefone_whatsapp: string | null } | null
  readonly enderecos_cliente: {
    readonly rua: string | null
    readonly numero: string | null
    readonly bairro: string | null
  } | null
  readonly itens_pedido: readonly ReceiptOrderItem[]
}

/** Response from the archiving job (`/api/cron/arquivar-pedidos`). */
export interface ArchiveResponse {
  readonly ok: boolean
  readonly pedidos_finalizados: number
  readonly pedidos_antigos: number
  readonly total_arquivados: number
  readonly execution_time_ms: number
  readonly timestamp: string
}

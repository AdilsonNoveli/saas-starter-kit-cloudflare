/**
 * GET /api/admin/orders/historico — paginated server-side table of archived orders.
 *
 * Filters: period (presets or custom), status, customer (typeahead), value range.
 *
 * Design decisions:
 *  - `arquivado = true` is fixed (Kanban/History separation lives in the archiving job).
 *    This isolates the partial index `idx_pedidos_historico` (migration 001).
 *  - Period operates on `criado_em` by default (more useful than `entregue_em`
 *    since cancelled orders do not have `entregue_em`).
 *  - Returned fields are the visible subset in the list; thermal receipt loads
 *    items on demand to keep the listing lightweight.
 */

import { createError, getQuery } from 'h3'
import {
  historyQuerySchema,
  type HistoryPeriod,
  type OrderHistoryItem,
  type OrderHistoryResponse,
} from '~~/shared/types/order'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import { logger } from '~/core/services/logger.service'

interface CustomerJoin {
  readonly nome: string | null
  readonly telefone_whatsapp: string | null
}

interface OrderRow {
  readonly id: string
  readonly short_id?: number | null
  readonly criado_em: string
  readonly entregue_em: string | null
  readonly status: OrderHistoryItem['status']
  readonly tipo_entrega: OrderHistoryItem['tipo_entrega']
  readonly forma_pagamento: string
  readonly valor_total: number
  readonly cliente_id: string | null
  readonly clientes: CustomerJoin | null
}

/** Resolves the start of the time window from a preset or custom range. */
function getPeriodStart(period: HistoryPeriod, from?: string): string | null {
  if (period === 'custom') return from ?? null
  const now = Date.now()
  const days: Record<Exclude<HistoryPeriod, 'custom'>, number> = {
    hoje: 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }
  const hours = days[period] * 24
  return new Date(now - hours * 60 * 60 * 1000).toISOString()
}

/** Escapes `ilike` metacharacters to prevent injection. */
function escapeIlike(value: string): string {
  return value
    .replaceAll('\\', String.raw`\\`)
    .replaceAll('%', String.raw`\%`)
    .replaceAll('_', String.raw`\_`)
}

export default defineEventHandler(async (event): Promise<OrderHistoryResponse> => {
  // Service role bypassa RLS e este endpoint expõe PII de clientes: exige papel
  // staff explícito (o middleware só autentica; `entregador` não é staff).
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = historyQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid parameters',
      data: parsed.error.issues,
    })
  }

  const {
    period,
    from,
    to,
    status,
    cliente,
    valor_min,
    valor_max,
    page,
    pageSize,
  } = parsed.data

  // Histórico = complemento exato do Kanban.
  // Kanban mostra: arquivado=false AND criado_em >= KANBAN_DIAS_RETENCAO.
  // Histórico mostra: tudo fora disso — evita dead zone onde pedidos
  // arquivado=false mas fora da janela de 7d somem de ambas as views.
  const KANBAN_DIAS_RETENCAO = 7
  const kanbanCutoff = new Date(
    Date.now() - KANBAN_DIAS_RETENCAO * 24 * 60 * 60 * 1000,
  ).toISOString()

  let query = supabase
    .from('orders')
    .select(
      `
        id,
        short_id,
        criado_em:created_at,
        entregue_em:delivered_at,
        status,
        tipo_entrega:delivery_mode,
        forma_pagamento:payment_method,
        valor_total:total_amount,
        cliente_id:customer_id,
        clientes:customers(nome:name, telefone_whatsapp:whatsapp_phone)
      `,
      { count: 'exact' },
    )
    .or(`archived.eq.true,created_at.lt.${kanbanCutoff}`)

  const start = getPeriodStart(period, from)
  if (start) query = query.gte('created_at', start)
  if (period === 'custom' && to) query = query.lte('created_at', to)

  if (status) query = query.eq('status', status)

  if (typeof valor_min === 'number') query = query.gte('total_amount', valor_min)
  if (typeof valor_max === 'number') query = query.lte('total_amount', valor_max)

  if (cliente && cliente.length > 0) {
    const safe = escapeIlike(cliente)
    query = query.or(
      `name.ilike.%${safe}%,whatsapp_phone.ilike.%${safe}%`,
      { foreignTable: 'customers' },
    )
  }

  const offset = (page - 1) * pageSize
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    logger.error('[admin/orders/history] Erro ao buscar histórico', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch order history' })
  }

  const rows = (data ?? []) as unknown as OrderRow[]

  const items: OrderHistoryItem[] = rows.map((p) => ({
    id: p.id,
    short_id: p.short_id ?? null,
    criado_em: p.criado_em,
    entregue_em: p.entregue_em,
    status: p.status,
    tipo_entrega: p.tipo_entrega,
    forma_pagamento: p.forma_pagamento,
    valor_total: Number(p.valor_total ?? 0),
    cliente_id: p.cliente_id,
    cliente_nome: p.clientes?.nome ?? null,
    cliente_whatsapp: p.clientes?.telefone_whatsapp ?? null,
  }))

  return { data: items, total: count ?? 0, page, pageSize }
})

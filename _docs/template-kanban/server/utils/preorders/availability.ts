/**
 * Pre-Order System — server-side availability engine.
 *
 * Combina as regras puras (shared/utils/preorders) com o estado do banco:
 * config do produto, grade semanal da loja, datas bloqueadas e capacidade
 * consumida. É usado pelas rotas públicas (/api/preorders/*) e pela
 * pré-validação do checkout. A autoridade FINAL anti-overbooking é a RPC
 * `reserve_preorders` (migration 078) — aqui é UX/fail-fast.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type {
  AvailabilityResult,
  CalendarDay,
  CalendarDayStatus,
  PreorderCalendarResponse,
  PreorderConfig,
} from '#shared/types/preorder'
import type { StoreScheduleConfig } from '#shared/types/store'
import {
  addDays,
  isDayOpen,
  isWithinLeadWindow,
  spToday,
} from '#shared/utils/preorders'

/**
 * Carrega o produto e garante que ele aceita encomendas.
 * Retorna null para produto inexistente, indisponível ou não-encomendável.
 */
import { DEFAULT_PREORDER_CONFIG } from '#shared/types/preorder'

type ServiceClient = SupabaseClient<Database>

/** Produto encomendável carregado do banco (config validada como presente). */
export interface PreorderProduct {
  readonly id: string
  readonly config: PreorderConfig
  /**
   * Capacidade diária (migration 113 — fonte única com Gestão de Estoque):
   * `produtos.producao_diaria_limite`, não mais `preorder_config.daily_capacity`.
   * `0` quando não configurada — `resolveDayStatus` trata como esgotado, nunca
   * "sem limite" (a autoridade final continua sendo `reserve_preorders`, que
   * já rejeita capacidade NULL da mesma forma).
   */
  readonly dailyCapacity: number
  readonly unidade_medida: string
}

export async function loadPreorderProduct(
  supabase: ServiceClient,
  productId: string,
): Promise<PreorderProduct | null> {
  const { data } = await supabase
    .from('products')
    .select('id, product_type, preorder_config, daily_production_limit, unit, available')
    .eq('id', productId)
    .maybeSingle()

  if (!data || data.available === false || data.product_type !== 'preorder') {
    return null
  }

  const rawConfig = (data.preorder_config as unknown as Partial<PreorderConfig> | null) ?? {}

  const config: PreorderConfig = {
    scheduling_type: rawConfig.scheduling_type ?? DEFAULT_PREORDER_CONFIG.scheduling_type,
    min_quantity: Number(rawConfig.min_quantity ?? DEFAULT_PREORDER_CONFIG.min_quantity),
    max_quantity: Number(rawConfig.max_quantity ?? DEFAULT_PREORDER_CONFIG.max_quantity),
    min_lead_days: Number(rawConfig.min_lead_days ?? DEFAULT_PREORDER_CONFIG.min_lead_days),
    max_lead_days: Number(rawConfig.max_lead_days ?? DEFAULT_PREORDER_CONFIG.max_lead_days),
  }

  return {
    id: data.id,
    config,
    dailyCapacity: Number(data.daily_production_limit ?? 0),
    unidade_medida: (data.unit as string | null) ?? 'unidade',
  }
}

/** Grade semanal da loja (dias de entrega elegíveis seguem /admin/settings). */
async function loadStoreSchedule(
  supabase: ServiceClient,
): Promise<StoreScheduleConfig | null> {
  const { data } = await supabase
    .from('store')
    .select('hours_config')
    .limit(1)
    .maybeSingle()
  return (data?.hours_config as unknown as StoreScheduleConfig | null) ?? null
}

/** Datas bloqueadas (globais ou do produto) dentro do intervalo [from, to]. */
async function loadBlockedDates(
  supabase: ServiceClient,
  productId: string,
  from: string,
  to: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from('preorder_blocked_dates')
    .select('blocked_date, product_id')
    .gte('blocked_date', from)
    .lte('blocked_date', to)

  const blocked = new Set<string>()
  for (const row of data ?? []) {
    if (row.product_id === null || row.product_id === productId) {
      blocked.add(row.blocked_date)
    }
  }
  return blocked
}

/**
 * Capacidade consumida por dia no intervalo: SUM(quantity) das encomendas cujo
 * pedido NÃO está em coluna de kanban cancelada. O join é resolvido em TS
 * (duas queries simples) para evitar filtros aninhados frágeis do PostgREST.
 */
async function loadConsumedByDate(
  supabase: ServiceClient,
  productId: string,
  from: string,
  to: string,
): Promise<Map<string, number>> {
  const [{ data: rows }, { data: cols }] = await Promise.all([
    supabase
      .from('preorders')
      .select('delivery_date, quantity, orders(status)')
      .eq('product_id', productId)
      .gte('delivery_date', from)
      .lte('delivery_date', to),
    supabase.from('kanban_column').select('key, is_cancelled'),
  ])

  const cancelled = new Set(
    (cols ?? []).filter((c) => c.is_cancelled).map((c) => c.key),
  )

  const consumed = new Map<string, number>()
  for (const row of rows ?? []) {
    const status = (row.orders as { status: string | null } | null)?.status
    if (status && cancelled.has(status)) continue
    consumed.set(
      row.delivery_date,
      (consumed.get(row.delivery_date) ?? 0) + Number(row.quantity),
    )
  }
  return consumed
}

/** Status de um único dia a partir do contexto já carregado (função pura). */
function resolveDayStatus(params: {
  date: string
  today: string
  config: PreorderConfig
  /** Capacidade diária — migration 113: lida de produtos.producao_diaria_limite, não mais de preorder_config. */
  dailyCapacity: number
  schedule: StoreScheduleConfig | null
  blocked: Set<string>
  consumed: Map<string, number>
}): CalendarDay {
  const { date, today, config, dailyCapacity, schedule, blocked, consumed } = params
  const remaining = Math.max(0, dailyCapacity - (consumed.get(date) ?? 0))

  let status: CalendarDayStatus
  if (!isWithinLeadWindow(config, date, today)) {
    status = 'out_of_lead_window'
  } else if (!isDayOpen(schedule, date)) {
    status = 'closed'
  } else if (blocked.has(date)) {
    status = 'blocked'
  } else if (remaining <= 0) {
    status = 'full'
  } else {
    status = 'available'
  }

  return { date, status, remaining_capacity: status === 'available' ? remaining : 0 }
}

/**
 * Disponibilidade de um produto numa data (rota /api/preorders/availability e
 * pré-validação do checkout). `quantity` opcional refina o resultado: o dia
 * pode ter vagas, mas não as suficientes para a quantidade pedida.
 */
export async function getAvailability(
  supabase: ServiceClient,
  product: PreorderProduct,
  date: string,
  quantity?: number,
): Promise<AvailabilityResult> {
  const today = spToday()
  const [schedule, blocked, consumed] = await Promise.all([
    loadStoreSchedule(supabase),
    loadBlockedDates(supabase, product.id, date, date),
    loadConsumedByDate(supabase, product.id, date, date),
  ])

  const day = resolveDayStatus({ date, today, config: product.config, dailyCapacity: product.dailyCapacity, schedule, blocked, consumed })
  const enough = quantity === undefined || day.remaining_capacity >= quantity

  return {
    available: day.status === 'available' && enough,
    remaining_capacity: day.remaining_capacity,
  }
}

/**
 * Calendário de um mês (YYYY-MM) para o PreorderDatePicker: cada dia com o
 * motivo de indisponibilidade (closed/blocked/full/out_of_lead_window).
 */
export async function buildCalendar(
  supabase: ServiceClient,
  product: PreorderProduct,
  month: string,
): Promise<PreorderCalendarResponse> {
  const today = spToday()
  const first = `${month}-01`
  // Último dia do mês: dia 0 do mês seguinte (aritmética UTC — sem shift de fuso).
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10)

  const [schedule, blocked, consumed] = await Promise.all([
    loadStoreSchedule(supabase),
    loadBlockedDates(supabase, product.id, first, lastDay),
    loadConsumedByDate(supabase, product.id, first, lastDay),
  ])

  const days: CalendarDay[] = []
  for (let date = first; date <= lastDay; date = addDays(date, 1)) {
    days.push(
      resolveDayStatus({ date, today, config: product.config, dailyCapacity: product.dailyCapacity, schedule, blocked, consumed }),
    )
  }

  return { month, days }
}

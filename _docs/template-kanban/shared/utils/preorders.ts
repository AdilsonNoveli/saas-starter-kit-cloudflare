/**
 * Pre-Order System — pure business rules, shared by client (instant feedback)
 * and server (authoritative validation in server/utils/preorders + RPC).
 *
 * All date math is done on calendar dates (YYYY-MM-DD) in the operation
 * timezone (America/Sao_Paulo, fixed UTC-3 — see shared/utils/datetime.ts).
 * Never construct `new Date('YYYY-MM-DD')` for display logic: that parses as
 * UTC midnight and shifts the day in SP.
 */

import type { PreorderConfig } from '#shared/types/preorder'
import type { StoreScheduleConfig } from '#shared/types/store'

const SP_TIMEZONE = 'America/Sao_Paulo'
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Today's calendar date (YYYY-MM-DD) in the operation timezone. */
export function spToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: SP_TIMEZONE })
}

/** True when `value` is a well-formed YYYY-MM-DD calendar date. */
export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const probe = new Date(Date.UTC(y!, m! - 1, d!))
  return probe.getUTCMonth() === m! - 1 && probe.getUTCDate() === d
}

/** Adds `days` to a calendar date, returning YYYY-MM-DD (UTC-safe arithmetic). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d! + days))
  return date.toISOString().slice(0, 10)
}

/** Day of week (0=Sunday .. 6=Saturday) of a calendar date. */
export function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()
}

/**
 * Monday (ISO week start) of the week containing `isoDate`. The agenda shows a
 * full Seg→Dom week, so the anchor is always the Monday. `dayOfWeek` is
 * 0=Sun..6=Sat, hence the +6 shift to make Monday the origin.
 */
export function weekStartMonday(isoDate: string): string {
  return addDays(isoDate, -((dayOfWeek(isoDate) + 6) % 7))
}

/** Parses "HH:MM" to a fractional hour (e.g. "08:30" → 8.5). Null if malformed. */
function parseHour(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h + m / 60
}

/** Intervalo de horas (inteiras) exibido pela agenda: menor abertura → maior fechamento. */
export interface AgendaHourRange {
  readonly startHour: number
  readonly endHour: number
}

const DEFAULT_AGENDA_HOURS: AgendaHourRange = { startHour: 8, endHour: 18 }

/**
 * Deriva o intervalo de horas da agenda a partir da grade semanal da loja
 * (loja.config_horarios): a barra lateral de horas cobre da menor abertura à
 * maior fechamento entre os dias abertos. Fallback 08h–18h quando a grade não
 * está configurada. Sempre retorna um intervalo válido (start < end, inteiros).
 */
export function deriveAgendaHours(schedule: StoreScheduleConfig | null | undefined): AgendaHourRange {
  if (!schedule) return DEFAULT_AGENDA_HOURS

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const key of ['0', '1', '2', '3', '4', '5', '6'] as const) {
    const dia = schedule[key]
    if (!dia?.aberto) continue
    const start = parseHour(dia.inicio)
    const end = parseHour(dia.fim)
    if (start !== null) min = Math.min(min, start)
    if (end !== null) max = Math.max(max, end)
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return DEFAULT_AGENDA_HOURS
  }
  return { startHour: Math.floor(min), endHour: Math.ceil(max) }
}

/**
 * True when the store operates on that calendar date's weekday, per the weekly
 * schedule configured in /admin/settings (loja.config_horarios). Preorders can
 * only be delivered on open days. A missing schedule means "always open".
 */
export function isDayOpen(schedule: StoreScheduleConfig | null | undefined, isoDate: string): boolean {
  if (!schedule) return true
  const key = String(dayOfWeek(isoDate)) as keyof StoreScheduleConfig
  return schedule[key]?.aberto === true
}

/** True when the date falls inside the lead-time window [today+min, today+max]. */
export function isWithinLeadWindow(config: PreorderConfig, isoDate: string, today: string = spToday()): boolean {
  return (
    isoDate >= addDays(today, config.min_lead_days) &&
    isoDate <= addDays(today, config.max_lead_days)
  )
}

/** Validates the ordered quantity against min/max. Returns an error message or null. */
export function validateQuantity(config: PreorderConfig, quantity: number): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Informe uma quantidade válida.'
  if (quantity < config.min_quantity) return `Quantidade mínima: ${config.min_quantity}.`
  if (quantity > config.max_quantity) return `Quantidade máxima: ${config.max_quantity}.`
  return null
}

/** Formats a calendar date for display (DD/MM/YYYY) without timezone shifting. */
export function formatDeliveryDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Shared archiving logic for orders.
 * Used by the admin manual endpoint and the Nitro scheduled task (CF Cron Trigger).
 * Reads archiving rules from store.orders_config (JSONB) with safe fallback.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { PedidosConfig } from '#shared/types/store'

const DEFAULT_CONFIG: PedidosConfig = {
  regras_arquivamento: [
    { status: 'entregue', horas: 6 },
    { status: 'cancelado', horas: 6 },
  ],
  horas_fallback: 48,
}

async function loadPedidosConfig(supabase: SupabaseClient<Database>): Promise<PedidosConfig> {
  const { data } = await supabase
    .from('store')
    .select('orders_config')
    .limit(1)
    .maybeSingle()
  const raw = data?.orders_config as PedidosConfig | null
  if (!raw || !Array.isArray(raw.regras_arquivamento) || typeof raw.horas_fallback !== 'number') {
    return DEFAULT_CONFIG
  }
  return raw
}

export interface ArchiveBulkResult {
  readonly finalizados: number
  readonly antigos: number
  readonly total: number
}

/** Archives all eligible orders based on rules in store.orders_config. */
export async function archiveEligibleOrders(supabase: SupabaseClient<Database>): Promise<ArchiveBulkResult> {
  const cfg = await loadPedidosConfig(supabase)
  const now = new Date()
  const archivedAt = now.toISOString()

  let finalizados = 0
  for (const rule of cfg.regras_arquivamento) {
    const cutoff = new Date(now.getTime() - rule.horas * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('orders')
      .update({ archived: true, archived_at: archivedAt })
      .eq('archived', false)
      .eq('status', rule.status)
      .lt('updated_at', cutoff)
      .select('id')
    if (error) {
      logger.error('archiveEligibleOrders: rule error', { status: rule.status, message: error.message })
    } else {
      finalizados += data?.length ?? 0
    }
  }

  const fallbackCutoff = new Date(now.getTime() - cfg.horas_fallback * 60 * 60 * 1000).toISOString()
  // Exclui status já cobertos pelas regras para evitar dupla contagem em caso de
  // falha parcial numa iteração anterior da mesma execução.
  const coveredStatuses = cfg.regras_arquivamento.map((r) => r.status).filter(Boolean)
  let fallbackQuery = supabase
    .from('orders')
    .update({ archived: true, archived_at: archivedAt })
    .eq('archived', false)
    .lt('created_at', fallbackCutoff)
  if (coveredStatuses.length > 0) {
    fallbackQuery = fallbackQuery.not('status', 'in', `(${coveredStatuses.join(',')})`)
  }
  const { data: oldRows, error: oldErr } = await fallbackQuery.select('id')

  if (oldErr) {
    logger.error('archiveEligibleOrders: fallback error', { message: oldErr.message })
  }
  const antigos = oldRows?.length ?? 0

  return { finalizados, antigos, total: finalizados + antigos }
}

/** Force-archives a single order regardless of status or time. */
export async function archiveSingleOrder(supabase: SupabaseClient<Database>, orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('archived', false)
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
}

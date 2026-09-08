/**
 * Shared archiving logic for orders.
 * Used by the admin manual endpoint, the cron HTTP endpoint, and the Nitro
 * scheduled task (CF Cron Triggers / Docker pg_cron fallback).
 * Reads archiving rules from loja.config_pedidos (JSONB) with safe fallback.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
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

async function loadPedidosConfig(supabase: SupabaseClient): Promise<PedidosConfig> {
  const { data } = await supabase
    .from('loja')
    .select('config_pedidos')
    .limit(1)
    .maybeSingle()
  const raw = data?.config_pedidos as PedidosConfig | null
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

/** Archives all eligible orders based on rules in loja.config_pedidos. */
export async function archiveEligibleOrders(supabase: SupabaseClient): Promise<ArchiveBulkResult> {
  const cfg = await loadPedidosConfig(supabase)
  const now = new Date()
  const archivedAt = now.toISOString()

  let finalizados = 0
  for (const rule of cfg.regras_arquivamento) {
    const cutoff = new Date(now.getTime() - rule.horas * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('pedidos')
      .update({ arquivado: true, arquivado_em: archivedAt })
      .eq('arquivado', false)
      .eq('status', rule.status)
      .lt('atualizado_em', cutoff)
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
    .from('pedidos')
    .update({ arquivado: true, arquivado_em: archivedAt })
    .eq('arquivado', false)
    .lt('criado_em', fallbackCutoff)
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
export async function archiveSingleOrder(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await supabase
    .from('pedidos')
    .update({ arquivado: true, arquivado_em: new Date().toISOString() })
    .eq('id', orderId)
    .eq('arquivado', false)
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
}

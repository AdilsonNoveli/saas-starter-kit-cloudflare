/**
 * POST /api/cron/archive-orders
 *
 * Order archiving cron job (Phase 5.2).
 * Auth: Bearer NUXT_WORKER_TOKEN (same pattern as the outbox worker).
 * Triggered by pg_cron or an external scheduler.
 *
 * Rules are read from loja.config_pedidos — no hardcoded constants.
 */

import { createError, getRequestHeader } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { logger } from '~/core/services/logger.service'
import { archiveEligibleOrders } from '../../utils/orders/archiveOrders'
import { safeCompare } from '../../utils/security/safeCompare'
import type { ArchiveResponse } from '#shared/types/order'

export default defineEventHandler(async (event): Promise<ArchiveResponse> => {
  const config = useRuntimeConfig()
  const expected = config.workerToken || ''
  const authHeader = getRequestHeader(event, 'authorization') || ''
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''

  if (!expected || !provided || !safeCompare(provided, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const startTime = Date.now()
  const result = await archiveEligibleOrders(serverSupabaseServiceRole(event))
  const execMs = Date.now() - startTime
  const timestamp = new Date().toISOString()

  logger.info('archive-orders POST: ok', { ...result, exec_ms: execMs })

  return {
    ok: true,
    pedidos_finalizados: result.finalizados,
    pedidos_antigos: result.antigos,
    total_arquivados: result.total,
    execution_time_ms: execMs,
    timestamp,
  }
})

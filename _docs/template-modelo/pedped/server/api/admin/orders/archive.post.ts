/**
 * POST /api/admin/orders/archive
 *
 * Manual archiving triggered by an authenticated admin.
 * Protected by middleware 3.admin-auth (user session) — no worker token needed.
 *
 * Body (optional):
 *  - { orderId: string } → force-archives that single order immediately
 *  - (empty)             → archives all eligible orders per loja.config_pedidos
 */

import { readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { archiveEligibleOrders, archiveSingleOrder } from '../../../utils/orders/archiveOrders'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

const bodySchema = z.object({
  orderId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  // Service role bypassa RLS: exige papel staff explícito (middleware só autentica).
  await requireRole(event, STAFF_ROLES)

  const body = await readBody(event).catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Parâmetros inválidos.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const startTime = Date.now()

  if (parsed.data.orderId) {
    await archiveSingleOrder(supabase, parsed.data.orderId)
    logger.info('archive manual: single', { id: parsed.data.orderId, ms: Date.now() - startTime })
    return { ok: true, finalizados: 1, antigos: 0, total: 1 }
  }

  const result = await archiveEligibleOrders(supabase)
  logger.info('archive manual: bulk', { ...result, ms: Date.now() - startTime })
  return { ok: true, ...result }
})

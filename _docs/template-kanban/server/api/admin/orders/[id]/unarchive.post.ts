/**
 * POST /api/admin/orders/:id/unarchive
 * Reverte o arquivamento de um pedido — devolve ao kanban (arquivado=false).
 */

import { createError } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  // Service role bypassa RLS: exige papel staff explícito (middleware só autentica).
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = paramsSchema.safeParse(event.context.params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'ID de pedido inválido.' })
  }
  const { error } = await supabase
    .from('orders')
    .update({ archived: false, archived_at: null })
    .eq('id', parsed.data.id)
    .eq('archived', true)

  if (error) {
    logger.error('unarchive: falha', { id: parsed.data.id, message: error.message })
    throw createError({ statusCode: 500, message: 'Falha ao desarquivar pedido.' })
  }

  logger.info('unarchive: ok', { id: parsed.data.id })
  return { ok: true }
})

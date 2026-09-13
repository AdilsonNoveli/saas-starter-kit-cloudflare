/**
 * Endpoint DELETE /api/admin/quick-responses/:id
 *
 * Exclui uma Resposta Rápida do Agente IA. Restrito a gerente+.
 */
import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { QUICK_RESPONSE_WRITE_ROLES } from '#shared/types/agentQuickResponse'
import { deleteQuickResponse } from '../../../utils/agent/quickResponseService'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event): Promise<{ success: true }> => {
  const { supabase } = await requireServiceRole(event, QUICK_RESPONSE_WRITE_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID da resposta rápida inválido.' })
  }
  const id = idRaw as string

  await deleteQuickResponse(supabase, id)
  return { success: true }
})

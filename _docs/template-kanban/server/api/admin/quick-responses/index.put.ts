/**
 * Endpoint PUT /api/admin/quick-responses
 *
 * Reordenação em lote (drag-and-drop na UI reindexa client-side e persiste
 * tudo de uma vez aqui) — distinto de `[id].put.ts`, que edita uma regra.
 * Restrito a gerente+ (`QUICK_RESPONSE_WRITE_ROLES`).
 */
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { QUICK_RESPONSE_WRITE_ROLES } from '#shared/types/agentQuickResponse'
import { reorderQuickResponses } from '../../../utils/agent/quickResponseService'

const bodySchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int(),
  })).min(1),
})

export default defineEventHandler(async (event): Promise<{ success: true }> => {
  const { supabase } = await requireServiceRole(event, QUICK_RESPONSE_WRITE_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.issues })
  }

  await reorderQuickResponses(supabase, parsed.data)
  return { success: true }
})

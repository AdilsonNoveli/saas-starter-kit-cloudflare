/**
 * Endpoint GET /api/admin/quick-responses/:id
 *
 * Uma Resposta Rápida do Agente IA — usado pela página de edição
 * (`app/pages/admin/settings/quick-responses/[id].vue`), que precisa
 * funcionar em deep-link direto, não só vindo da lista. Restrito a
 * STAFF_ROLES (leitura) — escrita é gerente+ (ver `[id].put.ts`).
 */
import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { AgentQuickResponse } from '#shared/types/agentQuickResponse'
import { getQuickResponse } from '../../../utils/agent/quickResponseService'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event): Promise<{ data: AgentQuickResponse }> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID da resposta rápida inválido.' })
  }
  const id = idRaw as string

  const data = await getQuickResponse(supabase, id)
  return { data }
})

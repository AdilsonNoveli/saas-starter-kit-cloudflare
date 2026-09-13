/**
 * Endpoint GET /api/admin/quick-responses
 *
 * Lista as Respostas Rápidas do Agente IA, ordenadas por `sortOrder`. Restrito
 * à equipe interna (STAFF_ROLES) — escrita é gerente+ (ver `index.post.ts`).
 * Lógica real em `server/utils/agent/quickResponseService.ts`.
 */
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { AgentQuickResponseListResponse } from '#shared/types/agentQuickResponse'
import { listQuickResponses } from '../../../utils/agent/quickResponseService'

export default defineEventHandler(async (event): Promise<AgentQuickResponseListResponse> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const data = await listQuickResponses(supabase)
  return { data }
})

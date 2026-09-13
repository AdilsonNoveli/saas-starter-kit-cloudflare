import { createError } from 'h3'
import { STAFF_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'

/** GET /api/admin/lab/runs — histórico de corridas do laboratório, mais recente primeiro. */
export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, STAFF_ROLES)

  const { data, error } = await admin
    .from('agent_test_run')
    .select('id, status, score, erro:error, iniciado_em:started_at, finalizado_em:finished_at')
    .order('started_at', { ascending: false })
    .limit(20)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar corridas do laboratório.' })
  }

  return { runs: data ?? [] }
})

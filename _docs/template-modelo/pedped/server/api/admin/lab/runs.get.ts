import { serverSupabaseServiceRole } from '#supabase/server'
import { createError } from 'h3'
import { STAFF_ROLES } from '#shared/types/user'
import type { Database } from '~/types/database.types'
import { requireRole } from '../../../utils/auth/requireRole'

/** GET /api/admin/lab/runs — histórico de corridas do laboratório, mais recente primeiro. */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)
  const admin = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await admin
    .from('agente_teste_run')
    .select('id, status, score, erro, iniciado_em, finalizado_em')
    .order('iniciado_em', { ascending: false })
    .limit(20)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar corridas do laboratório.' })
  }

  return { runs: data ?? [] }
})

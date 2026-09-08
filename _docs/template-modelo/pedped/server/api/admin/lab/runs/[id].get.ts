import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam } from 'h3'
import { STAFF_ROLES } from '#shared/types/user'
import type { Database } from '~/types/database.types'
import { requireRole } from '../../../../utils/auth/requireRole'

/**
 * GET /api/admin/lab/runs/[id] — detalhe de uma corrida: status/score da
 * `agente_teste_run` + achados por persona (`agente_avaliacao`,
 * `origem='laboratorio'`). Consumido pelo polling da UI (§8 fase 6 do PRD)
 * enquanto `status` é `running`, depois vira o relatório final.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id da corrida é obrigatório.' })
  }

  const admin = serverSupabaseServiceRole<Database>(event)

  const { data: run, error: runError } = await admin
    .from('agente_teste_run')
    .select('id, status, score, erro, iniciado_em, finalizado_em')
    .eq('id', id)
    .maybeSingle()

  if (runError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler a corrida do laboratório.' })
  }
  if (!run) {
    throw createError({ statusCode: 404, statusMessage: 'Corrida não encontrada.' })
  }

  const { data: avaliacoes, error: avError } = await admin
    .from('agente_avaliacao')
    .select('persona, status, veredicto, achados, tokens_avaliacao, avaliado_em')
    .eq('run_id', id)
    .order('avaliado_em', { ascending: true })

  if (avError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler as avaliações da corrida.' })
  }

  return { run, avaliacoes: avaliacoes ?? [] }
})

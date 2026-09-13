import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { STAFF_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../../utils/auth/requireRole'

const idSchema = z.string().uuid()

/**
 * GET /api/admin/lab/runs/[id] — detalhe de uma corrida: status/score da
 * `agente_teste_run` + achados por persona (`agente_avaliacao`,
 * `origem='laboratorio'`). Consumido pelo polling da UI (§8 fase 6 do PRD)
 * enquanto `status` é `running`, depois vira o relatório final.
 */
export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, STAFF_ROLES)
  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'id da corrida inválido.' })
  }
  const id = idRaw as string

  const { data: run, error: runError } = await admin
    .from('agent_test_run')
    .select('id, status, score, erro:error, iniciado_em:started_at, finalizado_em:finished_at')
    .eq('id', id)
    .maybeSingle()

  if (runError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler a corrida do laboratório.' })
  }
  if (!run) {
    throw createError({ statusCode: 404, statusMessage: 'Corrida não encontrada.' })
  }

  const { data: avaliacoes, error: avError } = await admin
    .from('agent_evaluation')
    .select('persona, status, veredicto:verdict, achados:findings, tokens_avaliacao:evaluation_tokens, avaliado_em:evaluated_at')
    .eq('run_id', id)
    .order('evaluated_at', { ascending: true })

  if (avError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler as avaliações da corrida.' })
  }

  return { run, avaliacoes: avaliacoes ?? [] }
})

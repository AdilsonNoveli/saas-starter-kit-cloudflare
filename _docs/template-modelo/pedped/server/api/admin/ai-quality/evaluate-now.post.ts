import OpenAI from 'openai'
import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { STAFF_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'
import { resolveEvaluatorConfig, runEvaluationCycle } from '../../../utils/agent/evaluateCycle'
import type { Database } from '~/types/database.types'
import { logger } from '~/core/services/logger.service'

/**
 * POST /api/admin/ai-quality/evaluate-now — roda um ciclo do avaliador
 * (`agent:evaluate`) sob demanda, sem esperar o próximo cron de 15 min
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md` §4.2/4.3
 * fase C3). Valor real: depois de mudar `agente_instrucoes_extra`, forçar uma
 * checagem imediata. Mesma lógica do cron (`server/utils/agent/evaluateCycle.ts`),
 * síncrono — o admin espera a resposta e recarrega o card de achados
 * recorrentes em seguida.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const admin = serverSupabaseServiceRole<Database>(event)

  const evaluatorConfig = await resolveEvaluatorConfig(admin)
  if (!evaluatorConfig) {
    throw createError({ statusCode: 400, statusMessage: 'Agente sem chave OpenAI configurada.' })
  }

  const openai = new OpenAI({ apiKey: evaluatorConfig.apiKey })
  const { avaliados, erros, total } = await runEvaluationCycle(admin, openai, evaluatorConfig)

  logger.info('[admin/ai-quality] ciclo sob demanda concluído', { avaliados, erros, total })

  return { avaliados, erros, total }
})

import { STAFF_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { OPENAI_ALL_BILLABLE_MODELS, estimateCostUsd } from '~~/shared/types/agent'

/**
 * GET /api/admin/dashboard/ai-usage — agregados de telemetria de custo/latência
 * (`agent_token_usage`) para os cards "Turnos do agente" / "Latência média" /
 * "Rounds médios" / "Custo estimado" / "Tokens consumidos" da aba Investimento IA.
 *
 * Rota de API, não client Supabase: `agent_token_usage` tem RLS habilitada
 * sem nenhuma policy de acesso — "exclusivo via service_role" (migration 087)
 * — o client autenticado do navegador lia zero linha sem erro e os 4 cards
 * ficavam travados em zero mesmo com conversas reais acontecendo. Mesma
 * correção já aplicada a `agent_evaluation`/`ai-quality.get.ts`.
 */
export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, STAFF_ROLES)

  const query = getQuery(event)
  const dateStart = typeof query.dateStart === 'string' ? query.dateStart : ''
  const dateEnd = typeof query.dateEnd === 'string' ? query.dateEnd : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) {
    throw createError({ statusCode: 400, statusMessage: 'Período inválido.' })
  }
  const { data, error } = await admin
    .from('agent_token_usage')
    .select('model, prompt_tokens, completion_tokens, latency_ms, rounds')
    .gte('created_at', `${dateStart}T00:00:00-03:00`)
    .lte('created_at', `${dateEnd}T23:59:59-03:00`)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler a telemetria de uso do agente.' })
  }

  const rows = data ?? []
  const totalPrompt = rows.reduce((s, r) => s + r.prompt_tokens, 0)
  const totalCompletion = rows.reduce((s, r) => s + r.completion_tokens, 0)
  const latencias = rows.map((r) => r.latency_ms).filter((v): v is number => v !== null)
  const rounds = rows.map((r) => r.rounds).filter((v): v is number => v !== null)
  // Catálogo completo (conversacional + mídia): `agent_token_usage.model`
  // também recebe `gpt-4o-mini-transcribe` (transcrição, §7.3) — usar só o
  // catálogo conversacional aqui fazia essas linhas contarem para `turnos`/
  // `promptTokens` mas custarem R$0,00 sempre, por falta de preço cadastrado.
  const custoUsd = rows.reduce((total, row) => {
    const custo = estimateCostUsd(row.prompt_tokens, row.completion_tokens, row.model, OPENAI_ALL_BILLABLE_MODELS)
    return total + (custo ?? 0)
  }, 0)

  return {
    turnos: rows.length,
    promptTokens: totalPrompt,
    completionTokens: totalCompletion,
    latenciaMediaMs: latencias.length > 0
      ? Math.round(latencias.reduce((s, v) => s + v, 0) / latencias.length)
      : 0,
    roundsMedio: rounds.length > 0
      ? Math.round((rounds.reduce((s, v) => s + v, 0) / rounds.length) * 10) / 10
      : 0,
    custoUsd,
  }
})

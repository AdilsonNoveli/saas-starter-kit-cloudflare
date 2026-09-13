import { STAFF_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { aggregateAchadosRecorrentes } from '../../../utils/dashboard/achadosRecorrentes'
import type { JudgeFinding } from '../../../utils/agent/conversationJudge'

/**
 * GET /api/admin/dashboard/ai-quality — agregados do avaliador unificado
 * (LLM-as-a-Judge por janela/conversa) para a aba Investimento IA do dashboard.
 *
 * Lê `agent_evaluation` (migration 105, substitui `agente_avaliacao_turnos` —
 * `_docs/implementar/prd-laboratorio-avaliacao-agente.md` §5.1/§8 fase 5),
 * `source = 'producao'` (a visão de laboratório é um relatório à parte, fase 6
 * do PRD). RLS idêntica à da tabela antiga: `deny_authenticated` explícito, o
 * client do navegador lê zero linha sem erro — a leitura tem que passar por
 * service role.
 *
 * Corrigido em 2026-08-04: os campos antigos `tarefaConcluida`/
 * `clienteFrustrado` (herdados do avaliador por par isolado, 4 campos fixos)
 * foram DESCARTADOS — mapeavam "% veredito verde" como se fosse "tarefa
 * concluída" e "% veredito vermelho" como se fosse "cliente frustrado", mas
 * o veredito mede CONFORMIDADE DO AGENTE às regras (alucinação, formato,
 * tom...), não conclusão de tarefa nem frustração do cliente — confirmado
 * com dado real: 8 vereditos vermelhos no dia, 10 achados de `alucinacao`,
 * ZERO achados de `tom` (a única categoria que de fato indicaria cliente
 * frustrado). O rótulo mentia sobre o que estava sendo medido. Agora expõe
 * o veredito honestamente: `percentualVerde`/`percentualAmarelo`/
 * `percentualVermelho`. `scoreQualidade` continua (nome já era honesto).
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
    .from('agent_evaluation')
    .select('verdict, findings')
    .eq('source', 'producao')
    .eq('status', 'done')
    .gte('evaluated_at', `${dateStart}T00:00:00-03:00`)
    .lte('evaluated_at', `${dateEnd}T23:59:59-03:00`)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler as avaliações de qualidade.' })
  }

  const rows = data ?? []
  const pct = (n: number): number => (rows.length > 0 ? Math.round((n / rows.length) * 100) : 0)
  const scoreDe = (v: string | null): number => (v === 'verde' ? 10 : v === 'amarelo' ? 5 : 0)

  // Achados recorrentes do agente (Iniciativa A do PRD de achados
  // recorrentes/insights) — top tipos por contagem, com exemplos de
  // evidência/sugestão prontos pra o card "o que fazer a respeito".
  const achadosRecorrentes = aggregateAchadosRecorrentes(
    rows.map((r) => ({ achados: r.findings as unknown as JudgeFinding[] | null })),
  )

  return {
    total: rows.length,
    percentualVerde: pct(rows.filter((r) => r.verdict === 'verde').length),
    percentualAmarelo: pct(rows.filter((r) => r.verdict === 'amarelo').length),
    percentualVermelho: pct(rows.filter((r) => r.verdict === 'vermelho').length),
    scoreQualidade: rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + scoreDe(r.verdict), 0) / rows.length) * 10) / 10
      : 0,
    achadosRecorrentes,
  }
})

/**
 * Agregação de achados categorizados do Judge (`agente_avaliacao.achados`)
 * em "achados recorrentes do agente" — Iniciativa A do PRD
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md` §1).
 *
 * Módulo puro (sem Supabase/H3) para poder ser testado sem mockar rede —
 * mesmo padrão dos outros agregadores em `server/utils/**`.
 *
 * Decisão de agrupamento (§1.2 do PRD): só por `tipo`, não por
 * `tipo + evidência` — poucas categorias, alto volume, evita fragmentar em
 * grupos de 1 por causa de variação textual da evidência.
 */
import type { JudgeFinding } from '../agent/conversationJudge'

export interface AchadoRecorrenteExemplo {
  readonly evidencia: string
  readonly sugestao?: string
}

export interface AchadoRecorrente {
  readonly tipo: string
  readonly total: number
  readonly exemplos: readonly AchadoRecorrenteExemplo[]
}

interface AchadosRow {
  readonly achados: readonly JudgeFinding[] | null
}

const MAX_TIPOS_PADRAO = 8
const MAX_EXEMPLOS_PADRAO = 3

/**
 * Agrupa achados por `tipo`, ordena por contagem desc e limita exemplos por
 * tipo — evidência pode conter trecho literal de conversa de cliente,
 * mostrar todas viraria parede de texto sem ganho (§1.2 do PRD).
 */
export function aggregateAchadosRecorrentes(
  rows: readonly AchadosRow[],
  opts?: { maxTipos?: number, maxExemplos?: number },
): AchadoRecorrente[] {
  const maxTipos = opts?.maxTipos ?? MAX_TIPOS_PADRAO
  const maxExemplos = opts?.maxExemplos ?? MAX_EXEMPLOS_PADRAO

  const porTipo = new Map<string, { total: number, exemplos: AchadoRecorrenteExemplo[] }>()
  for (const row of rows) {
    for (const achado of row.achados ?? []) {
      const entry = porTipo.get(achado.tipo) ?? { total: 0, exemplos: [] }
      entry.total += 1
      if (entry.exemplos.length < maxExemplos) {
        entry.exemplos.push({ evidencia: achado.evidencia, sugestao: achado.sugestao })
      }
      porTipo.set(achado.tipo, entry)
    }
  }

  return Array.from(porTipo.entries())
    .map(([tipo, { total, exemplos }]) => ({ tipo, total, exemplos }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maxTipos)
}

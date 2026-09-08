/**
 * Estoque mínimo — Gestão de Estoque (migration 111), alerta de 3 camadas
 * mesmo padrão de `margemAltaVendaBaixa.ts`/`achadosRecorrentes.ts`. Responde
 * "o que está prestes a faltar" — produto (`controle_estoque='contagem'`) e
 * insumo compartilham a mesma regra: `estoque_atual <= estoque_minimo`.
 *
 * Módulo puro (sem Supabase/H3).
 */
export interface EstoqueRow {
  readonly id: string
  readonly nome: string
  readonly tipo: 'produto' | 'insumo'
  readonly estoqueAtual: number
  /** `null` = sem alerta configurado — nunca entra no resultado. */
  readonly estoqueMinimo: number | null
}

export interface EstoqueMinimoCandidato {
  readonly id: string
  readonly nome: string
  readonly tipo: 'produto' | 'insumo'
  readonly estoqueAtual: number
  readonly estoqueMinimo: number
}

const MAX_ITENS_PADRAO = 20

/**
 * Candidatos com `estoqueAtual <= estoqueMinimo`, mais urgentes primeiro
 * (menor saldo relativo ao mínimo, ou seja, mais negativo/próximo de zero).
 * Ignora linhas com `estoqueMinimo IS NULL` (sem alerta configurado).
 */
export function rankEstoqueMinimo(
  linhas: readonly EstoqueRow[],
  opts?: { maxItens?: number },
): EstoqueMinimoCandidato[] {
  const maxItens = opts?.maxItens ?? MAX_ITENS_PADRAO

  const candidatos: EstoqueMinimoCandidato[] = []
  for (const l of linhas) {
    if (l.estoqueMinimo === null) continue
    if (l.estoqueAtual > l.estoqueMinimo) continue

    candidatos.push({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo,
      estoqueAtual: l.estoqueAtual,
      estoqueMinimo: l.estoqueMinimo,
    })
  }

  return candidatos
    .sort((a, b) => (a.estoqueAtual - a.estoqueMinimo) - (b.estoqueAtual - b.estoqueMinimo))
    .slice(0, maxItens)
}

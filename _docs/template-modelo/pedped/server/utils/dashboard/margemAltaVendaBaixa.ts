/**
 * Margem alta / venda baixa — Iniciativa B, Grupo 1, §2.2.2 do PRD
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md`).
 * Responde "quais produtos dão mais lucro por unidade mas aparecem pouco
 * nos pedidos" — decisão que informa é destacar no catálogo, sugerir ao
 * agente, ou rever preço/visibilidade.
 *
 * Módulo puro (sem Supabase/H3) — mesmo padrão de
 * `server/utils/dashboard/achadosRecorrentes.ts` e `afinidadeCesta.ts`.
 */
export interface ProdutoCatalogoRow {
  readonly produtoId: string
  readonly nome: string
  readonly precoCusto: number
  readonly precoVenda: number | null
  /** `produtos.margem_lucro` — percentual, ex.: 30 = markup de 30% sobre o custo. */
  readonly margemLucroPct: number
  readonly disponivel: boolean
}

export interface ProdutoCandidato {
  readonly produtoId: string
  readonly nome: string
  readonly precoVenda: number
  readonly margemLucroPct: number
  readonly lucroUnitario: number
  readonly quantidadeVendida: number
  readonly score: number
}

const MAX_ITENS_PADRAO = 10

/**
 * `score = margemLucroPct / (quantidadeVendida + 1)` — favorece margem alta
 * E venda baixa ao mesmo tempo; o `+1` evita divisão por zero e ainda deixa
 * "nunca vendido apesar da margem boa" no topo entre produtos de margem
 * parecida (é o caso mais acionável: zero venda mesmo sendo lucrativo).
 *
 * Exclui: produto indisponível (§2.2.2 do PRD — pausado é intencional, não
 * "esquecido"), margem `<= 0` (nada a destacar sem lucro), e
 * `precoVenda == null` (produto sem preço calculado ainda).
 */
export function rankMargemAltaVendaBaixa(
  produtos: readonly ProdutoCatalogoRow[],
  vendasPorProduto: ReadonlyMap<string, number>,
  opts?: { maxItens?: number },
): ProdutoCandidato[] {
  const maxItens = opts?.maxItens ?? MAX_ITENS_PADRAO

  const candidatos: ProdutoCandidato[] = []
  for (const p of produtos) {
    if (!p.disponivel) continue
    if (p.margemLucroPct <= 0) continue
    if (p.precoVenda === null) continue

    const quantidadeVendida = vendasPorProduto.get(p.produtoId) ?? 0
    const score = p.margemLucroPct / (quantidadeVendida + 1)
    candidatos.push({
      produtoId: p.produtoId,
      nome: p.nome,
      precoVenda: p.precoVenda,
      margemLucroPct: p.margemLucroPct,
      lucroUnitario: p.precoVenda - p.precoCusto,
      quantidadeVendida,
      score,
    })
  }

  return candidatos
    .sort((a, b) => b.score - a.score || b.margemLucroPct - a.margemLucroPct)
    .slice(0, maxItens)
}

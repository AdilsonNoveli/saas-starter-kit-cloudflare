/**
 * Afinidade de cesta — Iniciativa B, Grupo 1, §2.2.1 do PRD
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md`).
 * Responde "quais produtos aparecem juntos no mesmo pedido com mais
 * frequência do que o acaso explicaria" — decisão que informa é configurar
 * `produto_relacionados` com dado real em vez de achismo.
 *
 * Módulo puro (sem Supabase/H3) — mesmo padrão de
 * `server/utils/dashboard/achadosRecorrentes.ts`.
 *
 * **Lift, não contagem bruta**: `lift(A,B) = P(A∩B) / (P(A) × P(B))`. Sem
 * isso, os dois produtos mais vendidos da loja sempre pareceriam "andar
 * juntos" só porque ambos aparecem em quase todo pedido — lift > 1 significa
 * que aparecem juntos MAIS do que a popularidade individual de cada um já
 * explicaria; lift ≈ 1 é coincidência estatística, não afinidade real.
 */
export interface PedidoProdutoRow {
  readonly pedidoId: string
  readonly produtoId: string
}

export interface AfinidadePar {
  readonly produtoAId: string
  readonly produtoBId: string
  readonly coOcorrencias: number
  readonly lift: number
}

const MIN_CO_OCORRENCIAS_PADRAO = 2
const MAX_PARES_PADRAO = 20

/**
 * Agrupa itens por pedido (dedupe — mesmo produto duas vezes no mesmo
 * pedido conta como uma presença, não duas), conta pares co-ocorrentes e
 * calcula o lift de cada par. Pares com poucas co-ocorrências são
 * descartados (`minCoOcorrencias`) — com 1 só ocorrência o lift pode
 * disparar pra um valor artificialmente alto sem significar padrão real.
 */
export function aggregateAfinidadeCesta(
  rows: readonly PedidoProdutoRow[],
  opts?: { minCoOcorrencias?: number, maxPares?: number },
): AfinidadePar[] {
  const minCoOcorrencias = opts?.minCoOcorrencias ?? MIN_CO_OCORRENCIAS_PADRAO
  const maxPares = opts?.maxPares ?? MAX_PARES_PADRAO

  const produtosPorPedido = new Map<string, Set<string>>()
  for (const row of rows) {
    const set = produtosPorPedido.get(row.pedidoId) ?? new Set<string>()
    set.add(row.produtoId)
    produtosPorPedido.set(row.pedidoId, set)
  }

  const totalPedidos = produtosPorPedido.size
  if (totalPedidos === 0) return []

  const pedidosPorProduto = new Map<string, number>()
  const coOcorrencias = new Map<string, number>()

  for (const produtos of produtosPorPedido.values()) {
    const lista = Array.from(produtos).sort()
    for (const produtoId of lista) {
      pedidosPorProduto.set(produtoId, (pedidosPorProduto.get(produtoId) ?? 0) + 1)
    }
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const chave = `${lista[i]}|${lista[j]}`
        coOcorrencias.set(chave, (coOcorrencias.get(chave) ?? 0) + 1)
      }
    }
  }

  const pares: AfinidadePar[] = []
  for (const [chave, contagem] of coOcorrencias) {
    if (contagem < minCoOcorrencias) continue
    const [produtoAId, produtoBId] = chave.split('|') as [string, string]
    const countA = pedidosPorProduto.get(produtoAId) ?? 0
    const countB = pedidosPorProduto.get(produtoBId) ?? 0
    const lift = (contagem * totalPedidos) / (countA * countB)
    pares.push({ produtoAId, produtoBId, coOcorrencias: contagem, lift })
  }

  return pares
    .sort((a, b) => b.lift - a.lift || b.coOcorrencias - a.coOcorrencias)
    .slice(0, maxPares)
}

import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { CatalogProductsPageResponse } from '#shared/types/product'
import { mapCatalogPage, parseCatalogQuery } from '../../utils/catalog/catalogPage'
import { loadQuantidadeDisponivelPorProduto } from '../../utils/products/stockAvailability'

const PAGE_LIMIT_DEFAULT = 24
const PAGE_LIMIT_MAX = 100

export default defineEventHandler(async (event): Promise<CatalogProductsPageResponse> => {
  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)

  const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, Number(query.limit) || PAGE_LIMIT_DEFAULT))
  const categoryId =
    typeof query.category_id === 'string' && query.category_id ? query.category_id : null

  // Mesmo pivot do carregamento inicial + cursor keyset → ordem consistente.
  const { pivot, cursorRank, cursorId, wrapped } = parseCatalogQuery(query)

  const { data: rpcRows, error } = await supabase.rpc('catalog_products_page', {
    p_pivot: pivot,
    p_cursor_rank: cursorRank ?? undefined,
    p_cursor_id: cursorId ?? undefined,
    p_wrapped: wrapped,
    p_limit: limit,
    p_categoria: categoryId ?? undefined,
  })

  if (error) throw createError({ statusCode: 500, message: 'Erro ao buscar produtos' })

  const result = mapCatalogPage(rpcRows, limit)

  // Gestão de Estoque (migration 111): catalog_products_page não conhece
  // controle_estoque/producao_diaria_limite — anexado à parte, mesmo helper
  // compartilhado com o agente (searchProducts.ts) e com /api/catalog/search.
  // Service role: `produtos` não tem policy de SELECT pra `anon` (cliente do
  // catálogo) — com o client de `supabase` (RLS) isto devolvia 0 linhas em
  // silêncio e quantidade_disponivel caía sempre em null pra todo cliente.
  const quantidadeDisponivelPorId = await loadQuantidadeDisponivelPorProduto(
    serverSupabaseServiceRole(event),
    result.produtos.map((p) => p.id),
  )
  const produtosComEstoque = result.produtos.map((p) => ({
    ...p,
    quantidade_disponivel: quantidadeDisponivelPorId.get(p.id) ?? null,
  }))

  return { ...result, produtos: produtosComEstoque }
})

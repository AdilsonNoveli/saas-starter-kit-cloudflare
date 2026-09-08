import type { CatalogProductItem, CatalogCursor } from '#shared/types/product'
import type { PreorderConfig, ProductType } from '#shared/types/preorder'

/**
 * Mapeia o retorno da RPC `catalog_products_page` para o contrato do catálogo:
 * remove os campos internos de paginação (rank/wrapped) do payload enviado ao
 * cliente e deriva o próximo cursor a partir da ÚLTIMA linha.
 *
 * `hasMore` é derivado do keyset (página cheia ⇒ pode haver mais) — sem
 * `count(*)`, economizando compute/egress no Supabase.
 */

interface CatalogRpcRow {
  id: string
  categoria_id: string | null
  nome: string
  descricao: string | null
  foto_url: string | null
  imagens: string[]
  preco_venda: number | null
  preco_promocional: number | null
  unidade_medida: string | null
  permite_fracionamento: boolean
  estoque_atual: number | null
  disponivel: boolean
  criado_em: string
  tem_opcoes: boolean
  product_type: ProductType
  preorder_config: PreorderConfig | null
  rank_aleatorio: number
  wrapped: boolean
}

export interface CatalogPageResult {
  produtos: CatalogProductItem[]
  cursor: CatalogCursor | null
  hasMore: boolean
}

export function mapCatalogPage(data: unknown, limit: number): CatalogPageResult {
  const rows = (data ?? []) as CatalogRpcRow[]

  const produtos = rows.map((r) => ({
    id: r.id,
    categoria_id: r.categoria_id,
    nome: r.nome,
    descricao: r.descricao,
    foto_url: r.foto_url,
    imagens: r.imagens,
    preco_venda: r.preco_venda,
    preco_promocional: r.preco_promocional,
    unidade_medida: r.unidade_medida,
    permite_fracionamento: r.permite_fracionamento,
    estoque_atual: r.estoque_atual,
    disponivel: r.disponivel,
    criado_em: r.criado_em,
    tem_opcoes: r.tem_opcoes,
    product_type: r.product_type,
    preorder_config: r.preorder_config,
  })) as unknown as CatalogProductItem[]

  const last = rows.at(-1)
  const cursor: CatalogCursor | null = last
    ? { rank: last.rank_aleatorio, id: last.id, wrapped: last.wrapped }
    : null

  return { produtos, cursor, hasMore: rows.length === limit }
}

/** Lê e valida os parâmetros de cursor/pivot da query string. */
export function parseCatalogQuery(query: Record<string, unknown>): {
  pivot: number
  cursorRank: number | null
  cursorId: string | null
  wrapped: boolean
} {
  const rawPivot = Number(query.pivot)
  const pivot = Number.isFinite(rawPivot) ? Math.min(1, Math.max(0, rawPivot)) : Math.random()

  const rawRank = query.cursor_rank
  const cursorRank =
    typeof rawRank === 'string' && rawRank !== '' && Number.isFinite(Number(rawRank))
      ? Number(rawRank)
      : null
  const cursorId =
    typeof query.cursor_id === 'string' && query.cursor_id ? query.cursor_id : null
  const wrapped = query.wrapped === '1' || query.wrapped === 'true'

  return { pivot, cursorRank, cursorId, wrapped }
}

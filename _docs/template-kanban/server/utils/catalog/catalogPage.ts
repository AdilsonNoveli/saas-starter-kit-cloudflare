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

/**
 * Colunas devolvidas pela RPC `catalog_products_page` (schema EN pós-renomeação).
 * NÃO confundir com CatalogProductItem — esse é o contrato público PT-BR com o frontend.
 */
interface CatalogRpcRow {
  id: string
  category_id: string | null    // → categoria_id
  name: string                   // → nome
  description: string | null     // → descricao
  photo_url: string | null       // → foto_url
  images: string[]               // → imagens
  sale_price: number | null      // → preco_venda
  promo_price: number | null     // → preco_promocional
  unit: string | null            // → unidade_medida
  allows_fractional_sale: boolean  // → permite_fracionamento
  current_stock: number | null   // → estoque_atual
  available: boolean             // → disponivel
  created_at: string             // → criado_em
  tem_opcoes: boolean            // mantido PT-BR na RPC
  product_type: ProductType
  preorder_config: PreorderConfig | null
  number: number | null          // → numero (migration 128)
  sort_mode: 'random' | 'numeric' // modo efetivo usado nesta resposta (migration 128)
  random_rank: number            // → rank_aleatorio (cursor, não exposto)
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
    // Tradução EN (banco) → PT-BR (contrato frontend)
    id: r.id,
    categoria_id: r.category_id,
    nome: r.name,
    descricao: r.description,
    foto_url: r.photo_url,
    imagens: r.images ?? [],
    preco_venda: r.sale_price ?? 0,
    preco_promocional: r.promo_price ?? null,
    unidade_medida: r.unit ?? '',
    permite_fracionamento: r.allows_fractional_sale,
    estoque_atual: r.current_stock ?? null,
    disponivel: r.available,
    criado_em: r.created_at,
    sinonimos: [],          // não retornado pela RPC pública (apenas admin)
    tem_opcoes: r.tem_opcoes,
    product_type: r.product_type,
    preorder_config: r.preorder_config,
    numero: r.number,
  })) as unknown as CatalogProductItem[]

  const last = rows.at(-1)
  const cursor: CatalogCursor | null = last
    ? last.sort_mode === 'numeric'
      ? { mode: 'numeric', numero: last.number, id: last.id }
      : { mode: 'random', rank: last.random_rank, id: last.id, wrapped: last.wrapped }
    : null

  return { produtos, cursor, hasMore: rows.length === limit }
}


/** Lê e valida os parâmetros de cursor/pivot da query string. */
export function parseCatalogQuery(query: Record<string, unknown>): {
  pivot: number
  cursorRank: number | null
  cursorNumber: number | null
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
  const rawNumber = query.cursor_numero
  const cursorNumber =
    typeof rawNumber === 'string' && rawNumber !== '' && Number.isFinite(Number(rawNumber))
      ? Number(rawNumber)
      : null
  const cursorId =
    typeof query.cursor_id === 'string' && query.cursor_id ? query.cursor_id : null
  const wrapped = query.wrapped === '1' || query.wrapped === 'true'

  return { pivot, cursorRank, cursorNumber, cursorId, wrapped }
}

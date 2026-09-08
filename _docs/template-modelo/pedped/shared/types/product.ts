/**
 * Product-related shared contracts between client and server.
 * Typed against the real database schema (database.types.ts).
 */

import type { PreorderConfig, ProductType } from '#shared/types/preorder'

/** Base row from the `produtos` table. */
export interface ProductRow {
  id: string
  categoria_id: string | null
  nome: string
  descricao: string | null
  /** Capa do produto. Fonte única do thumbnail em cart, checkout, kits e pedidos. */
  foto_url: string | null
  /** Fotos EXTRAS (galeria além da capa). Máx. 4 → total de 5 imagens. */
  imagens: string[]
  preco_custo: number
  margem_lucro: number
  preco_venda: number
  /** Preço promocional definido manualmente. Quando presente, substitui preco_venda como preço vigente. */
  preco_promocional: number | null
  unidade_medida: string
  permite_fracionamento: boolean
  estoque_atual: number | null
  disponivel: boolean
  criado_em: string
  /** Variações e sinônimos coloquiais. Usados pelo índice GIN de busca fuzzy para a LLM. */
  sinonimos: string[]
  /** Modo de venda: estoque, encomenda ou ambos (migration 078). */
  product_type: ProductType
  /** Regras de encomenda. Obrigatório quando product_type !== 'stock'. */
  preorder_config: PreorderConfig | null
  /**
   * Unidades restantes AGORA (Gestão de Estoque, migration 111) — mesmo campo
   * de `IntegrationProduct.quantidade_disponivel` (agente), agora também no
   * catálogo web. `null`/ausente = sem controle de estoque configurado, sem
   * limite nenhum. OPCIONAL porque nem todo consumidor de `ProductRow` busca
   * este dado (ex.: PDV admin) — quem não busca trata como `null` (não bloqueia).
   */
  quantidade_disponivel?: number | null
}

/**
 * Retorna o preço efetivo do produto: preco_promocional quando ativo,
 * caso contrário preco_venda. Fonte única de verdade para cart, checkout e catálogo.
 */
export function getEffectivePrice(product: Pick<ProductRow, 'preco_venda' | 'preco_promocional'>): number {
  return product.preco_promocional ?? product.preco_venda
}

/** Número máximo de fotos por produto (capa + extras). */
export const MAX_PRODUCT_IMAGES = 5

/**
 * Galeria ordenada do produto: capa (`foto_url`) seguida das fotos extras (`imagens`).
 * Fonte única de verdade para card, modal e admin — evita duplicar a lógica de
 * composição capa+extras em cada consumidor (DRY). Remove entradas vazias.
 */
export function getProductGallery(
  product: Pick<ProductRow, 'foto_url' | 'imagens'>,
): string[] {
  return [product.foto_url, ...(product.imagens ?? [])].filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  )
}

/**
 * Product item returned by the admin endpoint with embedded category.
 * Reused by PDV, Kits and Promotions.
 *
 * `tem_opcoes`: computed via EXISTS on the server — `true` when the product
 * has at least one `produto_opcao_grupo`. Single source of truth; the client
 * does not query `produto_opcao_grupo` directly for this flag.
 */
export interface AdminProductListItem extends ProductRow {
  categorias: { id: string; nome: string } | null
  tem_opcoes: boolean
}

/** Sortable fields accepted by the admin products endpoint. */
export const ADMIN_PRODUCTS_ORDER_BY = ['nome', 'preco_venda', 'criado_em'] as const
export type AdminProductsOrderBy = (typeof ADMIN_PRODUCTS_ORDER_BY)[number]

export const ADMIN_PRODUCTS_ORDER = ['asc', 'desc'] as const
export type AdminProductsOrder = (typeof ADMIN_PRODUCTS_ORDER)[number]

/** Query params for `GET /api/admin/produtos`. All optional; defaults applied in handler. */
export interface AdminProductsQuery {
  q?: string
  categoria_id?: string
  disponivel?: boolean
  limit?: number
  offset?: number
  orderBy?: AdminProductsOrderBy
  order?: AdminProductsOrder
}

/**
 * Product item returned by the public catalogue endpoint `/api/products`.
 * Omits cost/margin fields that must never reach client browsers.
 * `tem_opcoes` is computed server-side via EXISTS on `produto_opcao_grupo`.
 */
export interface CatalogProductItem extends Omit<ProductRow, 'preco_custo' | 'margem_lucro'> {
  tem_opcoes: boolean
}

/** Paginated response from `GET /api/admin/produtos`. */
export interface AdminProductsResponse {
  data: AdminProductListItem[]
  total: number
  limit: number
  offset: number
}

/** Response from the public paginated catalog endpoint `/api/catalog/products-page`. */
/**
 * Cursor de paginação por keyset do catálogo (ordem aleatória escalável).
 *  - rank: valor de `rank_aleatorio` do último item retornado.
 *  - id: desempate (PK) → ordem total estrita.
 *  - wrapped: true = já passou do pivot para o segmento inicial (rank < pivot).
 */
export interface CatalogCursor {
  rank: number
  id: string
  wrapped: boolean
}

export interface CatalogProductsPageResponse {
  produtos: CatalogProductItem[]
  cursor: CatalogCursor | null
  hasMore: boolean
}

/**
 * Option group selection type (mirrors `tipo_opcao_grupo_enum`).
 *  - `single`:   exactly 1 item selected (radio behaviour).
 *  - `multiple`: multiple selectable items (checkbox with min/max).
 *  - `toggle`:   each item independently active/inactive.
 */
export type OptionGroupType = 'single' | 'multiple' | 'toggle'

/** Item within an option group (table `produto_opcao_item`). */
export interface OptionItem {
  readonly id: string
  readonly grupo_id: string
  readonly nome: string
  readonly preco_delta: number
  readonly selecionado_padrao: boolean
  readonly ativo: boolean
  readonly ordem: number
  readonly foto_url: string | null
}

/** Option group belonging to a product (table `produto_opcao_grupo`). */
export interface OptionGroup {
  readonly id: string
  readonly produto_id: string
  readonly nome: string
  readonly tipo: OptionGroupType
  readonly obrigatorio: boolean
  readonly min_selecoes: number
  readonly max_selecoes: number
  readonly ordem: number
  readonly produto_opcao_item: readonly OptionItem[]
}

/** Option selected by the operator in PDV (or by the customer in the catalogue). */
export interface SelectedOption {
  readonly opcao_item_id: string
  readonly nome_congelado: string
  readonly preco_delta_congelado: number
}

// Legacy aliases kept for backward compatibility while admin pages are migrated.
/** @deprecated Use `AdminProductListItem` */
export type AdminProdutoListItem = AdminProductListItem
/** @deprecated Use `OptionGroupType` */
export type TipoOpcaoGrupo = OptionGroupType
/** @deprecated Use `OptionGroup` */
export type OpcaoGrupo = OptionGroup
/** @deprecated Use `SelectedOption` */
export type OpcaoSelecionada = SelectedOption

/** Cart item in PDV. cart_key = `produto_id + sorted(opcao_ids).join(',')` */
export interface CartItemPdv {
  /** Uniqueness key in the cart (product + option combination + optional delivery date). */
  readonly cart_key: string
  readonly produto_id: string
  readonly nome: string
  readonly foto_url: string | null
  /** Base product price (preco_venda). */
  readonly preco_base: number
  readonly opcoes: readonly SelectedOption[]
  quantidade: number
  readonly delivery_date?: string | null
}

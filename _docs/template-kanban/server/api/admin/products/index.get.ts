import { serverSupabaseClient } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import {
  ADMIN_PRODUCTS_ORDER,
  ADMIN_PRODUCTS_ORDER_BY,
  type AdminProductsOrderBy,
  type AdminProductsResponse,
} from '~~/shared/types/product'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * Schema de validação dos query params.
 *
 * Limites:
 *  - `limit` máx. 100 para evitar payloads gigantes (PDV/Kits/Promoções
 *    consomem este endpoint com paginação real).
 *  - `q` truncado em 100 chars como defesa contra entradas absurdas.
 *
 * `disponivel` é tratado como string ("true"/"false") porque query strings
 * não carregam tipos — coerção explícita evita comparações ambíguas.
 */
const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoria_id: z.uuid().optional(),
  product_type: z.enum(['stock', 'preorder']).optional(),
  disponivel: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  orderBy: z.enum(ADMIN_PRODUCTS_ORDER_BY).default('criado_em'),
  order: z.enum(ADMIN_PRODUCTS_ORDER).default('desc'),
})

/**
 * `orderBy` é o nome PT-BR do query param público (`ADMIN_PRODUCTS_ORDER_BY`);
 * a coluna real do banco é a EN. Tradução aqui para não mudar o contrato da
 * URL que o admin já usa.
 */
const ORDER_COLUMN = {
  nome: 'name',
  preco_venda: 'sale_price',
  criado_em: 'created_at',
} as const satisfies Record<AdminProductsOrderBy, string>

/**
 * Forma interna do registro antes de mapear para `AdminProdutoListItem`.
 * O campo `produto_opcao_grupo` é usado só para derivar `tem_opcoes` e
 * depois descartado da resposta (DRY: um único ponto de cálculo).
 */
interface SearchAdminProductRow {
  id: string
  category_id: string | null
  name: string
  description: string | null
  photo_url: string | null
  images: string[] | null
  cost_price: number
  profit_margin: number
  sale_price: number
  promo_price: number | null
  unit: string | null
  allows_fractional_sale: boolean | null
  current_stock: number | null
  available: boolean | null
  created_at: string | null
  synonyms: string[] | null
  product_type: string | null
  preorder_config: unknown | null
  number: number | null
  categoria_nome: string | null
  tem_opcoes: boolean | null
  total_count: number | string | null
}

interface ProductRowRaw {
  id: string
  [key: string]: unknown
  categorias: { id: string; nome: string } | null
  produto_opcao_grupo: Array<{ id: string }>
}

export default defineEventHandler(async (event): Promise<AdminProductsResponse> => {
  await requireRole(event, STAFF_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parâmetros inválidos',
      data: parsed.error.issues,
    })
  }

  const { q, categoria_id, product_type, disponivel, limit, offset, orderBy, order } = parsed.data
  const supabase = await serverSupabaseClient(event)

  if (q && q.length > 0) {
    // Usa a RPC search_admin_products (migration 071) para busca Enterprise por Token-AND + word_similarity
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_admin_products', {
      p_term: q,
      p_category_id: categoria_id ?? undefined,
      p_available: disponivel ?? undefined,
      p_lim: limit,
      p_off: offset,
      p_product_type: product_type ?? undefined,
    })

    if (rpcError) {
      logger.error('[admin/products] Falha na RPC search_admin_products', { error: rpcError.message })
      throw createError({
        statusCode: 500,
        statusMessage: 'Falha ao buscar produtos no admin',
      })
    }

    const rpcRows = (rpcData ?? []) as unknown as SearchAdminProductRow[]
    const totalCount = rpcRows.length > 0 && rpcRows[0]?.total_count != null ? Number(rpcRows[0].total_count) : 0

    const mappedData = rpcRows.map((r) => ({
      id: r.id,
      categoria_id: r.category_id,
      nome: r.name,
      descricao: r.description,
      foto_url: r.photo_url,
      imagens: Array.isArray(r.images) ? r.images : [],
      preco_custo: Number(r.cost_price ?? 0),
      margem_lucro: Number(r.profit_margin ?? 0),
      preco_venda: Number(r.sale_price ?? 0),
      preco_promocional: r.promo_price != null ? Number(r.promo_price) : null,
      unidade_medida: r.unit ?? '',
      permite_fracionamento: Boolean(r.allows_fractional_sale),
      estoque_atual: r.current_stock != null ? Number(r.current_stock) : null,
      disponivel: Boolean(r.available),
      criado_em: r.created_at ?? '',
      sinonimos: Array.isArray(r.synonyms) ? r.synonyms : [],
      product_type: (r.product_type as 'stock' | 'preorder') ?? 'stock',
      preorder_config: (r.preorder_config as ProductRow['preorder_config']) ?? null,
      numero: r.number,
      categorias: r.category_id ? { id: r.category_id, nome: r.categoria_nome ?? '' } : null,
      tem_opcoes: Boolean(r.tem_opcoes),
    }))

    return {
      data: mappedData as AdminProductsResponse['data'],
      total: totalCount,
      limit,
      offset,
    }
  }

  // Path de listagem comum (sem termo q)
  let query = supabase
    .from('products')
    // Aliases PT-BR sobre as colunas EN: a resposta é tipada como
    // `AdminProductsResponse` (chaves PT-BR, `shared/types/product.ts`) e o
    // caminho de busca por `q` acima já monta esse mesmo formato à mão —
    // renomear só aqui deixaria o MESMO endpoint com dois contratos.
    .select(
      '*, categoria_id:category_id, nome:name, descricao:description, foto_url:photo_url, imagens:images, preco_custo:cost_price, margem_lucro:profit_margin, preco_venda:sale_price, preco_promocional:promo_price, unidade_medida:unit, permite_fracionamento:allows_fractional_sale, estoque_atual:current_stock, estoque_minimo:minimum_stock, controle_estoque:stock_control, producao_diaria_limite:daily_production_limit, disponivel:available, criado_em:created_at, sinonimos:synonyms, rank_aleatorio:random_rank, numero:number, categorias:categories(id, nome:name), produto_opcao_grupo:product_option_group(id)',
      { count: 'exact' },
    )

  if (categoria_id) {
    query = query.eq('category_id', categoria_id)
  }
  if (product_type) {
    query = query.eq('product_type', product_type)
  }
  if (typeof disponivel === 'boolean') {
    query = query.eq('available', disponivel)
  }

  const { data, error, count } = await query
    .order(ORDER_COLUMN[orderBy], { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('[admin/products] Falha ao listar produtos', { error: error.message })
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao listar produtos',
    })
  }

  const rows = (data ?? []) as unknown as ProductRowRaw[]
  const mappedData = rows.map(({ produto_opcao_grupo: grupos, ...rest }) => ({
    ...rest,
    tem_opcoes: Array.isArray(grupos) && grupos.length > 0,
  }))

  return {
    data: mappedData as AdminProductsResponse['data'],
    total: count ?? 0,
    limit,
    offset,
  }
})


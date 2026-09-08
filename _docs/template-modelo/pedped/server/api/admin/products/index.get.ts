import { serverSupabaseClient } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import {
  ADMIN_PRODUCTS_ORDER,
  ADMIN_PRODUCTS_ORDER_BY,
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
 * Forma interna do registro antes de mapear para `AdminProdutoListItem`.
 * O campo `produto_opcao_grupo` é usado só para derivar `tem_opcoes` e
 * depois descartado da resposta (DRY: um único ponto de cálculo).
 */
interface SearchAdminProductRow {
  id: string
  categoria_id: string | null
  nome: string
  descricao: string | null
  foto_url: string | null
  imagens: string[] | null
  preco_custo: number
  margem_lucro: number
  preco_venda: number
  preco_promocional: number | null
  unidade_medida: string | null
  permite_fracionamento: boolean | null
  estoque_atual: number | null
  disponivel: boolean | null
  criado_em: string | null
  sinonimos: string[] | null
  product_type: string | null
  preorder_config: unknown | null
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
      p_categoria_id: categoria_id ?? undefined,
      p_disponivel: disponivel ?? undefined,
      p_lim: limit,
      p_off: offset,
      p_product_type: product_type ?? undefined,
    })

    if (rpcError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Falha ao buscar produtos no admin',
        message: rpcError.message,
      })
    }

    const rpcRows = (rpcData ?? []) as unknown as SearchAdminProductRow[]
    const totalCount = rpcRows.length > 0 && rpcRows[0]?.total_count != null ? Number(rpcRows[0].total_count) : 0

    const mappedData = rpcRows.map((r) => ({
      id: r.id,
      categoria_id: r.categoria_id,
      nome: r.nome,
      descricao: r.descricao,
      foto_url: r.foto_url,
      imagens: Array.isArray(r.imagens) ? r.imagens : [],
      preco_custo: Number(r.preco_custo ?? 0),
      margem_lucro: Number(r.margem_lucro ?? 0),
      preco_venda: Number(r.preco_venda ?? 0),
      preco_promocional: r.preco_promocional != null ? Number(r.preco_promocional) : null,
      unidade_medida: r.unidade_medida ?? '',
      permite_fracionamento: Boolean(r.permite_fracionamento),
      estoque_atual: r.estoque_atual != null ? Number(r.estoque_atual) : null,
      disponivel: Boolean(r.disponivel),
      criado_em: r.criado_em ?? '',
      sinonimos: Array.isArray(r.sinonimos) ? r.sinonimos : [],
      product_type: (r.product_type as 'stock' | 'preorder') ?? 'stock',
      preorder_config: (r.preorder_config as ProductRow['preorder_config']) ?? null,
      categorias: r.categoria_id ? { id: r.categoria_id, nome: r.categoria_nome ?? '' } : null,
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
    .from('produtos')
    .select('*, categorias(id, nome), produto_opcao_grupo(id)', { count: 'exact' })

  if (categoria_id) {
    query = query.eq('categoria_id', categoria_id)
  }
  if (product_type) {
    query = query.eq('product_type', product_type)
  }
  if (typeof disponivel === 'boolean') {
    query = query.eq('disponivel', disponivel)
  }

  const { data, error, count } = await query
    .order(orderBy, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao listar produtos',
      message: error.message,
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


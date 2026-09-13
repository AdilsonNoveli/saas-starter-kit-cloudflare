import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import type { CatalogProductItem } from '#shared/types/product'
import { loadQuantidadeDisponivelPorProduto } from '../../utils/products/stockAvailability'

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoria_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

interface SearchProductRow {
  id: string
  category_id: string | null
  name: string
  description: string | null
  photo_url: string | null
  images: string[] | null
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
  categoria_nome: string | null
  tem_opcoes: boolean | null
}

export default defineEventHandler(async (event): Promise<CatalogProductItem[]> => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parâmetros inválidos',
      data: parsed.error.issues,
    })
  }

  const { q, categoria_id, limit } = parsed.data
  if (!q) return []

  const supabase = await serverSupabaseClient(event)

  const { data: rpcData, error: rpcError } = await supabase.rpc('search_admin_products', {
    p_term: q,
    p_category_id: categoria_id ?? undefined,
    p_available: true,
    p_lim: limit,
    p_off: 0,
  })

  if (rpcError) {
    logger.error('[catalog/search] Falha na RPC search_admin_products', { error: rpcError.message })
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao buscar produtos no catálogo',
    })
  }

  const rows = (rpcData ?? []) as unknown as SearchProductRow[]

  // Gestão de Estoque (migration 111): search_admin_products não conhece
  // controle_estoque/producao_diaria_limite — anexado via o mesmo helper
  // usado pelo agente (searchProducts.ts), nunca duplicado.
  // Service role: `produtos` só tem policy de SELECT para `authenticated` +
  // staff (private.is_staff()) — cliente do catálogo é `anon`, então o client
  // de `supabase` (RLS) devolveria 0 linhas em silêncio e quantidade_disponivel
  // cairia sempre em null. Só a leitura desta coluna computada (nunca preco_custo
  // nem outros campos internos) sai com privilégio elevado.
  const quantidadeDisponivelPorId = await loadQuantidadeDisponivelPorProduto(
    serverSupabaseServiceRole(event),
    rows.map((r) => r.id),
  )

  return rows.map((r) => ({
    id: r.id,
    categoria_id: r.category_id,
    nome: r.name,
    descricao: r.description,
    foto_url: r.photo_url,
    imagens: Array.isArray(r.images) ? r.images : [],
    preco_venda: Number(r.sale_price ?? 0),
    preco_promocional: r.promo_price != null ? Number(r.promo_price) : null,
    unidade_medida: r.unit ?? '',
    permite_fracionamento: Boolean(r.allows_fractional_sale),
    estoque_atual: r.current_stock != null ? Number(r.current_stock) : null,
    disponivel: Boolean(r.available),
    criado_em: r.created_at ?? '',
    sinonimos: Array.isArray(r.synonyms) ? r.synonyms : [],
    product_type: (r.product_type as 'stock' | 'preorder') ?? 'stock',
    preorder_config: (r.preorder_config as CatalogProductItem['preorder_config']) ?? null,
    tem_opcoes: Boolean(r.tem_opcoes),
    quantidade_disponivel: quantidadeDisponivelPorId.get(r.id) ?? null,
  }))
})

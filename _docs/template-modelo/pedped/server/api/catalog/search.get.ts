import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import type { CatalogProductItem } from '#shared/types/product'
import { loadQuantidadeDisponivelPorProduto } from '../../utils/products/stockAvailability'

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoria_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

interface SearchProductRow {
  id: string
  categoria_id: string | null
  nome: string
  descricao: string | null
  foto_url: string | null
  imagens: string[] | null
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
    p_categoria_id: categoria_id ?? undefined,
    p_disponivel: true,
    p_lim: limit,
    p_off: 0,
  })

  if (rpcError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao buscar produtos no catálogo',
      message: rpcError.message,
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
    categoria_id: r.categoria_id,
    nome: r.nome,
    descricao: r.descricao,
    foto_url: r.foto_url,
    imagens: Array.isArray(r.imagens) ? r.imagens : [],
    preco_venda: Number(r.preco_venda ?? 0),
    preco_promocional: r.preco_promocional != null ? Number(r.preco_promocional) : null,
    unidade_medida: r.unidade_medida ?? '',
    permite_fracionamento: Boolean(r.permite_fracionamento),
    estoque_atual: r.estoque_atual != null ? Number(r.estoque_atual) : null,
    disponivel: Boolean(r.disponivel),
    criado_em: r.criado_em ?? '',
    sinonimos: Array.isArray(r.sinonimos) ? r.sinonimos : [],
    product_type: (r.product_type as 'stock' | 'preorder') ?? 'stock',
    preorder_config: (r.preorder_config as CatalogProductItem['preorder_config']) ?? null,
    tem_opcoes: Boolean(r.tem_opcoes),
    quantidade_disponivel: quantidadeDisponivelPorId.get(r.id) ?? null,
  }))
})

import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import { mapCatalogPage, parseCatalogQuery } from '../utils/catalog/catalogPage'
import { loadQuantidadeDisponivelPorProduto } from '../utils/products/stockAvailability'

const PAGE_LIMIT_DEFAULT = 24
const PAGE_LIMIT_MAX = 100
const categoryIdSchema = z.string().uuid().optional()

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)

  const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, Number(query.limit) || PAGE_LIMIT_DEFAULT))
  const categoryIdParsed = categoryIdSchema.safeParse(
    typeof query.category_id === 'string' && query.category_id ? query.category_id : undefined,
  )
  if (!categoryIdParsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'category_id inválido.' })
  }
  const categoryId = categoryIdParsed.data ?? null
  // Pivot da ordem aleatória: o cliente (useProducts.ts) gera UM valor por
  // navegação via useState e manda aqui — o mesmo valor vale pra o render SSR
  // e pra hidratação, sem risco de mismatch. `parseCatalogQuery` (mesma usada
  // por /api/catalog/products-page) só sorteia um pivot novo aqui dentro se o
  // parâmetro vier ausente/inválido (chamada direta ao endpoint, sem o
  // composable — ex.: teste manual, integração externa).
  const { pivot } = parseCatalogQuery(query)

  // Página 1 via RPC keyset (cursor nulo) + metadados em paralelo.
  const [
    { data: rpcRows, error: prodError },
    { data: categorias, error: catError },
    { data: kits },
    { data: promocoes },
  ] = await Promise.all([
    // Página 1: sem cursor — a RPC usa o DEFAULT NULL (migration 083).
    supabase.rpc('catalog_products_page', {
      p_pivot: pivot,
      p_wrapped: false,
      p_limit: limit,
      p_category: categoryId ?? undefined,
    }),
    supabase
      .from('categories')
      .select('id, nome:name, descricao:description, icone_url:icon_url, ordem:sort_order, ativa:active, cor:color, principal:is_primary')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('kits')
      .select('id, nome:name, descricao:description, foto_url:photo_url, imagens:images, preco_fixo:fixed_price, disponivel:available, categoria_id:category_id, etiqueta:label, show_at_checkout, kit_itens:kit_items(quantidade:quantity, produtos:products(nome:name, preco_venda:sale_price))')
      .eq('available', true),
    supabase
      .from('promotions')
      .select(
        'id, nome:name, descricao:description, foto_url:photo_url, imagens:images, tipo:type, configuracao:config, ativa:active, data_inicio:start_date, data_fim:end_date, categoria_id:category_id, criado_em:created_at, posicao_exibicao:display_position, categorias_ids:category_ids, promocao_produtos:promotion_products(produto_id:product_id)',
      )
      .eq('active', true),
  ])

  if (catError) throw createError({ statusCode: 500, message: 'Erro ao buscar categorias' })
  if (prodError) throw createError({ statusCode: 500, message: 'Erro ao buscar produtos' })

  const { produtos, cursor, hasMore } = mapCatalogPage(rpcRows, limit)

  // Gestão de Estoque (migration 111): esta é a página 1 real do catálogo
  // (navegação normal, sem busca) — mesmo helper e mesmo motivo de service
  // role de /api/catalog/products-page (RLS de `produtos` não confiável pra
  // `anon` nesta query direta; ver comentário lá).
  const quantidadeDisponivelPorId = await loadQuantidadeDisponivelPorProduto(
    serverSupabaseServiceRole(event),
    produtos.map((p) => p.id),
  )
  const produtosComEstoque = produtos.map((p) => ({
    ...p,
    quantidade_disponivel: quantidadeDisponivelPorId.get(p.id) ?? null,
  }))

  return {
    categorias: categorias ?? [],
    kits: kits ?? [],
    promocoes: promocoes ?? [],
    produtos: produtosComEstoque,
    pivot,
    cursor,
    hasMore,
  }
})

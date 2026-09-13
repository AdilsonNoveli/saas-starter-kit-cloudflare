/**
 * Endpoint GET /api/catalog/products/:id
 *
 * Retorna os dados completos do produto para a página dedicada do catálogo:
 *  - Dados do produto (mapeados para contratos do catálogo, sem campos sensíveis de custo/margem).
 *  - Categoria vinculada.
 *  - Grupos de opções ativos com seus itens.
 *  - Regras de encomenda (quando preorder).
 *  - Estoque disponível em tempo real (via loadQuantidadeDisponivelPorProduto).
 *  - Produtos relacionados (via related_products com fallback para itens da mesma categoria).
 */
import { z } from 'zod'
import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { CatalogProductItem, OptionGroup } from '#shared/types/product'
import type { PreorderConfig, ProductType } from '#shared/types/preorder'
import type { CatalogPromocao } from '#shared/types/promotion'
import { loadQuantidadeDisponivelPorProduto } from '../../../utils/products/stockAvailability'

const idSchema = z.string().uuid()

export interface CatalogProductDetailResponse {
  produto: CatalogProductItem & {
    categoria?: {
      id: string
      nome: string
      descricao: string | null
      icone_url: string | null
      cor: string | null
    } | null
  }
  grupos: OptionGroup[]
  produtosRelacionados: CatalogProductItem[]
  /** 'explicit': relacionados cadastrados manualmente; 'category': fallback automático por categoria */
  relatedOrigin: 'explicit' | 'category'
  /** Promoções ativas elegíveis para este produto (tipo != 'destaque'). Vazio se nenhuma. */
  promocoes: CatalogPromocao[]
}

export default defineEventHandler(async (event): Promise<CatalogProductDetailResponse> => {
  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de produto inválido' })
  }
  const produtoId = idRaw as string

  // Service role para contornar restrições de RLS da tabela products para clientes anon do catálogo
  const supabase = serverSupabaseServiceRole(event)

  // 1. Busca do produto principal
  const { data: prodData, error: prodError } = await supabase
    .from('products')
    .select(`
      id,
      category_id,
      name,
      description,
      photo_url,
      images,
      sale_price,
      promo_price,
      unit,
      allows_fractional_sale,
      available,
      created_at,
      synonyms,
      product_type,
      preorder_config,
      number,
      categories (
        id,
        name,
        description,
        icon_url,
        color
      )
    `)
    .eq('id', produtoId)
    .maybeSingle()

  if (prodError || !prodData) {
    throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
  }

  // 2. Busca grupos de opções do produto
  const { data: gruposData } = await supabase
    .from('product_option_group')
    .select(`
      id, produto_id:product_id, nome:name, tipo:type, obrigatorio:required,
      min_selecoes:min_selections, max_selecoes:max_selections, ordem:sort_order,
      texto_max_caracteres:max_text_length, texto_placeholder:text_placeholder,
      arquivo_tipos_aceitos:accepted_file_types, arquivo_tamanho_maximo_mb:max_file_size_mb,
      produto_opcao_item:product_option_item(id, nome:name, preco_delta:price_delta, selecionado_padrao:default_selected, ativo:active, ordem:sort_order, grupo_id:group_id, foto_url:photo_url)
    `)
    .eq('product_id', produtoId)
    .order('sort_order', { ascending: true })
    .order('sort_order', { ascending: true, referencedTable: 'product_option_item' })

  const grupos: OptionGroup[] = ((gruposData ?? []) as unknown as OptionGroup[]).map((g) => ({
    ...g,
    produto_opcao_item: g.produto_opcao_item.filter((i) => i.ativo !== false),
  }))

  // 3. Busca produtos relacionados (tabela related_products + fallback mesma categoria)
  const { data: rels } = await supabase
    .from('related_products')
    .select('related_product_id')
    .eq('product_id', produtoId)
    .order('sort_order', { ascending: true })

  let relatedIds: string[] = (rels ?? []).map((r) => r.related_product_id)
  const relatedOrigin: 'explicit' | 'category' = relatedIds.length > 0 ? 'explicit' : 'category'

  // Fallback: se não houver relacionados manuais, busca até 4 produtos da mesma categoria
  if (relatedIds.length === 0 && prodData.category_id) {
    const { data: sameCatProds } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', prodData.category_id)
      .eq('available', true)
      .neq('id', produtoId)
      .limit(4)

    if (sameCatProds && sameCatProds.length > 0) {
      relatedIds = sameCatProds.map((p) => p.id)
    }
  }

  let produtosRelacionadosRaw: Array<{
    id: string
    category_id: string | null
    name: string
    description: string | null
    photo_url: string | null
    images: string[]
    sale_price: number
    promo_price: number | null
    unit: string
    allows_fractional_sale: boolean
    available: boolean
    created_at: string
    synonyms: string[]
    product_type: string
    preorder_config: unknown
    number: number | null
  }> = []

  if (relatedIds.length > 0) {
    const { data: relProds } = await supabase
      .from('products')
      .select(`
        id, category_id, name, description, photo_url, images,
        sale_price, promo_price, unit, allows_fractional_sale, available,
        created_at, synonyms, product_type, preorder_config, number
      `)
      .in('id', relatedIds)
      .eq('available', true)

    produtosRelacionadosRaw = (relProds ?? []) as unknown as typeof produtosRelacionadosRaw
  }

  // 4. Calcula estoque real do produto principal e dos relacionados
  const allProductIds = [produtoId, ...produtosRelacionadosRaw.map((p) => p.id)]
  const estoquePorId = await loadQuantidadeDisponivelPorProduto(supabase, allProductIds)

  // 4.1 Verifica opções para os produtos relacionados
  const relatedProductIds = produtosRelacionadosRaw.map((p) => p.id)
  const relatedOptionGroupSet = new Set<string>()
  if (relatedProductIds.length > 0) {
    const { data: relOptGroups } = await supabase
      .from('product_option_group')
      .select('product_id')
      .in('product_id', relatedProductIds)

    for (const item of relOptGroups ?? []) {
      if (item.product_id) relatedOptionGroupSet.add(item.product_id)
    }
  }

  // Mapeia categoria
  const cat = prodData.categories as { id: string; name: string; description: string | null; icon_url: string | null; color: string | null } | null
  const categoriaFormatada = cat
    ? {
        id: cat.id,
        nome: cat.name,
        descricao: cat.description,
        icone_url: cat.icon_url,
        cor: cat.color,
      }
    : null

  const produtoFormatado: CatalogProductItem & { categoria?: typeof categoriaFormatada } = {
    id: prodData.id,
    categoria_id: prodData.category_id,
    nome: prodData.name,
    descricao: prodData.description,
    foto_url: prodData.photo_url,
    imagens: Array.isArray(prodData.images) ? prodData.images : [],
    preco_venda: Number(prodData.sale_price || 0),
    preco_promocional: prodData.promo_price !== null ? Number(prodData.promo_price) : null,
    unidade_medida: prodData.unit || 'unidade',
    permite_fracionamento: prodData.allows_fractional_sale === true,
    estoque_atual: null,
    disponivel: prodData.available === true,
    criado_em: prodData.created_at || new Date().toISOString(),
    sinonimos: Array.isArray(prodData.synonyms) ? prodData.synonyms : [],
    product_type: (prodData.product_type as ProductType) || 'stock',
    preorder_config: (prodData.preorder_config as unknown as PreorderConfig | null) ?? null,
    quantidade_disponivel: estoquePorId.get(prodData.id) ?? null,
    numero: prodData.number ?? null,
    tem_opcoes: grupos.length > 0,
    categoria: categoriaFormatada,
  }

  const produtosRelacionadosFormatados: CatalogProductItem[] = produtosRelacionadosRaw.map((p) => ({
    id: p.id,
    categoria_id: p.category_id,
    nome: p.name,
    descricao: p.description,
    foto_url: p.photo_url,
    imagens: Array.isArray(p.images) ? p.images : [],
    preco_venda: Number(p.sale_price || 0),
    preco_promocional: p.promo_price !== null ? Number(p.promo_price) : null,
    unidade_medida: p.unit || 'unidade',
    permite_fracionamento: p.allows_fractional_sale === true,
    estoque_atual: null,
    disponivel: p.available === true,
    criado_em: p.created_at || new Date().toISOString(),
    sinonimos: Array.isArray(p.synonyms) ? p.synonyms : [],
    product_type: (p.product_type as ProductType) || 'stock',
    preorder_config: (p.preorder_config as unknown as PreorderConfig | null) ?? null,
    quantidade_disponivel: estoquePorId.get(p.id) ?? null,
    numero: p.number ?? null,
    tem_opcoes: relatedOptionGroupSet.has(p.id),
  }))

  // 5. Promoções ativas elegíveis para este produto
  //    Uma única query com JOIN embutido (evita N+1).
  //    Elegibilidade: sem promotion_products → aplica a todos; com → só se o produto estiver.
  //    'destaque' é excluído: é banner visual do catálogo, sem mecânica de desconto.
  const now = new Date().toISOString()
  const { data: promoData } = await supabase
    .from('promotions')
    .select(`
      id, name, description, photo_url, images, type, config,
      active, start_date, end_date, category_id, created_at,
      display_position, category_ids,
      promotion_products(product_id)
    `)
    .eq('active', true)
    .neq('type', 'destaque')
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)

  type PromoRow = {
    id: string
    name: string
    description: string | null
    photo_url: string | null
    images: string[] | null
    type: string
    config: unknown
    active: boolean
    start_date: string | null
    end_date: string | null
    category_id: string | null
    created_at: string
    display_position: string | null
    category_ids: string[] | null
    promotion_products: { product_id: string }[] | null
  }

  const promocoes: CatalogPromocao[] = ((promoData ?? []) as PromoRow[])
    .filter((promo) => {
      const productIds = (promo.promotion_products ?? []).map((p) => p.product_id)
      // Promoção sem restrição de produto → elegível para todos
      if (productIds.length === 0) return true
      // Promoção com lista restrita → só se este produto estiver na lista
      return productIds.includes(produtoId)
    })
    // Quando há mais de uma promoção elegível do mesmo tipo (ex.: uma
    // "genérica" da loja inteira + uma específica deste produto), o cliente
    // (ProductPagePromotions.vue) pega a PRIMEIRA de cada tipo via `.find()` —
    // sem esta ordenação, a escolha dependia da ordem não garantida da query.
    // Produto-específica (promotion_products não vazio) sempre vence a genérica.
    .sort((a, b) => {
      const aEspecifica = (a.promotion_products ?? []).length > 0 ? 0 : 1
      const bEspecifica = (b.promotion_products ?? []).length > 0 ? 0 : 1
      return aEspecifica - bEspecifica
    })
    .map((promo) => ({
      id: promo.id,
      nome: promo.name,
      descricao: promo.description,
      foto_url: promo.photo_url,
      imagens: Array.isArray(promo.images) ? promo.images : [],
      tipo: promo.type as CatalogPromocao['tipo'],
      configuracao: promo.config as CatalogPromocao['configuracao'],
      ativa: promo.active,
      data_inicio: promo.start_date,
      data_fim: promo.end_date,
      categoria_id: promo.category_id,
      criado_em: promo.created_at,
      posicao_exibicao: (promo.display_position ?? null) as CatalogPromocao['posicao_exibicao'],
      categorias_ids: promo.category_ids ?? null,
      promocao_produtos: (promo.promotion_products ?? []).map((p) => ({ produto_id: p.product_id })),
    }))

  return {
    produto: produtoFormatado,
    grupos,
    produtosRelacionados: produtosRelacionadosFormatados,
    relatedOrigin,
    promocoes,
  }
})

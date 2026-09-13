import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import type {
  IntegrationProduct,
  IntegrationProductsResponse,
  IntegrationRelatedProduct,
} from '#shared/types/integration'
import type { PreorderConfig, ProductType } from '#shared/types/preorder'
import { normalizeSearchTerm } from '../integration/normalize-search-term'
import { loadQuantidadeDisponivelPorProduto } from './stockAvailability'

/**
 * Consulta de catálogo compartilhada pela rota de integração (n8n/agente) —
 * extraída de `products.get.ts` (seção 6 da arquitetura do agente WhatsApp).
 *
 * ## Estratégia de busca (quando `q` está presente)
 * Chama a RPC `search_products` (migration 068) que usa pg_trgm + unaccent:
 *   1. Similaridade por trigramas (similarity >= 0.20) — tolera erros tipográficos.
 *   2. Fallback ILIKE — captura substrings não cobertos pelo threshold.
 *   Ordenação por relevância (similarity DESC).
 *
 * O input `q` passa antes pela pipeline `normalizeSearchTerm` (stop words PT-BR
 * + aliases de cardápio) antes de chegar ao banco.
 *
 * ## Sem `q` (listagem geral)
 * Mantém a query PostgREST original (sem alteração de comportamento).
 * Não usa a RPC — sem regressão para clientes que listam o catálogo completo.
 */
export interface SearchProductsParams {
  q?: string
  limit: number
  offset: number
  product_type?: ProductType
}

// ─── Tipo da linha retornada pela RPC search_products ────────────────────────
// Espelha os campos definidos em database.types.ts > Functions > search_products.
// Campos numéricos são nullable (preco_venda/preco_promocional) porque o PostgreSQL
// declara numeric como nullable por padrão até ser NOT NULL — mantido consistente
// com o tipo gerado para evitar discordância de tipos no futuro.
interface SearchProductRow {
  id: string
  name: string
  description: string | null
  sale_price: number | null
  promo_price: number | null
  unit: string | null
  categoria_nome: string | null
  tem_opcoes: boolean | null
}

// ─── Tipo da linha retornada pela query PostgREST (sem busca) ─────────────────
// Mantido idêntico ao original para o path de listagem geral.
interface ProductRow {
  id: string
  name: string
  description: string | null
  sale_price: number
  promo_price: number | null
  unit: string
  categories: { name: string } | null
}

// ─── Mapeamento: linha do banco → IntegrationProduct ─────────────────────────
// Funções de mapeamento separadas para cada path (RPC vs. PostgREST) porque
// a estrutura das linhas difere (categoria_nome vs. categorias.nome).
// A lógica de negócio (preco efetivo, em_promocao) é idêntica nos dois casos.

function getProductTypeLabel(type: ProductType): string {
  return type === 'preorder' ? 'Sob Encomenda' : 'Venda Direta'
}

function mapRpcRow(p: SearchProductRow): IntegrationProduct {
  const precoVenda = p.sale_price ?? 0
  const precoPromo = p.promo_price ?? null
  return {
    id: p.id,
    nome: p.name,
    descricao: p.description,
    preco_venda: precoVenda,
    preco: precoPromo ?? precoVenda,
    em_promocao: precoPromo != null && precoPromo < precoVenda,
    unidade_medida: p.unit ?? '',
    categoria: p.categoria_nome ?? null,
    product_type: 'stock',
    tipo_venda_label: getProductTypeLabel('stock'),
    tem_opcoes: p.tem_opcoes ?? false,
    quantidade_disponivel: null,
  }
}

// Path B (listagem geral) não tem `tem_opcoes` na query PostgREST — resolvido
// depois por `attachHasOptions`, mesmo padrão de `attachPreorderInfo`. `false`
// aqui é só o valor de partida antes do attach rodar.
function mapPostgrestRow(p: ProductRow): IntegrationProduct {
  return {
    id: p.id,
    nome: p.name,
    descricao: p.description,
    preco_venda: p.sale_price,
    preco: p.promo_price ?? p.sale_price,
    em_promocao: p.promo_price != null && p.promo_price < p.sale_price,
    unidade_medida: p.unit,
    categoria: p.categories?.name ?? null,
    product_type: 'stock',
    tipo_venda_label: getProductTypeLabel('stock'),
    tem_opcoes: false,
    quantidade_disponivel: null,
  }
}

/**
 * Anexa `product_type` + regras de encomenda aos produtos retornados. A RPC de
 * busca (search_products) e a listagem não expõem esses campos; uma única query
 * por ids os resolve para o agente saber quais produtos são encomenda e conduzir
 * o fluxo de agendamento. Produtos de estoque mantêm `product_type='stock'`.
 */
async function attachPreorderInfo(
  supabase: SupabaseClient<Database>,
  products: IntegrationProduct[],
): Promise<IntegrationProduct[]> {
  if (products.length === 0) return products

  const { data } = await supabase
    .from('products')
    .select('id, product_type, preorder_config')
    .in('id', products.map((p) => p.id))

  const byId = new Map((data ?? []).map((r) => [r.id as string, r]))

  return products.map((p) => {
    const row = byId.get(p.id)
    const productType = (row?.product_type as ProductType | undefined) ?? 'stock'
    const label = getProductTypeLabel(productType)

    if (productType !== 'preorder' || !row?.preorder_config) {
      return { ...p, product_type: productType, tipo_venda_label: label }
    }
    const cfg = row.preorder_config as unknown as PreorderConfig
    return {
      ...p,
      product_type: productType,
      tipo_venda_label: label,
      preorder: {
        min_quantity: cfg.min_quantity,
        max_quantity: cfg.max_quantity,
        min_lead_days: cfg.min_lead_days,
        max_lead_days: cfg.max_lead_days,
      },
    }
  })
}

/**
 * Anexa os produtos atrelados (venda casada) que o lojista configurou por
 * produto — no máximo 3, na ordem definida. Duas queries resolvem toda a página
 * (mesmo padrão de `catalog/related-products`): os vínculos e depois os produtos
 * atrelados DISPONÍVEIS. Produto sem atrelados fica sem o campo (o agente não
 * oferta nada — nunca inventa).
 */
async function attachRelatedProducts(
  supabase: SupabaseClient<Database>,
  products: IntegrationProduct[],
): Promise<IntegrationProduct[]> {
  if (products.length === 0) return products

  const { data: links } = await supabase
    .from('related_products')
    .select('product_id, related_product_id, sort_order')
    .in('product_id', products.map((p) => p.id))
    .order('sort_order', { ascending: true })

  if (!links || links.length === 0) return products

  const { data: relProducts } = await supabase
    .from('products')
    .select('id, name, sale_price, promo_price')
    .in('id', [...new Set(links.map((l) => l.related_product_id))])
    .eq('available', true)

  const relById = new Map<string, IntegrationRelatedProduct>(
    (relProducts ?? []).map((r) => [
      r.id,
      { id: r.id, nome: r.name, preco: r.promo_price ?? r.sale_price ?? 0 },
    ]),
  )

  // Agrupa por produto preservando a ordem; ignora atrelados indisponíveis; cap 3.
  const byProduct = new Map<string, IntegrationRelatedProduct[]>()
  for (const link of links) {
    const rel = relById.get(link.related_product_id)
    if (!rel) continue
    const list = byProduct.get(link.product_id) ?? []
    if (list.length < 3) list.push(rel)
    byProduct.set(link.product_id, list)
  }

  return products.map((p) => {
    const relacionados = byProduct.get(p.id)
    return relacionados && relacionados.length > 0 ? { ...p, relacionados } : p
  })
}

/**
 * Anexa `tem_opcoes` aos produtos da listagem geral (Path B) — mesmo padrão de
 * `attachPreorderInfo`/`attachRelatedProducts`: uma query por página de ids.
 * A RPC `search_products` (Path A, migration 110) já traz o campo direto, sem
 * precisar deste passo — só a listagem PostgREST original nunca teve como.
 */
async function attachHasOptions(
  supabase: SupabaseClient<Database>,
  products: IntegrationProduct[],
): Promise<IntegrationProduct[]> {
  if (products.length === 0) return products

  const { data } = await supabase
    .from('product_option_group')
    .select('product_id')
    .in('product_id', products.map((p) => p.id))

  const idsComOpcoes = new Set((data ?? []).map((r) => r.product_id as string))
  if (idsComOpcoes.size === 0) return products

  return products.map((p) => (idsComOpcoes.has(p.id) ? { ...p, tem_opcoes: true } : p))
}

/**
 * Anexa `quantidade_disponivel` (Gestão de Estoque, migration 111) — mesmo
 * padrão de `attachHasOptions`: uma query por página de ids, via o helper
 * compartilhado `loadQuantidadeDisponivelPorProduto` (mesma fonte usada pelo
 * catálogo web em `/api/catalog/*`). `null` (default dos map*Row acima)
 * permanece para produto sem linha em `produtos` OU sem controle de estoque
 * configurado (`controle_estoque='nenhum'`) — nunca um limite inventado
 * (REGRA 1, ver stockAvailability.ts).
 */
async function attachStockInfo(
  supabase: SupabaseClient<Database>,
  products: IntegrationProduct[],
): Promise<IntegrationProduct[]> {
  if (products.length === 0) return products

  const porProduto = await loadQuantidadeDisponivelPorProduto(supabase, products.map((p) => p.id))

  return products.map((p) => {
    if (!porProduto.has(p.id)) return p
    return { ...p, quantidade_disponivel: porProduto.get(p.id) ?? null }
  })
}

export async function searchProducts(
  supabase: SupabaseClient<Database>,
  params: SearchProductsParams,
): Promise<IntegrationProductsResponse> {
  const { q, limit, offset, product_type } = params

  // ─── Path A: Busca com termo (fuzzy via RPC) ────────────────────────────────
  // Ativado quando `q` está presente E resulta em string não-vazia após normalização.
  if (q && q.length > 0) {
    const normalizedTerm = normalizeSearchTerm(q)

    if (normalizedTerm) {
      logger.info('Integração: busca fuzzy de produtos', {
        q_original: q,
        q_normalizado: normalizedTerm,
        product_type: product_type ?? 'todos',
      })

      const { data: rpcRows, error } = await supabase.rpc('search_products', {
        p_term: normalizedTerm,
        p_lim: limit,
        p_off: offset,
      })

      if (error) {
        logger.error('Integração: falha na busca fuzzy de produtos', { error: error.message })
        throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar produtos' })
      }

      const rows = rpcRows ?? []
      let mapped = await attachPreorderInfo(supabase, rows.map(mapRpcRow))
      mapped = await attachRelatedProducts(supabase, mapped)
      mapped = await attachStockInfo(supabase, mapped)

      if (product_type) {
        mapped = mapped.filter((p) => p.product_type === product_type)
      }

      return {
        data: mapped,
        total: offset + mapped.length,
        limit,
        offset,
      }
    }
  }

  // ─── Path B: Listagem geral (sem termo) ──────────────────────────────────────
  let query = supabase
    .from('products')
    .select('id, name, description, sale_price, promo_price, unit, categories(name)', {
      count: 'exact',
    })
    .eq('available', true)

  if (product_type) {
    query = query.eq('product_type', product_type)
  }

  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('Integração: falha ao listar produtos', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar produtos' })
  }

  const rows = (data ?? []) as unknown as ProductRow[]
  const withPreorder = await attachPreorderInfo(supabase, rows.map(mapPostgrestRow))
  const withRelated = await attachRelatedProducts(supabase, withPreorder)
  const withOptions = await attachHasOptions(supabase, withRelated)
  const mapped = await attachStockInfo(supabase, withOptions)

  return { data: mapped, total: count ?? 0, limit, offset }
}

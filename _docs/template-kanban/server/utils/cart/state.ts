/**
 * Estado do carrinho server-side (fluxo agentivo).
 *
 * O carrinho vive em `cart_items` vinculado à sessão. Toda operação de
 * carrinho devolve o estado COMPLETO recalculado aqui: preço efetivo
 * (promocional ?? venda) lido do catálogo no momento da chamada e desconto
 * via motor de promoções — a MESMA regra do checkout do catálogo web.
 * O agente LLM nunca calcula nada.
 */

import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type {
  IntegrationCartItem,
  IntegrationCartState,
  IntegrationCheckoutState,
} from '#shared/types/integration'
import type { ProductRequirements } from '#shared/types/preorder'
import type { SelectedOption } from '#shared/types/product'
import { applyPromotions } from '../promotions/applyPromotions'
import { loadUploadArquivoRequirements } from '../products/uploadArquivoRequirements'
import { loadTextoLivreRequirements } from '../products/textoLivreRequirements'
import { resolveMissingFields } from './missingFields'

interface ActiveSession {
  readonly id: string
  readonly customer_id: string | null
  /**
   * Modalidade já gravada na sessão. Vem junto porque `updateCheckout` precisa
   * dela para saber se um endereço novo será usado para ENTREGA — e uma
   * consulta a mais por chamada de tool é latência que o turno paga.
   */
  readonly delivery_mode: string | null
}

/** Valida que a sessão existe e está ativa. 401 caso contrário. */
export async function requireActiveSession(
  supabase: SupabaseClient<Database>,
  sessaoId: string,
): Promise<ActiveSession> {
  const { data: sessao } = await supabase
    .from('sessions')
    .select('id, customer_id, status, expires_at, delivery_mode')
    .eq('id', sessaoId)
    .maybeSingle()

  const expired
    = sessao?.expires_at != null && new Date(sessao.expires_at).getTime() < Date.now()

  if (!sessao || !['ativa', 'convertida'].includes(sessao.status as string) || expired) {
    // O 401 daqui e o 422 de `setCartItem` chegavam ao cliente como a mesma
    // frase vaga do modelo ("aconteceu um problema"), sem nada no log dizendo
    // qual dos dois foi. Só identificadores e estado — nunca fala do cliente.
    logger.warn('[cart] sessão recusada', {
      sessao_id: sessaoId,
      existe: !!sessao,
      status: sessao?.status ?? null,
      expirada: expired,
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Sessão inválida ou expirada. Crie uma nova sessão.',
    })
  }

  return { id: sessao.id, customer_id: sessao.customer_id, delivery_mode: sessao.delivery_mode }
}

interface CartRow {
  id: string
  product_id: string
  quantity: number
  target_date: string | null
  note: string | null
  delivery_mode: string | null
  address_id: string | null
  products: {
    name: string
    sale_price: number
    promo_price: number | null
    available: boolean | null
    requirements: ProductRequirements
  } | null
}

interface CartItemOptionRow {
  cart_item_id: string
  option_item_id: string | null
  frozen_name: string
  frozen_price_delta: number
  text_value: string | null
  file_url: string | null
  original_file_name: string | null
  deferred: boolean
}

/**
 * Opções congeladas por linha do carrinho (migration 110) — uma query por
 * página de linhas, mesmo padrão de `attachRelatedProducts`/
 * `attachPreorderInfo` em `searchProducts.ts`. `opcao_item_id` pode ser `null`
 * (mesma nulabilidade de `itens_pedido_opcoes.opcao_item_id`) mas nunca chega
 * aqui assim na prática — `setCartItem.ts` sempre grava o id real.
 */
async function loadOptionsByCartItem(
  supabase: SupabaseClient<Database>,
  cartItemIds: readonly string[],
): Promise<Map<string, SelectedOption[]>> {
  const byCartItem = new Map<string, SelectedOption[]>()
  if (cartItemIds.length === 0) return byCartItem

  const { data } = await supabase
    .from('cart_item_options')
    .select('cart_item_id, option_item_id, frozen_name, frozen_price_delta, text_value, file_url, original_file_name, deferred')
    .in('cart_item_id', cartItemIds)

  for (const row of (data ?? []) as unknown as CartItemOptionRow[]) {
    if (!row.option_item_id) continue
    const lista = byCartItem.get(row.cart_item_id) ?? []
    lista.push({
      opcao_item_id: row.option_item_id,
      nome_congelado: row.frozen_name,
      preco_delta_congelado: Number(row.frozen_price_delta),
      valor_texto: row.text_value,
      arquivo_url: row.file_url,
      arquivo_nome_original: row.original_file_name,
      deferred: row.deferred,
    })
    byCartItem.set(row.cart_item_id, lista)
  }
  return byCartItem
}

/** Carrega o estado de checkout persistido na sessão (Feature 1.1/1.2). */
export async function getCheckoutState(
  supabase: SupabaseClient<Database>,
  sessaoId: string,
): Promise<IntegrationCheckoutState> {
  const { data: sessao, error } = await supabase
    .from('sessions')
    .select('delivery_mode, payment_method, address_id')
    .eq('id', sessaoId)
    .single()

  if (error || !sessao) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar o estado de checkout.' })
  }

  return {
    delivery_mode: sessao.delivery_mode as IntegrationCheckoutState['delivery_mode'],
    payment_method: sessao.payment_method as IntegrationCheckoutState['payment_method'],
    address_id: sessao.address_id,
  }
}

/** Carrega e recalcula o estado completo do carrinho da sessão. */
export async function getCartState(
  supabase: SupabaseClient<Database>,
  sessaoId: string,
): Promise<IntegrationCartState> {
  const [{ data, error }, checkout] = await Promise.all([
    supabase
      .from('cart_items')
      .select('id, product_id, quantity, target_date, note, delivery_mode, address_id, products (name, sale_price, promo_price, available, requirements)')
      .eq('session_id', sessaoId)
      .order('created_at', { ascending: true }),
    getCheckoutState(supabase, sessaoId),
  ])

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar o carrinho.' })
  }

  const rows = (data ?? []) as unknown as CartRow[]
  const produtoIds = [...new Set(rows.map((r) => r.product_id))]
  const [optionsByCartItem, uploadRequirementsByProduct, textoLivreRequirementsByProduct] = await Promise.all([
    loadOptionsByCartItem(supabase, rows.map((r) => r.id)),
    loadUploadArquivoRequirements(supabase, produtoIds),
    loadTextoLivreRequirements(supabase, produtoIds),
  ])

  const requirementsByProduct = new Map<string, ProductRequirements>(
    rows
      .filter((r) => r.products !== null)
      .map((r) => [r.product_id, r.products!.requirements]),
  )

  const itens: IntegrationCartItem[] = rows
    .filter((r) => r.products !== null)
    .map((r) => {
      const opcoes = optionsByCartItem.get(r.id) ?? []
      const deltaOpcoes = opcoes.reduce((acc, o) => acc + o.preco_delta_congelado, 0)
      // Preço EFETIVO do item já soma o delta das opções escolhidas (borda,
      // adicional...) — a REGRA 1 do prompt exige que todo preço citado venha
      // de tool, e este é o único ponto que calcula o total real da linha.
      const preco = (r.products!.promo_price ?? r.products!.sale_price) + deltaOpcoes
      const deliveryMode = r.delivery_mode as IntegrationCartItem['delivery_mode']
      return {
        id: r.id,
        produto_id: r.product_id,
        nome: r.products!.name,
        preco_unitario: Number(preco.toFixed(2)),
        quantidade: Number(r.quantity),
        subtotal: Number((preco * Number(r.quantity)).toFixed(2)),
        opcoes,
        target_date: r.target_date,
        observacao: r.note,
        delivery_mode: deliveryMode,
        address_id: r.address_id,
        // Resolução de nível (Feature 4.1): override do item, senão herda o checkout.
        fulfillment: {
          delivery_mode: deliveryMode ?? checkout.delivery_mode,
          address_id: r.address_id ?? checkout.address_id,
        },
      }
    })

  const subtotal = Number(itens.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2))

  const { descontoTotal, descricao, incentive } = await applyPromotions(
    supabase,
    itens.map((i) => ({
      produto_id: i.produto_id,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
    })),
  )

  return {
    sessao_id: sessaoId,
    itens,
    total_itens: itens.reduce((acc, i) => acc + i.quantidade, 0),
    subtotal,
    desconto: descontoTotal,
    desconto_descricao: descricao,
    total: Number((subtotal - descontoTotal).toFixed(2)),
    incentive,
    checkout,
    missing_fields: resolveMissingFields(itens, requirementsByProduct, checkout, uploadRequirementsByProduct, textoLivreRequirementsByProduct),
  }
}

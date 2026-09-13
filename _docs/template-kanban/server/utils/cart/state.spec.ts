import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { getCartState } from './state'

interface CartItemFixture {
  id: string
  product_id: string
  quantity: number
  target_date: string | null
  note: string | null
  delivery_mode: string | null
  address_id: string | null
  products: { name: string, sale_price: number, promo_price: number | null, available: boolean, requirements: Record<string, never> } | null
}

interface OptionFixture {
  cart_item_id: string
  option_item_id: string
  frozen_name: string
  frozen_price_delta: number
}

function buildSupabase(cartItems: CartItemFixture[], opcoes: OptionFixture[] = []) {
  function from(tabela: string): unknown {
    if (tabela === 'cart_items') {
      return { select: () => ({ eq: () => ({ order: async () => ({ data: cartItems, error: null }) }) }) }
    }
    if (tabela === 'cart_item_options') {
      return { select: () => ({ in: async () => ({ data: opcoes }) }) }
    }
    if (tabela === 'sessions') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { delivery_mode: null, payment_method: null, address_id: null } }),
          }),
        }),
      }
    }
    if (tabela === 'product_option_group') {
      return { select: () => ({ in: () => ({ eq: async () => ({ data: [], error: null }) }) }) }
    }
    if (tabela === 'promotions') {
      return { select: () => ({ eq: () => ({ or: () => ({ or: async () => ({ data: [], error: null }) }) }) }) }
    }
    return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }
  }
  return { from } as unknown as SupabaseClient<Database>
}

describe('getCartState — opções/variações somam ao preço efetivo (migration 110)', () => {
  it('item sem opção: preço/subtotal idênticos a antes da 110', async () => {
    const supabase = buildSupabase([
      { id: 'ci-1', product_id: 'p1', quantity: 2, target_date: null, note: null, delivery_mode: null, address_id: null, products: { name: 'Guaraná 2L', sale_price: 15, promo_price: null, available: true, requirements: {} } },
    ])

    const result = await getCartState(supabase, 'sessao-1')

    expect(result.itens).toEqual([expect.objectContaining({
      id: 'ci-1', produto_id: 'p1', preco_unitario: 15, quantidade: 2, subtotal: 30, opcoes: [],
    })])
  })

  it('item com opção: preço unitário soma o preco_delta_congelado, subtotal reflete a quantidade', async () => {
    const supabase = buildSupabase(
      [{ id: 'ci-1', product_id: 'p1', quantity: 2, target_date: null, note: null, delivery_mode: null, address_id: null, products: { name: 'Pizza Calabresa', sale_price: 45, promo_price: null, available: true, requirements: {} } }],
      [{ cart_item_id: 'ci-1', option_item_id: 'item-catupiry', frozen_name: 'Catupiry', frozen_price_delta: 8 }],
    )

    const result = await getCartState(supabase, 'sessao-1')

    expect(result.itens[0]).toMatchObject({
      preco_unitario: 53, // 45 + 8
      quantidade: 2,
      subtotal: 106, // 53 * 2
      opcoes: [{ opcao_item_id: 'item-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 }],
    })
  })

  it('carrinho misto: só a linha com opção recebe o delta, a outra fica intacta', async () => {
    const supabase = buildSupabase(
      [
        { id: 'ci-1', product_id: 'p1', quantity: 1, target_date: null, note: null, delivery_mode: null, address_id: null, products: { name: 'Pizza Calabresa', sale_price: 45, promo_price: null, available: true, requirements: {} } },
        { id: 'ci-2', product_id: 'p2', quantity: 1, target_date: null, note: null, delivery_mode: null, address_id: null, products: { name: 'Guaraná 2L', sale_price: 15, promo_price: null, available: true, requirements: {} } },
      ],
      [{ cart_item_id: 'ci-1', option_item_id: 'item-catupiry', frozen_name: 'Catupiry', frozen_price_delta: 8 }],
    )

    const result = await getCartState(supabase, 'sessao-1')

    expect(result.itens.find((i) => i.id === 'ci-1')?.preco_unitario).toBe(53)
    expect(result.itens.find((i) => i.id === 'ci-2')?.preco_unitario).toBe(15)
    expect(result.itens.find((i) => i.id === 'ci-2')?.opcoes).toEqual([])
  })

  it('duas opções na mesma linha somam os dois deltas', async () => {
    const supabase = buildSupabase(
      [{ id: 'ci-1', product_id: 'p1', quantity: 1, target_date: null, note: null, delivery_mode: null, address_id: null, products: { name: 'Camiseta', sale_price: 50, promo_price: null, available: true, requirements: {} } }],
      [
        { cart_item_id: 'ci-1', option_item_id: 'item-p', frozen_name: 'Tamanho P', frozen_price_delta: 0 },
        { cart_item_id: 'ci-1', option_item_id: 'item-estampa', frozen_name: 'Estampa extra', frozen_price_delta: 12 },
      ],
    )

    const result = await getCartState(supabase, 'sessao-1')

    expect(result.itens[0]?.preco_unitario).toBe(62)
    expect(result.itens[0]?.opcoes).toHaveLength(2)
  })
})

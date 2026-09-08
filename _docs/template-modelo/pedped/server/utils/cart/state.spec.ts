import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { getCartState } from './state'

interface CartItemFixture {
  id: string
  produto_id: string
  quantidade: number
  target_date: string | null
  observacao: string | null
  delivery_mode: string | null
  address_id: string | null
  produtos: { nome: string, preco_venda: number, preco_promocional: number | null, disponivel: boolean, requirements: Record<string, never> } | null
}

interface OptionFixture {
  cart_item_id: string
  opcao_item_id: string
  nome_congelado: string
  preco_delta_congelado: number
}

function buildSupabase(cartItems: CartItemFixture[], opcoes: OptionFixture[] = []) {
  function from(tabela: string): unknown {
    if (tabela === 'cart_items') {
      return { select: () => ({ eq: () => ({ order: async () => ({ data: cartItems, error: null }) }) }) }
    }
    if (tabela === 'cart_items_opcoes') {
      return { select: () => ({ in: async () => ({ data: opcoes }) }) }
    }
    if (tabela === 'sessoes') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { delivery_mode: null, payment_method: null, address_id: null } }),
          }),
        }),
      }
    }
    if (tabela === 'promocoes') {
      return { select: () => ({ eq: () => ({ or: () => ({ or: async () => ({ data: [], error: null }) }) }) }) }
    }
    return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }
  }
  return { from } as unknown as SupabaseClient<Database>
}

describe('getCartState — opções/variações somam ao preço efetivo (migration 110)', () => {
  it('item sem opção: preço/subtotal idênticos a antes da 110', async () => {
    const supabase = buildSupabase([
      { id: 'ci-1', produto_id: 'p1', quantidade: 2, target_date: null, observacao: null, delivery_mode: null, address_id: null, produtos: { nome: 'Guaraná 2L', preco_venda: 15, preco_promocional: null, disponivel: true, requirements: {} } },
    ])

    const result = await getCartState(supabase, 'sessao-1')

    expect(result.itens).toEqual([expect.objectContaining({
      id: 'ci-1', produto_id: 'p1', preco_unitario: 15, quantidade: 2, subtotal: 30, opcoes: [],
    })])
  })

  it('item com opção: preço unitário soma o preco_delta_congelado, subtotal reflete a quantidade', async () => {
    const supabase = buildSupabase(
      [{ id: 'ci-1', produto_id: 'p1', quantidade: 2, target_date: null, observacao: null, delivery_mode: null, address_id: null, produtos: { nome: 'Pizza Calabresa', preco_venda: 45, preco_promocional: null, disponivel: true, requirements: {} } }],
      [{ cart_item_id: 'ci-1', opcao_item_id: 'item-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 }],
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
        { id: 'ci-1', produto_id: 'p1', quantidade: 1, target_date: null, observacao: null, delivery_mode: null, address_id: null, produtos: { nome: 'Pizza Calabresa', preco_venda: 45, preco_promocional: null, disponivel: true, requirements: {} } },
        { id: 'ci-2', produto_id: 'p2', quantidade: 1, target_date: null, observacao: null, delivery_mode: null, address_id: null, produtos: { nome: 'Guaraná 2L', preco_venda: 15, preco_promocional: null, disponivel: true, requirements: {} } },
      ],
      [{ cart_item_id: 'ci-1', opcao_item_id: 'item-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 }],
    )

    const result = await getCartState(supabase, 'sessao-1')

    expect(result.itens.find((i) => i.id === 'ci-1')?.preco_unitario).toBe(53)
    expect(result.itens.find((i) => i.id === 'ci-2')?.preco_unitario).toBe(15)
    expect(result.itens.find((i) => i.id === 'ci-2')?.opcoes).toEqual([])
  })

  it('duas opções na mesma linha somam os dois deltas', async () => {
    const supabase = buildSupabase(
      [{ id: 'ci-1', produto_id: 'p1', quantidade: 1, target_date: null, observacao: null, delivery_mode: null, address_id: null, produtos: { nome: 'Camiseta', preco_venda: 50, preco_promocional: null, disponivel: true, requirements: {} } }],
      [
        { cart_item_id: 'ci-1', opcao_item_id: 'item-p', nome_congelado: 'Tamanho P', preco_delta_congelado: 0 },
        { cart_item_id: 'ci-1', opcao_item_id: 'item-estampa', nome_congelado: 'Estampa extra', preco_delta_congelado: 12 },
      ],
    )

    const result = await getCartState(supabase, 'sessao-1')

    expect(result.itens[0]?.preco_unitario).toBe(62)
    expect(result.itens[0]?.opcoes).toHaveLength(2)
  })
})

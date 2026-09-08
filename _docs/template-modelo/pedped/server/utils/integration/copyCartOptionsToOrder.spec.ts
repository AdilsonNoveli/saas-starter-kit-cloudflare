import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { IntegrationCartItem } from '#shared/types/integration'
import { copyCartOptionsToOrder } from './finalizeCheckout'

function cartItem(overrides: Partial<IntegrationCartItem>): IntegrationCartItem {
  return {
    id: 'cart-item-x',
    produto_id: 'produto-x',
    nome: 'Produto',
    preco_unitario: 10,
    quantidade: 1,
    subtotal: 10,
    opcoes: [],
    fulfillment: { delivery_mode: null, address_id: null },
    ...overrides,
  }
}

function buildSupabase(itensPedido: Array<{ id: string, produto_id: string, quantidade: number }>) {
  const inserted = vi.fn().mockResolvedValue({ error: null })
  const from = (tabela: string): unknown => {
    if (tabela === 'itens_pedido') {
      return { select: () => ({ eq: async () => ({ data: itensPedido, error: null }) }) }
    }
    if (tabela === 'itens_pedido_opcoes') {
      return { insert: (payload: unknown) => inserted(payload) }
    }
    throw new Error(`tabela inesperada: ${tabela}`)
  }
  return { supabase: { from } as unknown as SupabaseClient<Database>, inserted }
}

describe('copyCartOptionsToOrder', () => {
  it('carrinho sem nenhum item com opção: não consulta nem grava nada', async () => {
    const { supabase, inserted } = buildSupabase([])
    const fromSpy = vi.fn(supabase.from)

    await copyCartOptionsToOrder({ ...supabase, from: fromSpy } as unknown as SupabaseClient<Database>, 'pedido-1', [
      cartItem({ produto_id: 'p1' }),
    ])

    expect(fromSpy).not.toHaveBeenCalled()
    expect(inserted).not.toHaveBeenCalled()
  })

  it('copia as opções congeladas para a linha certa via produto_id+quantidade', async () => {
    const { supabase, inserted } = buildSupabase([
      { id: 'item-pedido-1', produto_id: 'p1', quantidade: 2 },
    ])

    await copyCartOptionsToOrder(supabase, 'pedido-1', [
      cartItem({
        produto_id: 'p1',
        quantidade: 2,
        opcoes: [{ opcao_item_id: 'op-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 }],
      }),
    ])

    expect(inserted).toHaveBeenCalledWith([
      { item_pedido_id: 'item-pedido-1', opcao_item_id: 'op-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 },
    ])
  })

  it('duas linhas do MESMO produto_id (variações diferentes): cada uma recebe seu item_pedido_id, sem colidir', async () => {
    const { supabase, inserted } = buildSupabase([
      { id: 'item-pedido-A', produto_id: 'p1', quantidade: 1 },
      { id: 'item-pedido-B', produto_id: 'p1', quantidade: 1 },
    ])

    await copyCartOptionsToOrder(supabase, 'pedido-1', [
      cartItem({ id: 'ci-1', produto_id: 'p1', quantidade: 1, opcoes: [{ opcao_item_id: 'op-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 }] }),
      cartItem({ id: 'ci-2', produto_id: 'p1', quantidade: 1, opcoes: [{ opcao_item_id: 'op-cheddar', nome_congelado: 'Cheddar', preco_delta_congelado: 8 }] }),
    ])

    const payload = inserted.mock.calls[0]?.[0] as Array<{ item_pedido_id: string, opcao_item_id: string }>
    const idsUsados = new Set(payload.map((p) => p.item_pedido_id))
    expect(idsUsados).toEqual(new Set(['item-pedido-A', 'item-pedido-B']))
    // Cada item_pedido_id recebeu exatamente uma opção — nenhuma colisão nem perda.
    expect(payload).toHaveLength(2)
  })

  it('item de carrinho sem correspondência em itens_pedido: pula em silêncio (não-fatal), não lança', async () => {
    const { supabase, inserted } = buildSupabase([])

    await expect(copyCartOptionsToOrder(supabase, 'pedido-1', [
      cartItem({ produto_id: 'p1', opcoes: [{ opcao_item_id: 'op-x', nome_congelado: 'X', preco_delta_congelado: 5 }] }),
    ])).resolves.toBeUndefined()

    expect(inserted).not.toHaveBeenCalled()
  })

  it('itens sem opção nenhuma no meio da lista não geram linha em itens_pedido_opcoes', async () => {
    const { supabase, inserted } = buildSupabase([
      { id: 'item-pedido-1', produto_id: 'p1', quantidade: 1 },
      { id: 'item-pedido-2', produto_id: 'p2', quantidade: 1 },
    ])

    await copyCartOptionsToOrder(supabase, 'pedido-1', [
      cartItem({ produto_id: 'p1', quantidade: 1, opcoes: [{ opcao_item_id: 'op-x', nome_congelado: 'X', preco_delta_congelado: 5 }] }),
      cartItem({ produto_id: 'p2', quantidade: 1, opcoes: [] }),
    ])

    expect(inserted).toHaveBeenCalledWith([
      { item_pedido_id: 'item-pedido-1', opcao_item_id: 'op-x', nome_congelado: 'X', preco_delta_congelado: 5 },
    ])
  })
})

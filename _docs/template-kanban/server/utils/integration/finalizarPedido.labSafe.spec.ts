/**
 * Teste de contrato obrigatório (§5.4 do PRD do laboratório de avaliação):
 * prova que `finalizeCheckoutLabSafe` nunca toca `orders` E que a FORMA do
 * retorno (campos presentes, tipos) bate com o que `finalizeCheckout` real
 * promete — para as duas implementações não divergirem em silêncio se alguém
 * mudar uma sem replicar na outra.
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { IntegrationOrderDetail } from '#shared/types/integration'
import { finalizeCheckoutLabSafe } from './finalizeCheckoutLabSafe'

/**
 * Fake mínimo do client Supabase: cada `.from(tabela)` devolve um builder
 * encadeável (todo método intermediário devolve `this`) que resolve com o
 * fixture da tabela, independente de quais métodos foram encadeados —
 * suficiente porque `getCartState`/`requireActiveSession` só leem
 * `sessions`/`cart_items`/`promotions`. `.from('orders')` lança: prova que o
 * caminho lab-safe nunca alcança a tabela de negócio real.
 */
function fakeLabSupabase(overrides: { cartItems?: unknown[] } = {}): SupabaseClient<Database> {
  function chain(result: { data: unknown; error: unknown }): unknown {
    const builder: Record<string, unknown> = {}
    const passthrough = ['select', 'eq', 'in', 'order', 'limit', 'gte', 'lte', 'or', 'maybeSingle', 'single', 'insert', 'update']
    for (const method of passthrough) builder[method] = () => builder
    builder.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve(result)
    return builder
  }

  const sessaoFixture = {
    id: 'sessao-lab-1',
    customer_id: 'cliente-lab-1',
    status: 'ativa',
    expires_at: null,
    delivery_mode: 'retirada',
    payment_method: 'dinheiro',
    address_id: null,
  }

  const cartItemsFixture = overrides.cartItems ?? [
    {
      product_id: 'produto-1',
      quantity: 2,
      target_date: null,
      note: null,
      delivery_mode: null,
      address_id: null,
      products: {
        name: 'Pizza calabresa',
        sale_price: 45,
        promo_price: null,
        available: true,
        requirements: {},
      },
    },
  ]

  return {
    from: (table: string) => {
      if (table === 'sessions') return chain({ data: sessaoFixture, error: null })
      if (table === 'cart_items') return chain({ data: cartItemsFixture, error: null })
      if (table === 'promotions') return chain({ data: [], error: null })
      // `resolveEntryKanbanStatus` (migration 125) — status inicial vem daqui, não de literal.
      if (table === 'kanban_column') return chain({ data: { key: 'pendente' }, error: null })
      if (table === 'orders') throw new Error('finalizeCheckoutLabSafe não deve tocar public.orders')
      return chain({ data: null, error: null })
    },
  } as unknown as SupabaseClient<Database>
}

/** Campos que `IntegrationOrderDetail` promete — mesma chave em ambas as implementações. */
const ORDER_DETAIL_KEYS: readonly (keyof IntegrationOrderDetail)[] = [
  'id', 'short_id', 'status', 'criado_em', 'tipo_entrega', 'forma_pagamento',
  'valor_subtotal', 'desconto_aplicado', 'valor_entrega', 'valor_total',
  'observacoes', 'nota_atendimento', 'cliente', 'endereco', 'itens', 'receipt_text',
]

describe('finalizeCheckoutLabSafe — contrato de forma', () => {
  it('nunca consulta a tabela orders', async () => {
    const supabase = fakeLabSupabase()
    const fromSpy = vi.spyOn(supabase, 'from')

    await finalizeCheckoutLabSafe(supabase, { sessao_id: 'sessao-lab-1', idempotencyKey: 'lab-teste' })

    expect(fromSpy).not.toHaveBeenCalledWith('orders')
  })

  it('devolve success=true, idempotent=false e pedido com todas as chaves de IntegrationOrderDetail', async () => {
    const supabase = fakeLabSupabase()

    const { response, drain } = await finalizeCheckoutLabSafe(supabase, {
      sessao_id: 'sessao-lab-1',
      idempotencyKey: 'lab-teste',
    })

    expect(response.success).toBe(true)
    expect(response.idempotent).toBe(false)
    expect(drain).toBeUndefined()
    expect(Object.keys(response.pedido).sort()).toEqual([...ORDER_DETAIL_KEYS].sort())
  })

  it('receipt_text é uma string não vazia — campo que o prompt do agente lê e reescreve', async () => {
    const supabase = fakeLabSupabase()

    const { response } = await finalizeCheckoutLabSafe(supabase, {
      sessao_id: 'sessao-lab-1',
      idempotencyKey: 'lab-teste',
    })

    expect(typeof response.pedido.receipt_text).toBe('string')
    expect(response.pedido.receipt_text.length).toBeGreaterThan(0)
  })

  it('valor_total é numérico e reflete subtotal - desconto do carrinho', async () => {
    const supabase = fakeLabSupabase()

    const { response } = await finalizeCheckoutLabSafe(supabase, {
      sessao_id: 'sessao-lab-1',
      idempotencyKey: 'lab-teste',
    })

    expect(typeof response.pedido.valor_total).toBe('number')
    expect(response.pedido.valor_total).toBe(90) // 2x R$45, sem promoção ativa no fixture
  })

  it('rejeita carrinho vazio com 422, igual à versão real', async () => {
    const supabase = fakeLabSupabase({ cartItems: [] })

    await expect(
      finalizeCheckoutLabSafe(supabase, { sessao_id: 'sessao-lab-1', idempotencyKey: 'lab-teste' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})

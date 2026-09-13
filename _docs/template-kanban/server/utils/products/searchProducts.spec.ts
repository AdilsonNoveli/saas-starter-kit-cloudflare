import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { searchProducts } from './searchProducts'

/**
 * Fake mínimo, roteado por tabela/RPC — cada teste só precisa preencher o que
 * usa. `attachPreorderInfo`/`attachRelatedProducts`/`attachHasOptions` sempre
 * rodam (mesmo padrão de produção), então precisam de uma resposta vazia
 * default para não quebrar os testes que não são sobre elas.
 */
function fakeSupabase(options: {
  rpcData?: unknown[]
  produtosListData?: unknown[]
  produtosListCount?: number
  optionGroupsData?: unknown[]
  produtoStockData?: unknown[]
  movimentacoesData?: unknown[]
}): SupabaseClient<Database> {
  const rpc = vi.fn().mockResolvedValue({ data: options.rpcData ?? [], error: null })

  function tableChain(table: string) {
    if (table === 'product_option_group') {
      return { select: () => ({ in: async () => ({ data: options.optionGroupsData ?? [] }) }) }
    }
    if (table === 'related_products') {
      return { select: () => ({ in: () => ({ order: async () => ({ data: [] }) }) }) }
    }
    if (table === 'stock_movements') {
      // Thenable — mesmo formato do query builder real do supabase-js: cada
      // método encadeado devolve o próprio chain, resolvido só no await final
      // (loadUsadoHojeProducaoDiaria — stockAvailability.ts).
      const resultado = { data: options.movimentacoesData ?? [] }
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        gte: () => chain,
        lt: () => chain,
        then: (resolve: (v: typeof resultado) => void) => resolve(resultado),
      }
      return chain
    }
    if (table === 'products') {
      // Três formas de uso: listagem geral (Path B, com count),
      // attachPreorderInfo/attachRelatedProducts, e attachStockInfo — as duas
      // últimas se distinguem pelas colunas pedidas (`_cols`).
      return {
        select: (_cols: string, opts?: { count?: string }) => {
          if (opts?.count) {
            return {
              eq: () => ({
                order: () => ({
                  range: async () => ({
                    data: options.produtosListData ?? [],
                    error: null,
                    count: options.produtosListCount ?? (options.produtosListData ?? []).length,
                  }),
                }),
              }),
            }
          }
          if (_cols.includes('stock_control')) {
            return { in: async () => ({ data: options.produtoStockData ?? [] }) }
          }
          return { in: async () => ({ data: [] }) }
        },
      }
    }
    return { select: () => ({ in: async () => ({ data: [] }) }) }
  }

  return { rpc, from: (table: string) => tableChain(table) } as unknown as SupabaseClient<Database>
}

describe('searchProducts — tem_opcoes (migration 110)', () => {
  it('Path A (busca com termo): tem_opcoes vem direto da RPC search_products', async () => {
    const supabase = fakeSupabase({
      rpcData: [
        { id: 'p1', name: 'Pizza Calabresa', description: null, sale_price: 45, promo_price: null, unit: 'un', categoria_nome: 'Pizzas', tem_opcoes: true },
        { id: 'p2', name: 'Guaraná 2L', description: null, sale_price: 15, promo_price: null, unit: 'un', categoria_nome: 'Bebidas', tem_opcoes: false },
      ],
    })

    const result = await searchProducts(supabase, { q: 'pizza', limit: 10, offset: 0 })

    expect(result.data.find((p) => p.id === 'p1')?.tem_opcoes).toBe(true)
    expect(result.data.find((p) => p.id === 'p2')?.tem_opcoes).toBe(false)
  })

  it('Path A: RPC sem a coluna (null) vira false, nunca undefined', async () => {
    const supabase = fakeSupabase({
      rpcData: [{ id: 'p1', name: 'Pizza', description: null, sale_price: 45, promo_price: null, unit: 'un', categoria_nome: null, tem_opcoes: null }],
    })

    const result = await searchProducts(supabase, { q: 'pizza', limit: 10, offset: 0 })

    expect(result.data[0]?.tem_opcoes).toBe(false)
  })

  it('Path B (listagem geral, sem termo): produto com grupo de opção vira tem_opcoes=true', async () => {
    const supabase = fakeSupabase({
      produtosListData: [
        { id: 'p1', name: 'Pizza Calabresa', description: null, sale_price: 45, promo_price: null, unit: 'un', categories: { name: 'Pizzas' } },
        { id: 'p2', name: 'Guaraná 2L', description: null, sale_price: 15, promo_price: null, unit: 'un', categories: null },
      ],
      optionGroupsData: [{ product_id: 'p1' }],
    })

    const result = await searchProducts(supabase, { limit: 10, offset: 0 })

    expect(result.data.find((p) => p.id === 'p1')?.tem_opcoes).toBe(true)
    expect(result.data.find((p) => p.id === 'p2')?.tem_opcoes).toBe(false)
  })

  it('Path B: nenhum produto da página tem grupo de opção — todos ficam tem_opcoes=false', async () => {
    const supabase = fakeSupabase({
      produtosListData: [
        { id: 'p1', name: 'Guaraná 2L', description: null, sale_price: 15, promo_price: null, unit: 'un', categories: null },
      ],
      optionGroupsData: [],
    })

    const result = await searchProducts(supabase, { limit: 10, offset: 0 })

    expect(result.data[0]?.tem_opcoes).toBe(false)
  })
})

describe('searchProducts — attachStockInfo / quantidade_disponivel (Gestão de Estoque, migration 111)', () => {
  it('produto sem controle de estoque (controle_estoque=nenhum): quantidade_disponivel fica null — nenhum limite', async () => {
    const supabase = fakeSupabase({
      rpcData: [{ id: 'p1', name: 'Pizza', description: null, sale_price: 45, promo_price: null, unit: 'un', categoria_nome: null, tem_opcoes: false }],
      produtoStockData: [{ id: 'p1', stock_control: 'nenhum', current_stock: null, daily_production_limit: null }],
    })

    const result = await searchProducts(supabase, { q: 'pizza', limit: 10, offset: 0 })

    expect(result.data[0]?.quantidade_disponivel).toBeNull()
  })

  it('controle_estoque=contagem: quantidade_disponivel reflete estoque_atual', async () => {
    const supabase = fakeSupabase({
      rpcData: [{ id: 'p1', name: 'Bolo', description: null, sale_price: 30, promo_price: null, unit: 'un', categoria_nome: null, tem_opcoes: false }],
      produtoStockData: [{ id: 'p1', stock_control: 'contagem', current_stock: 7, daily_production_limit: null }],
    })

    const result = await searchProducts(supabase, { q: 'bolo', limit: 10, offset: 0 })

    expect(result.data[0]?.quantidade_disponivel).toBe(7)
  })

  it('controle_estoque=producao_diaria: quantidade_disponivel = limite - usado hoje (venda líquida de cancelamento)', async () => {
    const supabase = fakeSupabase({
      produtosListData: [
        { id: 'p1', name: 'Marmita', description: null, sale_price: 25, promo_price: null, unit: 'un', categories: null },
      ],
      produtoStockData: [{ id: 'p1', stock_control: 'producao_diaria', current_stock: null, daily_production_limit: 20 }],
      movimentacoesData: [
        { entity_id: 'p1', quantity: -12 },
        { entity_id: 'p1', quantity: 4 }, // cancelamento parcial — neutraliza parte da venda
      ],
    })

    const result = await searchProducts(supabase, { limit: 10, offset: 0 })

    // usado = -(-12 + 4) = 8; disponível = 20 - 8 = 12.
    expect(result.data[0]?.quantidade_disponivel).toBe(12)
  })

  it('produto sem linha correspondente em produtos: mantém quantidade_disponivel null (default), nunca inventa', async () => {
    const supabase = fakeSupabase({
      rpcData: [{ id: 'p1', name: 'Item órfão', description: null, sale_price: 10, promo_price: null, unit: 'un', categoria_nome: null, tem_opcoes: false }],
      produtoStockData: [],
    })

    const result = await searchProducts(supabase, { q: 'item', limit: 10, offset: 0 })

    expect(result.data[0]?.quantidade_disponivel).toBeNull()
  })
})

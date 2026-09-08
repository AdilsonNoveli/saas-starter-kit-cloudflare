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
    if (table === 'produto_opcao_grupo') {
      return { select: () => ({ in: async () => ({ data: options.optionGroupsData ?? [] }) }) }
    }
    if (table === 'produto_relacionados') {
      return { select: () => ({ in: () => ({ order: async () => ({ data: [] }) }) }) }
    }
    if (table === 'estoque_movimentacoes') {
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
    if (table === 'produtos') {
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
          if (_cols.includes('controle_estoque')) {
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
        { id: 'p1', nome: 'Pizza Calabresa', descricao: null, preco_venda: 45, preco_promocional: null, unidade_medida: 'un', categoria_nome: 'Pizzas', tem_opcoes: true },
        { id: 'p2', nome: 'Guaraná 2L', descricao: null, preco_venda: 15, preco_promocional: null, unidade_medida: 'un', categoria_nome: 'Bebidas', tem_opcoes: false },
      ],
    })

    const result = await searchProducts(supabase, { q: 'pizza', limit: 10, offset: 0 })

    expect(result.data.find((p) => p.id === 'p1')?.tem_opcoes).toBe(true)
    expect(result.data.find((p) => p.id === 'p2')?.tem_opcoes).toBe(false)
  })

  it('Path A: RPC sem a coluna (null) vira false, nunca undefined', async () => {
    const supabase = fakeSupabase({
      rpcData: [{ id: 'p1', nome: 'Pizza', descricao: null, preco_venda: 45, preco_promocional: null, unidade_medida: 'un', categoria_nome: null, tem_opcoes: null }],
    })

    const result = await searchProducts(supabase, { q: 'pizza', limit: 10, offset: 0 })

    expect(result.data[0]?.tem_opcoes).toBe(false)
  })

  it('Path B (listagem geral, sem termo): produto com grupo de opção vira tem_opcoes=true', async () => {
    const supabase = fakeSupabase({
      produtosListData: [
        { id: 'p1', nome: 'Pizza Calabresa', descricao: null, preco_venda: 45, preco_promocional: null, unidade_medida: 'un', categorias: { nome: 'Pizzas' } },
        { id: 'p2', nome: 'Guaraná 2L', descricao: null, preco_venda: 15, preco_promocional: null, unidade_medida: 'un', categorias: null },
      ],
      optionGroupsData: [{ produto_id: 'p1' }],
    })

    const result = await searchProducts(supabase, { limit: 10, offset: 0 })

    expect(result.data.find((p) => p.id === 'p1')?.tem_opcoes).toBe(true)
    expect(result.data.find((p) => p.id === 'p2')?.tem_opcoes).toBe(false)
  })

  it('Path B: nenhum produto da página tem grupo de opção — todos ficam tem_opcoes=false', async () => {
    const supabase = fakeSupabase({
      produtosListData: [
        { id: 'p1', nome: 'Guaraná 2L', descricao: null, preco_venda: 15, preco_promocional: null, unidade_medida: 'un', categorias: null },
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
      rpcData: [{ id: 'p1', nome: 'Pizza', descricao: null, preco_venda: 45, preco_promocional: null, unidade_medida: 'un', categoria_nome: null, tem_opcoes: false }],
      produtoStockData: [{ id: 'p1', controle_estoque: 'nenhum', estoque_atual: null, producao_diaria_limite: null }],
    })

    const result = await searchProducts(supabase, { q: 'pizza', limit: 10, offset: 0 })

    expect(result.data[0]?.quantidade_disponivel).toBeNull()
  })

  it('controle_estoque=contagem: quantidade_disponivel reflete estoque_atual', async () => {
    const supabase = fakeSupabase({
      rpcData: [{ id: 'p1', nome: 'Bolo', descricao: null, preco_venda: 30, preco_promocional: null, unidade_medida: 'un', categoria_nome: null, tem_opcoes: false }],
      produtoStockData: [{ id: 'p1', controle_estoque: 'contagem', estoque_atual: 7, producao_diaria_limite: null }],
    })

    const result = await searchProducts(supabase, { q: 'bolo', limit: 10, offset: 0 })

    expect(result.data[0]?.quantidade_disponivel).toBe(7)
  })

  it('controle_estoque=producao_diaria: quantidade_disponivel = limite - usado hoje (venda líquida de cancelamento)', async () => {
    const supabase = fakeSupabase({
      produtosListData: [
        { id: 'p1', nome: 'Marmita', descricao: null, preco_venda: 25, preco_promocional: null, unidade_medida: 'un', categorias: null },
      ],
      produtoStockData: [{ id: 'p1', controle_estoque: 'producao_diaria', estoque_atual: null, producao_diaria_limite: 20 }],
      movimentacoesData: [
        { entidade_id: 'p1', quantidade: -12 },
        { entidade_id: 'p1', quantidade: 4 }, // cancelamento parcial — neutraliza parte da venda
      ],
    })

    const result = await searchProducts(supabase, { limit: 10, offset: 0 })

    // usado = -(-12 + 4) = 8; disponível = 20 - 8 = 12.
    expect(result.data[0]?.quantidade_disponivel).toBe(12)
  })

  it('produto sem linha correspondente em produtos: mantém quantidade_disponivel null (default), nunca inventa', async () => {
    const supabase = fakeSupabase({
      rpcData: [{ id: 'p1', nome: 'Item órfão', descricao: null, preco_venda: 10, preco_promocional: null, unidade_medida: 'un', categoria_nome: null, tem_opcoes: false }],
      produtoStockData: [],
    })

    const result = await searchProducts(supabase, { q: 'item', limit: 10, offset: 0 })

    expect(result.data[0]?.quantidade_disponivel).toBeNull()
  })
})

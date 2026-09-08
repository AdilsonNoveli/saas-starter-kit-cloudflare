import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { OptionGroup } from '#shared/types/product'

// `getCartState` tem specs próprios (`cart/state.spec.ts` equivalente via
// `updateCheckout.spec.ts`) — mockado aqui para não precisar fingir a cadeia
// inteira de `produtos`/`promocoes`. `requireActiveSession` fica REAL.
const { getCartState } = vi.hoisted(() => ({ getCartState: vi.fn(async () => ({ subtotal: 0 })) }))
vi.mock('./state', async (importOriginal) => ({
  ...await importOriginal<typeof import('./state')>(),
  getCartState,
}))

const { getProductOptions } = vi.hoisted(() => ({ getProductOptions: vi.fn(async (): Promise<OptionGroup[]> => []) }))
vi.mock('../products/getProductOptions', () => ({ getProductOptions }))

const { setCartItem } = await import('./setCartItem')

const SESSAO_ATIVA = { id: 'sessao-1', cliente_id: 'cliente-1', status: 'ativa', expira_em: null, delivery_mode: null }

interface Cenario {
  produto?: { id: string, disponivel: boolean, controle_estoque?: string, estoque_atual?: number | null, producao_diaria_limite?: number | null } | null
  cartItemPorId?: { id: string, produto_id?: string } | null
  movimentacoes?: Array<{ entidade_id: string, quantidade: number }>
}

function buildSupabase(cenario: Cenario = {}) {
  const deletado: Array<{ tabela: string, filtros: Record<string, unknown> }> = []
  const upsertPayload = vi.fn()
  const updatePayload = vi.fn()
  const inseridoOpcoes = vi.fn()

  function from(tabela: string): unknown {
    if (tabela === 'sessoes') {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: SESSAO_ATIVA }) }) }) }
    }
    if (tabela === 'produtos') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: cenario.produto === undefined ? { id: 'produto-1', disponivel: true } : cenario.produto }),
          }),
        }),
      }
    }
    if (tabela === 'estoque_movimentacoes') {
      // Mesmo formato thenable dos query builders reais do supabase-js: cada
      // método encadeado devolve o próprio chain, resolvido só no await final
      // (loadUsadoHojeProducaoDiaria — server/utils/products/stockAvailability.ts).
      const resultado = { data: cenario.movimentacoes ?? [] }
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
    if (tabela === 'cart_items') {
      return {
        select: (_cols: string) => ({
          eq: (col1: string, val1: unknown) => ({
            eq: (_col2: string, _val2: unknown) => ({
              maybeSingle: async () => {
                // Path do cart_item_id: select('id, produto_id').eq('id', X).eq('sessao_id', Y).maybeSingle()
                if (col1 === 'id') return { data: cenario.cartItemPorId === undefined ? { id: val1 } : cenario.cartItemPorId }
                return { data: null }
              },
              single: async () => ({ data: { id: 'novo-cart-item' }, error: null }),
            }),
            single: async () => ({ data: { id: 'novo-cart-item' }, error: null }),
          }),
        }),
        delete: () => ({
          eq: (col1: string, val1: unknown) => {
            const chain = {
              eq: (col2: string, val2: unknown) => {
                const chain2 = {
                  eq: (col3: string, val3: unknown) => {
                    deletado.push({ tabela, filtros: { [col1]: val1, [col2]: val2, [col3]: val3 } })
                    return Promise.resolve({ error: null })
                  },
                }
                deletado.push({ tabela, filtros: { [col1]: val1, [col2]: val2 } })
                return Object.assign(Promise.resolve({ error: null }), chain2)
              },
            }
            deletado.push({ tabela, filtros: { [col1]: val1 } })
            return Object.assign(Promise.resolve({ error: null }), chain)
          },
        }),
        update: (payload: unknown) => ({
          eq: async () => { updatePayload(payload); return { error: null } },
        }),
        upsert: (payload: unknown) => ({
          select: () => ({
            single: async () => { upsertPayload(payload); return { data: { id: 'novo-cart-item' }, error: null } },
          }),
        }),
      }
    }
    if (tabela === 'cart_items_opcoes') {
      return {
        delete: () => ({ eq: async () => ({ error: null }) }),
        insert: async (payload: unknown) => { inseridoOpcoes(payload); return { error: null } },
      }
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
  }

  return {
    supabase: { from } as unknown as SupabaseClient<Database>,
    deletado,
    upsertPayload,
    updatePayload,
    inseridoOpcoes,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  getProductOptions.mockResolvedValue([])
  getCartState.mockResolvedValue({ subtotal: 0 } as never)
})

describe('setCartItem — comportamento existente (sem opções), continua igual', () => {
  it('adiciona produto sem opção — opcoes_assinatura vazia, comportamento idêntico ao de antes da 110', async () => {
    const { supabase, upsertPayload } = buildSupabase()

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 2 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 2, opcoes_assinatura: '',
    }))
  })

  it('produto_id inexistente continua 422 técnico (regressão do bug de produção 05/08)', async () => {
    const { supabase } = buildSupabase({ produto: null })

    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-x', quantidade: 1 }))
      .rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('setCartItem — opções/variações de produto (migration 110)', () => {
  const GRUPO_BORDA: OptionGroup = {
    id: 'grupo-borda',
    produto_id: 'produto-1',
    nome: 'Borda',
    tipo: 'single',
    obrigatorio: true,
    min_selecoes: 1,
    max_selecoes: 1,
    ordem: 0,
    produto_opcao_item: [
      { id: 'item-catupiry', grupo_id: 'grupo-borda', nome: 'Catupiry', preco_delta: 8, selecionado_padrao: false, ativo: true, ordem: 0, foto_url: null },
      { id: 'item-cheddar', grupo_id: 'grupo-borda', nome: 'Cheddar', preco_delta: 8, selecionado_padrao: false, ativo: true, ordem: 1, foto_url: null },
    ],
  }

  it('opção válida: releva nome/preço reais do banco, nunca confia no modelo, e grava em cart_items_opcoes', async () => {
    getProductOptions.mockResolvedValue([GRUPO_BORDA])
    const { supabase, upsertPayload, inseridoOpcoes } = buildSupabase()

    await setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-catupiry' }],
    })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ opcoes_assinatura: 'item-catupiry' }))
    expect(inseridoOpcoes).toHaveBeenCalledWith([
      { cart_item_id: 'novo-cart-item', opcao_item_id: 'item-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 },
    ])
  })

  it('grupo obrigatório sem nenhuma escolha: 422 nomeando o grupo — erro de negócio, agente pode perguntar', async () => {
    getProductOptions.mockResolvedValue([GRUPO_BORDA])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1 }))
      .rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('Borda') as unknown as string })
  })

  it('opcao_item_id inexistente/inativo: 422 técnico — instrui a chamar ConsultarOpcoesProduto de novo', async () => {
    getProductOptions.mockResolvedValue([GRUPO_BORDA])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-inexistente' }],
    })).rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('ConsultarOpcoesProduto') as unknown as string })
  })

  it('grupo single com mais escolhas que max_selecoes: 422 de negócio', async () => {
    getProductOptions.mockResolvedValue([GRUPO_BORDA])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-catupiry' }, { opcao_item_id: 'item-cheddar' }],
    })).rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('máximo') as unknown as string })
  })

  it('grupo opcional (obrigatorio=false) sem escolha nenhuma: passa normalmente', async () => {
    const grupoOpcional: OptionGroup = { ...GRUPO_BORDA, obrigatorio: false, min_selecoes: 0 }
    getProductOptions.mockResolvedValue([grupoOpcional])
    const { supabase, upsertPayload } = buildSupabase()

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ opcoes_assinatura: '' }))
  })

  it('duas combinações de opção do MESMO produto_id geram assinaturas diferentes — linhas distintas do carrinho', async () => {
    const grupoOpcional: OptionGroup = { ...GRUPO_BORDA, obrigatorio: false, min_selecoes: 0 }
    getProductOptions.mockResolvedValue([grupoOpcional])
    const { supabase, upsertPayload } = buildSupabase()

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1, opcoes: [{ opcao_item_id: 'item-catupiry' }] })
    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1, opcoes: [{ opcao_item_id: 'item-cheddar' }] })

    expect(upsertPayload).toHaveBeenNthCalledWith(1, expect.objectContaining({ opcoes_assinatura: 'item-catupiry' }))
    expect(upsertPayload).toHaveBeenNthCalledWith(2, expect.objectContaining({ opcoes_assinatura: 'item-cheddar' }))
  })

  it('remoção (quantidade=0) sem cart_item_id usa produto_id + assinatura das opções informadas', async () => {
    getProductOptions.mockResolvedValue([])
    const { supabase, deletado } = buildSupabase()

    await setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 0,
      opcoes: [{ opcao_item_id: 'item-catupiry' }],
    })

    expect(deletado).toContainEqual({
      tabela: 'cart_items',
      filtros: { sessao_id: 'sessao-1', produto_id: 'produto-1', opcoes_assinatura: 'item-catupiry' },
    })
  })
})

describe('setCartItem — cart_item_id (mira linha existente sem recompor opções de memória)', () => {
  it('remove a linha exata por cart_item_id, ignorando produto_id/opcoes', async () => {
    const { supabase, deletado } = buildSupabase({ cartItemPorId: { id: 'linha-existente' } })

    await setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 0, cart_item_id: 'linha-existente',
    })

    expect(deletado).toContainEqual({ tabela: 'cart_items', filtros: { id: 'linha-existente' } })
  })

  it('atualiza só a quantidade da linha exata por cart_item_id', async () => {
    const { supabase, updatePayload } = buildSupabase({ cartItemPorId: { id: 'linha-existente' } })

    await setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 5, cart_item_id: 'linha-existente',
    })

    expect(updatePayload).toHaveBeenCalledWith({ quantidade: 5 })
  })

  it('cart_item_id de outra sessão (ou inexistente): 422 técnico, nunca mexe em linha alheia', async () => {
    const { supabase } = buildSupabase({ cartItemPorId: null })

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1, cart_item_id: 'linha-de-outra-sessao',
    })).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('setCartItem — soft-check de estoque (Gestão de Estoque, migration 111)', () => {
  it('controle_estoque=contagem com estoque insuficiente: 422 de negócio, informa o número exato', async () => {
    const { supabase } = buildSupabase({
      produto: { id: 'produto-1', disponivel: true, controle_estoque: 'contagem', estoque_atual: 2 },
    })

    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 5 }))
      .rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('2') as unknown as string })
  })

  it('controle_estoque=contagem com estoque suficiente: passa normalmente', async () => {
    const { supabase, upsertPayload } = buildSupabase({
      produto: { id: 'produto-1', disponivel: true, controle_estoque: 'contagem', estoque_atual: 10 },
    })

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 3 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ quantidade: 3 }))
  })

  it('controle_estoque=producao_diaria com capacidade do dia esgotada: 422 de negócio', async () => {
    const { supabase } = buildSupabase({
      produto: { id: 'produto-1', disponivel: true, controle_estoque: 'producao_diaria', producao_diaria_limite: 10 },
      movimentacoes: [{ entidade_id: 'produto-1', quantidade: -8 }],
    })

    // 10 de limite, 8 já usados hoje → restam 2, pedido de 5 estoura.
    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 5 }))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('controle_estoque=nenhum (default): nunca bloqueia, mesmo com quantidade grande', async () => {
    const { supabase, upsertPayload } = buildSupabase({
      produto: { id: 'produto-1', disponivel: true, controle_estoque: 'nenhum' },
    })

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 500 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ quantidade: 500 }))
  })

  it('atalho por cart_item_id NÃO pula o soft-check — mesma regra de estoque do caminho por produto_id', async () => {
    const { supabase } = buildSupabase({
      cartItemPorId: { id: 'linha-existente', produto_id: 'produto-1' },
      produto: { id: 'produto-1', disponivel: true, controle_estoque: 'contagem', estoque_atual: 1 },
    })

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 4, cart_item_id: 'linha-existente',
    })).rejects.toMatchObject({ statusCode: 422 })
  })
})

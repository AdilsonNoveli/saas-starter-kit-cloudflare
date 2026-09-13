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

// `deferArt` (migration 127, diferir:true) tem cobertura própria do
// delete+insert em `pendingArt.spec.ts` — aqui só interessa a FIAÇÃO (que
// setCartItem chama com os args certos), não reimplementar o mock de
// `cart_item_options` pro encadeamento .delete().eq().eq() que ele usa.
const { deferArt } = vi.hoisted(() => ({ deferArt: vi.fn(async () => undefined) }))
vi.mock('./pendingArt', () => ({ deferArt }))

const { setCartItem } = await import('./setCartItem')

const SESSAO_ATIVA = { id: 'sessao-1', customer_id: 'cliente-1', status: 'ativa', expires_at: null, delivery_mode: null }

interface Cenario {
  produto?: { id: string, available: boolean, stock_control?: string, current_stock?: number | null, daily_production_limit?: number | null } | null
  cartItemPorId?: { id: string, product_id?: string } | null
  movimentacoes?: Array<{ entity_id: string, quantity: number }>
}

function buildSupabase(cenario: Cenario = {}) {
  const deletado: Array<{ tabela: string, filtros: Record<string, unknown> }> = []
  const upsertPayload = vi.fn()
  const updatePayload = vi.fn()
  const inseridoOpcoes = vi.fn()

  function from(tabela: string): unknown {
    if (tabela === 'sessions') {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: SESSAO_ATIVA }) }) }) }
    }
    if (tabela === 'products') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: cenario.produto === undefined ? { id: 'produto-1', available: true } : cenario.produto }),
          }),
        }),
      }
    }
    if (tabela === 'stock_movements') {
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
                // Path do cart_item_id: select('id, product_id').eq('id', X).eq('session_id', Y).maybeSingle()
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
    if (tabela === 'cart_item_options') {
      // `.delete().eq(...)` resolve direto (mesmo padrão de sempre); quando
      // há âncoras upload_arquivo a preservar, `replaceCartItemOptions`
      // encadeia `.not('option_item_id', 'in', ...)` — o builder real do
      // supabase-js permite; este mock precisa do mesmo encadeamento.
      const deleteResult = Promise.resolve({ error: null })
      const deleteChain = Object.assign(deleteResult, { not: () => deleteResult })
      return {
        delete: () => ({ eq: () => deleteChain }),
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
      session_id: 'sessao-1', product_id: 'produto-1', quantity: 2, options_signature: '',
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

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ options_signature: 'item-catupiry' }))
    expect(inseridoOpcoes).toHaveBeenCalledWith([
      { cart_item_id: 'novo-cart-item', option_item_id: 'item-catupiry', frozen_name: 'Catupiry', text_value: null, frozen_price_delta: 8 },
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

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ options_signature: '' }))
  })

  it('duas combinações de opção do MESMO produto_id geram assinaturas diferentes — linhas distintas do carrinho', async () => {
    const grupoOpcional: OptionGroup = { ...GRUPO_BORDA, obrigatorio: false, min_selecoes: 0 }
    getProductOptions.mockResolvedValue([grupoOpcional])
    const { supabase, upsertPayload } = buildSupabase()

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1, opcoes: [{ opcao_item_id: 'item-catupiry' }] })
    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1, opcoes: [{ opcao_item_id: 'item-cheddar' }] })

    expect(upsertPayload).toHaveBeenNthCalledWith(1, expect.objectContaining({ options_signature: 'item-catupiry' }))
    expect(upsertPayload).toHaveBeenNthCalledWith(2, expect.objectContaining({ options_signature: 'item-cheddar' }))
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
      filtros: { session_id: 'sessao-1', product_id: 'produto-1', options_signature: 'item-catupiry' },
    })
  })
})

describe('setCartItem — resolução determinística de grupo obrigatório (bug de produção 17/08)', () => {
  const GRUPO_TIPO_UNICO: OptionGroup = {
    id: 'grupo-tipo',
    produto_id: 'produto-1',
    nome: 'TIPO',
    tipo: 'single',
    obrigatorio: true,
    min_selecoes: 1,
    max_selecoes: 1,
    ordem: 0,
    produto_opcao_item: [
      { id: 'item-masculino', grupo_id: 'grupo-tipo', nome: 'Masculino', preco_delta: 0, selecionado_padrao: false, ativo: true, ordem: 0, foto_url: null },
    ],
  }

  const GRUPO_MATERIAL_QUEBRADO: OptionGroup = {
    id: 'grupo-material',
    produto_id: 'produto-1',
    nome: 'MATERIAL',
    tipo: 'single',
    obrigatorio: true,
    min_selecoes: 1,
    max_selecoes: 1,
    ordem: 1,
    produto_opcao_item: [
      { id: 'item-poliester', grupo_id: 'grupo-material', nome: 'Tecido Poliéster', preco_delta: 0, selecionado_padrao: false, ativo: true, ordem: 0, foto_url: null },
      { id: 'item-vazio', grupo_id: 'grupo-material', nome: '', preco_delta: 0, selecionado_padrao: false, ativo: true, ordem: 1, foto_url: null },
    ],
  }

  it('grupo obrigatório com UMA única opção válida: resolve sozinho, sem exigir escolha do agente', async () => {
    getProductOptions.mockResolvedValue([GRUPO_TIPO_UNICO])
    const { supabase, upsertPayload, inseridoOpcoes } = buildSupabase()

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ options_signature: 'item-masculino' }))
    expect(inseridoOpcoes).toHaveBeenCalledWith([
      { cart_item_id: 'novo-cart-item', option_item_id: 'item-masculino', frozen_name: 'Masculino', text_value: null, frozen_price_delta: 0 },
    ])
  })

  it('grupo com 1 opção válida + 1 item de nome vazio: NUNCA resolve sozinho, exige escolha (422 de negócio)', async () => {
    getProductOptions.mockResolvedValue([GRUPO_MATERIAL_QUEBRADO])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1 }))
      .rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('MATERIAL') as unknown as string })
  })

  it('item de nome vazio nunca é aceito mesmo se o id for enviado explicitamente — 422 técnico, id não reconhecido', async () => {
    getProductOptions.mockResolvedValue([GRUPO_MATERIAL_QUEBRADO])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-vazio' }],
    })).rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('ConsultarOpcoesProduto') as unknown as string })
  })

  it('grupo obrigatório sem NENHUMA opção válida cadastrada: erro TÉCNICO (500), nunca pergunta de negócio', async () => {
    const grupoSemOpcaoValida: OptionGroup = { ...GRUPO_MATERIAL_QUEBRADO, produto_opcao_item: [GRUPO_MATERIAL_QUEBRADO.produto_opcao_item[1]!] }
    getProductOptions.mockResolvedValue([grupoSemOpcaoValida])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1 }))
      .rejects.toMatchObject({ statusCode: 500 })
  })
})

describe('setCartItem — texto_livre (migration 114): agente pede e valida o texto, mesmo padrão dos tipos pré-existentes', () => {
  const GRUPO_TEXTO: OptionGroup = {
    id: 'grupo-texto',
    produto_id: 'produto-1',
    nome: 'Nome para gravar',
    tipo: 'texto_livre',
    obrigatorio: true,
    min_selecoes: 1,
    max_selecoes: 1,
    ordem: 0,
    texto_max_caracteres: 20,
    texto_placeholder: null,
    arquivo_tipos_aceitos: null,
    arquivo_tamanho_maximo_mb: null,
    produto_opcao_item: [
      { id: 'item-texto', grupo_id: 'grupo-texto', nome: 'Nome para gravar', preco_delta: 5, selecionado_padrao: false, ativo: true, ordem: 0, foto_url: null },
    ],
  }

  it('obrigatório com opcao_item_id mas SEM valor_texto: 422 pedindo o texto — nunca satisfeito só com o id', async () => {
    getProductOptions.mockResolvedValue([GRUPO_TEXTO])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-texto' }],
    })).rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('Texto necessário') as unknown as string })
  })

  it('obrigatório sem NENHUMA opção enviada (migration 127): NÃO bloqueia mais — item entra no carrinho, pendência vira responsabilidade de missing_fields', async () => {
    getProductOptions.mockResolvedValue([GRUPO_TEXTO])
    const { supabase, upsertPayload, inseridoOpcoes } = buildSupabase()

    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1 }))
      .resolves.toEqual({ subtotal: 0 })

    expect(upsertPayload).toHaveBeenCalled()
    // Nada foi submetido pro grupo texto_livre — resolved fica vazio, nenhuma
    // linha (nem parcial/errada) é gravada em cart_item_options.
    expect(inseridoOpcoes).not.toHaveBeenCalled()
  })

  it('texto acima do limite configurado: 422 nomeando o limite', async () => {
    getProductOptions.mockResolvedValue([GRUPO_TEXTO])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-texto', valor_texto: 'um texto bem mais longo do que vinte caracteres' }],
    })).rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('20 caracteres') as unknown as string })
  })

  it('texto válido: congela valor_texto em cart_items_opcoes e inclui o texto na assinatura', async () => {
    getProductOptions.mockResolvedValue([GRUPO_TEXTO])
    const { supabase, upsertPayload, inseridoOpcoes } = buildSupabase()

    await setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-texto', valor_texto: 'Maria' }],
    })

    // Assinatura inclui o texto: dois pedidos do mesmo produto com textos
    // DIFERENTES precisam virar linhas distintas do carrinho, nunca colidir.
    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ options_signature: 'item-texto:Maria' }))
    expect(inseridoOpcoes).toHaveBeenCalledWith([
      { cart_item_id: 'novo-cart-item', option_item_id: 'item-texto', frozen_name: 'Nome para gravar', text_value: 'Maria', frozen_price_delta: 5 },
    ])
  })
})

describe('setCartItem — upload_arquivo (migration 114): item entra no carrinho sem a arte, pendência fica pra missing_fields', () => {
  const GRUPO_ARTE: OptionGroup = {
    id: 'grupo-arte',
    produto_id: 'produto-1',
    nome: 'Arte da estampa',
    tipo: 'upload_arquivo',
    obrigatorio: true,
    min_selecoes: 1,
    max_selecoes: 1,
    ordem: 0,
    texto_max_caracteres: null,
    texto_placeholder: null,
    arquivo_tipos_aceitos: ['application/pdf'],
    arquivo_tamanho_maximo_mb: 10,
    produto_opcao_item: [
      { id: 'item-arte', grupo_id: 'grupo-arte', nome: 'Arte da estampa', preco_delta: 0, selecionado_padrao: false, ativo: true, ordem: 0, foto_url: null },
    ],
  }

  it('obrigatório SEM nenhuma opção enviada: NÃO bloqueia — o modelo não tem como coletar a arte no mesmo tool call que adiciona o item', async () => {
    getProductOptions.mockResolvedValue([GRUPO_ARTE])
    const { supabase, upsertPayload } = buildSupabase()

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ options_signature: '' }))
  })

  it('diferir:true na âncora upload_arquivo (migration 127, "enviar depois"): grava via deferArt, nunca bloqueia nem entra na assinatura', async () => {
    getProductOptions.mockResolvedValue([GRUPO_ARTE])
    const { supabase, upsertPayload } = buildSupabase()

    await setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'item-arte', diferir: true }],
    })

    expect(deferArt).toHaveBeenCalledWith(supabase, {
      cartItemId: 'novo-cart-item',
      opcaoItemId: 'item-arte',
      nomeCongelado: 'Arte da estampa',
      precoDeltaCongelado: 0,
    })
    // diferir não é uma "opção escolhida" que diferencia linhas do carrinho.
    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ options_signature: '' }))
  })

  it('diferir:true num opcao_item_id que não é âncora upload_arquivo deste produto: 422 técnico', async () => {
    getProductOptions.mockResolvedValue([GRUPO_ARTE])
    const { supabase } = buildSupabase()

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 1,
      opcoes: [{ opcao_item_id: 'id-invalido', diferir: true }],
    })).rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('diferir') as unknown as string })
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

    expect(updatePayload).toHaveBeenCalledWith({ quantity: 5 })
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
      produto: { id: 'produto-1', available: true, stock_control: 'contagem', current_stock: 2 },
    })

    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 5 }))
      .rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining('2') as unknown as string })
  })

  it('controle_estoque=contagem com estoque suficiente: passa normalmente', async () => {
    const { supabase, upsertPayload } = buildSupabase({
      produto: { id: 'produto-1', available: true, stock_control: 'contagem', current_stock: 10 },
    })

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 3 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 }))
  })

  it('controle_estoque=producao_diaria com capacidade do dia esgotada: 422 de negócio', async () => {
    const { supabase } = buildSupabase({
      produto: { id: 'produto-1', available: true, stock_control: 'producao_diaria', daily_production_limit: 10 },
      movimentacoes: [{ entity_id: 'produto-1', quantity: -8 }],
    })

    // 10 de limite, 8 já usados hoje → restam 2, pedido de 5 estoura.
    await expect(setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 5 }))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('controle_estoque=nenhum (default): nunca bloqueia, mesmo com quantidade grande', async () => {
    const { supabase, upsertPayload } = buildSupabase({
      produto: { id: 'produto-1', available: true, stock_control: 'nenhum' },
    })

    await setCartItem(supabase, { sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 500 })

    expect(upsertPayload).toHaveBeenCalledWith(expect.objectContaining({ quantity: 500 }))
  })

  it('atalho por cart_item_id NÃO pula o soft-check — mesma regra de estoque do caminho por produto_id', async () => {
    const { supabase } = buildSupabase({
      cartItemPorId: { id: 'linha-existente', product_id: 'produto-1' },
      produto: { id: 'produto-1', available: true, stock_control: 'contagem', current_stock: 1 },
    })

    await expect(setCartItem(supabase, {
      sessao_id: 'sessao-1', produto_id: 'produto-1', quantidade: 4, cart_item_id: 'linha-existente',
    })).rejects.toMatchObject({ statusCode: 422 })
  })
})

import { describe, it, expect } from 'vitest'
import { buildCustomerBriefing } from './buildBriefing'
import type {
  IntegrationBusinessContext,
  IntegrationCustomerProfile,
  IntegrationCustomerState,
  IntegrationOperationalState,
  IntegrationNextAction,
} from '#shared/types/integration'

describe('buildCustomerBriefing', () => {
  const mockBusiness: IntegrationBusinessContext = {
    id: 'loja-1',
    name: 'Pizzaria Teste',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    sales: { allow_stock: true, allow_preorder: true },
    delivery: { allow_delivery: true, allow_pickup: true },
  }

  const mockProfile: IntegrationCustomerProfile = {
    id: 'cli-1',
    name: 'Maria Silva',
    telefone_whatsapp: '5511999999999',
    whatsapp_lid: null,
    is_visitante: false,
    is_new_customer: false,
    status: 'Ativo',
    preferences: {
      consumption: [],
      preferred_payment: 'pix',
      preferred_delivery: 'entrega',
      favorite_products: [],
      ingredient_preferences: { without: [] },
    },
    staff_notes: [],
    statistics: { total_orders: 5, average_ticket: 45.0, last_order_days: 2 },
    preferred_address: { exists: true, id: 'end-1', formatted: 'Rua A, 123, Centro - São Paulo' },
    addresses: [
      {
        id: 'end-1',
        rua: 'Rua A',
        numero: '123',
        bairro: 'Centro',
        complemento: null,
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01000-000',
        apelido: 'Casa',
        padrao: true,
      },
    ],
    recent_orders: [
      {
        id: 'ped-1',
        criado_em: '2026-07-20T10:00:00Z',
        status: 'concluido',
        valor_total: 45.0,
        resumo: '1× Pizza Calabresa',
        nota_atendimento: null,
      },
    ],
  }

  const mockState: IntegrationCustomerState = {
    session: { id: 'sess-1', url: 'https://teste.app/carrinho' },
    cart: {
      has_open_cart: true,
      total_items: 2,
      subtotal: 138.0,
      summary_text: '2× Pizza Cinco Queijos',
      items: [
        {
          id: 'cart-item-1',
          produto_id: 'b281ce2d-9396-47f6-8889-62006400208e',
          nome: 'Pizza Cinco Queijos',
          preco_unitario: 69.0,
          quantidade: 2,
          subtotal: 138.0,
          opcoes: [],
          fulfillment: { delivery_mode: null, address_id: null },
        },
      ],
      desconto: 13.8,
      desconto_descricao: ['Desconto Progressivo'],
      incentive: { tipo: 'progressivo', faltam: 1, unidade: 'itens', desconto_percentual: 15 },
      checkout: { delivery_mode: null, payment_method: null, address_id: null },
      missing_fields: [],
    },
    preorder: { has_pending_preorder: false, summary_text: null },
    conversation: {
      current_flow: 'stock',
      current_stage: 'waiting_modality',
      next_expected_information: 'modality',
      required_tool: null,
      can_finalize: false,
    },
  }

  const mockOperational: IntegrationOperationalState = {
    store_open: true,
    store_status_message: 'Aberta até 23:00',
    pix_key: 'pix@pizzaria.com',
    payment_methods: ['pix', 'dinheiro', 'cartao'],
    agenda: {
      window_days: 14,
      today: '2026-07-24',
      first_available_date: '2026-07-25',
      first_available_text: '25/07 (amanhã)',
      availability_summary: 'Agenda disponível',
      requires_tool_for_validation: true,
    },
  }

  const askModality: IntegrationNextAction = {
    code: 'ASK_MODALITY',
    instruction: 'Pergunte se e ENTREGA ou RETIRADA. Nada mais nesta mensagem.',
    tool: null,
    note: null,
  }

  it('gera o briefing determinístico com os dados formatados', () => {
    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: mockProfile,
      customerState: mockState,
      operational: mockOperational,
      nextAction: askModality,
      contatoNome: 'Maria Silva',
    })

    expect(result).toContain('AGORA:')
    expect(result).toContain('CALENDARIO OFICIAL (use SEMPRE estas datas, nunca calcule de cabeca):')
    expect(result).toContain('<= HOJE')
    expect(result).toContain('MES PARA O PARAMETRO month:')
    expect(result).toContain('LOJA: ABERTA - Aberta até 23:00 | aceita entrega e retirada')
    expect(result).toContain('PAGAMENTOS: pix, dinheiro, cartao | chave pix: pix@pizzaria.com')
    expect(result).toContain('CLIENTE: Maria Silva | status Ativo | 5 pedidos anteriores | prefere pix e entrega')
    expect(result).toContain('ULTIMO PEDIDO: 1× Pizza Calabresa em 2026-07-20 (concluido)')
    expect(result).toContain('ENDERECO SALVO: Rua A, 123, Centro - São Paulo [endereco_id=end-1]')
    // Carrinho com produto_id completo por item (ganho direto do payload).
    expect(result).toContain('CARRINHO (pronta entrega): 2 itens = R$ 138,00')
    expect(result).toContain('produto_id=b281ce2d-9396-47f6-8889-62006400208e')
    expect(result).toContain('cart_item_id=cart-item-1')
    // Desconto aplicado e incentivo de upsell visíveis ao agente.
    expect(result).toContain('DESCONTO APLICADO: -R$ 13,80 (Desconto Progressivo)')
    expect(result).toContain('faltam 1 itens para o cliente ganhar 15% de desconto')
    expect(result).toContain('>>> PROXIMO PASSO OBRIGATORIO')
    expect(result).toContain('Pergunte se e ENTREGA ou RETIRADA. Nada mais nesta mensagem.')
  })

  it('mostra as opções escolhidas de uma linha do carrinho (migration 110 — borda, sabor, tamanho...)', () => {
    const stateComOpcoes: IntegrationCustomerState = {
      ...mockState,
      cart: {
        ...mockState.cart,
        items: [
          {
            id: 'cart-item-2',
            produto_id: 'produto-pizza',
            nome: 'Pizza Calabresa',
            preco_unitario: 53,
            quantidade: 1,
            subtotal: 53,
            opcoes: [{ opcao_item_id: 'op-catupiry', nome_congelado: 'Catupiry', preco_delta_congelado: 8 }],
            fulfillment: { delivery_mode: null, address_id: null },
          },
        ],
      },
    }

    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: mockProfile,
      customerState: stateComOpcoes,
      operational: mockOperational,
      nextAction: askModality,
      contatoNome: 'Maria Silva',
    })

    expect(result).toContain('opcoes: Catupiry')
  })

  it('item de carrinho sem opção nenhuma não mostra o sufixo "opcoes:"', () => {
    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: mockProfile,
      customerState: mockState,
      operational: mockOperational,
      nextAction: askModality,
      contatoNome: 'Maria Silva',
    })

    expect(result).not.toContain('opcoes:')
  })

  it('anexa a nota do atendente ao ULTIMO PEDIDO quando presente (item 4b — pós-venda)', () => {
    const profileComNota: IntegrationCustomerProfile = {
      ...mockProfile,
      recent_orders: [{ ...mockProfile.recent_orders[0]!, nota_atendimento: 'Atraso por trânsito, previsão 15h' }],
    }

    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: profileComNota,
      customerState: mockState,
      operational: mockOperational,
      nextAction: askModality,
      contatoNome: 'Maria Silva',
    })

    expect(result).toContain('ULTIMO PEDIDO: 1× Pizza Calabresa em 2026-07-20 (concluido) | obs. da loja: Atraso por trânsito, previsão 15h')
  })

  it('sem nota do atendente, ULTIMO PEDIDO fica igual a antes (sem o sufixo)', () => {
    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: mockProfile,
      customerState: mockState,
      operational: mockOperational,
      nextAction: askModality,
      contatoNome: 'Maria Silva',
    })

    expect(result).toContain('ULTIMO PEDIDO: 1× Pizza Calabresa em 2026-07-20 (concluido)')
    expect(result).not.toContain('obs. da loja')
  })

  it('calendário oficial começa em HOJE e tem exatamente 8 dias', () => {
    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: mockProfile,
      customerState: mockState,
      operational: mockOperational,
      nextAction: askModality,
    })

    const linhas = result.split('\n')
    const inicio = linhas.findIndex((l) => l.startsWith('CALENDARIO OFICIAL'))
    const dias = linhas.slice(inicio + 1, inicio + 9)
    expect(dias).toHaveLength(8)
    expect(dias[0]).toContain('<= HOJE')
    // Data no formato YYYY-MM-DD como primeiro token (o modelo copia o primeiro).
    expect(String(dias[0]).trim()).toMatch(/^\d{4}-\d{2}-\d{2}\b/)
  })

  it('renderiza OBSERVACAO quando o next_action traz nota', () => {
    const comNota: IntegrationNextAction = {
      ...askModality,
      note: 'O cliente tem (2× Pizza) no pedido de pronta entrega. Lembre-o de fechar.',
    }
    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: mockProfile,
      customerState: mockState,
      operational: mockOperational,
      nextAction: comNota,
    })
    expect(result).toContain('OBSERVACAO: O cliente tem (2× Pizza)')
    // Sem prefixo duplicado de ATENCAO/ATENÇÃO.
    expect(result).not.toMatch(/ATEN[CÇ][AÃ]O:\s*ATEN/i)
  })

  it('trata adequadamente cliente sem cadastro / contexto inicial', () => {
    const emptyState: IntegrationCustomerState = {
      session: { id: null, url: null },
      cart: { has_open_cart: false, total_items: 0, subtotal: 0, summary_text: null, items: [], desconto: 0, desconto_descricao: [], incentive: null, checkout: { delivery_mode: null, payment_method: null, address_id: null }, missing_fields: [] },
      preorder: { has_pending_preorder: false, summary_text: null },
      conversation: {
        current_flow: 'general',
        current_stage: 'discovery',
        next_expected_information: 'product',
        required_tool: 'BuscarProdutos',
        can_finalize: false,
      },
    }

    const searchProduct: IntegrationNextAction = {
      code: 'SEARCH_PRODUCT',
      instruction: 'O cliente ainda nao tem produto definido. Chame BuscarProdutos antes de responder qualquer coisa sobre itens, sabores ou precos.',
      tool: 'BuscarProdutos',
      note: null,
    }

    const result = buildCustomerBriefing({
      business: mockBusiness,
      customerProfile: null,
      customerState: emptyState,
      operational: mockOperational,
      nextAction: searchProduct,
    })

    expect(result).toContain('CLIENTE: cliente | status - | 0 pedidos anteriores')
    expect(result).toContain('CARRINHO (pronta entrega): vazio (nenhum item de pronta entrega adicionado)')
    expect(result).toContain('ENDERECO SALVO: nenhum.')
    expect(result).toContain('Chame BuscarProdutos antes de responder')
  })
})

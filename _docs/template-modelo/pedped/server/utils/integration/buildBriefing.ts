import type {
  IntegrationBusinessContext,
  IntegrationCustomerProfile,
  IntegrationCustomerState,
  IntegrationOperationalState,
  IntegrationNextAction,
} from '#shared/types/integration'

function brl(v: number | null | undefined): string {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',')
}

/** Remove acentos para não misturar grafias no texto do briefing (contexto, não mensagem). */
function deburr(v: string): string {
  return v.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

interface DateParts {
  weekday: string
  day: string
  month: string
  year: string
  hour: string
  minute: string
}

function getSaoPauloParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value
    }
  }

  const hour = (map.hour || '00').padStart(2, '0')
  const minute = (map.minute || '00').padStart(2, '0')

  return {
    weekday: deburr((map.weekday || '').toLowerCase()),
    day: map.day || '01',
    month: map.month || '01',
    year: map.year || '2026',
    hour,
    minute,
  }
}

export interface BuildBriefingInput {
  business: IntegrationBusinessContext
  customerProfile: IntegrationCustomerProfile | null
  customerState: IntegrationCustomerState
  operational: IntegrationOperationalState
  /** Próximo passo já resolvido (fonte única — ver `resolveNextAction`). */
  nextAction: IntegrationNextAction
  contatoNome?: string
}

export function buildCustomerBriefing(input: BuildBriefingInput): string {
  const { business, customerProfile, customerState, operational, nextAction, contatoNome } = input

  const now = new Date()
  const pNow = getSaoPauloParts(now)

  // ── Calendário absoluto de 8 dias (0 a 7), data YYYY-MM-DD primeiro ──
  const rotulos: Record<number, string> = { 0: 'HOJE', 1: 'AMANHA', 2: 'DEPOIS DE AMANHA' }
  const cal: string[] = []
  for (let i = 0; i <= 7; i++) {
    const p = getSaoPauloParts(new Date(now.getTime() + i * 24 * 60 * 60 * 1000))
    const base = `  ${p.year}-${p.month}-${p.day} ${p.weekday}`
    cal.push(rotulos[i] ? base.padEnd(30) + '<= ' + rotulos[i] : base)
  }

  // ── Loja / pagamentos ──
  const modalidades = [
    business.delivery.allow_delivery ? 'entrega' : '',
    business.delivery.allow_pickup ? 'retirada' : '',
  ].filter(Boolean).join(' e ') || 'consultar'
  const payments = (operational.payment_methods || []).join(', ') || 'consultar'

  // ── Cliente ──
  const prefs = customerProfile?.preferences
  const totalOrders = customerProfile?.statistics?.total_orders ?? 0
  const pedidosTxt = totalOrders === 1 ? '1 pedido anterior' : `${totalOrders} pedidos anteriores`
  const prefereTxt = prefs?.preferred_payment || prefs?.preferred_delivery
    ? ' | prefere ' + [prefs?.preferred_payment, prefs?.preferred_delivery].filter(Boolean).join(' e ')
    : ''
  const clienteTxt = `${contatoNome || customerProfile?.name || 'cliente'} | status ${customerProfile?.status || '-'} | ${pedidosTxt}${prefereTxt}`

  const ult = customerProfile?.recent_orders?.[0]
  // `nota_atendimento` (migration 109) é a nota do ATENDENTE sobre o
  // andamento do pedido — dá ao agente contexto real pra responder o
  // pós-venda ("como está meu pedido?") em vez de só o status do kanban.
  const ultTxt = ult
    ? (ult.resumo || 'pedido') + ' em ' + String(ult.criado_em || '').slice(0, 10) + ' (' + (ult.status || '') + ')'
      + (ult.nota_atendimento ? ' | obs. da loja: ' + ult.nota_atendimento : '')
    : 'nenhum'

  // ── Endereço salvo preferencial (oferecer explicitamente) ──
  const savedAddr = customerProfile?.preferred_address
  const enderecoLinhas = savedAddr?.exists && savedAddr.id
    ? [
        `ENDERECO SALVO: ${savedAddr.formatted || 'endereco'} [endereco_id=${savedAddr.id}]`,
        '  Se o cliente escolher entrega, OFERECA este endereco. So chame ConsultarEnderecoEntrega se ele informar um endereco DIFERENTE.',
      ]
    : ['ENDERECO SALVO: nenhum. Se for entrega, peca rua, numero e cidade e chame ConsultarEnderecoEntrega.']

  // ── Carrinho (com produto_id por item, desconto e incentivo de upsell) ──
  const cart = customerState.cart
  const cartLinhas: string[] = []
  if (cart.has_open_cart) {
    cartLinhas.push(`CARRINHO (pronta entrega): ${cart.total_items} itens = ${brl(cart.subtotal)}`)
    for (const item of cart.items) {
      // opcoes (migration 110): já inclusas no preco_unitario. cart_item_id é
      // o que DefinirItemCarrinho usa pra reduzir/remover esta linha exata
      // sem recompor a combinacao de opcoes de memoria entre turnos.
      const opcoesTxt = item.opcoes.length > 0
        ? ` | opcoes: ${item.opcoes.map((o) => o.nome_congelado).join(', ')}`
        : ''
      cartLinhas.push(`  - ${item.nome} | ${item.quantidade} un | ${brl(item.preco_unitario)} cada | produto_id=${item.produto_id} | cart_item_id=${item.id}${opcoesTxt}`)
    }
    if (cart.desconto > 0) {
      const nome = cart.desconto_descricao[0]
      cartLinhas.push(`DESCONTO APLICADO: -${brl(cart.desconto)}${nome ? ' (' + nome + ')' : ''} | total com desconto ${brl(cart.subtotal - cart.desconto)}`)
    }
    if (cart.incentive) {
      const alvo = cart.incentive.unidade === 'reais' ? brl(cart.incentive.faltam) : `${cart.incentive.faltam} ${cart.incentive.unidade}`
      cartLinhas.push(`INCENTIVO (oferte para vender mais): faltam ${alvo} para o cliente ganhar ${cart.incentive.desconto_percentual}% de desconto.`)
    }
  } else {
    cartLinhas.push('CARRINHO (pronta entrega): vazio (nenhum item de pronta entrega adicionado)')
  }

  // ── Encomenda / agenda ──
  const preorder = customerState.preorder
  const encTxt = preorder.has_pending_preorder ? (preorder.summary_text || 'ha encomenda pendente') : 'nenhuma'
  const agendaTxt = `primeira data ${operational.agenda.first_available_date} — sempre confirme com ConsultarDatasEncomenda`

  // ── Próximo passo obrigatório (fonte única: next_action) ──
  const proximo = ['>>> PROXIMO PASSO OBRIGATORIO', nextAction.instruction]
  if (nextAction.note) {
    proximo.push('OBSERVACAO: ' + nextAction.note)
  }

  return [
    `AGORA: ${pNow.weekday}, ${pNow.day}/${pNow.month}/${pNow.year} ${pNow.hour}:${pNow.minute} (America/Sao_Paulo)`,
    '',
    'CALENDARIO OFICIAL (use SEMPRE estas datas, nunca calcule de cabeca):',
    cal.join('\n'),
    `MES PARA O PARAMETRO month: ${pNow.year}-${pNow.month}`,
    '',
    `LOJA: ${operational.store_open ? 'ABERTA' : 'FECHADA'} - ${operational.store_status_message || ''} | aceita ${modalidades}`,
    `PAGAMENTOS: ${payments} | chave pix: ${operational.pix_key || 'nao informada'}`,
    '',
    'CLIENTE: ' + clienteTxt,
    'ULTIMO PEDIDO: ' + ultTxt,
    ...enderecoLinhas,
    '',
    ...cartLinhas,
    'ENCOMENDA PENDENTE: ' + encTxt,
    'AGENDA DE ENCOMENDAS: ' + agendaTxt,
    '',
    ...proximo,
  ].join('\n')
}

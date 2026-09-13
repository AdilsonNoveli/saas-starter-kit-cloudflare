import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type {
  IntegrationCustomerContext,
  IntegrationCustomerAddress,
  IntegrationRecentOrder,
  IntegrationBusinessContext,
  IntegrationCustomerProfile,
  IntegrationCustomerState,
  IntegrationOperationalState,
} from '#shared/types/integration'
import type { OperationStatus, StoreScheduleConfig } from '#shared/types/store'
import { findOrCreateCustomer } from '../customers/findOrCreateCustomer'
import { sanitizeContactName } from '../customers/sanitizeContactName'
import { getCartState } from '../cart/state'
import { buildCatalogUrl } from '../sessions/createCatalogSession'
import { calculateStoreStatus } from '../store/calculateStoreStatus'
import { buildCustomerBriefing } from './buildBriefing'
import { resolveNextAction } from './resolveNextAction'

/**
 * `ConsultarContextoCliente` — extraída de `customers/context.post.ts`
 * (seção 6 da arquitetura do agente WhatsApp). Devolve o contexto completo
 * (negócio + cliente + carrinho + próxima ação) que o agente/n8n consulta no
 * início de cada turno.
 */
export interface GetCustomerContextParams {
  whatsapp?: string
  lid?: string
  nome?: string
}

interface RecentOrderRow {
  id: string
  created_at: string
  status: string
  total_amount: number | null
  service_note: string | null
  order_items: Array<{
    quantity: number
    frozen_product_name: string | null
    products: { name: string } | null
  }>
}

export async function getCustomerContext(
  supabase: SupabaseClient<Database>,
  params: GetCustomerContextParams,
): Promise<IntegrationCustomerContext> {
  // ─── 1. BUSINESS CONTEXT ─────────────────────────────────────────────────
  const { data: lojaRaw } = await supabase
    .from('store')
    .select('id, trade_name, pix_key, support_whatsapp_number, allows_pickup, operation_status, status_override_date, hours_config')
    .limit(1)
    .maybeSingle()

  const storeStatus = lojaRaw
    ? calculateStoreStatus(
        lojaRaw.operation_status as OperationStatus,
        lojaRaw.hours_config as StoreScheduleConfig | null,
        lojaRaw.status_override_date as string | null,
      )
    : { isOpen: false, mensagem: 'Loja não configurada.' }

  const business: IntegrationBusinessContext = {
    id: lojaRaw?.id ?? 'loja-principal',
    name: lojaRaw?.trade_name ?? 'Pizzaria Modelo',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    sales: {
      allow_stock: true,
      allow_preorder: true,
    },
    delivery: {
      allow_delivery: true,
      allow_pickup: lojaRaw?.allows_pickup ?? true,
    },
  }

  // Se nenhum identificador fornecido: solicitar WhatsApp
  if (!params.whatsapp && !params.lid) {
    const operationalEmpty: IntegrationOperationalState = {
      store_open: storeStatus.isOpen,
      store_status_message: storeStatus.mensagem,
      pix_key: (lojaRaw?.pix_key as string | null) ?? null,
      payment_methods: ['pix', 'dinheiro', 'cartao'],
      agenda: {
        window_days: 14,
        today: new Date().toISOString().slice(0, 10),
        first_available_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        first_available_text: 'amanhã',
        availability_summary: 'Há disponibilidade para encomendas nos próximos 14 dias.',
        requires_tool_for_validation: true,
      },
    }

    const nextActionEmpty = resolveNextAction({
      actionRequired: 'collect_whatsapp',
      storeOpen: storeStatus.isOpen,
      currentFlow: 'general',
      needsProductSearch: true,
      quantityLimits: null,
      needsCalendarValidation: false,
      preorderProductId: null,
      agendaMonth: '',
      missingFields: [],
      hasCartItems: false,
      savedAddress: null,
      paymentMethods: operationalEmpty.payment_methods,
      canFinalize: false,
      note: null,
    })

    const emptyCustomerState: IntegrationCustomerState = {
      session: { id: null, url: null },
      cart: { has_open_cart: false, total_items: 0, subtotal: 0, summary_text: null, items: [], desconto: 0, desconto_descricao: [], incentive: null, checkout: { delivery_mode: null, payment_method: null, address_id: null }, missing_fields: [] },
      preorder: { has_pending_preorder: false, summary_text: null },
      conversation: {
        current_flow: 'general',
        current_stage: 'discovery',
        next_expected_information: 'product',
        required_tool: nextActionEmpty.tool,
        can_finalize: false,
      },
    }

    const briefingEmpty = buildCustomerBriefing({
      business,
      customerProfile: null,
      customerState: emptyCustomerState,
      operational: operationalEmpty,
      nextAction: nextActionEmpty,
      // Cliente ainda não resolvido (sem whatsapp/lid) — não há `customer.nome`
      // sanitizado para usar aqui, então `params.nome` cru precisa passar pelo
      // mesmo sanitizador de `findOrCreateCustomer` antes de entrar no
      // BRIEFING DO SISTEMA (ver `sanitizeContactName.ts`).
      contatoNome: sanitizeContactName(params.nome),
    })

    return {
      action_required: 'collect_whatsapp',
      briefing: briefingEmpty,
      next_action: nextActionEmpty,
      business,
      customer_profile: null,
      customer_state: emptyCustomerState,
      operational: operationalEmpty,
    }
  }

  const customer = await findOrCreateCustomer(supabase, {
    whatsapp: params.whatsapp,
    lid: params.lid,
    nome: params.nome,
  })

  // ─── 2. GARBAGE COLLECTION PROATIVO DE SESSÕES EXPIRADAS ────────────────
  const nowIso = new Date().toISOString()
  await supabase
    .from('sessions')
    .update({ status: 'expirada' })
    .eq('customer_id', customer.id)
    .eq('status', 'ativa')
    .lte('expires_at', nowIso)

  // Consultas paralelas limpas
  const [profileRes, addressesRes, ordersRes, sessionRes, ordersCountRes] = await Promise.all([
    supabase
      .from('customers')
      .select('is_guest, has_pending_issues, context_summary, preferences, preferred_channel, status, total_orders')
      .eq('id', customer.id)
      .single(),
    supabase
      .from('customer_addresses')
      .select('id, street, number, neighborhood, complement, city, state, zip_code, label, is_default')
      .eq('customer_id', customer.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('orders')
      .select('id, created_at, status, total_amount, service_note, order_items (quantity, frozen_product_name, products (name))')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1), // Retorna apenas o ÚLTIMO pedido para contexto limpo sem ruído
    supabase
      .from('sessions')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('status', 'ativa')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // total_orders = todos os pedidos do cliente (mesma regra do recent_orders:
    // sem filtro de status). Fonte confiável para reconhecer cliente recorrente,
    // já que customers.total_orders só conta entregas concluídas.
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer.id),
  ])

  const enderecos: IntegrationCustomerAddress[] = (addressesRes.data ?? []).map((a) => ({
    id: a.id,
    rua: a.street,
    numero: a.number,
    bairro: a.neighborhood,
    complemento: a.complement,
    cidade: a.city,
    estado: a.state,
    cep: a.zip_code,
    apelido: a.label,
    padrao: a.is_default ?? false,
  }))

  const ultimos_pedidos: IntegrationRecentOrder[] = (
    (ordersRes.data ?? []) as unknown as RecentOrderRow[]
  ).map((p) => ({
    id: p.id,
    criado_em: p.created_at,
    status: p.status,
    valor_total: Number(p.total_amount ?? 0),
    resumo: p.order_items
      .map((i) => i.quantity + '× ' + (i.products?.name ?? i.frozen_product_name ?? 'item'))
      .join(', '),
    nota_atendimento: p.service_note,
  }))

  // ─── 3. ESTADO DO CARRINHO E SESSÃO LIMPOS ─────────────────────────────
  let sessaoState: IntegrationCustomerState['session'] = { id: null, url: null }
  let cartState: IntegrationCustomerState['cart'] = {
    has_open_cart: false,
    total_items: 0,
    subtotal: 0,
    summary_text: null,
    items: [],
    desconto: 0,
    desconto_descricao: [],
    incentive: null,
    checkout: { delivery_mode: null, payment_method: null, address_id: null },
    missing_fields: [],
  }

  if (sessionRes.data) {
    const fullCart = await getCartState(supabase, sessionRes.data.id)
    const hasCartItems = fullCart.total_itens > 0

    if (hasCartItems) {
      sessaoState = {
        id: sessionRes.data.id,
        url: buildCatalogUrl(sessionRes.data.id),
      }
      cartState = {
        has_open_cart: true,
        total_items: fullCart.total_itens,
        subtotal: fullCart.subtotal,
        summary_text: fullCart.itens.map((i) => i.quantidade + '× ' + i.nome).join(', '),
        items: fullCart.itens,
        desconto: fullCart.desconto,
        desconto_descricao: fullCart.desconto_descricao,
        incentive: fullCart.incentive,
        checkout: fullCart.checkout,
        missing_fields: fullCart.missing_fields,
      }
    }
  }

  // ─── 4. PROFILE LIMPO E SEM DADOS MORTOS ─────────────────────────────────
  const enderecoPadrao = enderecos.find((a) => a.padrao) || enderecos[0] || null
  const preferredAddressFormatted = enderecoPadrao
    ? enderecoPadrao.rua + ', ' + enderecoPadrao.numero + (enderecoPadrao.bairro ? ', ' + enderecoPadrao.bairro : '') + (enderecoPadrao.cidade ? ' - ' + enderecoPadrao.cidade : '')
    : null

  const customer_profile: IntegrationCustomerProfile = {
    id: customer.id,
    name: customer.nome || 'Cliente',
    telefone_whatsapp: customer.telefoneWhatsapp,
    whatsapp_lid: customer.whatsappLid,
    is_visitante: profileRes.data?.is_guest ?? true,
    is_new_customer: customer.isNew,
    status: profileRes.data?.status ?? 'Novo',
    preferences: {
      consumption: profileRes.data?.preferences ? [profileRes.data.preferences] : [],
      // `null`, e não 'pix'/'entrega' fixos: o valor fixo entrava no briefing
      // como "prefere pix e entrega" para TODO cliente — invenção injetada no
      // prompt, contra a REGRA 1 ("nunca invente"). Pior desde a Customer SKILL,
      // que traz a distribuição real (`payment_method`/`delivery_mode` com
      // percentual) e passaria a contradizer essa linha no mesmo prompt.
      // Quem sabe a preferência real é a SKILL; aqui a resposta honesta é "não sei".
      preferred_payment: null,
      preferred_delivery: null,
      favorite_products: [],
      ingredient_preferences: { without: [] },
    },
    staff_notes: profileRes.data?.context_summary ? [profileRes.data.context_summary] : [],
    statistics: {
      total_orders: ordersCountRes.count ?? ultimos_pedidos.length,
      average_ticket: ultimos_pedidos.length > 0 ? ultimos_pedidos.reduce((acc, curr) => acc + curr.valor_total, 0) / ultimos_pedidos.length : 0,
      last_order_days: ultimos_pedidos[0]?.criado_em ? Math.floor((Date.now() - new Date(ultimos_pedidos[0].criado_em).getTime()) / (1000 * 60 * 60 * 24)) : null,
    },
    preferred_address: {
      exists: !!enderecoPadrao,
      id: enderecoPadrao?.id ?? null,
      formatted: preferredAddressFormatted,
    },
    addresses: enderecos,
    recent_orders: ultimos_pedidos,
  }

  // ─── 5. OPERATIONAL STATE (Agenda Cal.com Leve) ─────────────────────────
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const todayIso = now.toISOString().slice(0, 10)
  const tomorrowIso = tomorrow.toISOString().slice(0, 10)
  const dayStr = String(tomorrow.getDate()).padStart(2, '0')
  const monthStr = String(tomorrow.getMonth() + 1).padStart(2, '0')

  const operational: IntegrationOperationalState = {
    store_open: storeStatus.isOpen,
    store_status_message: storeStatus.mensagem,
    pix_key: (lojaRaw?.pix_key as string | null) ?? null,
    payment_methods: ['pix', 'dinheiro', 'cartao'],
    agenda: {
      window_days: 14,
      today: todayIso,
      first_available_date: tomorrowIso,
      first_available_text: dayStr + '/' + monthStr + ' (amanhã)',
      availability_summary: 'Há disponibilidade para encomendas nos próximos 14 dias.',
      requires_tool_for_validation: true,
    },
  }

  // ─── 6. DECISION HINTS CRISTALINO (Zero Ruído) ────────────────────────────
  const currentFlow: IntegrationCustomerState['conversation']['current_flow'] =
    cartState.has_open_cart ? 'stock' : 'general'

  // Aviso de carrinho pendente só faz sentido FORA do fluxo de pronta entrega —
  // dentro dele o carrinho é o próprio assunto (correção 4c do payload-contexto).
  const showCartWarning = cartState.has_open_cart && currentFlow !== 'stock'
  const pendingWarning = showCartWarning
    ? 'O cliente tem (' + cartState.summary_text + ') no pedido de pronta entrega. Se concluir uma encomenda, lembre-o de fechar este pedido pendente.'
    : null

  // ─── 7. PRÓXIMO PASSO OBRIGATÓRIO (fonte única: resolveNextAction) ─────────
  // missing_fields (Feature 2.2) já reflete modalidade/endereço/pagamento
  // pendentes; decision_hints foi removido (Feature 2.3) por duplicar essa
  // decisão sem nunca tê-la derivado de verdade.
  const next_action = resolveNextAction({
    actionRequired: null,
    storeOpen: operational.store_open,
    currentFlow,
    needsProductSearch: !cartState.has_open_cart,
    quantityLimits: null,
    needsCalendarValidation: false,
    preorderProductId: null,
    agendaMonth: todayIso.slice(0, 7),
    missingFields: cartState.missing_fields,
    hasCartItems: cartState.has_open_cart,
    savedAddress: enderecoPadrao && preferredAddressFormatted
      ? { formatted: preferredAddressFormatted, id: enderecoPadrao.id }
      : null,
    paymentMethods: operational.payment_methods,
    // Sem sinal persistido de "cliente confirmou" — ver nota em
    // ResolveNextActionInput.canFinalize. Com tudo coletado, o passo natural
    // é CONFIRM_ORDER; o agente decide chamar o finalize a partir da própria
    // confirmação do cliente no turno seguinte (REGRA 2 do prompt).
    canFinalize: false,
    note: pendingWarning,
  })

  // ─── 8. ESTADO DA CONVERSA DETERMINÍSTICO (FSM) ───────────────────────────
  const conversationState: IntegrationCustomerState['conversation'] = {
    current_flow: currentFlow,
    current_stage: cartState.has_open_cart ? 'waiting_modality' : 'discovery',
    next_expected_information: cartState.has_open_cart ? 'modality' : 'product',
    // required_tool sempre coerente com o próximo passo (correção 5c do payload).
    required_tool: next_action.tool,
    can_finalize: false,
  }

  const customer_state: IntegrationCustomerState = {
    session: sessaoState,
    cart: cartState,
    preorder: {
      has_pending_preorder: false,
      summary_text: null,
    },
    conversation: conversationState,
  }

  const briefing = buildCustomerBriefing({
    business,
    customerProfile: customer_profile,
    customerState: customer_state,
    operational,
    nextAction: next_action,
    // NUNCA `params.nome` cru aqui: `customer.nome` já É esse valor, passado
    // por `sanitizeContactName` dentro de `findOrCreateCustomer` — usar o cru
    // de novo reabriria a mesma porta que o backfill acabou de fechar (o nome
    // vira `clienteTxt` dentro do BRIEFING DO SISTEMA, a seção que o prompt
    // chama de "fonte da verdade").
    contatoNome: customer.nome,
  })

  return {
    action_required: null,
    briefing,
    next_action,
    business,
    customer_profile,
    customer_state,
    operational,
  }
}

/**
 * Contrato ESTÁVEL e VERSIONADO da integração inbound (Fase 6.4).
 *
 * A aplicação é a fonte da verdade; o n8n (ou qualquer ferramenta) apenas
 * conversa. Trocar o n8n por outra ferramenta não deve exigir mudança na app.
 * Versão: v1 (rotas em `/api/integration/v1/...`).
 *
 * Regra anti-fraude: o cliente da integração NUNCA define preços. Envia apenas
 * `produto_id` + `quantidade`; preços/subtotal são congelados por trigger.
 *
 * Convenção: identificadores TypeScript em inglês; campos do payload seguem o
 * schema (Portuguese) por contrato direto com o banco.
 */

import type { ProductType } from '#shared/types/preorder'
import type { PromotionIncentive } from '#shared/types/promotion'
import type { SelectedOption } from '#shared/types/product'

/** Regras de encomenda expostas ao agente (só quando product_type='preorder'). */
export interface IntegrationPreorderRules {
  readonly min_quantity: number
  readonly max_quantity: number
  readonly min_lead_days: number
  readonly max_lead_days: number
}

/** Produto atrelado (venda casada) sugerido junto de outro — ver `relacionados`. */
export interface IntegrationRelatedProduct {
  readonly id: string
  readonly nome: string
  /** Preço EFETIVO a citar (preco_promocional ?? preco_venda). */
  readonly preco: number
}

/** Item do catálogo exposto ao agente (GET /products). */
export interface IntegrationProduct {
  readonly id: string
  readonly nome: string
  readonly descricao: string | null
  /** Preço de tabela (sem promoção). */
  readonly preco_venda: number
  /** Preço EFETIVO a citar ao cliente (preco_promocional ?? preco_venda). */
  readonly preco: number
  readonly em_promocao: boolean
  readonly unidade_medida: string
  readonly categoria: string | null
  /** Modo de venda: 'stock' (imediata), 'preorder' (encomenda) ou 'both'. */
  readonly product_type: ProductType
  /** Rótulo em linguagem natural para entendimento imediato da LLM. */
  readonly tipo_venda_label: string
  /** Regras de encomenda — presente SOMENTE quando o produto aceita encomenda. */
  readonly preorder?: IntegrationPreorderRules
  /**
   * Produtos atrelados (venda casada) para o agente ofertar junto — no máximo 3,
   * na ordem definida pelo lojista. Presente SOMENTE quando há atrelados
   * configurados; ausente = não ofertar nada (nunca inventar).
   */
  readonly relacionados?: readonly IntegrationRelatedProduct[]
  /**
   * `true` quando o produto tem grupo de opção/variação configurado (borda
   * recheada, "sem cebola", tamanho, cor...) — migration 110. O agente deve
   * chamar `ConsultarOpcoesProduto` antes de adicionar ao carrinho, nunca
   * adivinhar. `false` = produto simples, sem nada a perguntar.
   */
  readonly tem_opcoes: boolean
  /**
   * Unidades restantes AGORA, já considerando estoque + produção do dia
   * (migration 111 — Gestão de Estoque). `null` = sem controle de estoque
   * configurado (`controle_estoque='nenhum'`, a maioria dos produtos hoje) —
   * comportamento de sempre, nenhum limite. Nunca inventar um limite quando
   * este campo vier `null` (REGRA 1, ver QUANTITY_LIMITS_NOTE em
   * systemPrompt.ts — bug real de produção 05/08 motivou este campo).
   */
  readonly quantidade_disponivel: number | null
}

/** Resposta paginada de GET /api/integration/v1/products. */
export interface IntegrationProductsResponse {
  readonly data: readonly IntegrationProduct[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

/** Item do pedido inbound (sem preço — congelado no servidor). */
export interface IntegrationOrderItem {
  readonly produto_id: string
  readonly quantidade: number
  /**
   * Encomenda: data de entrega (YYYY-MM-DD). Obrigatória para produtos
   * product_type='preorder'; a app valida janela/dia/capacidade e reserva
   * atomicamente. Ignorada para produtos de venda imediata.
   */
  readonly delivery_date?: string
  /**
   * Fulfillment por-item (Feature 4.1 — EPIC 4): override SÓ deste item,
   * preservado em `itens_pedido`. Ausente = herda `pedidos.tipo_entrega`/
   * `endereco_id` (resolução de nível — comum promovido ao pedido).
   */
  readonly delivery_mode?: 'entrega' | 'retirada'
  readonly address_id?: string
}

/** Resposta de confirmação de entrega. */
export interface ConfirmDeliveryResponse {
  readonly success: true
  readonly orderId: string
  /** Próximo pedido reatribuído após a liberação (ou null se fila vazia). */
  readonly nextOrderId: string | null
}

// ─── Carrinho server-side (fluxo agentivo) ───────────────────────────────────
// O agente LLM nunca mantém estado: toda mutação devolve o estado COMPLETO do
// carrinho calculado pela aplicação (preço efetivo, promoções). Frete entra
// apenas no checkout (depende de endereço/tipo de entrega).

/**
 * Fulfillment RESOLVIDO de um item (Feature 4.1 — EPIC 4): override do item
 * (`cart_items.delivery_mode/address_id`) quando presente, senão herdado do
 * checkout do pedido. Simples no comum (tudo herda), poderoso no misto
 * (item diverge do padrão — ex.: pizza-retirada + bolo-entrega).
 */
export interface IntegrationItemFulfillment {
  readonly delivery_mode: 'entrega' | 'retirada' | null
  readonly address_id: string | null
}

/** Item do carrinho com preço efetivo congelado pela aplicação. */
export interface IntegrationCartItem {
  /**
   * `cart_items.id` (migration 110) — identificador ESTÁVEL da linha, para o
   * agente reduzir/remover um item com opções sem precisar recompor a
   * combinação de memória entre turnos (`DefinirItemCarrinho.cart_item_id`).
   */
  readonly id: string
  readonly produto_id: string
  readonly nome: string
  /** Preço unitário efetivo (preco_promocional ?? preco_venda), JÁ somando o delta das opções escolhidas. */
  readonly preco_unitario: number
  readonly quantidade: number
  readonly subtotal: number
  /** Opções/variações escolhidas (borda, sabor, tamanho...) — `[]` para produto sem opção. */
  readonly opcoes: readonly SelectedOption[]
  /** Data de entrega/retirada do item (produtos de encomenda). */
  readonly target_date?: string | null
  /** Observação livre do cliente para este item (ex.: mensagem no bolo). */
  readonly observacao?: string | null
  /**
   * Override de modalidade/endereço SÓ deste item (`null`/ausente = herda o
   * checkout do pedido). Gravado via `DefinirItemCarrinho` quando o item
   * diverge do padrão.
   */
  readonly delivery_mode?: 'entrega' | 'retirada' | null
  readonly address_id?: string | null
  /** Modalidade/endereço EFETIVOS deste item, já resolvidos (override ?? checkout). */
  readonly fulfillment: IntegrationItemFulfillment
}

/**
 * Estado de checkout persistido no servidor (EPIC 1 — PRD-REFATORACAO).
 * Gravado incrementalmente via `PATCH /cart`; o agente nunca o carrega —
 * apenas dispara a gravação e lê o retorno.
 */
export interface IntegrationCheckoutState {
  readonly delivery_mode: 'entrega' | 'retirada' | null
  readonly payment_method: 'pix' | 'dinheiro' | 'cartao' | null
  readonly address_id: string | null
}

/**
 * Pendência calculada pelo motor de `missing_fields` (EPIC 2 —
 * PRD-REFATORACAO). Fonte única de verdade sobre o que falta coletar antes
 * do checkout; `resolveNextAction` deriva o próximo passo daqui.
 */
export interface IntegrationMissingField {
  readonly scope: 'item' | 'order'
  readonly field: string
  /** Presente apenas quando `scope === 'item'`. */
  readonly item_id?: string
  /** Texto pronto para o agente perguntar ao cliente. */
  readonly prompt: string
}

/** Estado completo do carrinho — resposta de todas as operações de carrinho. */
export interface IntegrationCartState {
  readonly sessao_id: string
  readonly itens: readonly IntegrationCartItem[]
  /** Total de unidades no carrinho. */
  readonly total_itens: number
  readonly subtotal: number
  /** Desconto do motor de promoções (maior desconto vence, não acumula). */
  readonly desconto: number
  readonly desconto_descricao: readonly string[]
  /** subtotal - desconto. Frete é calculado no checkout. */
  readonly total: number
  /** Próximo nível de desconto a desbloquear (upsell), ou `null`. */
  readonly incentive: PromotionIncentive | null
  /** Estado de checkout coletado até agora (modalidade/pagamento/endereço). */
  readonly checkout: IntegrationCheckoutState
  /** Pendências antes do checkout, na ordem canônica do funil (vazio = pronto). */
  readonly missing_fields: readonly IntegrationMissingField[]
}

// ─── Contexto do cliente (primeira chamada do fluxo agentivo) ────────────────

/** Endereço salvo do cliente, disponível para reutilizar no checkout. */
export interface IntegrationCustomerAddress {
  readonly id: string
  readonly rua: string
  readonly numero: string
  readonly bairro: string
  readonly complemento: string | null
  readonly cidade: string | null
  readonly estado: string | null
  readonly cep: string | null
  readonly apelido: string | null
  readonly padrao: boolean
}

/** Pedido recente resumido para dar contexto ao agente. */
export interface IntegrationRecentOrder {
  readonly id: string
  readonly criado_em: string
  readonly status: string
  readonly valor_total: number
  /** Ex.: "2× Guaraná Antarctica 2L, 1× Pizza Calabresa". */
  readonly resumo: string
  /**
   * Nota do atendente sobre o andamento do pedido (migration 109), STAFF-ONLY
   * — nunca vem do cliente, nunca aparece em recibo. `null` quando não há
   * nota. Dá ao agente contexto real para o pós-venda ("como está meu
   * pedido?") em vez de só o status genérico do kanban.
   */
  readonly nota_atendimento: string | null
}

/** Resposta de PATCH /api/integration/v1/customers/context. */
export interface IntegrationUpdateContextResponse {
  readonly success: true
  readonly cliente_id: string
  readonly preferencias: string | null
  readonly contexto_resumo: string | null
  readonly canal_preferido: 'catalogo' | 'chat' | 'misto' | null
}

/** Resposta de POST /api/integration/v1/customers/context. */
// ─── Customer State Engine Payload (Fase 6.5 - docs/payload-contexto.md) ────

/** Bloco 1: Contexto de Negócio Imutável. */
export interface IntegrationBusinessContext {
  readonly id: string
  readonly name: string
  readonly timezone: string
  readonly language: string
  readonly sales: {
    readonly allow_stock: boolean
    readonly allow_preorder: boolean
  }
  readonly delivery: {
    readonly allow_delivery: boolean
    readonly allow_pickup: boolean
  }
}

/** Bloco 2: Perfil Permanente do Cliente (Customer Profile). */
export interface IntegrationCustomerProfile {
  readonly id: string | null
  readonly name: string
  readonly telefone_whatsapp: string | null
  readonly whatsapp_lid: string | null
  readonly is_visitante: boolean
  readonly is_new_customer: boolean
  readonly status: string | null
  readonly preferences: {
    readonly consumption: readonly string[]
    readonly preferred_payment: 'pix' | 'dinheiro' | 'cartao' | null
    readonly preferred_delivery: 'entrega' | 'retirada' | null
    readonly favorite_products: readonly string[]
    readonly ingredient_preferences: {
      readonly without: readonly string[]
    }
  }
  readonly staff_notes: readonly string[]
  readonly statistics: {
    readonly total_orders: number
    readonly average_ticket: number
    readonly last_order_days: number | null
  }
  readonly preferred_address: {
    readonly exists: boolean
    readonly id: string | null
    readonly formatted: string | null
  }
  readonly addresses: readonly IntegrationCustomerAddress[]
  readonly recent_orders: readonly IntegrationRecentOrder[]
}

/** Bloco 3: Estado Atual do Cliente e da Conversa (Customer State). */
export interface IntegrationCustomerState {
  readonly session: {
    readonly id: string | null
    readonly url: string | null
  }
  readonly cart: {
    readonly has_open_cart: boolean
    readonly total_items: number
    readonly subtotal: number
    readonly summary_text: string | null
    readonly items: readonly IntegrationCartItem[]
    /** Desconto já aplicado pelo motor de promoções (0 se nenhum). */
    readonly desconto: number
    readonly desconto_descricao: readonly string[]
    /** Próximo nível de desconto a desbloquear (upsell), ou `null`. */
    readonly incentive: PromotionIncentive | null
    /** Estado de checkout coletado até agora (modalidade/pagamento/endereço). */
    readonly checkout: IntegrationCheckoutState
    /** Pendências antes do checkout, na ordem canônica do funil (vazio = pronto). */
    readonly missing_fields: readonly IntegrationMissingField[]
  }
  readonly preorder: {
    readonly has_pending_preorder: boolean
    readonly summary_text: string | null
  }
  readonly conversation: {
    readonly current_flow: 'stock' | 'preorder' | 'general'
    readonly current_stage: 'discovery' | 'waiting_modality' | 'waiting_address' | 'waiting_payment' | 'waiting_delivery_date' | 'ready_to_finalize'
    readonly next_expected_information: 'product' | 'modality' | 'address' | 'payment_method' | 'delivery_date' | 'confirmation' | null
    readonly required_tool: string | null
    readonly can_finalize: boolean
  }
}

/** Bloco 4: Estado Operacional da Loja e Agenda (Operational State). */
export interface IntegrationOperationalState {
  readonly store_open: boolean
  readonly store_status_message: string
  readonly pix_key: string | null
  readonly payment_methods: readonly ['pix', 'dinheiro', 'cartao']
  readonly agenda: {
    readonly window_days: number
    readonly today: string
    readonly first_available_date: string
    readonly first_available_text: string
    readonly availability_summary: string
    readonly requires_tool_for_validation: boolean
  }
}

/**
 * Código canônico do próximo passo obrigatório. A app decide, o modelo executa
 * (nunca deixe o modelo escolher entre dois caminhos). Ordem de prioridade em
 * `resolveNextAction`; a primeira condição que bater vence.
 */
export type NextActionCode =
  | 'COLLECT_WHATSAPP'
  | 'STORE_CLOSED'
  | 'SEARCH_PRODUCT'
  | 'FIX_QUANTITY'
  | 'VALIDATE_DATE'
  | 'ASK_ITEM_TEXT'
  | 'ASK_ITEM_ART'
  | 'ASK_MODALITY'
  | 'CONFIRM_SAVED_ADDRESS'
  | 'GEOCODE_ADDRESS'
  | 'ASK_PAYMENT'
  | 'CONFIRM_ORDER'
  | 'FINALIZE'

/**
 * Bloco 4b: única instrução imperativa que o modelo obedece literalmente. O
 * `briefing` a renderiza em `>>> PROXIMO PASSO OBRIGATORIO`; o n8n pode ramificar
 * pelo `code` sem interpretar prosa. Fonte única: `resolveNextAction`.
 */
export interface IntegrationNextAction {
  readonly code: NextActionCode
  /** Ordem no imperativo, no máximo duas linhas — pronta para o prompt. */
  readonly instruction: string
  /** Tool que o passo exige, ou `null` quando é só uma pergunta ao cliente. */
  readonly tool: string | null
  /** Observação secundária (ex.: aviso de carrinho pendente), ou `null`. */
  readonly note: string | null
}

/**
 * Resposta Completa do Engine de Estado de Cliente (POST /api/integration/v1/customers/context).
 *
 * `decision_hints` foi REMOVIDO (EPIC 2 Feature 2.3 — PRD-REFATORACAO): era um
 * bloco de booleans paralelo e nunca totalmente derivado, que duplicava a
 * decisão já tomada em `customer_state.cart.missing_fields` e `next_action`.
 * Fonte única agora: `missing_fields` (o que falta) → `next_action` (o que
 * fazer a seguir).
 */
export interface IntegrationCustomerContext {
  readonly action_required: 'collect_whatsapp' | null
  /** Briefing determinístico pré-formatado pronto para ser injetado no System Prompt da LLM. */
  readonly briefing: string
  /** Próximo passo obrigatório estruturado (mesma decisão renderizada no briefing). */
  readonly next_action: IntegrationNextAction
  readonly business: IntegrationBusinessContext
  readonly customer_profile: IntegrationCustomerProfile | null
  readonly customer_state: IntegrationCustomerState
  readonly operational: IntegrationOperationalState
}

// ─── Sessão de catálogo ───────────────────────────────────────────────────────

/** Resposta com o link pronto — a aplicação monta a URL (fonte única). */
export interface IntegrationSessionResponse {
  readonly sessaoId: string
  readonly url: string
}

// ─── Detalhe do pedido + nota térmica ────────────────────────────────────────

/** Resposta de GET /api/integration/v1/orders/[id] e do checkout do carrinho. */
export interface IntegrationOrderDetail {
  readonly id: string
  /** Número amigável de 5 dígitos exibido ao cliente (migration 074). */
  readonly short_id: number | null
  readonly status: string
  readonly criado_em: string
  readonly tipo_entrega: string
  readonly forma_pagamento: string
  readonly valor_subtotal: number
  readonly desconto_aplicado: number
  readonly valor_entrega: number
  readonly valor_total: number
  readonly observacoes: string | null
  /**
   * Nota do atendente (migration 109), STAFF-ONLY — nunca entra em
   * `receipt_text`/`formatReceiptText` (esse não lê este campo de propósito).
   */
  readonly nota_atendimento: string | null
  readonly cliente: { readonly nome: string; readonly telefone_whatsapp: string | null } | null
  readonly endereco: string | null
  readonly itens: readonly {
    readonly nome: string
    readonly quantidade: number
    readonly subtotal: number
  }[]
  /** Nota térmica em texto monoespaçado, pronta para enviar no WhatsApp. */
  readonly receipt_text: string
}

/** Resposta de POST /api/integration/v1/cart/checkout. */
export interface IntegrationCartCheckoutResponse {
  readonly success: true
  readonly pedido: IntegrationOrderDetail
  /** `true` quando a chave de idempotência já existia (pedido reaproveitado). */
  readonly idempotent: boolean
}

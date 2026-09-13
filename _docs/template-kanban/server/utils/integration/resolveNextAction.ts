/**
 * Fonte ÚNICA do próximo passo obrigatório (seção 4 de `docs/payload-contexto.md`).
 *
 * O `next_action` do payload e a linha `>>> PROXIMO PASSO OBRIGATORIO` do briefing
 * derivam daqui — nunca duplique a decisão. Regra de ouro: a app decide, o modelo
 * executa; nunca deixe o modelo escolher entre dois caminhos possíveis.
 *
 * Prioridade fixa: a primeira condição que bater vence e as outras nem aparecem.
 */

import type { IntegrationMissingField, IntegrationNextAction } from '#shared/types/integration'

/** Sinais normalizados que a rota de contexto conhece no momento da chamada. */
export interface ResolveNextActionInput {
  readonly actionRequired: 'collect_whatsapp' | null
  readonly storeOpen: boolean
  readonly currentFlow: 'stock' | 'preorder' | 'general'
  readonly needsProductSearch: boolean
  /** Quantidade fora dos limites do produto (encomenda). `null` quando ok. */
  readonly quantityLimits: { readonly min: number; readonly max: number } | null
  readonly needsCalendarValidation: boolean
  /** Contexto para `VALIDATE_DATE` (product_id + month YYYY-MM). */
  readonly preorderProductId: string | null
  readonly agendaMonth: string
  /** Pendências calculadas por `resolveMissingFields` (fonte única — Feature 2.2). */
  readonly missingFields: readonly IntegrationMissingField[]
  readonly hasCartItems: boolean
  /** Endereço salvo do cliente, quando existir. */
  readonly savedAddress: { readonly formatted: string; readonly id: string } | null
  readonly paymentMethods: readonly string[]
  /**
   * `true` quando o cliente já confirmou verbalmente o pedido nesta conversa.
   * Não há sinal persistido para isso hoje — o agente decide a partir do
   * histórico da conversa (REGRA 2 do prompt); `context.post.ts` sempre passa
   * `false` e o passo natural, com tudo coletado, é `CONFIRM_ORDER`.
   */
  readonly canFinalize: boolean
  /** Observação secundária (aviso de carrinho pendente), já sem prefixo. */
  readonly note: string | null
}

export function resolveNextAction(input: ResolveNextActionInput): IntegrationNextAction {
  const note = input.note
  const payments = input.paymentMethods.join(', ') || 'pix, dinheiro, cartao'

  // 1 — Falta identificar o cliente.
  if (input.actionRequired === 'collect_whatsapp') {
    return {
      code: 'COLLECT_WHATSAPP',
      instruction: 'Peca o numero de WhatsApp do cliente para continuar. Nada mais nesta mensagem.',
      tool: null,
      note,
    }
  }

  // 2 — Loja fechada durante pronta entrega: só encomenda agendada.
  if (!input.storeOpen && input.currentFlow === 'stock') {
    return {
      code: 'STORE_CLOSED',
      instruction: 'A loja esta fechada: avise que agora so da para agendar encomenda e nao finalize pronta entrega.',
      tool: null,
      note,
    }
  }

  // 3 — Sem produto definido: buscar antes de falar de itens.
  //
  // ATENCAO: este passo nao sabe o que o cliente disse NESTA mensagem — so
  // sabe que o carrinho esta vazio, o que e igualmente verdade logo apos "boa
  // tarde" e logo apos "quero uma pizza calabresa". Regressao real de
  // producao (05/08): a instrucao antiga soava como ordem incondicional
  // ("chame BuscarProdutos antes de responder qualquer coisa"), e por vir
  // por ULTIMO no prompt (>>> PROXIMO PASSO OBRIGATORIO, a coisa mais
  // proxima da geracao da resposta) tinha mais peso que a excecao de
  // conversa social pura da REGRA 2 — o agente empurrava produto/catalogo
  // ate numa saudacao pura. A ressalva abaixo devolve essa decisao pra REGRA
  // 2, que e quem realmente sabe o que foi dito.
  if (input.needsProductSearch) {
    return {
      code: 'SEARCH_PRODUCT',
      instruction: 'O cliente ainda nao tem produto definido no carrinho. Se ele JA disse o que quer (item especifico ou pedido generico de navegar/ver o cardapio), chame BuscarProdutos ou EnviarBotaoCatalogo antes de responder, conforme a REGRA 2. Se ele so cumprimentou ou ainda nao disse nada sobre pedido (conversa social pura), NAO chame nenhuma tool agora — responda a saudacao e pergunte como pode ajudar, e so aja quando ele disser o que quer.',
      tool: 'BuscarProdutos',
      note,
    }
  }

  // 4 — Quantidade fora dos limites do produto.
  if (input.quantityLimits) {
    return {
      code: 'FIX_QUANTITY',
      instruction: `A quantidade esta fora do permitido (minimo ${input.quantityLimits.min}, maximo ${input.quantityLimits.max}). Diga o limite exato e peca a correcao.`,
      tool: null,
      note,
    }
  }

  // 5 — Encomenda escolhida: validar a data com a agenda.
  if (input.needsCalendarValidation) {
    const params = [
      input.preorderProductId ? `product_id=${input.preorderProductId}` : null,
      input.agendaMonth ? `month=${input.agendaMonth}` : null,
    ].filter(Boolean).join(' e ')
    return {
      code: 'VALIDATE_DATE',
      instruction: `Produto de encomenda escolhido. Chame ConsultarDatasEncomenda${params ? ' com ' + params : ''} e ofereca somente datas com status "available".`,
      tool: 'ConsultarDatasEncomenda',
      note,
    }
  }

  // 5.5 — Pendência de personalização/arte NO ITEM (migration 127).
  //
  // Regressão real (auditoria): a primeira versão desta correção só dizia ao
  // modelo, em PROSA no system prompt, "pergunte sobre isso numa mensagem
  // separada, depois de adicionar" — e o modelo, tentando conciliar isso com
  // outras instruções (orientacao de single/multiple/toggle, que SIM bloqueia
  // o add), misturou a pergunta de personalização com a de quantidade na
  // mesma mensagem e travou o fluxo (MANGA LONGA, 25/08). Mesma regra de ouro
  // do resto deste arquivo: a app decide QUANDO perguntar (aqui, de forma
  // determinística, na hora certa do funil), o modelo só executa a pergunta
  // exata — nunca decide sozinho quando encaixar isso na conversa.
  //
  // texto_livre/upload_arquivo NUNCA bloqueiam `DefinirItemCarrinho`
  // (`setCartItem.ts`) — o item já está no carrinho quando este passo aparece
  // — mas bloqueiam `FinalizarPedido` (`finalizeCheckout.ts` rejeita qualquer
  // `missing_fields` scope=item). Por isso entram ANTES das pendências de
  // nível pedido: resolver o item primeiro, modalidade/endereço/pagamento
  // depois — mesma ordem canônica do funil que `missingFields.ts` já usa.
  const itemPendency = input.missingFields.find(
    (m) => m.scope === 'item' && (m.field === 'texto_personalizacao' || m.field === 'arquivo_arte'),
  )
  if (itemPendency?.field === 'texto_personalizacao') {
    return {
      code: 'ASK_ITEM_TEXT',
      instruction: `${itemPendency.prompt}. Faca essa pergunta numa mensagem PROPRIA — nunca junto com a pergunta de quantidade nem com a confirmacao do item (REGRA 5).`,
      tool: null,
      note,
    }
  }
  if (itemPendency?.field === 'arquivo_arte') {
    return {
      code: 'ASK_ITEM_ART',
      instruction: `${itemPendency.prompt}. Faca essa pergunta numa mensagem PROPRIA — nunca junto com a pergunta de quantidade nem com a confirmacao do item (REGRA 5).`,
      tool: null,
      note,
    }
  }

  // Pendências de nível "pedido" (modalidade/endereço/pagamento) — item-scoped
  // (target_date por-produto) ainda não gera passo aqui; entra no EPIC 3 quando
  // o carrinho unificado aceitar item de encomenda.
  const orderMissing = input.missingFields.filter((m) => m.scope === 'order')
  const missingField = (field: string): boolean => orderMissing.some((m) => m.field === field)

  // 6 — Modalidade indefinida.
  if (missingField('delivery_mode')) {
    return {
      code: 'ASK_MODALITY',
      instruction: 'Pergunte se e ENTREGA ou RETIRADA. Nada mais nesta mensagem.',
      tool: null,
      note,
    }
  }

  // 7 — Entrega com endereço salvo: confirmar antes de geocodar.
  if (missingField('address_id') && input.savedAddress) {
    return {
      code: 'CONFIRM_SAVED_ADDRESS',
      instruction: `Confirme o endereco salvo ${input.savedAddress.formatted} (endereco_id=${input.savedAddress.id}). So chame ConsultarEnderecoEntrega se o cliente indicar um endereco DIFERENTE.`,
      tool: null,
      note,
    }
  }

  // 8 — Entrega sem endereço salvo: geocodar.
  if (missingField('address_id') && !input.savedAddress) {
    return {
      code: 'GEOCODE_ADDRESS',
      instruction: 'Peca rua, numero e cidade e chame ConsultarEnderecoEntrega. Nao peca CEP nem UF.',
      tool: 'ConsultarEnderecoEntrega',
      note,
    }
  }

  // 9 — Falta a forma de pagamento.
  if (missingField('payment_method')) {
    return {
      code: 'ASK_PAYMENT',
      instruction: `Pergunte a forma de pagamento entre: ${payments}.`,
      tool: null,
      note,
    }
  }

  // 10 — Nada pendente e há itens no carrinho: falta a confirmação verbal.
  if (orderMissing.length === 0 && input.hasCartItems) {
    return {
      code: 'CONFIRM_ORDER',
      instruction: 'Repita o pedido em UMA frase e peca a confirmacao do cliente.',
      tool: null,
      note,
    }
  }

  // 11 — Confirmado: finalizar. Carrinho unificado (EPIC 3): uma única tool
  // fecha pronta entrega e encomenda, juntas ou separadas.
  if (input.canFinalize) {
    return {
      code: 'FINALIZE',
      instruction: 'Tudo confirmado. Chame FinalizarPedido para fechar o pedido.',
      tool: 'FinalizarPedido',
      note,
    }
  }

  // Fallback determinístico: descobrir a intenção sem inventar dado. Mesma
  // ressalva do passo 3 acima — carrinho com item não confirmado ainda não é
  // sinal de urgência, pode muito bem ser o início "boa tarde" da conversa.
  return {
    code: 'SEARCH_PRODUCT',
    instruction: 'Se o cliente ja citou algum item ou pedido generico, chame BuscarProdutos ou EnviarBotaoCatalogo antes de responder (REGRA 2). Se foi so uma saudacao ou fala social, NAO chame tool nenhuma — responda e deixe ele dizer o que quer.',
    tool: 'BuscarProdutos',
    note,
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import type { IntegrationCartCheckoutResponse, IntegrationCartItem } from '#shared/types/integration'
import type { OperationStatus, StoreScheduleConfig } from '#shared/types/store'
import { requireActiveSession, getCartState } from '../cart/state'
import { getOrderDetail } from '../orders/getOrderDetail'
import { dispatchWebhookCore } from '../webhook/dispatch'
import { applyPromotions } from '../promotions/applyPromotions'
import { calculateStoreStatus } from '../store/calculateStoreStatus'
import { resolveIntegrationDelivery } from './resolveDelivery'
import {
  createIntegrationOrder,
  findCompletedIntegrationOrder,
} from './createIntegrationOrder'

/**
 * Copia as opções congeladas de `cart_items_opcoes` (já resolvidas em
 * `getCartState`) para `itens_pedido_opcoes` — depois que a RPC atômica cria
 * o pedido, porque `create_integration_order` (migration 073) não sabe de
 * opções e não vale a pena arriscar mexer numa RPC transacional já validada
 * por esta correção. Não-fatal: erro aqui vira log, nunca derruba o checkout
 * (o pedido já existe e o cliente já recebeu o comprovante).
 *
 * Correlação cart_items→itens_pedido por (produto_id, quantidade), na ORDEM
 * em que aparecem no carrinho: a RPC cria uma linha de itens_pedido por item
 * do carrinho, mas não devolve o id de cada uma, e `itens_pedido.id` é
 * `gen_random_uuid()` — sem coluna de ordem de criação para desempatar.
 * Funciona sempre quando não há duas linhas com o MESMO produto_id+quantidade
 * e variações DIFERENTES no mesmo pedido (o caso comum); no raro caso de
 * colisão, o total do pedido continua certo (a soma dos deltas bate), só o
 * rótulo da opção podia ficar trocado entre as duas linhas idênticas em
 * quantidade — cosmético, nunca financeiro (fora do escopo desta correção
 * resolver isso sem tocar na RPC).
 */
export async function copyCartOptionsToOrder(
  supabase: SupabaseClient<Database>,
  pedidoId: string,
  cartItens: readonly IntegrationCartItem[],
): Promise<void> {
  const comOpcoes = cartItens.filter((i) => i.opcoes.length > 0)
  if (comOpcoes.length === 0) return

  const { data: itensPedido, error } = await supabase
    .from('itens_pedido')
    .select('id, produto_id, quantidade')
    .eq('pedido_id', pedidoId)

  if (error || !itensPedido) {
    logger.error('[checkout] falha ao reler itens_pedido para copiar opções (não-fatal)', {
      pedido_id: pedidoId,
      error: error?.message,
    })
    return
  }

  const buckets = new Map<string, string[]>()
  for (const item of itensPedido) {
    const chave = `${item.produto_id}|${item.quantidade}`
    const lista = buckets.get(chave) ?? []
    lista.push(item.id)
    buckets.set(chave, lista)
  }

  const paraInserir: Array<{ item_pedido_id: string, opcao_item_id: string, nome_congelado: string, preco_delta_congelado: number }> = []
  for (const item of comOpcoes) {
    const chave = `${item.produto_id}|${item.quantidade}`
    const itemPedidoId = buckets.get(chave)?.shift()
    if (!itemPedidoId) {
      logger.warn('[checkout] item_pedido não encontrado para copiar opções (não-fatal)', {
        pedido_id: pedidoId,
        produto_id: item.produto_id,
      })
      continue
    }
    for (const opcao of item.opcoes) {
      paraInserir.push({
        item_pedido_id: itemPedidoId,
        opcao_item_id: opcao.opcao_item_id,
        nome_congelado: opcao.nome_congelado,
        preco_delta_congelado: opcao.preco_delta_congelado,
      })
    }
  }

  if (paraInserir.length === 0) return

  const { error: insErr } = await supabase.from('itens_pedido_opcoes').insert(paraInserir)
  if (insErr) {
    logger.error('[checkout] falha ao gravar itens_pedido_opcoes (não-fatal)', {
      pedido_id: pedidoId,
      error: insErr.message,
    })
  }
}

/**
 * `FinalizarPedido` — extraída de `cart/checkout.post.ts` (seção 6 da
 * arquitetura do agente WhatsApp). Converte o carrinho da sessão em pedido,
 * 100% server-side. Commit puro (Feature 1.4 — EPIC 1): modalidade/pagamento/
 * endereço já foram gravados via `updateCheckout`; itens/atributos via
 * `setCartItem`. A aplicação lê o estado persistido, aplica promoções,
 * calcula frete por distância e congela preços via triggers — o MESMO
 * pipeline do catálogo web.
 *
 * Carrinho unificado (Feature 3.1 — EPIC 3): itens de encomenda reservam
 * capacidade (RPC `reserve_preorders`) na MESMA transação do pedido.
 *
 * Sem `H3Event` (reutilizável fora de rotas HTTP — ver seção 4/5): usa
 * `dispatchWebhookCore` diretamente e devolve a promise `drain` do disparo
 * de webhook para o chamador decidir como aguardá-la — a rota HTTP a liga em
 * `event.context.waitUntil` (necessário no runtime Cloudflare Workers); um
 * consumer de fila (futuro tool do agente) pode simplesmente `await` o campo
 * `drain` do resultado.
 */
export interface FinalizeCheckoutParams {
  sessao_id: string
  /** Idempotency key desta chamada — commit puro, gerada pelo chamador. */
  idempotencyKey: string
}

export interface FinalizeCheckoutResult {
  response: IntegrationCartCheckoutResponse
  /** Só populada quando um webhook `pedido.criado` foi enfileirado com sucesso. */
  drain?: Promise<void>
}

export async function finalizeCheckout(
  supabase: SupabaseClient<Database>,
  params: FinalizeCheckoutParams,
): Promise<FinalizeCheckoutResult> {
  const { sessao_id, idempotencyKey } = params

  // Replay imediato de um pedido já concluído, ANTES de validar — o checkout
  // limpa o carrinho ao concluir, então revalidar veria "carrinho vazio" e
  // negaria o replay. A criação atômica em si fica a cargo da RPC.
  const replayId = await findCompletedIntegrationOrder(supabase, idempotencyKey)
  if (replayId) {
    const pedido = await getOrderDetail(supabase, replayId)
    return { response: { success: true, pedido, idempotent: true } }
  }

  const sessao = await requireActiveSession(supabase, sessao_id)
  if (!sessao.cliente_id) {
    throw createError({ statusCode: 422, statusMessage: 'Sessão sem cliente vinculado.' })
  }

  const cart = await getCartState(supabase, sessao_id)
  if (cart.itens.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'O carrinho está vazio.' })
  }

  // Completude do estado persistido (Feature 1.4): commit puro — nada disto
  // vem do body, tudo já foi gravado via updateCheckout.
  const tipoEntrega = cart.checkout.delivery_mode
  if (!tipoEntrega) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Modalidade de entrega não definida. Grave com PATCH /cart antes de finalizar.',
    })
  }
  if (tipoEntrega === 'entrega' && !cart.checkout.address_id) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Endereço de entrega não definido. Grave com PATCH /cart antes de finalizar.',
    })
  }

  // Itens de encomenda sem data ainda pendente (missing_fields item-scoped).
  const itemMissing = cart.missing_fields.filter((m) => m.scope === 'item')
  if (itemMissing.length > 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Há itens de encomenda sem data definida. Use DefinirItemCarrinho com target_date.',
      data: { missing_fields: itemMissing },
    })
  }

  // Guards de loja — mesmas regras do checkout do catálogo.
  const { data: loja } = await supabase
    .from('loja')
    .select('status_operacao, status_override_data, config_horarios, permite_retirada, latitude_origem, longitude_origem, raio_atendimento_km, taxa_entrega_padrao, config_promocoes')
    .limit(1)
    .single()

  if (loja) {
    const { isOpen } = calculateStoreStatus(
      loja.status_operacao as OperationStatus,
      loja.config_horarios as StoreScheduleConfig | null,
      loja.status_override_data as string | null,
    )
    if (!isOpen) {
      throw createError({
        statusCode: 403,
        statusMessage: 'A loja está fechada no momento.',
      })
    }
    if (tipoEntrega === 'retirada' && !loja.permite_retirada) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Retirada no local não está disponível.',
      })
    }
  }

  // Entrega: distância + raio + frete a partir do endereço JÁ salvo
  // (address_id persistido via updateCheckout) — regra única compartilhada
  // com a encomenda.
  const merchandiseSubtotal = cart.itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const delivery = await resolveIntegrationDelivery(supabase, loja, {
    tipoEntrega,
    clienteId: sessao.cliente_id,
    enderecoId: cart.checkout.address_id,
    endereco: null,
    merchandiseSubtotal,
  })

  // Desconto sobre os itens do carrinho (preço efetivo já resolvido no estado).
  const { descontoTotal } = await applyPromotions(
    supabase,
    cart.itens.map((i) => ({
      produto_id: i.produto_id,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
    })),
  )

  // Itens de encomenda (product_type='preorder') reservam capacidade na mesma
  // transação do pedido — a RPC reserve_preorders é a autoridade final.
  const { data: produtosCarrinho } = await supabase
    .from('produtos')
    .select('id, product_type')
    .in('id', cart.itens.map((i) => i.produto_id))
  const productTypeMap = new Map((produtosCarrinho ?? []).map((p) => [p.id, p.product_type]))
  const preorderItems = cart.itens
    .filter((i): i is typeof i & { target_date: string } =>
      productTypeMap.get(i.produto_id) === 'preorder' && !!i.target_date)
    .map((i) => ({ product_id: i.produto_id, delivery_date: i.target_date, quantity: i.quantidade }))

  // Observações do pedido = agregado das observações por-item (Feature 1.2.2),
  // já que o commit não carrega mais texto livre de negócio.
  const observacoesAgregadas = cart.itens
    .filter((i) => i.observacao)
    .map((i) => `${i.nome}: ${i.observacao}`)
    .join('; ') || null

  // Status inicial + nota operacional (instrução no card do kanban).
  // Nasce PENDENTE quando exige ação humana:
  //  • PIX: alguém precisa confirmar o recebimento antes de avançar.
  //  • Entrega sem validação de raio (sem coordenadas): endereço a conferir.
  // Dinheiro/cartão com endereço validado (ou retirada) entram 'confirmado'.
  const formaPagamento = cart.checkout.payment_method ?? 'dinheiro'
  const notas: string[] = []
  if (delivery.enderecoNaoValidado) {
    notas.push('Verificar o endereço com o cliente (não validado por raio de entrega).')
  }
  const statusInicial
    = formaPagamento === 'pix' || delivery.enderecoNaoValidado ? 'pendente' : 'confirmado'
  const notaOperacional = notas.length > 0 ? notas.join(' ') : null

  // Criação atômica (reserva de idempotência + pedido + itens + conclusão da
  // chave + conversão de sessão + limpeza do carrinho) numa única transação.
  const result = await createIntegrationOrder(supabase, {
    idempotencyKey,
    clienteId: sessao.cliente_id,
    tipoEntrega,
    formaPagamento,
    status: statusInicial,
    // Fulfillment por-item (Feature 4.1): só os itens com override próprio
    // levam delivery_mode/address_id — os demais herdam o pedido (NULL).
    itens: cart.itens.map((i) => ({
      produto_id: i.produto_id,
      quantidade: i.quantidade,
      ...(i.delivery_mode ? { delivery_mode: i.delivery_mode } : {}),
      ...(i.address_id ? { address_id: i.address_id } : {}),
    })),
    enderecoId: delivery.enderecoId,
    enderecoNovo: delivery.enderecoNovo,
    sessaoId: sessao.id,
    observacoes: observacoesAgregadas,
    notaOperacional,
    descontoAplicado: descontoTotal,
    valorEntrega: delivery.valorEntrega,
    freteGratis: delivery.freteGratis,
    preorderItems,
  })

  if (result.outcome === 'in_flight') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Pedido com esta Idempotency-Key já está em processamento.',
    })
  }

  // Opções/variações (migration 110) — só na criação real (replay já copiou
  // na primeira vez). Mesmo padrão non-atomic/best-effort de
  // `orders/create.post.ts`: a RPC `create_integration_order` já existia e
  // não sabe de `opcoes`; o subtotal congelado é recalculado sozinho pelos
  // triggers `trg_itens_pedido_opcoes_subtotal`/`recalculate_item_subtotal`
  // assim que a linha entra em `itens_pedido_opcoes` — não precisa de mais
  // nada daqui além de inserir a linha certa.
  if (result.outcome === 'created') {
    await copyCartOptionsToOrder(supabase, result.pedidoId, cart.itens)
  }

  const pedido = await getOrderDetail(supabase, result.pedidoId)

  // Webhook só na criação real: um replay (corrida com outra request durante a
  // validação) não deve redisparar `pedido.criado`.
  let drain: Promise<void> | undefined
  if (result.outcome === 'created') {
    const { data: enrichedOrder } = await supabase
      .from('pedidos')
      .select(`
        *,
        clientes (nome, telefone_whatsapp),
        enderecos_cliente (*),
        itens_pedido (
          id, quantidade, preco_unitario_congelado, subtotal, nome_produto_congelado,
          produtos (nome)
        )
      `)
      .eq('id', result.pedidoId)
      .single()

    const dispatchResult = await dispatchWebhookCore(supabase, 'pedido.criado', {
      pedidoId: result.pedidoId,
      clienteId: sessao.cliente_id,
      sessaoId: sessao.id,
      pedido: enrichedOrder || null,
      origem: 'integracao',
    })
    drain = dispatchResult.drain
  }

  return {
    response: { success: true, pedido, idempotent: result.outcome === 'replay' },
    drain,
  }
}

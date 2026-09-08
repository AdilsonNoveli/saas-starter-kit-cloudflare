import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { dispatchWebhook } from '../../utils/webhook/dispatchHttp'
import { applyPromotions } from '../../utils/promotions/applyPromotions'
import { calculateStoreStatus } from '../../utils/store/calculateStoreStatus'
import { haversineDistanceKm } from '../../utils/geo/haversine'
import { resolveDeliveryFee } from '../../utils/delivery/freeShipping'
import { getAvailability, type PreorderProduct } from '../../utils/preorders/availability'
import type { OperationStatus, StoreScheduleConfig, PromotionConfig } from '#shared/types/store'
import type { PreorderConfig } from '#shared/types/preorder'
import { isCalendarDate, validateQuantity } from '#shared/utils/preorders'

/**
 * Validação de entrada — endpoint PÚBLICO (só exige sessão). Sem isto,
 * `quantidade` negativa/enorme e `produto_id` arbitrário eram aceitos.
 *
 * IMPORTANTE (integridade financeira): `nome_congelado` e
 * `preco_delta_congelado` das opções são ACEITOS mas IGNORADOS — os valores
 * reais são relidos de `produto_opcao_item` no servidor (ver abaixo). O preço
 * base já é congelado por trigger a partir de `produtos`.
 */
// O frontend envia valores em MAIÚSCULAS ('ENTREGA'/'PIX'). Normalizamos para
// minúsculas ANTES de validar contra o enum do banco: valor inválido vira 400
// explícito aqui, em vez de escapar para um 500 por violação de constraint no
// INSERT. `z.preprocess` roda antes do parse; `undefined` passa direto (optional).
const lowercaseEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(values).optional(),
  )

const createOrderSchema = z.object({
  sessaoId: z.uuid(),
  tipoEntrega: lowercaseEnum(['entrega', 'retirada']),
  formaPagamento: lowercaseEnum(['pix', 'dinheiro', 'cartao']),
  observacoes: z.string().max(2000).optional(),
  cupomCodigo: z.string().max(50).optional(),
  itens: z
    .array(
      z.object({
        produto_id: z.uuid(),
        quantidade: z.number().positive().max(999),
        // Encomendas: data de entrega (YYYY-MM-DD). Obrigatória para produtos
        // product_type='preorder'; validada e reservada atomicamente na RPC.
        delivery_date: z
          .string()
          .refine(isCalendarDate, 'Data de entrega inválida.')
          .optional(),
        // Campos extras do cliente (nome/preco_delta) são estritos: o `.object`
        // padrão do zod descarta chaves desconhecidas — revalidamos no servidor.
        opcoes: z
          .array(z.object({ opcao_item_id: z.uuid() }))
          .max(50)
          .optional(),
      }),
    )
    .min(1)
    .max(100),
  endereco: z
    .object({
      rua: z.string().min(1).max(200),
      numero: z.string().min(1).max(50),
      bairro: z.string().min(1).max(120),
      // .nullish() = aceita undefined E null (lat/lng podem ser null quando o
      // geocoding falha ou quando o usuário escolhe RETIRADA e depois muda para
      // ENTREGA; o servidor já lida com null calculando sem distância).
      lat: z.number().min(-90).max(90).nullish(),
      lng: z.number().min(-180).max(180).nullish(),
      complemento: z.string().max(200).optional(),
      cep: z.string().max(20).optional(),
    })
    .nullable()
    .optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = createOrderSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    logger.warn('[orders/create] Validação do schema falhou', {
      issues: parsed.error.issues,
    })
    throw createError({
      statusCode: 400,
      message: 'Dados incompletos ou inválidos para processar o pedido.',
    })
  }
  const { sessaoId, tipoEntrega, formaPagamento, observacoes, itens, endereco } = parsed.data

  const supabase = serverSupabaseServiceRole(event)

  // Guard: bloqueia finalização de pedido quando a loja está fechada ou retirada desativada
  const { data: lojaStatus } = await supabase
    .from('loja')
    .select('status_operacao, status_override_data, config_horarios, permite_retirada, latitude_origem, longitude_origem, raio_atendimento_km, taxa_entrega_padrao, config_promocoes')
    .limit(1)
    .single()

  const tipoNormalized = tipoEntrega?.toLowerCase()

  // Distância loja→cliente calculada UMA vez; reutilizada na validação de raio e no frete.
  // null = não aplicável (retirada, sem coordenadas do cliente ou loja não geocodificada).
  const deliveryDistanceKm =
    tipoNormalized === 'entrega' &&
    endereco?.lat &&
    endereco?.lng &&
    lojaStatus?.latitude_origem &&
    lojaStatus?.longitude_origem
      ? haversineDistanceKm(
          Number(lojaStatus.latitude_origem),
          Number(lojaStatus.longitude_origem),
          endereco.lat,
          endereco.lng,
        )
      : null

  if (lojaStatus) {
    const { isOpen } = calculateStoreStatus(
      lojaStatus.status_operacao as OperationStatus,
      lojaStatus.config_horarios as StoreScheduleConfig | null,
      lojaStatus.status_override_data as string | null,
    )
    if (!isOpen) {
      throw createError({
        statusCode: 403,
        message: 'A loja está fechada no momento. Tente novamente quando estivermos abertos.',
      })
    }

    if (tipoNormalized === 'retirada' && !lojaStatus.permite_retirada) {
      throw createError({
        statusCode: 400,
        message: 'Retirada no local não está disponível neste momento.',
      })
    }

    // Defense-in-depth: valida raio mesmo que /api/validate-address tenha sido bypassado.
    if (
      deliveryDistanceKm !== null &&
      lojaStatus.raio_atendimento_km &&
      deliveryDistanceKm > Number(lojaStatus.raio_atendimento_km)
    ) {
      throw createError({
        statusCode: 400,
        message: `Endereço fora do raio de entrega. Máximo: ${lojaStatus.raio_atendimento_km} km, distância: ${deliveryDistanceKm.toFixed(1)} km.`,
      })
    }
  }

  // Distance-based fee via RPC; falls back to flat rate when no rule matches
  // or when distance is unavailable (store not geocoded).
  let finalDeliveryFee = 0
  if (tipoNormalized === 'entrega') {
    if (deliveryDistanceKm !== null) {
      const { data: freteRpc } = await supabase
        .rpc('calcular_frete_por_distancia', { p_distancia_km: deliveryDistanceKm })
      finalDeliveryFee = Number(freteRpc ?? lojaStatus?.taxa_entrega_padrao ?? 0)
    } else {
      finalDeliveryFee = Number(lojaStatus?.taxa_entrega_padrao ?? 0)
    }
  }

  // 1. Validar a sessão (sempre no backend!). Checa status E expiração —
  //    antes, uma sessão vencida ainda marcada como 'ativa' finalizava pedidos.
  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes')
    .select('id, cliente_id, status, expira_em')
    .eq('id', sessaoId)
    .single()

  if (
    sessaoError ||
    !sessao ||
    !['ativa', 'convertida'].includes(sessao.status as string) ||
    new Date(sessao.expira_em ?? 0) < new Date()
  ) {
    throw createError({
      statusCode: 401,
      message: 'Sessão inválida ou expirada. Inicie um novo pedido pelo WhatsApp.',
    })
  }

  // 2. Endereço (se entrega).
  let enderecoId: string | null = null
  const tipoEntregaLower = tipoNormalized as 'entrega' | 'retirada'
  const formaPagamentoLower = formaPagamento?.toLowerCase() as 'pix' | 'dinheiro' | 'cartao'

  if (tipoEntregaLower === 'entrega' && endereco) {
    const { data: enderecoData, error: enderecoError } = await supabase
      .from('enderecos_cliente')
      .insert({
        cliente_id: sessao.cliente_id,
        rua: endereco.rua,
        numero: endereco.numero,
        bairro: endereco.bairro,
        latitude: endereco.lat,
        longitude: endereco.lng,
        complemento: endereco.complemento || null,
        cep: endereco.cep || null,
        apelido: 'outro',
        padrao: false,
      })
      .select('id')
      .single()

    if (enderecoError) {
      logger.error('[orders/create] Erro ao salvar endereço', { error: enderecoError.message })
      throw createError({
        statusCode: 500,
        message: 'Erro ao salvar endereço de entrega.',
      })
    }
    enderecoId = enderecoData.id
  }

  // 3a. Buscar preços atuais dos produtos para calcular desconto antes do insert.
  const produtoIds = [...new Set(itens.map((i) => i.produto_id))]
  const { data: precosData } = await supabase
    .from('produtos')
    .select('id, preco_venda, preco_promocional, product_type, preorder_config, unidade_medida')
    .in('id', produtoIds)

  const precoMap = new Map(
    (precosData ?? []).map((p) => [
      p.id as string,
      (p.preco_promocional ?? p.preco_venda) as number,
    ]),
  )

  // 3a-bis. Encomendas — pré-validação fail-fast ANTES de criar qualquer coisa.
  // A autoridade final anti-overbooking é a RPC reserve_preorders (após criar o
  // pedido); aqui garantimos que item de encomenda tem data e regras válidas.
  const produtoRowMap = new Map((precosData ?? []).map((p) => [p.id as string, p]))
  const preorderItems: Array<{ product_id: string; delivery_date: string; quantity: number }> = []

  for (const item of itens) {
    const produtoRow = produtoRowMap.get(item.produto_id)
    const isPreorder = produtoRow?.product_type === 'preorder' && produtoRow.preorder_config !== null

    // Encomenda exige data; item comum não pode carregar data (fluxos distintos).
    if (isPreorder && !item.delivery_date) {
      throw createError({
        statusCode: 400,
        message: 'Este produto é vendido sob encomenda: escolha uma data de entrega.',
      })
    }
    if (!item.delivery_date) continue
    if (!isPreorder) {
      throw createError({
        statusCode: 400,
        message: 'Produto não aceita encomendas.',
      })
    }

    const config = produtoRow.preorder_config as unknown as PreorderConfig
    const quantityError = validateQuantity(config, item.quantidade)
    if (quantityError) {
      throw createError({ statusCode: 400, message: quantityError })
    }

    const preorderProduct: PreorderProduct = {
      id: produtoRow.id as string,
      config,
      unidade_medida: (produtoRow.unidade_medida as string | null) ?? 'unidade',
    }
    const availability = await getAvailability(
      supabase, preorderProduct, item.delivery_date, item.quantidade,
    )
    if (!availability.available) {
      throw createError({
        statusCode: 409,
        message: 'A data escolhida não está mais disponível para encomenda. Escolha outra data.',
      })
    }

    preorderItems.push({
      product_id: item.produto_id,
      delivery_date: item.delivery_date,
      quantity: item.quantidade,
    })
  }

  const itensParaDesconto = itens.map((i) => ({
    produto_id: i.produto_id,
    quantidade: i.quantidade,
    preco_unitario: precoMap.get(i.produto_id) ?? 0,
  }))

  // Subtotal de mercadoria (pré-desconto) — base do cupom E do frete grátis.
  const merchandiseSubtotal = itensParaDesconto.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)

  // Frete grátis por valor de carrinho: zera o frete de distância quando a
  // campanha está ativa e o subtotal atingiu a meta (fulfillment do incentivo).
  if (tipoEntregaLower === 'entrega') {
    finalDeliveryFee = resolveDeliveryFee({
      distanceFee: finalDeliveryFee,
      merchandiseSubtotal,
      config: lojaStatus?.config_promocoes as Partial<PromotionConfig> | null,
    })
  }

  const { descontoTotal, descricao: descontoDescricao } = await applyPromotions(supabase, itensParaDesconto)

  // 3c. Validar e aplicar cupom atomicamente via RPC — elimina a race condition
  // TOCTOU onde duas requisições simultâneas validavam antes de qualquer uma
  // incrementar o contador. O UPDATE...RETURNING é single-statement, portanto
  // atômico no PostgreSQL.
  let cupomDesconto = 0
  let cupomId: string | null = null
  const cupomCodigo = parsed.data.cupomCodigo

  if (cupomCodigo) {
    const { data: claimed } = await supabase
      .rpc('claim_cupom_atomico', { p_codigo: cupomCodigo, p_subtotal: merchandiseSubtotal })

    if (claimed && claimed.length > 0) {
      cupomDesconto = Number(claimed[0]!.desconto)
      cupomId = claimed[0]!.cupom_id as string
    }
  }

  const notas: string[] = []
  if (tipoEntregaLower === 'entrega' && deliveryDistanceKm === null) {
    notas.push('Verificar o endereço com o cliente (não validado por raio de entrega).')
  }
  const notaOperacional = notas.length > 0 ? notas.join(' ') : null

  // 3b. Criar o pedido.
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      cliente_id: sessao.cliente_id,
      sessao_id: sessao.id,
      endereco_id: enderecoId,
      tipo_entrega: tipoEntregaLower,
      forma_pagamento: formaPagamentoLower,
      observacoes: observacoes || null,
      status: 'pendente',
      desconto_aplicado: descontoTotal + cupomDesconto,
      valor_entrega: finalDeliveryFee,
      frete_gratis_aplicado: finalDeliveryFee === 0 && tipoEntregaLower === 'entrega',
      nota_operacional: notaOperacional,
    })
    .select('id')
    .single()

  if (pedidoError) {
    logger.error('[orders/create] Erro ao criar pedido', { error: pedidoError.message })
    // Rollback do cupom: se o pedido falhou após o claim atômico, decrementa
    // o contador (best-effort; não bloqueia a resposta de erro ao cliente).
    if (cupomId) {
      try {
        await supabase.rpc('decrement_cupom_uso', { p_cupom_id: cupomId })
      } catch (e) {
        logger.warn('[orders/create] Falha ao reverter uso do cupom', { cupomId, error: e })
      }
    }
    throw createError({
      statusCode: 500,
      message: 'Erro ao criar pedido no sistema.',
    })
  }

  // 4. Itens (preço_unitário será congelado pela trigger no Postgres).
  const itensParaInserir = itens.map((item) => ({
    pedido_id: pedido.id,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
  }))

  const { data: itensInseridos, error: itensError } = await supabase
    .from('itens_pedido')
    .insert(itensParaInserir)
    .select('id, produto_id')

  if (itensError) {
    logger.error('[orders/create] Erro ao salvar itens', { error: itensError.message })
    throw createError({
      statusCode: 500,
      message: 'Erro ao salvar os itens do pedido.',
    })
  }

  // 4-bis. Gestão de estoque (migration 111): consumo atômico por linha (FOR
  // UPDATE dentro da função) — não é uma RPC transacional como
  // create_integration_order, mas a função em si impede oversell mesmo sem
  // envolver o pedido inteiro numa transação JS. Rejeição = compensação
  // completa, mesmo padrão de reserve_preorders logo abaixo.
  const { error: estoqueError } = await supabase.rpc('consumir_estoque_pedido', {
    p_pedido_id: pedido.id,
    p_itens: itensParaInserir,
  })

  if (estoqueError) {
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    if (cupomId) {
      try {
        await supabase.rpc('decrement_cupom_uso', { p_cupom_id: cupomId })
      } catch (e) {
        logger.warn('[orders/create] Falha ao reverter uso do cupom', { cupomId, error: e })
      }
    }

    logger.warn('[orders/create] Consumo de estoque rejeitado pelo banco', {
      pedidoId: pedido.id,
      error: estoqueError.message,
    })

    if (estoqueError.message.includes('ESTOQUE_INSUFICIENTE')) {
      throw createError({ statusCode: 409, message: 'Um dos itens não tem mais estoque suficiente para a quantidade pedida.' })
    }
    if (estoqueError.message.includes('PRODUCAO_DIARIA_ESGOTADA')) {
      throw createError({ statusCode: 409, message: 'A produção de hoje esgotou para um dos itens do pedido.' })
    }
    if (estoqueError.message.includes('INSUMO_INSUFICIENTE')) {
      throw createError({ statusCode: 409, message: 'Falta insumo suficiente para preparar um dos itens do pedido.' })
    }
    throw createError({ statusCode: 500, message: 'Erro ao processar o estoque do pedido.' })
  }

  // 4-ter. Reserva atômica das encomendas na RPC (migration 078): advisory lock
  // por (produto, data) + checagem + INSERT na MESMA transação — dois checkouts
  // simultâneos jamais ultrapassam daily_capacity. Se o banco rejeitar, o pedido
  // recém-criado é removido (CASCADE limpa itens/opções/preorders) e o cupom é
  // devolvido — compensação completa antes de responder ao cliente.
  if (preorderItems.length > 0) {
    const { error: reserveError } = await supabase.rpc('reserve_preorders', {
      p_order_id: pedido.id,
      p_items: preorderItems,
    })

    if (reserveError) {
      await supabase.from('pedidos').delete().eq('id', pedido.id)
      if (cupomId) {
        try {
          await supabase.rpc('decrement_cupom_uso', { p_cupom_id: cupomId })
        } catch (e) {
          logger.warn('[orders/create] Falha ao reverter uso do cupom', { cupomId, error: e })
        }
      }

      const isCapacity = reserveError.message.includes('PREORDER_CAPACITY_EXCEEDED')
      logger.warn('[orders/create] Reserva de encomenda rejeitada pelo banco', {
        pedidoId: pedido.id,
        error: reserveError.message,
      })
      throw createError({
        statusCode: isCapacity ? 409 : 400,
        message: isCapacity
          ? 'A capacidade de encomendas para a data escolhida acabou de esgotar. Escolha outra data.'
          : 'Não foi possível reservar a encomenda: data ou quantidade indisponível.',
      })
    }
  }

  // 4a. Revalidar opções no servidor (integridade financeira): o trigger de
  //     subtotal soma `preco_delta_congelado`. Se confiássemos no valor do
  //     cliente, seria possível enviar delta negativo e zerar/negativar o total.
  //     Relemos nome + preco_delta reais de `produto_opcao_item` e ignoramos o
  //     que veio do cliente. Opções inexistentes/inativas são descartadas.
  const opcaoIds = [
    ...new Set(itens.flatMap((i) => i.opcoes?.map((o) => o.opcao_item_id) ?? [])),
  ]
  const opcaoMap = new Map<string, { nome: string; preco_delta: number }>()
  if (opcaoIds.length > 0) {
    const { data: opcoesData } = await supabase
      .from('produto_opcao_item')
      .select('id, nome, preco_delta, ativo')
      .in('id', opcaoIds)
    for (const o of opcoesData ?? []) {
      if (o.ativo) {
        opcaoMap.set(o.id as string, {
          nome: o.nome as string,
          preco_delta: Number(o.preco_delta),
        })
      }
    }
  }

  // 4b. Opções dos itens (2.6) — persiste seleções congeladas quando houver.
  const opcoesParaInserir = itens.flatMap((item, idx) => {
    const itemId = itensInseridos?.[idx]?.id
    if (!itemId || !item.opcoes?.length) return []
    return item.opcoes.flatMap((op) => {
      const real = opcaoMap.get(op.opcao_item_id)
      if (!real) return [] // opção inválida/inativa → ignorada (nunca confiar no cliente)
      return [
        {
          item_pedido_id: itemId,
          opcao_item_id: op.opcao_item_id,
          nome_congelado: real.nome,
          preco_delta_congelado: real.preco_delta,
        },
      ]
    })
  })

  if (opcoesParaInserir.length > 0) {
    const { error: opcoesError } = await supabase
      .from('itens_pedido_opcoes')
      .insert(opcoesParaInserir)

    if (opcoesError) {
      logger.warn('[orders/create] Erro não-fatal ao salvar opções', { error: opcoesError.message })
    }
  }

  // 5. Marcar sessão como convertida.
  await supabase
    .from('sessoes')
    .update({ status: 'convertida' })
    .eq('id', sessaoId)

  // 6. Enfileira webhook no outbox (3.6) — antes este endpoint não notificava
  // ninguém apesar de ser uma das maiores fontes de pedidos.
  const { data: fullOrder } = await supabase
    .from('pedidos')
    .select(`
      *,
      clientes (nome, telefone_whatsapp),
      enderecos_cliente (*),
      itens_pedido (
        id, quantidade, preco_unitario_congelado, subtotal, nome_produto_congelado,
        produtos (nome)
      ),
      preorders (
        id, product_id, delivery_date, quantity, unit, rules_snapshot,
        produtos (nome)
      )
    `)
    .eq('id', pedido.id)
    .single()

  await dispatchWebhook(event, 'pedido.criado', {
    pedidoId: pedido.id,
    clienteId: sessao.cliente_id,
    sessaoId,
    notaOperacional: fullOrder?.nota_operacional ?? notaOperacional,
    pedido: fullOrder || null,
    origem: 'catalogo',
  })

  return {
    success: true,
    pedidoId: pedido.id,
    descontoAplicado: descontoTotal + cupomDesconto,
    descontoDescricao,
  }
})

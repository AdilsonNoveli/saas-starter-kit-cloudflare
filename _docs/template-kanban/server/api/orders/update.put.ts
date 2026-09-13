import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { dispatchWebhook } from '../../utils/webhook/dispatchHttp'
import { applyPromotions } from '../../utils/promotions/applyPromotions'
import { calculateStoreStatus } from '../../utils/store/calculateStoreStatus'
import { haversineDistanceKm } from '../../utils/geo/haversine'
import { resolveDeliveryFee } from '../../utils/delivery/freeShipping'
import { resolveEntryKanbanStatus } from '../../utils/orders/resolveEntryKanbanStatus'
import type { OperationStatus, StoreScheduleConfig, PromotionConfig } from '#shared/types/store'

// Normaliza MAIÚSCULAS do frontend ('ENTREGA'/'PIX') para minúsculas antes de
// validar contra o enum do banco — 400 explícito em vez de 500 por constraint.
const lowercaseEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(values).optional(),
  )

const updateOrderSchema = z.object({
  pedidoId: z.string().uuid(),
  sessaoId: z.string().uuid(),
  tipoEntrega: lowercaseEnum(['entrega', 'retirada']),
  formaPagamento: lowercaseEnum(['pix', 'dinheiro', 'cartao']),
  observacoes: z.string().max(2000).optional(),
  itens: z
    .array(
      z.object({
        produto_id: z.uuid(),
        quantidade: z.number().positive().max(999),
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
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      complemento: z.string().max(200).optional(),
      cep: z.string().max(20).optional(),
    })
    .nullable()
    .optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = updateOrderSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Dados incompletos ou inválidos para atualizar o pedido.',
    })
  }
  const { pedidoId, sessaoId, tipoEntrega, formaPagamento, observacoes, itens, endereco } = parsed.data

  const supabase = serverSupabaseServiceRole(event)

  // 1. Validar a sessão
  const { data: sessao, error: sessaoError } = await supabase
    .from('sessions')
    .select('id, customer_id, status, expires_at')
    .eq('id', sessaoId)
    .single()

  if (
    sessaoError ||
    !sessao ||
    sessao.status !== 'convertida' || // Sessão de pedido já fechado está convertida
    new Date(sessao.expires_at ?? 0) < new Date()
  ) {
    throw createError({
      statusCode: 401,
      message: 'Sessão inválida ou expirada.',
    })
  }

  // 2. Validar o pedido existente (deve ser PENDENTE)
  const { data: oldPedido, error: oldPedidoError } = await supabase
    .from('orders')
    .select('id, customer_id, status')
    .eq('id', pedidoId)
    .single()

  if (oldPedidoError || !oldPedido) {
    throw createError({
      statusCode: 404,
      message: 'Pedido não encontrado.',
    })
  }

  if (oldPedido.customer_id !== sessao.customer_id) {
    throw createError({
      statusCode: 403,
      message: 'Acesso negado ao pedido.',
    })
  }

  const statusEntrada = await resolveEntryKanbanStatus(supabase)
  if (oldPedido.status !== statusEntrada) {
    throw createError({
      statusCode: 400,
      message: 'Este pedido já está em andamento e não pode mais ser editado.',
    })
  }

  // Guard: bloqueia finalização de pedido quando a loja está fechada
  const { data: lojaStatus } = await supabase
    .from('store')
    .select('operation_status, status_override_date, hours_config, allows_pickup, origin_latitude, origin_longitude, service_radius_km, default_delivery_fee, promotions_config')
    .limit(1)
    .single()

  const tipoNormalized = tipoEntrega?.toLowerCase()

  const deliveryDistanceKm =
    tipoNormalized === 'entrega' &&
    endereco?.lat &&
    endereco?.lng &&
    lojaStatus?.origin_latitude &&
    lojaStatus?.origin_longitude
      ? haversineDistanceKm(
          Number(lojaStatus.origin_latitude),
          Number(lojaStatus.origin_longitude),
          endereco.lat,
          endereco.lng,
        )
      : null

  if (lojaStatus) {
    const { isOpen } = calculateStoreStatus(
      lojaStatus.operation_status as OperationStatus,
      lojaStatus.hours_config as StoreScheduleConfig | null,
      lojaStatus.status_override_date as string | null,
    )
    if (!isOpen) {
      throw createError({
        statusCode: 403,
        message: 'A loja está fechada no momento. Tente novamente mais tarde.',
      })
    }

    if (tipoNormalized === 'retirada' && !lojaStatus.allows_pickup) {
      throw createError({
        statusCode: 400,
        message: 'Retirada no local não está disponível neste momento.',
      })
    }

    if (
      deliveryDistanceKm !== null &&
      lojaStatus.service_radius_km &&
      deliveryDistanceKm > Number(lojaStatus.service_radius_km)
    ) {
      throw createError({
        statusCode: 400,
        message: `Endereço fora do raio de entrega. Máximo: ${lojaStatus.service_radius_km} km.`,
      })
    }
  }

  let finalDeliveryFee = 0
  if (tipoNormalized === 'entrega') {
    if (deliveryDistanceKm !== null) {
      const { data: freteRpc } = await supabase
        .rpc('calculate_shipping_by_distance', { p_distance_km: deliveryDistanceKm })
      finalDeliveryFee = Number(freteRpc ?? lojaStatus?.default_delivery_fee ?? 0)
    } else {
      finalDeliveryFee = Number(lojaStatus?.default_delivery_fee ?? 0)
    }
  }

  // 3. Salvar endereço (se entrega)
  let enderecoId: string | null = null
  const tipoEntregaLower = tipoNormalized as 'entrega' | 'retirada'
  const formaPagamentoLower = formaPagamento?.toLowerCase() as 'pix' | 'dinheiro' | 'cartao'

  if (tipoEntregaLower === 'entrega' && endereco) {
    const { data: enderecoData, error: enderecoError } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: sessao.customer_id,
        street: endereco.rua,
        number: endereco.numero,
        neighborhood: endereco.bairro,
        latitude: endereco.lat,
        longitude: endereco.lng,
        complement: endereco.complemento || null,
        zip_code: endereco.cep || null,
        label: 'outro',
        is_default: false,
      })
      .select('id')
      .single()

    if (enderecoError) {
      logger.error('[orders/update] Erro ao salvar endereço', { error: enderecoError.message })
      throw createError({
        statusCode: 500,
        message: 'Erro ao salvar endereço de entrega.',
      })
    }
    enderecoId = enderecoData.id
  }

  // 4. Buscar preços atuais e aplicar descontos
  const produtoIds = [...new Set(itens.map((i) => i.produto_id))]
  const { data: precosData, error: precosError } = await supabase
    .from('products')
    .select('id, sale_price, promo_price, available')
    .in('id', produtoIds)

  if (precosError) {
    logger.error('[orders/update] Erro ao validar produtos', { error: precosError.message })
    throw createError({ statusCode: 500, message: 'Erro ao validar os itens do pedido.' })
  }

  // Valida existência + disponibilidade ANTES de deletar os itens antigos.
  // Sem isto, um produto_id inexistente/indisponível só falharia no INSERT —
  // depois do DELETE — deixando o pedido sem itens (a operação não é
  // transacional no lado do cliente). Falhar cedo preserva o estado original.
  const disponiveis = new Set((precosData ?? []).filter((p) => p.available).map((p) => p.id as string))
  const invalidos = produtoIds.filter((id) => !disponiveis.has(id))
  if (invalidos.length > 0) {
    throw createError({
      statusCode: 422,
      message: 'Há itens inexistentes ou indisponíveis no pedido. Atualize o carrinho e tente novamente.',
    })
  }

  const precoMap = new Map(
    (precosData ?? []).map((p) => [
      p.id as string,
      (p.promo_price ?? p.sale_price) as number,
    ]),
  )

  const itensParaDesconto = itens.map((i) => ({
    produto_id: i.produto_id,
    quantidade: i.quantidade,
    preco_unitario: precoMap.get(i.produto_id) ?? 0,
  }))

  // Frete grátis por valor de carrinho: zera o frete de distância quando a
  // campanha está ativa e o subtotal de mercadoria atingiu a meta.
  if (tipoEntregaLower === 'entrega') {
    const merchandiseSubtotal = itensParaDesconto.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
    finalDeliveryFee = resolveDeliveryFee({
      distanceFee: finalDeliveryFee,
      merchandiseSubtotal,
      config: lojaStatus?.promotions_config as Partial<PromotionConfig> | null,
    })
  }

  const { descontoTotal, descricao: descontoDescricao } = await applyPromotions(supabase, itensParaDesconto)

  // 5. Deletar os itens antigos (e suas opções)
  const { data: oldItems } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', pedidoId)

  const oldItemIds = (oldItems ?? []).map((i) => i.id)
  if (oldItemIds.length > 0) {
    await supabase
      .from('order_item_options')
      .delete()
      .in('order_item_id', oldItemIds)
  }

  await supabase
    .from('order_items')
    .delete()
    .eq('order_id', pedidoId)

  // 6. Atualizar o pedido
  const { error: updatePedidoError } = await supabase
    .from('orders')
    .update({
      address_id: enderecoId,
      delivery_mode: tipoEntregaLower,
      payment_method: formaPagamentoLower,
      notes: observacoes || null,
      discount_applied: descontoTotal,
      delivery_fee: finalDeliveryFee,
      free_shipping_applied: finalDeliveryFee === 0 && tipoEntregaLower === 'entrega',
    })
    .eq('id', pedidoId)

  if (updatePedidoError) {
    logger.error('[orders/update] Erro ao atualizar pedido', { error: updatePedidoError.message })
    throw createError({
      statusCode: 500,
      message: 'Erro ao atualizar dados do pedido.',
    })
  }

  // 7. Inserir os novos itens
  const itensParaInserir = itens.map((item) => ({
    order_id: pedidoId,
    product_id: item.produto_id,
    quantity: item.quantidade,
  }))

  const { data: itensInseridos, error: itensError } = await supabase
    .from('order_items')
    .insert(itensParaInserir)
    .select('id, product_id')

  if (itensError) {
    logger.error('[orders/update] Erro ao salvar itens', { error: itensError.message })
    throw createError({
      statusCode: 500,
      message: 'Erro ao salvar os novos itens do pedido.',
    })
  }

  // 8. Inserir opções dos itens
  const opcaoIds = [
    ...new Set(itens.flatMap((i) => i.opcoes?.map((o) => o.opcao_item_id) ?? [])),
  ]
  const opcaoMap = new Map<string, { name: string; price_delta: number }>()
  if (opcaoIds.length > 0) {
    const { data: opcoesData } = await supabase
      .from('product_option_item')
      .select('id, name, price_delta, active')
      .in('id', opcaoIds)
    for (const o of opcoesData ?? []) {
      if (o.active) {
        opcaoMap.set(o.id as string, {
          name: o.name as string,
          price_delta: Number(o.price_delta),
        })
      }
    }
  }

  const opcoesParaInserir = itens.flatMap((item, idx) => {
    const itemId = itensInseridos?.[idx]?.id
    if (!itemId || !item.opcoes?.length) return []
    return item.opcoes.flatMap((op) => {
      const real = opcaoMap.get(op.opcao_item_id)
      if (!real) return []
      return [
        {
          order_item_id: itemId,
          option_item_id: op.opcao_item_id,
          frozen_name: real.name,
          frozen_price_delta: real.price_delta,
        },
      ]
    })
  })

  if (opcoesParaInserir.length > 0) {
    const { error: opcoesError } = await supabase
      .from('order_item_options')
      .insert(opcoesParaInserir)

    if (opcoesError) {
      logger.warn('[orders/update] Erro não-fatal ao salvar opções', { error: opcoesError.message })
    }
  }

  // 9. Disparar Webhook de pedido.atualizado
  const { data: fullOrder } = await supabase
    .from('orders')
    .select(`
      *,
      customers (name, whatsapp_phone),
      customer_addresses (*),
      order_items (
        id, quantity, frozen_unit_price, subtotal, frozen_product_name,
        products (name)
      )
    `)
    .eq('id', pedidoId)
    .single()

  await dispatchWebhook(event, 'pedido.atualizado', {
    pedidoId: pedidoId,
    clienteId: sessao.customer_id,
    sessaoId,
    pedido: fullOrder || null,
    origem: 'catalogo',
  })

  return {
    success: true,
    pedidoId: pedidoId,
    descontoAplicado: descontoTotal,
    descontoDescricao,
  }
})

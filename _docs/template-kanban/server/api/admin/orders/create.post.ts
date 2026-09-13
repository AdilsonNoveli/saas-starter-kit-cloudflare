import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { dispatchWebhook } from '../../../utils/webhook/dispatchHttp'
import { applyPromotions } from '../../../utils/promotions/applyPromotions'
import { resolveDeliveryFee } from '../../../utils/delivery/freeShipping'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { PromotionConfig } from '#shared/types/store'
import { loadSpecialGroupIndex, validateRequiredCustomizations, loadStandardGroupIndex, validateStandardOptionGroups, resolveCustomization } from '../../../utils/orders/optionCustomization'
import { resolveEntryKanbanStatus } from '../../../utils/orders/resolveEntryKanbanStatus'

const bodySchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  itens: z
    .array(
      z.object({
        produto_id: z.string().uuid(),
        quantidade: z.number().positive().max(999),
        delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        opcoes: z
          .array(
            z.object({
              opcao_item_id: z.string().uuid(),
              nome_congelado: z.string().max(200).optional(),
              preco_delta_congelado: z.number().optional(),
              valor_texto: z.string().max(2000).optional(),
              arquivo_url: z.string().url().max(1000).optional(),
              arquivo_nome_original: z.string().max(255).optional(),
            }),
          )
          .max(50)
          .optional(),
      }),
    )
    .min(1)
    .max(100),
  tipo_entrega: z.enum(['entrega', 'retirada']).optional(),
  forma_pagamento: z.enum(['dinheiro', 'pix', 'cartao']).optional(),
  troco_para: z.number().min(0).nullable().optional(),
  observacoes: z.string().max(2000).optional(),
  endereco: z
    .object({
      rua: z.string().max(200).optional(),
      numero: z.string().max(50).optional(),
      complemento: z.string().max(200).optional(),
      bairro: z.string().max(120).optional(),
      cidade: z.string().max(100).optional(),
      estado: z.string().max(50).optional(),
      cep: z.string().max(20).optional(),
    })
    .optional(),
  valor_entrega_manual: z.number().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  // Service role bypassa RLS: exige checagem de papel explícita (o middleware
  // 3.admin-auth.ts apenas autentica; sem isto, um `entregador` autenticado
  // conseguiria criar pedidos manuais).
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    logger.warn('[admin/orders/create] Validação do schema falhou', { issues: parsed.error.issues })
    throw createError({ statusCode: 400, message: 'Dados inválidos para criar o pedido.' })
  }

  const {
    cliente_id,
    itens,
    tipo_entrega,
    forma_pagamento,
    troco_para,
    observacoes,
    endereco,
    valor_entrega_manual,
  } = parsed.data

  // 1. Store settings (default delivery fee + campanha de frete grátis).
  const { data: store } = await supabase
    .from('store')
    .select('id, default_delivery_fee, promotions_config')
    .limit(1)
    .single()

  let finalDeliveryFee = 0
  if (tipo_entrega === 'entrega') {
    finalDeliveryFee =
      typeof valor_entrega_manual === 'number'
        ? valor_entrega_manual
        : store?.default_delivery_fee ?? 0
  }

  // 2. Address (if delivery).
  let addressId: string | null = null
  if (tipo_entrega === 'entrega' && endereco?.rua) {
    const { data: addrData, error: addrErr } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: cliente_id ?? null,
        street: endereco.rua,
        number: endereco.numero ?? 'S/N',
        neighborhood: endereco.bairro ?? 'Não informado',
        complement: endereco.complemento ?? '',
        city: endereco.cidade ?? 'Não informada',
        state: endereco.estado ?? 'SP',
        zip_code: endereco.cep ?? '',
      })
      .select('id')
      .single()

    if (!addrErr && addrData) {
      addressId = addrData.id
    } else {
      logger.error('Admin Order: error inserting address', { error: addrErr?.message })
    }
  }

  // 3a. Buscar preços para calcular desconto antes do insert.
  const produtoIds = [...new Set(itens.map((i) => i.produto_id))]
  const { data: precosData } = await supabase
    .from('products')
    .select('id, name, sale_price, promo_price, product_type')
    .in('id', produtoIds)

  // Encomendas: validação de data de entrega para produtos do tipo preorder
  const preorderItems: Array<{ product_id: string; delivery_date: string; quantity: number }> = []

  for (const item of itens) {
    const produtoRow = (precosData ?? []).find((p) => p.id === item.produto_id)
    const isPreorder = produtoRow?.product_type === 'preorder'

    if (isPreorder) {
      if (!item.delivery_date) {
        throw createError({
          statusCode: 400,
          message: `O produto "${produtoRow?.name ?? 'sob encomenda'}" exige data de entrega agendada.`,
        })
      }

      const { data: blockedRow } = await supabase
        .from('preorder_blocked_dates')
        .select('id')
        .eq('blocked_date', item.delivery_date)
        .maybeSingle()

      if (blockedRow) {
        throw createError({
          statusCode: 400,
          message: `A data ${item.delivery_date} está bloqueada para novas encomendas.`,
        })
      }

      preorderItems.push({
        product_id: item.produto_id,
        delivery_date: item.delivery_date,
        quantity: item.quantidade,
      })
    }
  }

  // Grupos texto_livre/upload_arquivo (migration 114): valida ANTES de criar
  // o pedido que todo grupo obrigatório desse tipo recebeu um valor — mesma
  // checagem do checkout web, aqui no PDV (mesmo ProductDetailsModal shared
  // em mode='pdv', então a mesma validação precisa valer nos dois lados).
  const specialGroups = await loadSpecialGroupIndex(supabase, produtoIds)
  validateRequiredCustomizations(itens, specialGroups.requiredByProduto)

  // Grupos single/multiple/toggle (variações "borda recheada", "sem cebola",
  // "Interruptor Individual"...): mesma checagem de contagem obrigatória do
  // checkout web — o PDV compartilha o mesmo ProductDetailsModal (mode='pdv').
  const standardGroups = await loadStandardGroupIndex(supabase, produtoIds)
  validateStandardOptionGroups(itens, standardGroups)

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

  // Frete grátis por valor de carrinho — só quando o frete NÃO foi definido
  // manualmente pelo atendente (a escolha explícita do PDV prevalece).
  if (tipo_entrega === 'entrega' && typeof valor_entrega_manual !== 'number') {
    const merchandiseSubtotal = itensParaDesconto.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
    finalDeliveryFee = resolveDeliveryFee({
      distanceFee: finalDeliveryFee,
      merchandiseSubtotal,
      config: store?.promotions_config as Partial<PromotionConfig> | null,
    })
  }

  const { descontoTotal } = await applyPromotions(supabase, itensParaDesconto)

  // 3b. Create order — coluna is_entry do Kanban, igual a qualquer outro
  // canal (checkout do site, agente WhatsApp/Compra Expressa).
  const statusInicial = await resolveEntryKanbanStatus(supabase)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: cliente_id ?? null,
      address_id: addressId,
      payment_method: forma_pagamento ?? 'dinheiro',
      change_for: troco_para ?? null,
      delivery_mode: tipo_entrega ?? 'retirada',
      delivery_fee: finalDeliveryFee,
      free_shipping_applied: finalDeliveryFee === 0 && tipo_entrega === 'entrega',
      notes: observacoes ?? '',
      status: statusInicial,
      discount_applied: descontoTotal,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    logger.error('[admin/orders/create] Erro ao salvar pedido', { error: orderError?.message })
    throw createError({ statusCode: 500, message: 'Falha ao salvar o pedido.' })
  }

  // 3c. Reserva atômica das encomendas na RPC
  if (preorderItems.length > 0) {
    const { error: reserveError } = await supabase.rpc('reserve_preorders', {
      p_order_id: order.id,
      p_items: preorderItems,
    })

    if (reserveError) {
      await supabase.from('orders').delete().eq('id', order.id)
      const isCapacity = reserveError.message.includes('PREORDER_CAPACITY_EXCEEDED')
      logger.warn('[admin/orders/create] Reserva de encomenda rejeitada pelo banco', {
        pedidoId: order.id,
        error: reserveError.message,
      })
      throw createError({
        statusCode: isCapacity ? 409 : 400,
        message: isCapacity
          ? 'A capacidade de encomendas para a data escolhida esgotou.'
          : 'Não foi possível reservar a encomenda para a data solicitada.',
      })
    }
  }

  // 4. Insert items — returns IDs to insert options afterwards.
  const itemsToInsert = itens.map((i) => ({
    order_id: order.id,
    product_id: i.produto_id,
    quantity: i.quantidade,
  }))

  const { data: insertedItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)
    .select('id, product_id')

  if (itemsError) {
    logger.error('Admin Order: error inserting items', {
      pedido_id: order.id,
      error: itemsError.message,
    })
    throw createError({
      statusCode: 500,
      message: 'Failed to save order items.',
    })
  }

  // 4.1. Insert selected options into `order_item_options`.
  if (insertedItems && itens.some((i) => i.opcoes && i.opcoes.length > 0)) {
    const optionRows: Array<{
      order_item_id: string
      option_item_id: string
      frozen_name: string
      frozen_price_delta: number
      text_value: string | null
      file_url: string | null
      original_file_name: string | null
    }> = []

    // Integridade financeira: relê name + price_delta reais de `product_option_item`
    // (o trigger de subtotal soma frozen_price_delta). Nunca confiar no valor
    // enviado pelo cliente — valores do payload são descartados.
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

    // Use index-based matching: Postgres INSERT … RETURNING preserves insertion order,
    // so insertedItems[idx] corresponds to itens[idx]. find() by produto_id is wrong
    // when the same product appears more than once in the cart.
    for (let idx = 0; idx < itens.length; idx++) {
      const item = itens[idx]
      if (!item?.opcoes?.length) continue
      const insertedId = insertedItems[idx]?.id
      if (!insertedId) continue
      for (const op of item.opcoes) {
        const real = opcaoMap.get(op.opcao_item_id)
        if (!real) continue // opção inválida/inativa → ignorada
        const { valorTexto, arquivoUrl, arquivoNomeOriginal } = resolveCustomization(op, specialGroups.configByItemId)
        optionRows.push({
          order_item_id: insertedId,
          option_item_id: op.opcao_item_id,
          frozen_name: real.name,
          frozen_price_delta: real.price_delta,
          text_value: valorTexto,
          file_url: arquivoUrl,
          original_file_name: arquivoNomeOriginal,
        })
      }
    }

    if (optionRows.length > 0) {
      const { error: optionErr } = await supabase
        .from('order_item_options')
        .insert(optionRows)
      if (optionErr) {
        logger.error('Admin Order: error inserting options', {
          pedido_id: order.id,
          error: optionErr.message,
        })
      }
    }
  }

  // 5. Promote lead to customer when completing a counter sale.
  if (cliente_id) {
    await supabase
      .from('customers')
      .update({ is_guest: false })
      .eq('id', cliente_id)
  }

  // 6. Enqueue webhook in outbox with enriched order payload (3.6).
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
    .eq('id', order.id)
    .single()

  await dispatchWebhook(event, 'pedido.criado', {
    pedidoId: order.id,
    clienteId: cliente_id ?? null,
    pedido: fullOrder ?? null,
    origem: 'pdv_admin',
  })

  return {
    success: true,
    pedidoId: order.id,
    message: 'Sale completed successfully.',
  }
})

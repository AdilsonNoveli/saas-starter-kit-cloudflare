import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { dispatchWebhook } from '../../../utils/webhook/dispatchHttp'
import { applyPromotions } from '../../../utils/promotions/applyPromotions'
import { resolveDeliveryFee } from '../../../utils/delivery/freeShipping'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { PromotionConfig } from '#shared/types/store'

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
  await requireRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    logger.warn('[admin/orders/create] Validação do schema falhou', { issues: parsed.error.issues })
    throw createError({ statusCode: 400, message: 'Dados inválidos para criar o pedido.' })
  }

  const supabase = serverSupabaseServiceRole(event)

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
    .from('loja')
    .select('id, taxa_entrega_padrao, config_promocoes')
    .limit(1)
    .single()

  let finalDeliveryFee = 0
  if (tipo_entrega === 'entrega') {
    finalDeliveryFee =
      typeof valor_entrega_manual === 'number'
        ? valor_entrega_manual
        : store?.taxa_entrega_padrao ?? 0
  }

  // 2. Address (if delivery).
  let addressId: string | null = null
  if (tipo_entrega === 'entrega' && endereco?.rua) {
    const { data: addrData, error: addrErr } = await supabase
      .from('enderecos_cliente')
      .insert({
        cliente_id: cliente_id ?? null,
        rua: endereco.rua,
        numero: endereco.numero ?? 'S/N',
        bairro: endereco.bairro ?? 'Não informado',
        complemento: endereco.complemento ?? '',
        cidade: endereco.cidade ?? 'Não informada',
        estado: endereco.estado ?? 'SP',
        cep: endereco.cep ?? '',
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
    .from('produtos')
    .select('id, nome, preco_venda, preco_promocional, product_type')
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
          message: `O produto "${produtoRow?.nome ?? 'sob encomenda'}" exige data de entrega agendada.`,
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

  const precoMap = new Map(
    (precosData ?? []).map((p) => [
      p.id as string,
      (p.preco_promocional ?? p.preco_venda) as number,
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
      config: store?.config_promocoes as Partial<PromotionConfig> | null,
    })
  }

  const { descontoTotal } = await applyPromotions(supabase, itensParaDesconto)

  // 3b. Create order (PDV: starts as confirmed).
  const { data: order, error: orderError } = await supabase
    .from('pedidos')
    .insert({
      cliente_id: cliente_id ?? null,
      endereco_id: addressId,
      forma_pagamento: forma_pagamento ?? 'dinheiro',
      troco_para: troco_para ?? null,
      tipo_entrega: tipo_entrega ?? 'retirada',
      valor_entrega: finalDeliveryFee,
      frete_gratis_aplicado: finalDeliveryFee === 0 && tipo_entrega === 'entrega',
      observacoes: observacoes ?? '',
      status: 'confirmado',
      desconto_aplicado: descontoTotal,
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
      await supabase.from('pedidos').delete().eq('id', order.id)
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
    pedido_id: order.id,
    produto_id: i.produto_id,
    quantidade: i.quantidade,
  }))

  const { data: insertedItems, error: itemsError } = await supabase
    .from('itens_pedido')
    .insert(itemsToInsert)
    .select('id, produto_id')

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

  // 4.1. Insert selected options into `itens_pedido_opcoes`.
  if (insertedItems && itens.some((i) => i.opcoes && i.opcoes.length > 0)) {
    const optionRows: Array<{
      item_pedido_id: string
      opcao_item_id: string
      nome_congelado: string
      preco_delta_congelado: number
    }> = []

    // Integridade financeira: relê nome + preco_delta reais de `produto_opcao_item`
    // (o trigger de subtotal soma preco_delta_congelado). Nunca confiar no valor
    // enviado pelo cliente — valores do payload são descartados.
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
        optionRows.push({
          item_pedido_id: insertedId,
          opcao_item_id: op.opcao_item_id,
          nome_congelado: real.nome,
          preco_delta_congelado: real.preco_delta,
        })
      }
    }

    if (optionRows.length > 0) {
      const { error: optionErr } = await supabase
        .from('itens_pedido_opcoes')
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
      .from('clientes')
      .update({ is_visitante: false })
      .eq('id', cliente_id)
  }

  // 6. Enqueue webhook in outbox with enriched order payload (3.6).
  const { data: fullOrder } = await supabase
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

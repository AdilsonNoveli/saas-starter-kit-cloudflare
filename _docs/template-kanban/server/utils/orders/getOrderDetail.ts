/**
 * Carrega um pedido completo e o converte em `IntegrationOrderDetail`
 * (incluindo a nota térmica em texto). Reutilizado pelo GET /orders/[id]
 * da integração e pelo checkout do carrinho agentivo.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'
import type { IntegrationOrderDetail } from '#shared/types/integration'
import { formatReceiptText } from '#shared/utils/receipt'

interface OrderRow {
  id: string
  short_id: number | null
  status: string
  created_at: string
  delivery_mode: string
  payment_method: string
  subtotal_amount: number | null
  discount_applied: number | null
  delivery_fee: number | null
  total_amount: number | null
  notes: string | null
  service_note: string | null
  customers: { name: string; whatsapp_phone: string | null } | null
  customer_addresses: {
    street: string | null
    number: string | null
    neighborhood: string | null
    complement: string | null
  } | null
  order_items: Array<{
    quantity: number
    subtotal: number | null
    frozen_product_name: string | null
    products: { name: string } | null
  }>
}

export async function getOrderDetail(
  supabase: SupabaseClient<Database>,
  orderId: string,
  // Escopo por dono, quando o chamador tem um cliente identificado (ex.: a
  // tool do agente `ConsultarDetalhePedido`, onde `orderId` vem do LLM — sem
  // isto, qualquer UUID de pedido de OUTRO cliente seria aceito e devolveria
  // nome/telefone/endereço/itens dele). Os dois chamadores internos
  // (`finalizeCheckout.ts`, logo após criar o próprio pedido) seguem sem
  // escopo — o `orderId` ali é gerado pelo próprio servidor, nunca por input
  // externo.
  ownerCustomerId?: string,
): Promise<IntegrationOrderDetail> {
  let query = supabase
    .from('orders')
    .select(`
      id, short_id, status, created_at, delivery_mode, payment_method,
      subtotal_amount, discount_applied, delivery_fee, total_amount, notes, service_note,
      customers (name, whatsapp_phone),
      customer_addresses (street, number, neighborhood, complement),
      order_items (quantity, subtotal, frozen_product_name, products (name))
    `)
    .eq('id', orderId)

  if (ownerCustomerId) {
    query = query.eq('customer_id', ownerCustomerId)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Pedido não encontrado.' })
  }

  const order = data as unknown as OrderRow

  const { data: loja } = await supabase
    .from('store')
    .select('trade_name, pix_key')
    .limit(1)
    .maybeSingle()

  const endereco = order.customer_addresses
    ? [
        [order.customer_addresses.street, order.customer_addresses.number].filter(Boolean).join(', '),
        order.customer_addresses.complement,
        order.customer_addresses.neighborhood,
      ].filter(Boolean).join(' — ') || null
    : null

  const itens = order.order_items.map((i) => ({
    nome: i.products?.name ?? i.frozen_product_name ?? 'Produto indisponível',
    quantidade: Number(i.quantity),
    subtotal: Number(i.subtotal ?? 0),
  }))

  const detail: Omit<IntegrationOrderDetail, 'receipt_text'> = {
    id: order.id,
    short_id: order.short_id,
    status: order.status,
    criado_em: order.created_at,
    tipo_entrega: order.delivery_mode,
    forma_pagamento: order.payment_method,
    valor_subtotal: Number(order.subtotal_amount ?? 0),
    desconto_aplicado: Number(order.discount_applied ?? 0),
    valor_entrega: Number(order.delivery_fee ?? 0),
    valor_total: Number(order.total_amount ?? 0),
    observacoes: order.notes,
    // STAFF-ONLY: presente aqui (JSON que o agente lê), nunca em
    // `formatReceiptText` — essa função não lê este campo de propósito.
    nota_atendimento: order.service_note,
    cliente: order.customers
      ? { nome: order.customers.name, telefone_whatsapp: order.customers.whatsapp_phone }
      : null,
    endereco,
    itens,
  }

  return {
    ...detail,
    receipt_text: formatReceiptText({
      ...detail,
      cliente_nome: order.customers?.name ?? null,
      endereco,
      loja_nome: loja?.trade_name ?? null,
      chave_pix: (loja?.pix_key as string | null) ?? null,
    }),
  }
}

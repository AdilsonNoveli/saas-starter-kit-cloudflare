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
  criado_em: string
  tipo_entrega: string
  forma_pagamento: string
  valor_subtotal: number | null
  desconto_aplicado: number | null
  valor_entrega: number | null
  valor_total: number | null
  observacoes: string | null
  nota_atendimento: string | null
  clientes: { nome: string; telefone_whatsapp: string | null } | null
  enderecos_cliente: {
    rua: string | null
    numero: string | null
    bairro: string | null
    complemento: string | null
  } | null
  itens_pedido: Array<{
    quantidade: number
    subtotal: number | null
    nome_produto_congelado: string | null
    produtos: { nome: string } | null
  }>
}

export async function getOrderDetail(
  supabase: SupabaseClient<Database>,
  orderId: string,
): Promise<IntegrationOrderDetail> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id, short_id, status, criado_em, tipo_entrega, forma_pagamento,
      valor_subtotal, desconto_aplicado, valor_entrega, valor_total, observacoes, nota_atendimento,
      clientes (nome, telefone_whatsapp),
      enderecos_cliente (rua, numero, bairro, complemento),
      itens_pedido (quantidade, subtotal, nome_produto_congelado, produtos (nome))
    `)
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Pedido não encontrado.' })
  }

  const order = data as unknown as OrderRow

  const { data: loja } = await supabase
    .from('loja')
    .select('nome_fantasia, chave_pix')
    .limit(1)
    .maybeSingle()

  const endereco = order.enderecos_cliente
    ? [
        [order.enderecos_cliente.rua, order.enderecos_cliente.numero].filter(Boolean).join(', '),
        order.enderecos_cliente.complemento,
        order.enderecos_cliente.bairro,
      ].filter(Boolean).join(' — ') || null
    : null

  const itens = order.itens_pedido.map((i) => ({
    nome: i.produtos?.nome ?? i.nome_produto_congelado ?? 'Produto indisponível',
    quantidade: Number(i.quantidade),
    subtotal: Number(i.subtotal ?? 0),
  }))

  const detail: Omit<IntegrationOrderDetail, 'receipt_text'> = {
    id: order.id,
    short_id: order.short_id,
    status: order.status,
    criado_em: order.criado_em,
    tipo_entrega: order.tipo_entrega,
    forma_pagamento: order.forma_pagamento,
    valor_subtotal: Number(order.valor_subtotal ?? 0),
    desconto_aplicado: Number(order.desconto_aplicado ?? 0),
    valor_entrega: Number(order.valor_entrega ?? 0),
    valor_total: Number(order.valor_total ?? 0),
    observacoes: order.observacoes,
    // STAFF-ONLY: presente aqui (JSON que o agente lê), nunca em
    // `formatReceiptText` — essa função não lê este campo de propósito.
    nota_atendimento: order.nota_atendimento,
    cliente: order.clientes,
    endereco,
    itens,
  }

  return {
    ...detail,
    receipt_text: formatReceiptText({
      ...detail,
      cliente_nome: order.clientes?.nome ?? null,
      endereco,
      loja_nome: loja?.nome_fantasia ?? null,
      chave_pix: (loja?.chave_pix as string | null) ?? null,
    }),
  }
}

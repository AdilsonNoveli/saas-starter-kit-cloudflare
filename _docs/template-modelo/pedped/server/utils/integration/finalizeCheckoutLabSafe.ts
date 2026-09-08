/**
 * Versão lab-safe de `finalizeCheckout` — exclusiva do laboratório de
 * avaliação (`_docs/implementar/prd-laboratorio-avaliacao-agente.md` §2.3/§5.4).
 * MESMO contrato de entrada/saída (`FinalizeCheckoutParams`/`FinalizeCheckoutResult`)
 * da versão real: valida o carrinho igual, mas devolve um `receipt_text`
 * sintético SEM criar linha em `pedidos` — nenhuma tabela de negócio real é
 * tocada. Repete as mesmas validações 422 (carrinho vazio, modalidade/endereço
 * não definidos) para que o julgamento do laboratório também cubra o caminho
 * de erro que o agente real precisa saber tratar.
 *
 * Teste de contrato obrigatório (`finalizarPedidoLabSafe.spec.ts`, §5.4): prova
 * que a FORMA do retorno (campos presentes, tipos) bate com a real, para que
 * as duas implementações não divirjam em silêncio ao longo do tempo.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'
import type { IntegrationOrderDetail } from '#shared/types/integration'
import { formatReceiptText } from '#shared/utils/receipt'
import { requireActiveSession, getCartState } from '../cart/state'
import type { FinalizeCheckoutParams, FinalizeCheckoutResult } from './finalizeCheckout'

export async function finalizeCheckoutLabSafe(
  supabase: SupabaseClient<Database>,
  params: FinalizeCheckoutParams,
): Promise<FinalizeCheckoutResult> {
  const { sessao_id } = params

  const sessao = await requireActiveSession(supabase, sessao_id)
  if (!sessao.cliente_id) {
    throw createError({ statusCode: 422, statusMessage: 'Sessão sem cliente vinculado.' })
  }

  const cart = await getCartState(supabase, sessao_id)
  if (cart.itens.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'O carrinho está vazio.' })
  }

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

  const criadoEm = new Date().toISOString()
  const itens = cart.itens.map((i) => ({ nome: i.nome, quantidade: i.quantidade, subtotal: i.subtotal }))

  const semReceipt: Omit<IntegrationOrderDetail, 'receipt_text'> = {
    // Id sintético — nunca um UUID de `pedidos` real (nenhuma linha foi criada).
    id: randomUUID(),
    short_id: null,
    status: 'confirmado',
    criado_em: criadoEm,
    tipo_entrega: tipoEntrega,
    forma_pagamento: cart.checkout.payment_method ?? 'dinheiro',
    valor_subtotal: cart.subtotal,
    desconto_aplicado: cart.desconto,
    valor_entrega: 0,
    valor_total: cart.total,
    observacoes: null,
    nota_atendimento: null,
    cliente: null,
    endereco: null,
    itens,
  }

  const pedido: IntegrationOrderDetail = {
    ...semReceipt,
    receipt_text: formatReceiptText({
      ...semReceipt,
      cliente_nome: null,
      endereco: null,
      loja_nome: null,
      chave_pix: null,
    }),
  }

  return { response: { success: true, pedido, idempotent: false } }
}

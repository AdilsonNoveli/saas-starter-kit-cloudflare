/**
 * Serviço de atribuição automática de entregas (Fase 6.3).
 *
 * Orquestra as funções atômicas do Postgres (016) e o disparo do webhook
 * direcionado ('entrega.atribuida') com o pedido + whatsapp do entregador.
 *
 * Separation of Concerns: os endpoints (status.put / integration) chamam estas
 * funções; a regra de seleção atômica vive no banco (sem dupla atribuição).
 */

import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import { dispatchWebhook } from '../webhook/dispatchHttp'

/** Pedido enriquecido com entregador para o payload do webhook direcionado. */
const DELIVERY_ORDER_SELECT = `
  *,
  clientes ( nome, telefone_whatsapp ),
  enderecos_cliente ( * ),
  entregador:usuarios!pedidos_entregador_id_fkey ( id, nome, whatsapp ),
  itens_pedido (
    id, quantidade, preco_unitario_congelado, subtotal, nome_produto_congelado,
    produtos ( nome )
  )
` as const

interface DeliveryOrderRow {
  id: string
  cliente_id: string | null
  entregador: { id: string; nome: string | null; whatsapp: string | null } | null
  [key: string]: unknown
}

/**
 * Dispara o webhook direcionado de entrega atribuída para um pedido que já
 * está em `saiu_para_entrega` com `entregador_id` definido.
 */
async function dispatchDeliveryAssigned(
  event: H3Event,
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(DELIVERY_ORDER_SELECT)
    .eq('id', orderId)
    .single()

  if (error || !data) {
    logger.error('Entrega atribuída mas falha ao montar payload do webhook', {
      orderId,
      error: error?.message,
    })
    return
  }

  const order = data as unknown as DeliveryOrderRow
  await dispatchWebhook(event, 'entrega.atribuida', {
    orderId: order.id,
    customerId: order.cliente_id,
    driverId: order.entregador?.id ?? null,
    driverWhatsapp: order.entregador?.whatsapp ?? null,
    pedido: order,
    origem: 'sistema',
  })
}

/**
 * Tenta atribuir automaticamente um entregador a um pedido que acabou de
 * entrar em `preparado`. Só age se o pedido for de entrega. Em caso de
 * sucesso, dispara o webhook direcionado. Retorna o entregador atribuído
 * (ou `null` quando não há entregador disponível — pedido fica aguardando).
 */
export async function processDeliveryAssignment(
  event: H3Event,
  supabase: SupabaseClient,
  orderId: string,
): Promise<string | null> {
  const { data: driverId, error } = await supabase.rpc('assign_order_driver', {
    p_pedido_id: orderId,
  })

  if (error) {
    logger.error('Falha ao atribuir entregador', { orderId, error: error.message })
    return null
  }
  if (!driverId) {
    logger.info('Sem entregador disponível — pedido aguardando', { orderId })
    return null
  }

  await dispatchDeliveryAssigned(event, supabase, orderId)
  return driverId as string
}

/**
 * Reavalia a fila de entregas após um entregador ser liberado (entrega
 * concluída). Atribui o pedido pendente mais antigo, se houver entregador
 * livre, e dispara o webhook direcionado. Retorna o pedido atribuído (ou null).
 */
export async function reevaluateDeliveryQueue(
  event: H3Event,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: orderId, error } = await supabase.rpc('reevaluate_delivery_queue')

  if (error) {
    logger.error('Falha ao reavaliar fila de entrega', { error: error.message })
    return null
  }
  if (!orderId) {
    return null
  }

  await dispatchDeliveryAssigned(event, supabase, orderId as string)
  return orderId as string
}

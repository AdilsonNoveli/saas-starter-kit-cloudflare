/**
 * Endpoint GET /api/admin/orders/:id
 *
 * Pedido no shape de recibo (`ReceiptOrder`), para
 * `app/components/chat/ChatCustomerOrdersTab.vue` (aba de pedidos do
 * cliente no painel de Chat). Antes lido direto do navegador via
 * `useSupabaseClient()` — migrado pro guard padrão das rotas admin (§5 do
 * AUDITORIA.md).
 */
import { z } from 'zod'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { ReceiptOrder } from '#shared/types/order'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event): Promise<{ data: ReceiptOrder | null }> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de pedido inválido' })
  }
  const id = idRaw as string

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, short_id, criado_em:created_at, status, tipo_entrega:delivery_mode, forma_pagamento:payment_method,
      valor_subtotal:subtotal_amount, valor_total:total_amount, valor_entrega:delivery_fee, troco_para:change_for, frete_gratis_aplicado:free_shipping_applied, observacoes:notes,
      clientes:customers (nome:name, telefone_whatsapp:whatsapp_phone),
      enderecos_cliente:customer_addresses (rua:street, numero:number, bairro:neighborhood),
      itens_pedido:order_items (
        id, nome_produto_congelado:frozen_product_name, quantidade:quantity, subtotal,
        produtos:products (nome:name),
        itens_pedido_opcoes:order_item_options (nome_congelado:frozen_name, preco_delta_congelado:frozen_price_delta, valor_texto:text_value, arquivo_url:file_url, arquivo_nome_original:original_file_name, deferred)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    logger.error('[admin/orders/[id].get] Falha ao buscar pedido', { id, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar pedido' })
  }

  return { data: (data as unknown as ReceiptOrder | null) ?? null }
})

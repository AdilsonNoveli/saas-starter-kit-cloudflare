import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { dispatchWebhook } from '../../../../utils/webhook/dispatchHttp'

const idSchema = z.string().uuid()
const bodySchema = z.object({
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, ['atendente', 'producao', 'gerente', 'administrador', 'proprietario'])

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, message: 'ID de encomenda inválido.' })
  }
  const id = idRaw as string

  const bodyParsed = bodySchema.safeParse(await readBody(event))
  if (!bodyParsed.success) {
    throw createError({ statusCode: 400, message: 'Data de entrega inválida.' })
  }
  const { delivery_date } = bodyParsed.data

  // 1. Verificar se a data de destino está bloqueada
  const { data: isBlocked } = await supabase
    .from('preorder_blocked_dates')
    .select('id')
    .eq('blocked_date', delivery_date)
    .maybeSingle()

  if (isBlocked) {
    throw createError({
      statusCode: 400,
      message: `A data ${delivery_date} está bloqueada para encomendas.`,
    })
  }

  // 2. Buscar dados atuais da encomenda antes da alteração
  const { data: currentPreorder, error: fetchErr } = await supabase
    .from('preorders')
    .select('id, order_id, delivery_date')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !currentPreorder) {
    throw createError({ statusCode: 404, message: 'Encomenda não encontrada.' })
  }

  const previousDate = currentPreorder.delivery_date

  // 3. Atualizar a data da encomenda (todas do mesmo pedido para manter consistência)
  const { data: updatedData, error: updateErr } = await supabase
    .from('preorders')
    .update({ delivery_date })
    .eq('order_id', currentPreorder.order_id)
    .select(`
      id,
      order_id,
      delivery_date,
      quantity,
      unit,
      products ( name ),
      orders (
        id, short_id, status, total_amount, customer_id,
        customers ( name, whatsapp_phone )
      )
    `)

  if (updateErr) {
    logger.error('Falha ao atualizar data da encomenda', {
      preorder_id: id,
      order_id: currentPreorder.order_id,
      delivery_date,
      error: updateErr.message,
    })
    throw createError({ statusCode: 500, message: 'Erro ao atualizar data da encomenda.' })
  }

  // 4. Disparar Webhook de alteração de data (pedido.data_alterada)
  const firstItem = updatedData?.[0]
  if (firstItem) {
    await dispatchWebhook(event, 'pedido.data_alterada', {
      preorderId: id,
      orderId: currentPreorder.order_id,
      shortId: firstItem.orders?.short_id,
      dataAnterior: previousDate,
      novaData: delivery_date,
      clienteId: firstItem.orders?.customer_id,
      pedido: firstItem.orders,
      origem: 'admin_preorders',
    })
  }

  return { success: true, preorders: updatedData }
})

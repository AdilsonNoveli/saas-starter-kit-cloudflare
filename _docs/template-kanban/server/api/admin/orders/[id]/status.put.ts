import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { dispatchWebhook } from '../../../../utils/webhook/dispatchHttp'
import { processDeliveryAssignment, reevaluateDeliveryQueue } from '../../../../utils/delivery/assignment'
import { sendKanbanStageNotification } from '../../../../utils/agent/sendKanbanStageNotification'
import { resolveWebhookRuntimeConfig } from '../../../../utils/whatsapp/resolveWebhookRuntimeConfig'
import { cloudflareEnv } from '../../../../utils/whatsapp/queueBindings'
import type { CustomerStatus } from '#shared/types/agentQuickResponse'

const idSchema = z.string().uuid()
const bodySchema = z.object({ status: z.string().min(1).max(50) })

export default defineEventHandler(async (event) => {
  // Verificação explícita de papel: não depende de RLS para proteger o endpoint.
  // serverSupabaseServiceRole bypassa RLS, portanto a guarda deve ser aqui.
  // Service role garante que o UPDATE não é bloqueado silenciosamente por RLS
  // quando o cookie de sessão não chega corretamente via fetch nativo do browser.
  const { supabase } = await requireServiceRole(event, ['atendente', 'producao', 'gerente', 'administrador', 'proprietario'])

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, message: 'ID de pedido inválido.' })
  }
  const id = idRaw as string

  const bodyParsed = bodySchema.safeParse(await readBody(event))
  if (!bodyParsed.success) {
    throw createError({ statusCode: 400, message: 'Dados incompletos.' })
  }
  const body = bodyParsed.data

  // Valida que o status de destino é uma chave válida de kanban_column e lê o
  // papel de despacho por flag (a automação de entrega não depende de chave
  // hardcoded: qualquer coluna marcada is_delivery_dispatch dispara a atribuição).
  const { data: coluna, error: colunaErr } = await supabase
    .from('kanban_column')
    .select('key, is_delivery_dispatch, is_delivered, is_cancelled')
    .eq('key', body.status)
    .maybeSingle()

  if (colunaErr || !coluna) {
    throw createError({ statusCode: 400, message: `Status inválido: "${body.status}"` })
  }

  // Estado ANTERIOR do pedido — precisa saber se já estava cancelado antes do
  // update, para não estornar estoque duas vezes (migration 111) numa
  // transição cancelado→cancelado (ex.: nota alterada sem trocar de coluna).
  const { data: pedidoAnterior } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  let jaEstavaCancelado = false
  if (pedidoAnterior?.status) {
    const { data: colunaAnterior } = await supabase
      .from('kanban_column')
      .select('is_cancelled')
      .eq('key', pedidoAnterior.status)
      .maybeSingle()
    jaEstavaCancelado = colunaAnterior?.is_cancelled ?? false
  }

  // Atualiza o banco e retorna o pedido enriquecido com os relacionamentos
  const { error, data } = await supabase
    .from('orders')
    .update({ status: body.status } satisfies Database['public']['Tables']['orders']['Update'])
    .eq('id', id)
    .select(`
      *,
      customers (
        name,
        whatsapp_phone,
        whatsapp_lid,
        status
      ),
      customer_addresses (
        *
      ),
      order_items (
        id,
        quantity,
        frozen_unit_price,
        subtotal,
        frozen_product_name,
        products (
          name
        )
      )
    `)
    .single()

  if (error) {
    logger.error('Falha ao atualizar status do pedido', {
      pedido_id: id,
      novo_status: body.status,
      error: error.message,
    })
    throw createError({ statusCode: 500, message: 'Erro ao atualizar status do pedido.' })
  }

  if (!data) {
    throw createError({ statusCode: 404, message: 'Pedido não encontrado.' })
  }

  // 2. Enfileira o webhook no outbox (Transactional Outbox).
  await dispatchWebhook(event, 'pedido.status_alterado', {
    pedidoId: data.id,
    clienteId: data.customer_id,
    novoStatus: body.status,
    notaOperacional: data.operational_note,
    pedido: data,
    origem: 'admin',
  })

  // 2b. Resposta Rápida do Agente IA por etapa do Kanban (gatilho
  // 'kanban_stage') — best-effort, nunca pode derrubar esta resposta: o
  // pedido já mudou de coluna, que é o que importa pro staff agora.
  if (data.customer_id) {
    try {
      const webhookConfig = await resolveWebhookRuntimeConfig(supabase, useRuntimeConfig())
      if (webhookConfig?.provider?.apiToken) {
        await sendKanbanStageNotification(supabase, webhookConfig.provider, cloudflareEnv(event), {
          clienteId: data.customer_id,
          telefone: data.customers?.whatsapp_phone ?? null,
          lid: data.customers?.whatsapp_lid ?? null,
          kanbanStageKey: body.status,
          customerStatus: (data.customers?.status ?? null) as CustomerStatus | null,
        })
      }
    } catch (err) {
      logger.error('[orders/status] falha ao processar resposta rápida de etapa do kanban (ignorado)', {
        pedido_id: id,
        novo_status: body.status,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // 3. Atribuição automática de entrega (6.3) — disparada pela flag da coluna
  //    de destino (is_delivery_dispatch), não por uma chave hardcoded.
  if (coluna.is_delivery_dispatch && data.delivery_mode === 'entrega') {
    await processDeliveryAssignment(event, supabase, data.id)
  }

  // 4. Entrega concluída pelo admin (coluna is_delivered): libera o entregador e
  //    atribui o próximo pedido da fila — mesmo comportamento da confirmação via
  //    WhatsApp do entregador. Sem isso, pedidos ficavam presos "Aguardando
  //    entregador" quando a baixa era feita arrastando o card no quadro.
  if (coluna.is_delivered) {
    await reevaluateDeliveryQueue(event, supabase)
  }

  // 5. Cancelamento (migration 111): estorna toda movimentação de estoque
  //    gravada por consume_order_stock para este pedido. Só na transição
  //    PARA cancelado (jaEstavaCancelado evita estornar duas vezes).
  if (coluna.is_cancelled && !jaEstavaCancelado) {
    const { error: estornoError } = await supabase.rpc('refund_order_stock', { p_order_id: id })
    if (estornoError) {
      logger.error('Falha ao estornar estoque do pedido cancelado', {
        pedido_id: id,
        error: estornoError.message,
      })
    }
  }

  return { success: true }
})

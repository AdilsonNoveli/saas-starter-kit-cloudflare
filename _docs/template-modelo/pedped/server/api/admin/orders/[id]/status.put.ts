import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { requireRole } from '../../../../utils/auth/requireRole'
import { dispatchWebhook } from '../../../../utils/webhook/dispatchHttp'
import { processDeliveryAssignment, reevaluateDeliveryQueue } from '../../../../utils/delivery/assignment'

const idSchema = z.string().uuid()
const bodySchema = z.object({ status: z.string().min(1).max(50) })

export default defineEventHandler(async (event) => {
  // Verificação explícita de papel: não depende de RLS para proteger o endpoint.
  // serverSupabaseServiceRole bypassa RLS, portanto a guarda deve ser aqui.
  await requireRole(event, ['atendente', 'producao', 'gerente', 'administrador', 'proprietario'])

  // Service role garante que o UPDATE não é bloqueado silenciosamente por RLS
  // quando o cookie de sessão não chega corretamente via fetch nativo do browser.
  const supabase = serverSupabaseServiceRole(event)

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

  // Valida que o status de destino é uma chave válida de kanban_coluna e lê o
  // papel de despacho por flag (a automação de entrega não depende de chave
  // hardcoded: qualquer coluna marcada is_delivery_dispatch dispara a atribuição).
  const { data: coluna, error: colunaErr } = await supabase
    .from('kanban_coluna')
    .select('chave, is_delivery_dispatch, is_delivered, is_cancelled')
    .eq('chave', body.status)
    .maybeSingle()

  if (colunaErr || !coluna) {
    throw createError({ statusCode: 400, message: `Status inválido: "${body.status}"` })
  }

  // Estado ANTERIOR do pedido — precisa saber se já estava cancelado antes do
  // update, para não estornar estoque duas vezes (migration 111) numa
  // transição cancelado→cancelado (ex.: nota alterada sem trocar de coluna).
  const { data: pedidoAnterior } = await supabase
    .from('pedidos')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  let jaEstavaCancelado = false
  if (pedidoAnterior?.status) {
    const { data: colunaAnterior } = await supabase
      .from('kanban_coluna')
      .select('is_cancelled')
      .eq('chave', pedidoAnterior.status)
      .maybeSingle()
    jaEstavaCancelado = colunaAnterior?.is_cancelled ?? false
  }

  // Atualiza o banco e retorna o pedido enriquecido com os relacionamentos
  const { error, data } = await supabase
    .from('pedidos')
    .update({ status: body.status } satisfies Database['public']['Tables']['pedidos']['Update'])
    .eq('id', id)
    .select(`
      *,
      clientes (
        nome,
        telefone_whatsapp
      ),
      enderecos_cliente (
        *
      ),
      itens_pedido (
        id,
        quantidade,
        preco_unitario_congelado,
        subtotal,
        nome_produto_congelado,
        produtos (
          nome
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
    clienteId: data.cliente_id,
    novoStatus: body.status,
    notaOperacional: data.nota_operacional,
    pedido: data,
    origem: 'admin',
  })

  // 3. Atribuição automática de entrega (6.3) — disparada pela flag da coluna
  //    de destino (is_delivery_dispatch), não por uma chave hardcoded.
  if (coluna.is_delivery_dispatch && data.tipo_entrega === 'entrega') {
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
  //    gravada por consumir_estoque_pedido para este pedido. Só na transição
  //    PARA cancelado (jaEstavaCancelado evita estornar duas vezes).
  if (coluna.is_cancelled && !jaEstavaCancelado) {
    const { error: estornoError } = await supabase.rpc('estornar_estoque_pedido', { p_pedido_id: id })
    if (estornoError) {
      logger.error('Falha ao estornar estoque do pedido cancelado', {
        pedido_id: id,
        error: estornoError.message,
      })
    }
  }

  return { success: true }
})

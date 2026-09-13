/**
 * Endpoint GET /api/admin/chat/[clienteId]/context
 *
 * Retorna dados detalhados do cliente, endereços e pedidos recentes para a
 * 3ª coluna. Restrito à equipe interna (STAFF_ROLES). Lógica real em
 * `server/utils/chat/chatService.ts` (G1; G9: preço unitário lido de
 * `itens_pedido.preco_unitario_congelado`, nunca recalculado).
 */
import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { ChatCustomerContext } from '#shared/types/chat'
import { getCustomerChatContext } from '../../../../utils/chat/chatService'

const clienteIdSchema = z.string().uuid()

export default defineEventHandler(async (event): Promise<{ success: true, data: ChatCustomerContext }> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const clienteIdRaw = getRouterParam(event, 'clienteId')
  if (!clienteIdSchema.safeParse(clienteIdRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cliente inválido.' })
  }
  const clienteId = clienteIdRaw as string

  const data = await getCustomerChatContext(supabase, clienteId)
  return { success: true, data }
})

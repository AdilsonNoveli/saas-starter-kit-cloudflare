/**
 * Endpoint GET /api/admin/chat/[clienteId]/messages
 *
 * Retorna o histórico de mensagens de uma conversa com um cliente — as mais
 * RECENTES primeiro (G2), com cursor real via `before_seq` para carregar
 * histórico mais antigo. Restrito à equipe interna (STAFF_ROLES). Lógica
 * real em `server/utils/chat/chatService.ts` (G1).
 */
import { createError, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { ChatMessagesResponse } from '#shared/types/chat'
import { getConversationMessages } from '../../../../utils/chat/chatService'

const clienteIdSchema = z.string().uuid()

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before_seq: z.coerce.number().int().min(0).optional(),
})

export default defineEventHandler(async (event): Promise<ChatMessagesResponse> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const clienteIdRaw = getRouterParam(event, 'clienteId')
  if (!clienteIdSchema.safeParse(clienteIdRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cliente inválido.' })
  }
  const clienteId = clienteIdRaw as string

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros inválidos', data: parsed.error.issues })
  }

  return getConversationMessages(supabase, clienteId, {
    limit: parsed.data.limit,
    beforeSeq: parsed.data.before_seq ?? null,
  })
})

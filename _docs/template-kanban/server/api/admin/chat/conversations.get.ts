/**
 * Endpoint GET /api/admin/chat/conversations
 *
 * Lista conversas ativas agrupadas por cliente, ordenadas pela mensagem mais
 * recente (não pelo último pedido — G4). Restrito à equipe interna
 * (STAFF_ROLES). Lógica real em `server/utils/chat/chatService.ts` (G1).
 */
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import { CHAT_FILTER_TABS } from '#shared/types/chat'
import type { ChatConversationsResponse } from '#shared/types/chat'
import { listConversations } from '../../../utils/chat/chatService'

const querySchema = z.object({
  tab: z.enum(CHAT_FILTER_TABS).default('all'),
  search: z.string().trim().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event): Promise<ChatConversationsResponse> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros inválidos', data: parsed.error.issues })
  }

  return listConversations(supabase, parsed.data)
})

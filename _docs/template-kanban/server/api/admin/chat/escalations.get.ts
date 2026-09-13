/**
 * Endpoint GET /api/admin/chat/escalations
 *
 * Snapshot inicial dos clientes em transbordo agora + o toggle de alerta
 * sonoro (`loja.chat_alerta_sonoro_ativo`) — Camada 1 de G13 (§5 do PRD,
 * escopo reduzido: só bolinha pulsante + som, sem cron/e-mail/WhatsApp).
 * Consumido por `useChatEscalations.ts` no boot e a cada resync do socket
 * único; a atualização em tempo real de transbordos novos vem do tópico
 * `chat.conversation_updated`, já existente — este endpoint só cobre o
 * estado inicial/reconexão. Restrito à equipe interna (STAFF_ROLES).
 */
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import type { ChatEscalationsResponse } from '#shared/types/chat'
import { listEscalations } from '../../../utils/chat/chatService'

export default defineEventHandler(async (event): Promise<ChatEscalationsResponse> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  return listEscalations(supabase)
})

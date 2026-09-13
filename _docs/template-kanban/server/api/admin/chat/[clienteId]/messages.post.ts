/**
 * Endpoint POST /api/admin/chat/[clienteId]/messages
 *
 * Envia mensagem manual para o cliente. Restrito à equipe interna
 * (STAFF_ROLES). Lógica real em `server/utils/chat/chatService.ts` (G1) —
 * grava e enfileira; quem envia de fato é
 * `server/plugins/whatsapp-chat-outbound-queue.ts` (G5/G6).
 */
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import { CHAT_CHANNELS, type SendChatMessageResponse } from '#shared/types/chat'
import { dispatchOutboundMessage } from '../../../../utils/chat/chatService'
import { cloudflareEnv } from '../../../../utils/whatsapp/queueBindings'

const clienteIdSchema = z.string().uuid()

const bodySchema = z.object({
  text: z.string().max(4096),
  attachments: z
    .array(z.object({
      url: z.string().url(),
      key: z.string().min(1).max(1024),
      mimeType: z.string().min(1).max(255),
      fileName: z.string().min(1).max(255),
      fileSize: z.number().positive().optional(),
    }))
    .max(10)
    .optional(),
  channel: z.enum(CHAT_CHANNELS).optional(),
})

export default defineEventHandler(async (event): Promise<SendChatMessageResponse> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const clienteIdRaw = getRouterParam(event, 'clienteId')
  if (!clienteIdSchema.safeParse(clienteIdRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cliente inválido.' })
  }
  const clienteId = clienteIdRaw as string

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.issues })
  }

  const data = await dispatchOutboundMessage({ supabase, env: cloudflareEnv(event) }, clienteId, parsed.data)

  return { success: true, data }
})

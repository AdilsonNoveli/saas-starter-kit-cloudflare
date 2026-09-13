/**
 * Endpoint PUT /api/admin/chat/[clienteId]/status
 *
 * Alterna o estado de controle do atendimento:
 *   - 'pause': Pausa manual do Agente IA (loja assume)
 *   - 'resume': Libera a pausa (devolve ao Agente IA)
 * Restrito à equipe interna (STAFF_ROLES). Lógica real em
 * `server/utils/chat/chatService.ts` (G1).
 */
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'
import { toggleTakeoverStatus, type ToggleTakeoverResult } from '../../../../utils/chat/chatService'
import { cloudflareEnv } from '../../../../utils/whatsapp/queueBindings'

const clienteIdSchema = z.string().uuid()

// Teto de 24h para a pausa manual — evita um valor absurdo (ex.: dias/anos)
// travar o atendimento por IA indefinidamente por um erro de digitação.
const bodySchema = z.object({
  action: z.enum(['pause', 'resume']),
  minutes: z.number().int().min(1).max(1440).optional(),
})

export default defineEventHandler(async (event): Promise<ToggleTakeoverResult> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const clienteIdRaw = getRouterParam(event, 'clienteId')
  if (!clienteIdSchema.safeParse(clienteIdRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cliente inválido.' })
  }
  const clienteId = clienteIdRaw as string

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Ação inválida.', data: parsed.error.issues })
  }

  return toggleTakeoverStatus(supabase, clienteId, parsed.data.action, parsed.data.minutes, cloudflareEnv(event))
})

/**
 * Endpoint PUT /api/admin/quick-responses/:id
 *
 * Atualiza uma Resposta Rápida do Agente IA (edição parcial — só os campos
 * enviados mudam, ver `updateQuickResponse`). Restrito a gerente+.
 */
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import {
  CUSTOMER_STATUS_VALUES,
  QUICK_RESPONSE_TRIGGERS,
  QUICK_RESPONSE_WRITE_ROLES,
  type AgentQuickResponse,
} from '#shared/types/agentQuickResponse'
import { updateQuickResponse } from '../../../utils/agent/quickResponseService'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  triggerType: z.enum(QUICK_RESPONSE_TRIGGERS).optional(),
  keywords: z.array(z.string().trim().min(1)).max(50).optional(),
  kanbanStageKey: z.string().trim().min(1).nullable().optional(),
  customerStatuses: z.array(z.enum(CUSTOMER_STATUS_VALUES)).max(CUSTOMER_STATUS_VALUES.length).optional(),
  replyText: z.string().trim().min(1).max(1000).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event): Promise<{ data: AgentQuickResponse }> => {
  const { supabase } = await requireServiceRole(event, QUICK_RESPONSE_WRITE_ROLES)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID da resposta rápida não fornecido.' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.issues })
  }

  const data = await updateQuickResponse(supabase, id, parsed.data)
  return { data }
})

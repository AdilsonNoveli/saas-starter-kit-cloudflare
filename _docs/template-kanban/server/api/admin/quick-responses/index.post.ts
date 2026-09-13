/**
 * Endpoint POST /api/admin/quick-responses
 *
 * Cria uma Resposta Rápida do Agente IA. Restrito a gerente+
 * (`QUICK_RESPONSE_WRITE_ROLES`) — leitura é STAFF_ROLES (ver `index.get.ts`).
 * Vocabulário de `triggerType`/`customerStatuses` validado aqui via Zod —
 * é o ÚNICO lugar onde esses valores são restringidos (o banco não tem
 * CHECK de propósito, ver comentário em `agent_quick_responses`, migration 120).
 */
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import {
  CUSTOMER_STATUS_VALUES,
  QUICK_RESPONSE_TRIGGERS,
  QUICK_RESPONSE_WRITE_ROLES,
  type AgentQuickResponse,
} from '#shared/types/agentQuickResponse'
import { createQuickResponse } from '../../../utils/agent/quickResponseService'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  triggerType: z.enum(QUICK_RESPONSE_TRIGGERS),
  keywords: z.array(z.string().trim().min(1)).max(50).optional(),
  kanbanStageKey: z.string().trim().min(1).nullable().optional(),
  customerStatuses: z.array(z.enum(CUSTOMER_STATUS_VALUES)).max(CUSTOMER_STATUS_VALUES.length).optional(),
  replyText: z.string().trim().min(1).max(1000),
  active: z.boolean().optional(),
  // Omitido = server calcula o fim da lista (nextSortOrder, quickResponseService.ts).
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event): Promise<{ data: AgentQuickResponse }> => {
  const { supabase } = await requireServiceRole(event, QUICK_RESPONSE_WRITE_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.issues })
  }

  const data = await createQuickResponse(supabase, parsed.data)
  return { data }
})

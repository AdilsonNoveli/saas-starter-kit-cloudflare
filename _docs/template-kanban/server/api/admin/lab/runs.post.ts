import { createError } from 'h3'
import { STAFF_ROLES } from '#shared/types/user'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { LAB_PERSONAS } from '../../../utils/lab/personas'
import {
  cloudflareEnv,
  queueBindingFrom,
  sendToQueue,
  type WhatsappLabQueueMessage,
} from '../../../utils/whatsapp/queueBindings'

/**
 * POST /api/admin/lab/runs — dispara uma corrida do laboratório de avaliação
 * (`_docs/implementar/prd-laboratorio-avaliacao-agente.md` §6). Cria
 * `agent_test_run` já com `status='running'` (não `'pending'`): criação e
 * início são a mesma ação aqui, e é esse INSERT que precisa bater no índice
 * único parcial `agent_test_run_unique_active` (migration 105) para rejeitar
 * uma segunda corrida concorrente com 409, em vez de silenciosamente
 * misturar duas corridas na mesma fila.
 */
export default defineEventHandler(async (event) => {
  const { user: caller, supabase: admin } = await requireServiceRole(event, STAFF_ROLES)

  const { data: run, error } = await admin
    .from('agent_test_run')
    .insert({ status: 'running' })
    .select('id')
    .single()

  if (error || !run) {
    if (error?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Já existe uma corrida do laboratório em andamento.' })
    }
    logger.error('[admin/lab] falha ao criar corrida', { error: error?.message ?? 'sem linha criada' })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar a corrida do laboratório.' })
  }

  const queue = queueBindingFrom<WhatsappLabQueueMessage>(cloudflareEnv(event), 'WHATSAPP_LAB_QUEUE')
  await Promise.all(
    LAB_PERSONAS.map((persona, personaIndex) =>
      sendToQueue(queue, 'WHATSAPP_LAB_QUEUE', { runId: run.id, personaKey: persona.key, personaIndex })),
  )

  logger.info('[admin/lab] corrida iniciada', { runId: run.id, userId: caller.id, personas: LAB_PERSONAS.length })

  return { runId: run.id }
})

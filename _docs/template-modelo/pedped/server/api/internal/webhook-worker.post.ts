/**
 * Endpoint interno de drenagem do outbox de webhook (3.6).
 *
 * Acionado por **pg_cron** (a cada ~1 min) ou tarefa scheduled externa.
 * **Não é uma rota pública** — requer `Authorization: Bearer
 * <NUXT_WORKER_TOKEN>`. Decisão (princípio do menor privilégio): token
 * dedicado, separado dos segredos que vão DENTRO dos disparos para o destino
 * configurado (esses vivem no Vault, migration 103). Vazar um não compromete
 * o outro.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRequestHeader } from 'h3'
import { processWebhookOutbox } from '../../utils/webhook/worker'
import { safeCompare } from '../../utils/security/safeCompare'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const expected = (config.workerToken as string) || ''
  const authHeader = getRequestHeader(event, 'authorization') || ''
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''

  if (!expected || !provided || !safeCompare(provided, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const result = await processWebhookOutbox(supabase)
  // `ok` reflete a rodada: uma recusa por falta do token de saída não é
  // sucesso, e quem aciona (pg_cron/monitoramento) precisa ver a diferença.
  return { ok: !result.recusado, ...result }
})

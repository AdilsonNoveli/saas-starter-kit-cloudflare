/**
 * DELETE /api/admin/webhook/secrets — revoga um dos segredos do webhook.
 *
 * Revogação de verdade: `webhook_secret_delete` apaga a linha do Vault, não só
 * zera a coluna (mesma decisão da migration 092 — segredo que continua cifrado
 * no banco não foi revogado).
 *
 * Efeito colateral desejado: sem o segredo, o worker passa a **recusar** a
 * rodada inteira em vez de entregar sem credencial. Revogar é, na prática, o
 * freio de mão do webhook.
 */

import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { invalidateWebhookCredentialsCache } from '../../../utils/webhook/credentials'

const querySchema = z.object({ tipo: z.enum(['token', 'signing']) })

export default defineEventHandler(async (event) => {
  const { user: caller, supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Tipo de segredo inválido.' })
  }
  const { data, error } = await admin.rpc('webhook_secret_delete', { p_type: parsed.data.tipo })

  if (error) {
    logger.error('Falha ao revogar segredo do webhook', { tipo: parsed.data.tipo, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao revogar o segredo.' })
  }

  invalidateWebhookCredentialsCache()
  logger.info('Segredo do webhook revogado', { userId: caller.id, tipo: parsed.data.tipo, existia: data === true })

  return { configurado: false, tipo: parsed.data.tipo }
})

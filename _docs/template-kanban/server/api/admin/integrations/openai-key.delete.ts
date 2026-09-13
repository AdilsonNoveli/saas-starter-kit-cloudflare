import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'

/**
 * DELETE /api/admin/integrations/openai-key — revoga a chave OpenAI do agente
 * WhatsApp (migration 092). A seção 10 da arquitetura do agente especificou
 * escrita e leitura, mas não a revogação; sem esta rota, uma chave vazada só
 * podia ser SUBSTITUÍDA por outra válida, nunca removida pela UI.
 *
 * Revogar ≠ desligar o agente: `agente_ativo` (seção 8, aba Agente IA em
 * `/admin/settings`) continua independente. Os dois caminhos levam ao mesmo
 * fallback ao cliente no consumer, mas só este apaga o segredo do Vault.
 *
 * Idempotente: revogar sem chave configurada responde 200 com
 * `{ configurado: false, revogado: false }`, não erro — o estado final
 * desejado (sem chave) já é o vigente.
 */
export default defineEventHandler(async (event) => {
  const { user: caller, supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)
  const { data: revogado, error } = await admin.rpc('agent_openai_key_delete')

  if (error) {
    logger.error('Falha ao revogar chave OpenAI no Vault', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao revogar a chave.' })
  }

  logger.info('Chave OpenAI do agente revogada', { userId: caller.id, revogado })

  return { configurado: false, mascara: null, revogado: revogado === true }
})

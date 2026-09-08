import { serverSupabaseServiceRole } from '#supabase/server'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'
import { hasLegacyEnvToken } from '../../../utils/whatsapp/buildWhatsappProviderConfig'

/**
 * DELETE /api/admin/integrations/whatsapp-provider — revoga o token do provedor
 * de WhatsApp (migration 093), mesmo desenho da revogação da chave OpenAI
 * (migration 092): apaga o segredo do Vault, não só a referência. Revogação que
 * deixa o texto cifrado no banco não é revogação.
 *
 * URL base e rótulo do provedor permanecem — não são credencial, e limpá-los
 * faria o lojista reconfigurar tudo para trocar só o token.
 *
 * Idempotente: revogar sem token configurado responde 200 com
 * `revogado: false`, não erro — o estado final desejado já é o vigente.
 *
 * ⚠️ Enquanto o fallback de env da §3.2 existir (removido na fase 8 da §11),
 * revogar aqui **não** deixa o agente mudo se `NUXT_WHATSAPP_API_TOKEN` estiver
 * definido: o envio volta a usar a credencial de ambiente. É o preço da
 * transição sem downtime, e o card avisa quando esse é o caso.
 */
export default defineEventHandler(async (event) => {
  const caller = await requireRole(event, USER_MANAGEMENT_ROLES)

  const admin = serverSupabaseServiceRole(event)
  const { data: revogado, error } = await admin.rpc('whatsapp_api_key_delete')

  if (error) {
    logger.error('Falha ao revogar token do provedor no Vault', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao revogar o token.' })
  }

  logger.info('Token do provedor de WhatsApp revogado', { userId: caller.id, revogado })

  return {
    configurado: false,
    mascara: null,
    revogado: revogado === true,
    usandoFallbackEnv: hasLegacyEnvToken(useRuntimeConfig(event)),
  }
})

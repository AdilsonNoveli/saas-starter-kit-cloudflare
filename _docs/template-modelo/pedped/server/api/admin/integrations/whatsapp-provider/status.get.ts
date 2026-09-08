import { serverSupabaseServiceRole } from '#supabase/server'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../../utils/auth/requireRole'
import { hasLegacyEnvToken } from '../../../../utils/whatsapp/buildWhatsappProviderConfig'

/**
 * GET /api/admin/integrations/whatsapp-provider/status — lê só
 * `whatsapp_api_key_id is not null`, a máscara, a URL base e o rótulo
 * (§6.2 de `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 * **Nunca chama `whatsapp_api_key_get`** — status não precisa decriptar nada, e
 * manter a decriptação restrita a escrita e uso em runtime é o item central da
 * §9, o mesmo desenho de `openai-key/status`.
 *
 * `usandoFallbackEnv` alimenta o aviso do card (§3.2): sem token no Vault, o
 * envio ainda funciona pela env legada, e o lojista precisa saber que está
 * nesse estado — é justamente o que o impede de trocar de provedor sem deploy.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, USER_MANAGEMENT_ROLES)

  const admin = serverSupabaseServiceRole(event)
  const { data: loja } = await admin
    .from('loja')
    .select('whatsapp_api_key_id, whatsapp_api_key_mascara, whatsapp_api_base_url, whatsapp_provedor_nome')
    .limit(1)
    .maybeSingle()

  const configurado = !!loja?.whatsapp_api_key_id

  return {
    configurado,
    mascara: loja?.whatsapp_api_key_mascara ?? null,
    baseUrl: loja?.whatsapp_api_base_url ?? '',
    provedorNome: loja?.whatsapp_provedor_nome ?? '',
    usandoFallbackEnv: !configurado && hasLegacyEnvToken(useRuntimeConfig(event)),
  }
})

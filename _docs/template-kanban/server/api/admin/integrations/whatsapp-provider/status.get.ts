import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { hasLegacyEnvToken } from '../../../../utils/whatsapp/buildWhatsappProviderConfig'
import { resolveSiteUrl } from '../../../../utils/net/siteUrl'

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
 *
 * `webhookUrl` é o endereço de ENTRADA (`verifyWebhookToken.ts`) — o que o
 * lojista precisa colar no painel do provedor para receber mensagem de
 * cliente. Não é segredo do Vault: é `NUXT_SITE_URL` + `NUXT_WHATSAPP_WEBHOOK_TOKEN`,
 * os dois só configuráveis no deploy (`wrangler secret put`). Devolvido em
 * claro porque só chega a quem já tem papel de admin (`requireRole` acima) e
 * é exatamente o valor que a tela precisa exibir para copiar — mascarar aqui
 * só obrigaria o lojista a ir atrás do valor em outro lugar (env do deploy).
 * `null` quando falta `NUXT_SITE_URL` ou `NUXT_WHATSAPP_WEBHOOK_TOKEN`: a tela
 * usa isso para avisar que o deploy ainda não terminou a configuração, em vez
 * de mostrar uma URL quebrada.
 */
export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)
  const { data: loja } = await admin
    .from('store')
    .select('whatsapp_api_key_id, whatsapp_api_key_mask, whatsapp_api_base_url, whatsapp_provider_name')
    .limit(1)
    .maybeSingle()

  const configurado = !!loja?.whatsapp_api_key_id

  const webhookToken = (useRuntimeConfig(event).whatsappWebhookToken as string) || ''
  let webhookUrl: string | null = null
  if (webhookToken) {
    try {
      webhookUrl = `${resolveSiteUrl()}/api/whatsapp/webhook/${webhookToken}`
    } catch {
      // NUXT_SITE_URL ausente — `webhookUrl` fica null, a tela avisa em vez de montar link quebrado.
    }
  }

  return {
    configurado,
    mascara: loja?.whatsapp_api_key_mask ?? null,
    baseUrl: loja?.whatsapp_api_base_url ?? '',
    provedorNome: loja?.whatsapp_provider_name ?? '',
    usandoFallbackEnv: !configurado && hasLegacyEnvToken(useRuntimeConfig(event)),
    webhookUrl,
    webhookConfigurado: !!webhookToken,
  }
})

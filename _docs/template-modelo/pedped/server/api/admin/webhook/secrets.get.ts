/**
 * GET /api/admin/webhook/secrets — estado dos segredos do webhook de saída.
 *
 * Devolve **só a máscara**, nunca o valor. Mesmo contrato da chave OpenAI
 * (`integrations/openai-key/status`): a tela precisa saber que existe e
 * mostrar o final para o operador se reconhecer, e nada além disso.
 * `vault.decrypted_secrets` não é tocado aqui — checagem de status não
 * descriptografa nada.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'

export default defineEventHandler(async (event) => {
  await requireRole(event, USER_MANAGEMENT_ROLES)

  const admin = serverSupabaseServiceRole(event)
  const { data: loja } = await admin
    .from('loja')
    .select('webhook_token_id, webhook_token_mascara, webhook_signing_secret_id, webhook_signing_secret_mascara')
    .limit(1)
    .maybeSingle()

  return {
    token: {
      configurado: !!loja?.webhook_token_id,
      mascara: loja?.webhook_token_mascara ?? null,
    },
    assinatura: {
      configurado: !!loja?.webhook_signing_secret_id,
      mascara: loja?.webhook_signing_secret_mascara ?? null,
    },
  }
})

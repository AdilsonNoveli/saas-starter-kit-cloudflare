import { serverSupabaseServiceRole } from '#supabase/server'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../../utils/auth/requireRole'

/**
 * GET /api/admin/integrations/openai-key/status — lê só `agente_openai_key_id
 * is not null` e `agente_openai_key_mascara` (seção 10 da arquitetura do
 * agente WhatsApp). Nunca consulta `vault.decrypted_secrets` — checagem de
 * status não precisa descriptografar nada.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, USER_MANAGEMENT_ROLES)

  const admin = serverSupabaseServiceRole(event)
  const { data: loja } = await admin
    .from('loja')
    .select('agente_openai_key_id, agente_openai_key_mascara, agente_modelo')
    .limit(1)
    .maybeSingle()

  return {
    configurado: !!loja?.agente_openai_key_id,
    mascara: loja?.agente_openai_key_mascara ?? null,
    modelo: loja?.agente_modelo ?? 'gpt-4.1-mini',
  }
})

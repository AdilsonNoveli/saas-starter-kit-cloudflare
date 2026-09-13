import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../../utils/auth/requireRole'

/**
 * GET /api/admin/integrations/openai-key/status — lê só `agent_openai_key_id
 * is not null` e `agent_openai_key_mask` (seção 10 da arquitetura do
 * agente WhatsApp). Nunca consulta `vault.decrypted_secrets` — checagem de
 * status não precisa descriptografar nada.
 */
export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)
  const { data: loja } = await admin
    .from('store')
    .select('agent_openai_key_id, agent_openai_key_mask, agent_model')
    .limit(1)
    .maybeSingle()

  return {
    configurado: !!loja?.agent_openai_key_id,
    mascara: loja?.agent_openai_key_mask ?? null,
    modelo: loja?.agent_model ?? 'gpt-4.1-mini',
  }
})

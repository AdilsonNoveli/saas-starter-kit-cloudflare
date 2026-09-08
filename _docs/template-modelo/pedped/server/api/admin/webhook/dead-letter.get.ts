/**
 * GET /api/admin/webhook/dead-letter — eventos que morreram sem ser entregues
 * (§8.16, defeito 6).
 *
 * Antes, evento morto só existia como `logger.error` num tail que ninguém
 * observa: a perda era real e silenciosa. Aqui ela vira uma lista que o admin
 * enxerga e pode reenfileirar.
 *
 * **Não devolve `payload`.** A lista existe para diagnosticar entrega, e o
 * payload carrega nome, telefone e endereço do cliente — expor isso numa
 * listagem seria trocar um problema de observabilidade por um de privacidade.
 * O que o operador precisa para agir está nos metadados: qual evento, quando,
 * quantas tentativas, que erro.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'

/** Teto da listagem: é painel de diagnóstico, não exportação. */
const LIMITE = 50

export default defineEventHandler(async (event) => {
  await requireRole(event, USER_MANAGEMENT_ROLES)

  const admin = serverSupabaseServiceRole(event)
  const { data, error } = await admin
    .from('webhook_outbox')
    .select('id, event_id, evento, destino_url, tentativas, http_status, ultimo_erro, criado_em')
    .eq('status', 'morto')
    .order('criado_em', { ascending: false })
    .limit(LIMITE)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { eventos: data ?? [], limite: LIMITE }
})

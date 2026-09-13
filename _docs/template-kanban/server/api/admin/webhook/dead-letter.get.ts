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

import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { logger } from '~/core/services/logger.service'

/** Teto da listagem: é painel de diagnóstico, não exportação. */
const LIMITE = 50

export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)
  const { data, error } = await admin
    .from('webhook_outbox')
    .select('id, event_id, evento:event, destino_url:destination_url, tentativas:attempts, http_status, ultimo_erro:last_error, criado_em:created_at')
    .eq('status', 'morto')
    .order('created_at', { ascending: false })
    .limit(LIMITE)

  if (error) {
    logger.error('[admin/webhook/dead-letter] Falha ao listar eventos mortos', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar eventos mortos.' })
  }

  return { eventos: data ?? [], limite: LIMITE }
})

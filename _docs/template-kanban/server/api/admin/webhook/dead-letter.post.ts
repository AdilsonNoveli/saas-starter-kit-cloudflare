/**
 * POST /api/admin/webhook/dead-letter — reenfileira um evento morto
 * (§8.16, defeito 6).
 *
 * Dead-letter só serve para alguma coisa se der para agir sobre ela. O caso
 * que motivou isto foi um `pedido.criado` morto por `403` de credencial (§8.14)
 * — corrigido o token, o evento tinha de poder voltar para a fila em vez de
 * ficar perdido para sempre.
 *
 * Reenfileirar um evento cujo destino é inseguro é permitido de propósito: ele
 * vai morrer de novo na validação do worker, com o motivo registrado. Quem
 * decide o destino é a tela de configuração, não esta rota.
 */

import { createError, readBody } from 'h3'
import { z } from 'zod'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { logger } from '~/core/services/logger.service'

const bodySchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'id inválido.' })
  }
  // `WHERE` por id **e** por status: além do `pg-safeupdate` (§5, armadilha 2),
  // o filtro de status é o que impede reenfileirar por acidente um evento que
  // já está em voo ou já foi entregue.
  const { data, error } = await admin
    .from('webhook_outbox')
    .update({
      status: 'pendente',
      attempts: 0,
      http_status: null,
      // Elegível imediatamente — mesmo -2s de `dispatchWebhookCore`, pelo mesmo
      // motivo (clock skew entre a app e o banco).
      next_retry_at: new Date(Date.now() - 2000).toISOString(),
    })
    .eq('id', parsed.data.id)
    .eq('status', 'morto')
    .select('id, event_id, event')
    .maybeSingle()

  if (error) {
    logger.error('[admin/webhook/dead-letter] Falha ao reenfileirar evento', { id: parsed.data.id, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao reenfileirar evento.' })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Evento não encontrado ou não está morto.' })
  }

  // `last_error` fica: é o histórico de por que morreu da primeira vez, e some
  // sozinho na próxima tentativa (sucesso zera, falha sobrescreve).
  return { ok: true, evento: data }
})

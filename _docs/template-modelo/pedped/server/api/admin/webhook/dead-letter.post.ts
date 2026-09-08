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

import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'

const bodySchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  await requireRole(event, USER_MANAGEMENT_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'id inválido.' })
  }

  const admin = serverSupabaseServiceRole(event)
  // `WHERE` por id **e** por status: além do `pg-safeupdate` (§5, armadilha 2),
  // o filtro de status é o que impede reenfileirar por acidente um evento que
  // já está em voo ou já foi entregue.
  const { data, error } = await admin
    .from('webhook_outbox')
    .update({
      status: 'pendente',
      tentativas: 0,
      http_status: null,
      // Elegível imediatamente — mesmo -2s de `dispatchWebhookCore`, pelo mesmo
      // motivo (clock skew entre a app e o banco).
      proxima_tentativa_em: new Date(Date.now() - 2000).toISOString(),
    })
    .eq('id', parsed.data.id)
    .eq('status', 'morto')
    .select('id, event_id, evento')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Evento não encontrado ou não está morto.' })
  }

  // `ultimo_erro` fica: é o histórico de por que morreu da primeira vez, e some
  // sozinho na próxima tentativa (sucesso zera, falha sobrescreve).
  return { ok: true, evento: data }
})

/**
 * PUT /api/admin/orders/:id/nota-atendimento
 *
 * Nota do atendente sobre o andamento do pedido (staff-only, migration 109) —
 * separada de `status.put.ts` de propósito: não dispara webhook nem
 * atribuição de entrega, é só o texto que o agente lê no pós-venda
 * (`getCustomerContext.ts`/`getOrderDetail.ts`), nunca impresso em recibo.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

const idSchema = z.string().uuid()
// String vazia normaliza para null — "apagar a nota" salva null, não ''.
const bodySchema = z.object({ nota: z.string().max(2000).nullable() })

export default defineEventHandler(async (event) => {
  // Service role bypassa RLS: exige papel staff explícito (middleware só autentica).
  await requireRole(event, STAFF_ROLES)

  const idParsed = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 400, message: 'ID de pedido inválido.' })
  }

  const bodyParsed = bodySchema.safeParse(await readBody(event))
  if (!bodyParsed.success) {
    throw createError({ statusCode: 400, message: 'Nota inválida (máximo 2000 caracteres).' })
  }

  const nota = bodyParsed.data.nota?.trim() || null
  const supabase = serverSupabaseServiceRole(event)

  const { error } = await supabase
    .from('pedidos')
    .update({ nota_atendimento: nota })
    .eq('id', idParsed.data)

  if (error) {
    logger.error('nota-atendimento: falha ao salvar', { id: idParsed.data, message: error.message })
    throw createError({ statusCode: 500, message: 'Erro ao salvar a nota.' })
  }

  logger.info('nota-atendimento: ok', { id: idParsed.data, temNota: nota !== null })
  return { success: true, nota }
})

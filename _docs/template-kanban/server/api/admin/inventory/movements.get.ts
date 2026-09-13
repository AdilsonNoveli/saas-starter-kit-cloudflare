import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/** GET /api/admin/inventory/movements — histórico paginado por entidade (migration 111). */
const querySchema = z.object({
  tipo_entidade: z.enum(['produto', 'insumo']),
  entidade_id: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros inválidos.' })
  }
  const { tipo_entidade, entidade_id, limit, offset } = parsed.data
  const { data, error, count } = await supabase
    .from('stock_movements')
    .select('id, tipo_movimento:movement_type, quantidade:quantity, motivo:reason, pedido_id:order_id, usuario_id:user_id, criado_em:created_at', { count: 'exact' })
    .eq('entity_type', tipo_entidade)
    .eq('entity_id', entidade_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler histórico de movimentações.' })
  }

  return { data: data ?? [], total: count ?? 0, limit, offset }
})

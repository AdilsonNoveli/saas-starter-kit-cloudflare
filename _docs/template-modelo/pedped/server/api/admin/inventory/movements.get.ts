import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/** GET /api/admin/inventory/movements — histórico paginado por entidade (migration 111). */
const querySchema = z.object({
  tipo_entidade: z.enum(['produto', 'insumo']),
  entidade_id: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros inválidos.' })
  }
  const { tipo_entidade, entidade_id, limit, offset } = parsed.data

  // Service role — mesma razão de products.get.ts/movements.post.ts.
  const supabase = serverSupabaseServiceRole(event)
  const { data, error, count } = await supabase
    .from('estoque_movimentacoes')
    .select('id, tipo_movimento, quantidade, motivo, pedido_id, usuario_id, criado_em', { count: 'exact' })
    .eq('tipo_entidade', tipo_entidade)
    .eq('entidade_id', entidade_id)
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler histórico de movimentações.' })
  }

  return { data: data ?? [], total: count ?? 0, limit, offset }
})

import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * GET /api/admin/inventory/products — produtos com controle de estoque
 * configurado (`stock_control != 'nenhum'`), para a aba "Produtos" de
 * `/admin/inventory` (Gestão de Estoque, migration 111).
 */
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros inválidos' })
  }
  const { limit, offset } = parsed.data

  const { data, error, count } = await supabase
    .from('products')
    .select('id, nome:name, unidade_medida:unit, controle_estoque:stock_control, estoque_atual:current_stock, estoque_minimo:minimum_stock, producao_diaria_limite:daily_production_limit', { count: 'exact' })
    .neq('stock_control', 'nenhum')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar produtos com controle de estoque.' })
  }

  return { data: data ?? [], total: count ?? 0, limit, offset }
})

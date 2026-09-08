import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * GET /api/admin/inventory/products — produtos com controle de estoque
 * configurado (`controle_estoque != 'nenhum'`), para a aba "Produtos" de
 * `/admin/inventory` (Gestão de Estoque, migration 111).
 */
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros inválidos' })
  }
  const { limit, offset } = parsed.data

  // Service role: endpoint já é autorizado via requireRole (qualquer staff);
  // RLS de produtos é mais restrita (gerente+ pra escrita) e não deve ser a
  // autoridade aqui — mesma armadilha documentada em movements.post.ts.
  const supabase = serverSupabaseServiceRole(event)

  const { data, error, count } = await supabase
    .from('produtos')
    .select('id, nome, unidade_medida, controle_estoque, estoque_atual, estoque_minimo, producao_diaria_limite', { count: 'exact' })
    .neq('controle_estoque', 'nenhum')
    .order('nome', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar produtos com controle de estoque.' })
  }

  return { data: data ?? [], total: count ?? 0, limit, offset }
})

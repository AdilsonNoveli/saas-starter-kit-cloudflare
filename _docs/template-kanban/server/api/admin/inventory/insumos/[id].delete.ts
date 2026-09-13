import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { CUSTOMER_DELETE_ROLES } from '#shared/types/user'

/**
 * DELETE /api/admin/inventory/insumos/[id] — remove insumo (migration 111).
 * `produto_insumos.insumo_id` tem ON DELETE CASCADE — remove também a receita
 * de qualquer produto que usava este insumo. Destrutivo e irreversível:
 * restrito a gerência para cima, mesmo teto de `customers/[id].delete.ts`.
 */
const idSchema = z.uuid()

export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, CUSTOMER_DELETE_ROLES)

  const id = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }
  const { error } = await supabase.from('ingredients').delete().eq('id', id.data)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao excluir insumo.' })
  }

  return { success: true }
})

import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * DELETE /api/admin/inventory/insumos/[id] — remove insumo (migration 111).
 * `produto_insumos.insumo_id` tem ON DELETE CASCADE — remove também a receita
 * de qualquer produto que usava este insumo.
 */
const idSchema = z.uuid()

export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const id = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.from('insumos').delete().eq('id', id.data)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao excluir insumo.' })
  }

  return { success: true }
})

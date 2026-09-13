import { createError } from 'h3'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/** GET /api/admin/inventory/insumos — lista de insumos (matéria-prima), migration 111. */
export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, nome:name, unidade_medida:unit, estoque_atual:current_stock, estoque_minimo:minimum_stock, ativo:active')
    .order('name', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar insumos.' })
  }

  return { data: data ?? [] }
})

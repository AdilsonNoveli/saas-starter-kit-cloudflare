import { serverSupabaseServiceRole } from '#supabase/server'
import { createError } from 'h3'
import { requireRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/** GET /api/admin/inventory/insumos — lista de insumos (matéria-prima), migration 111. */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('insumos')
    .select('id, nome, unidade_medida, estoque_atual, estoque_minimo, ativo')
    .order('nome', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar insumos.' })
  }

  return { data: data ?? [] }
})

import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/** PUT /api/admin/inventory/insumos/[id] — edita insumo, migration 111. */
const idSchema = z.uuid()
const bodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  unidade_medida: z.enum(['unidade', 'kg', 'litro', 'metro', 'caixa']),
  estoque_minimo: z.number().nonnegative().nullable().default(null),
  ativo: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const id = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos para editar insumo.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('insumos')
    .update(parsed.data)
    .eq('id', id.data)
    .select('id, nome, unidade_medida, estoque_atual, estoque_minimo, ativo')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao editar insumo.' })
  }

  return { data }
})

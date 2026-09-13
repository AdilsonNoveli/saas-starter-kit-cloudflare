import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
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
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const id = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos para editar insumo.' })
  }
  const { data, error } = await supabase
    .from('ingredients')
    .update({
      name: parsed.data.nome,
      unit: parsed.data.unidade_medida,
      minimum_stock: parsed.data.estoque_minimo,
      active: parsed.data.ativo,
    })
    .eq('id', id.data)
    .select('id, nome:name, unidade_medida:unit, estoque_atual:current_stock, estoque_minimo:minimum_stock, ativo:active')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao editar insumo.' })
  }

  return { data }
})

import { createError, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/** POST /api/admin/inventory/insumos — cria insumo (matéria-prima), migration 111. */
const bodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  unidade_medida: z.enum(['unidade', 'kg', 'litro', 'metro', 'caixa']),
  estoque_atual: z.number().nonnegative().default(0),
  estoque_minimo: z.number().nonnegative().nullable().default(null),
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos para criar insumo.' })
  }
  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      name: parsed.data.nome,
      unit: parsed.data.unidade_medida,
      current_stock: parsed.data.estoque_atual,
      minimum_stock: parsed.data.estoque_minimo,
    })
    .select('id, nome:name, unidade_medida:unit, estoque_atual:current_stock, estoque_minimo:minimum_stock, ativo:active')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar insumo.' })
  }

  return { data }
})

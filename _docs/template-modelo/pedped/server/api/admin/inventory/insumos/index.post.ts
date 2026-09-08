import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { requireRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/** POST /api/admin/inventory/insumos — cria insumo (matéria-prima), migration 111. */
const bodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  unidade_medida: z.enum(['unidade', 'kg', 'litro', 'metro', 'caixa']),
  estoque_atual: z.number().nonnegative().default(0),
  estoque_minimo: z.number().nonnegative().nullable().default(null),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos para criar insumo.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('insumos')
    .insert(parsed.data)
    .select('id, nome, unidade_medida, estoque_atual, estoque_minimo, ativo')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar insumo.' })
  }

  return { data }
})

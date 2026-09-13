import { createError, readBody } from 'h3'
import { z } from 'zod'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * PUT /api/admin/inventory/recipe — grava a receita/BOM de um produto
 * (`product_ingredients`, migration 111). Delete+reinsert — mesmo "set semântico"
 * de `replaceCartItemOptions` (`server/utils/cart/setCartItem.ts`).
 */
const bodySchema = z.object({
  produto_id: z.uuid(),
  insumos: z.array(z.object({
    insumo_id: z.uuid(),
    quantidade_por_unidade: z.number().positive(),
  })).max(50),
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos para gravar a receita.' })
  }
  const { produto_id, insumos } = parsed.data

  const { error: delErr } = await supabase.from('product_ingredients').delete().eq('product_id', produto_id)
  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar a receita do produto.' })
  }

  if (insumos.length === 0) {
    return { success: true }
  }

  const { error: insErr } = await supabase.from('product_ingredients').insert(
    insumos.map((i) => ({
      product_id: produto_id,
      ingredient_id: i.insumo_id,
      quantity_per_unit: i.quantidade_por_unidade,
    })),
  )
  if (insErr) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao gravar a receita do produto.' })
  }

  return { success: true }
})

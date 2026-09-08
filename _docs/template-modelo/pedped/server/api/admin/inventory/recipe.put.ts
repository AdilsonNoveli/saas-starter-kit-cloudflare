import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * PUT /api/admin/inventory/recipe — grava a receita/BOM de um produto
 * (`produto_insumos`, migration 111). Delete+reinsert — mesmo "set semântico"
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
  await requireRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos para gravar a receita.' })
  }
  const { produto_id, insumos } = parsed.data

  // Service role — mesma razão de products.get.ts/movements.post.ts.
  const supabase = serverSupabaseServiceRole(event)

  const { error: delErr } = await supabase.from('produto_insumos').delete().eq('produto_id', produto_id)
  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar a receita do produto.' })
  }

  if (insumos.length === 0) {
    return { success: true }
  }

  const { error: insErr } = await supabase.from('produto_insumos').insert(
    insumos.map((i) => ({ produto_id, insumo_id: i.insumo_id, quantidade_por_unidade: i.quantidade_por_unidade })),
  )
  if (insErr) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao gravar a receita do produto.' })
  }

  return { success: true }
})

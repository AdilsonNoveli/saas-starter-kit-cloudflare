import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { getAvailability, loadPreorderProduct } from '../../utils/preorders/availability'
import { isCalendarDate } from '#shared/utils/preorders'

/**
 * GET /api/preorders/availability?product_id&date[&quantity]
 * Disponibilidade de encomenda de um produto numa data (rota fina — a lógica
 * vive em server/utils/preorders/availability). Público: service role + rate
 * limit global, mesmo padrão das demais rotas de catálogo.
 */
const querySchema = z.object({
  product_id: z.uuid(),
  date: z.string().refine(isCalendarDate, 'Data inválida (YYYY-MM-DD).'),
  quantity: z.coerce.number().positive().optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Parâmetros inválidos.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const product = await loadPreorderProduct(supabase, parsed.data.product_id)
  if (!product) {
    throw createError({ statusCode: 404, message: 'Produto não aceita encomendas.' })
  }

  return getAvailability(supabase, product, parsed.data.date, parsed.data.quantity)
})

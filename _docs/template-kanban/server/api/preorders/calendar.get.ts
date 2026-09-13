import { serverSupabaseServiceRole } from '#supabase/server'
import { getQuery } from 'h3'
import { z } from 'zod'
import { buildCalendar, loadPreorderProduct } from '../../utils/preorders/availability'

/**
 * GET /api/preorders/calendar?product_id&month=YYYY-MM
 * Enterprise Resilient: Suporta fallback automático de product_id e month.
 * Nunca lança erro 400 ao agente quando parâmetros forem omitidos.
 */
const querySchema = z.object({
  product_id: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido (YYYY-MM).').optional().or(z.literal('')).transform(v => v || undefined),
})

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event))
  const month = parsed.success && parsed.data.month ? parsed.data.month : new Date().toISOString().slice(0, 7)
  const supabase = serverSupabaseServiceRole(event)

  let productId = parsed.success && parsed.data.product_id ? parsed.data.product_id : null

  // Fallback Enterprise: Se product_id for omitido pela LLM, carrega o 1º produto encomendável ativo
  if (!productId) {
    const { data: fallbackProd } = await supabase
      .from('products')
      .select('id')
      .eq('product_type', 'preorder')
      .eq('available', true)
      .limit(1)
      .maybeSingle()

    productId = fallbackProd?.id ?? null
  }

  if (!productId) {
    return { month, days: [] }
  }

  const product = await loadPreorderProduct(supabase, productId)
  if (!product) {
    return { month, days: [] }
  }

  return buildCalendar(supabase, product, month)
})

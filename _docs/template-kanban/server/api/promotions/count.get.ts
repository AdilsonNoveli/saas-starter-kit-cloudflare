/**
 * GET /api/ofertas/count
 * Retorna a contagem de produtos disponíveis com preço promocional ativo.
 */
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('available', true)
    .not('promo_price', 'is', null)

  if (error) return { count: 0 }

  return { count: count ?? 0 }
})

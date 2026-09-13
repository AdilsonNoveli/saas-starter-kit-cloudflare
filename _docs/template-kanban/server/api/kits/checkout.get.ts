/**
 * GET /api/kits/checkout
 * Retorna kits ativos marcados para aparecer no checkout (público, sem auth).
 */
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('kits')
    .select(`
      id,
      name,
      description,
      photo_url,
      fixed_price,
      label,
      kit_items (
        product_id,
        quantity,
        products ( name, sale_price )
      )
    `)
    .eq('available', true)
    .eq('show_at_checkout', true)
    .order('name')

  if (error) {
    return { kits: [] }
  }

  return { kits: data ?? [] }
})

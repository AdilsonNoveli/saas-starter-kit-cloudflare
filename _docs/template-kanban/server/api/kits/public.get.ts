/**
 * GET /api/kits/public
 * Retorna kits disponíveis para exibição no catálogo (público, sem auth).
 */
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  // `*` (em vez de colunas explícitas) mantém o endpoint resiliente à ordem da
  // migração 042 (kits.imagens): antes de aplicada, apenas não retorna o campo.
  const { data, error } = await supabase
    .from('kits')
    .select(`
      *,
      kit_items (
        quantity,
        products ( name, sale_price )
      )
    `)
    .eq('available', true)
    .order('name')

  if (error) return { kits: [] }

  return { kits: data ?? [] }
})

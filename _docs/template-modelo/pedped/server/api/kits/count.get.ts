/**
 * GET /api/kits/count
 * Retorna contagem de kits disponíveis (público, sem auth).
 */
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { count, error } = await supabase
    .from('kits')
    .select('id', { count: 'exact', head: true })
    .eq('disponivel', true)

  if (error) return { count: 0 }

  return { count: count ?? 0 }
})

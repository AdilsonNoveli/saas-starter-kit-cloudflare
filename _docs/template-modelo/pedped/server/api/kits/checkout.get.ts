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
      nome,
      descricao,
      foto_url,
      preco_fixo,
      etiqueta,
      kit_itens (
        produto_id,
        quantidade,
        produtos ( nome, preco_venda )
      )
    `)
    .eq('disponivel', true)
    .eq('mostrar_no_checkout', true)
    .order('nome')

  if (error) {
    return { kits: [] }
  }

  return { kits: data ?? [] }
})

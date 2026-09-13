import { ref } from 'vue'
import type { SaveResult } from '~/composables/useProductSaveResult'

export interface ProdutoRelacionado {
  readonly id: string
  readonly nome: string
  readonly foto_url: string | null
  readonly preco_venda: number
}

/**
 * Produtos Relacionados: sugeridos no checkout quando este produto está no
 * carrinho (máx. 3). A busca de candidatos é feita pelo `AdminProductPicker`
 * (já existe, usado por kits/promoções) — esta composable só guarda a
 * seleção e persiste via delete+reinsert (idempotente e seguro aqui).
 */
export function useProductRelated() {
  const supabase = useSupabaseClient()

  const relacionados = ref<ProdutoRelacionado[]>([])

  function addRelacionado(prod: ProdutoRelacionado): void {
    if (relacionados.value.length >= 3 || relacionados.value.some((r) => r.id === prod.id)) return
    relacionados.value = [...relacionados.value, prod]
  }

  function removeRelacionado(id: string): void {
    relacionados.value = relacionados.value.filter((r) => r.id !== id)
  }

  async function loadForProduct(produtoId: string): Promise<void> {
    const { data: relLinks } = await supabase
      .from('related_products')
      .select('related_product_id')
      .eq('product_id', produtoId)
      .order('sort_order', { ascending: true })

    if (relLinks && relLinks.length > 0) {
      const relIds = relLinks.map((r) => r.related_product_id)
      const { data: relProds } = await supabase
        .from('products')
        .select('id, nome:name, foto_url:photo_url, preco_venda:sale_price')
        .in('id', relIds)
      const byId = new Map((relProds ?? []).map((p) => [p.id, p]))
      relacionados.value = relIds
        .map((id) => byId.get(id))
        .filter((p): p is ProdutoRelacionado => p !== undefined)
    } else {
      relacionados.value = []
    }
  }

  async function saveForProduct(produtoId: string): Promise<SaveResult> {
    const { error: deleteError } = await supabase.from('related_products').delete().eq('product_id', produtoId)
    if (deleteError) return { success: false, message: deleteError.message }

    if (relacionados.value.length > 0) {
      const { error: insertError } = await supabase.from('related_products').insert(
        relacionados.value.map((r, i) => ({
          product_id: produtoId,
          related_product_id: r.id,
          sort_order: i,
        })),
      )
      if (insertError) return { success: false, message: insertError.message }
    }
    return { success: true }
  }

  function reset(): void {
    relacionados.value = []
  }

  return { relacionados, addRelacionado, removeRelacionado, loadForProduct, saveForProduct, reset }
}

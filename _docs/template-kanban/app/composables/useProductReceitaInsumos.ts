import { computed, ref } from 'vue'
import type { SaveResult } from '~/composables/useProductSaveResult'

export interface InsumoOption {
  id: string
  nome: string
  unidade_medida: string
}

export interface ReceitaItem {
  insumo_id: string
  quantidade_por_unidade: number
}

/**
 * Receita/BOM do produto (migration 111): quais insumos são consumidos por
 * unidade vendida. Extraída de `[id].vue` — carrega o catálogo de insumos
 * disponíveis (independente do produto) e a receita específica deste
 * produto (produto_insumos).
 */
export function useProductReceitaInsumos() {
  const supabase = useSupabaseClient()

  const insumosDisponiveis = ref<InsumoOption[]>([])
  const insumoOptions = computed(() =>
    insumosDisponiveis.value.map((i) => ({ value: i.id, label: `${i.nome} (${i.unidade_medida})` })),
  )

  const receitaInsumos = ref<ReceitaItem[]>([])

  function addReceitaItem(): void {
    receitaInsumos.value.push({ insumo_id: '', quantidade_por_unidade: 1 })
  }

  function removeReceitaItem(index: number): void {
    receitaInsumos.value.splice(index, 1)
  }

  async function loadInsumosDisponiveis(): Promise<void> {
    try {
      const res = await $fetch<{ data: InsumoOption[] }>('/api/admin/inventory/insumos')
      insumosDisponiveis.value = res.data
    } catch {
      insumosDisponiveis.value = []
    }
  }

  async function loadForProduct(produtoId: string): Promise<void> {
    const { data } = await supabase
      .from('product_ingredients')
      .select('insumo_id:ingredient_id, quantidade_por_unidade:quantity_per_unit')
      .eq('product_id', produtoId)
    receitaInsumos.value = (data ?? []).map((r) => ({
      insumo_id: r.insumo_id,
      quantidade_por_unidade: Number(r.quantidade_por_unidade),
    }))
  }

  /** Cada insumo usado precisa de uma seleção e uma quantidade maior que zero. */
  function validate(): boolean {
    return !receitaInsumos.value.some((r) => !r.insumo_id || !(r.quantidade_por_unidade > 0))
  }

  /** Delete+reinsert via endpoint dedicado (mesmo "set semântico" de produto_relacionados). */
  async function saveForProduct(produtoId: string): Promise<SaveResult> {
    try {
      await $fetch('/api/admin/inventory/recipe', {
        method: 'PUT',
        body: { produto_id: produtoId, insumos: receitaInsumos.value },
      })
      return { success: true }
    } catch (err) {
      const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      return { success: false, message }
    }
  }

  function reset(): void {
    receitaInsumos.value = []
  }

  return {
    insumosDisponiveis,
    insumoOptions,
    receitaInsumos,
    loadInsumosDisponiveis,
    addReceitaItem,
    removeReceitaItem,
    loadForProduct,
    saveForProduct,
    validate,
    reset,
  }
}

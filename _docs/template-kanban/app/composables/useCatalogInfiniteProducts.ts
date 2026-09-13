import { ref, computed, watch, readonly } from 'vue'
import { useProducts } from '~/composables/useProducts'
import type { CatalogProductItem, CatalogCursor, CatalogProductsPageResponse } from '#shared/types/product'

const PAGE_SIZE = 24

/**
 * Paginação do catálogo por KEYSET (cursor), ordem aleatória escalável.
 *
 * - Página 1 vem do SSR (useProducts, key catalog-products): produtos + pivot +
 *   cursor + hasMore — zero round-trip extra no load inicial.
 * - `loadMore()` continua a partir do cursor (rank, id, wrapped), reusando o
 *   MESMO pivot → ordem consistente, sem OFFSET, escala para 10k+.
 * - Troca de categoria reinicia a paginação daquela categoria (cursor nulo),
 *   mantendo o pivot do carregamento.
 */
export const useCatalogInfiniteProducts = () => {
  const { produtos: initialProdutos, categorias, kits, promocoes, pending, pivot, cursor: initialCursor, hasMore: initialHasMore } =
    useProducts()

  const activeCategoryId = useState<string | null>('catalog:activeCategory', () => null)

  const accumulatedProdutos = ref<CatalogProductItem[]>([])
  const cursor = ref<CatalogCursor | null>(null)
  const hasMore = ref(false)
  const loadingMore = ref(false)
  let bootstrapped = false

  // Bootstrap a partir do SSR (dispara uma vez quando o fetch resolve).
  watch(
    initialProdutos,
    (val) => {
      if (!bootstrapped && val.length > 0) {
        accumulatedProdutos.value = [...val]
        cursor.value = initialCursor.value
        hasMore.value = initialHasMore.value
        bootstrapped = true
      }
    },
    { immediate: true },
  )

  /**
   * Busca uma página via keyset. `reset` = reinício (categoria nova / página 1):
   * ignora o cursor e começa do pivot (segmento A).
   */
  const fetchNext = async (categoryId: string | null, reset: boolean): Promise<void> => {
    if (loadingMore.value) return
    loadingMore.value = true
    try {
      const data = await $fetch<CatalogProductsPageResponse>('/api/catalog/products-page', {
        query: {
          limit: PAGE_SIZE,
          pivot: pivot.value,
          ...(reset || !cursor.value
            ? {}
            : cursor.value.mode === 'numeric'
              ? {
                  cursor_numero: cursor.value.numero ?? undefined,
                  cursor_id: cursor.value.id,
                }
              : {
                  cursor_rank: cursor.value.rank,
                  cursor_id: cursor.value.id,
                  wrapped: cursor.value.wrapped ? '1' : '0',
                }),
          ...(categoryId ? { category_id: categoryId } : {}),
        },
      })
      accumulatedProdutos.value = reset
        ? data.produtos
        : [...accumulatedProdutos.value, ...data.produtos]
      cursor.value = data.cursor
      hasMore.value = data.hasMore
    } finally {
      loadingMore.value = false
    }
  }

  // Reinicia e recarrega na troca de categoria (não dispara no render inicial).
  watch(activeCategoryId, (categoryId) => {
    cursor.value = null
    accumulatedProdutos.value = []
    hasMore.value = false
    fetchNext(categoryId, true)
  })

  const loadMore = async (): Promise<void> => {
    if (loadingMore.value || !hasMore.value) return
    await fetchNext(activeCategoryId.value, false)
  }

  return {
    produtos: computed<CatalogProductItem[]>(() => accumulatedProdutos.value),
    categorias,
    kits,
    promocoes,
    pending,
    loadingMore: readonly(loadingMore),
    hasMore: readonly(hasMore),
    loadMore,
  }
}

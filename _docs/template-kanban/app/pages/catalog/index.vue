<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useCartStore } from '~/stores/cart'
import { useCatalogInfiniteProducts } from '~/composables/useCatalogInfiniteProducts'
import { useInfiniteScroll } from '~/composables/useInfiniteScroll'
import { useNotification } from '~/composables/useNotification'
import { useTracking } from '~/composables/useTracking'
import { useStore } from '~/composables/useStore'
import type { CatalogProductItem, SelectedOption } from '~~/shared/types/product'
import { getEffectivePrice } from '~~/shared/types/product'
import type { CatalogPromocao } from '#shared/types/promotion'
import { formatDeliveryDate } from '~~/shared/utils/preorders'

definePageMeta({
  layout: 'catalog'
})

useHead({
  title: 'Catálogo de Produtos'
})

const route = useRoute()
const cartStore = useCartStore()
const { notify } = useNotification()
const { track } = useTracking()

const {
  produtos,
  categorias,
  kits,
  promocoes,
  pending,
  loadingMore,
  loadMore,
} = useCatalogInfiniteProducts()

const selectedKit = ref<{ id: string; nome: string; descricao: string | null; foto_url: string | null; imagens: string[]; preco_fixo: number; etiqueta: string; kit_itens: { quantidade: number; produtos: { nome: string; preco_venda: number } | null }[] } | null>(null)
const selectedPromotion = ref<CatalogPromocao | null>(null)

const openPromotionDetails = (promocao: CatalogPromocao) => {
  selectedPromotion.value = promocao
}

const { data: catalogStatus } = useFetch<{ isOpen: boolean; mensagem: string } | null>('/api/store/status', {
  key: 'catalog:store-status',
  default: () => null,
})

// Search bridge with layout
const catalogSearchItems = useState<{ id: string; name: string; description?: string; synonyms?: string[] }[]>('catalog:searchItems', () => [])
const catalogSearchSelected = useState<string | null>('catalog:searchSelected', () => null)

const _explicitCategoryId = useState<string | null>('catalog:activeCategory', () => null)
const activeCategoryId = computed<string | null>(() => _explicitCategoryId.value)

const selectedProductForDetails = ref<CatalogProductItem | null>(null)
const selectedModalMode = ref<'info' | 'pdv'>('info')
const searchFilterId = ref<string | null>(null)

// Infinite scroll sentinel
const sentinel = ref<HTMLElement | null>(null)
useInfiniteScroll(sentinel, loadMore, { rootMargin: '400px' })

// Track category changes for analytics
watch(_explicitCategoryId, (id) => {
  searchFilterId.value = null
  if (id) {
    const cat = categorias.value.find((c) => c.id === id)
    if (cat) track('categoria_view', { entidade: 'categoria', entidade_id: id, metadata: { nome: cat.nome } })
  }
})

// Update search index as products accumulate (grows with each page load)
watch(produtos, (val) => {
  catalogSearchItems.value = (val ?? []).map((p) => ({
    id: p.id,
    name: p.nome,
    description: p.descricao ?? undefined,
    synonyms: Array.isArray(p.sinonimos) ? p.sinonimos : [],
  }))
}, { immediate: true })

watch(catalogSearchSelected, (id) => {
  searchFilterId.value = id
})

const catalogSearchQuery = useState<string>('catalog:searchQuery', () => '')
const apiSearchResults = ref<CatalogProductItem[]>([])

let pageSearchDebounce: ReturnType<typeof setTimeout> | null = null

watch(catalogSearchQuery, (q) => {
  if (pageSearchDebounce) clearTimeout(pageSearchDebounce)
  const term = q.trim()
  if (!term) {
    apiSearchResults.value = []
    return
  }
  pageSearchDebounce = setTimeout(async () => {
    try {
      const data = await $fetch<CatalogProductItem[]>('/api/catalog/search', {
        query: { q: term },
      })
      apiSearchResults.value = data ?? []
    } catch {
      apiSearchResults.value = []
    }
  }, 250)
})

// Visible products: search filter takes priority; otherwise search query tokenized filter or accumulated list
const visibleProducts = computed<CatalogProductItem[]>(() => {
  if (searchFilterId.value) {
    return produtos.value.filter((p) => p.id === searchFilterId.value)
  }
  const q = catalogSearchQuery.value.trim().toLowerCase()
  if (q) {
    if (apiSearchResults.value.length > 0) return apiSearchResults.value

    const tokens = q.split(/\s+/).filter(Boolean)
    return produtos.value.filter((p) => {
      const haystack = [p.nome, p.descricao ?? '', ...(p.sinonimos ?? [])].join(' ').toLowerCase()
      return tokens.every((tok) => haystack.includes(tok))
    })
  }
  return [...produtos.value]
})

const filteredKits = computed(() => {
  if (!kits.value || searchFilterId.value || catalogSearchQuery.value.trim()) return []
  if (activeCategoryId.value === null) return kits.value
  
  // Se for a categoria principal da loja, exibe todos os kits
  const activeCat = categorias.value.find((c) => c.id === activeCategoryId.value)
  if (activeCat?.principal) return kits.value

  // Caso contrário, filtra pela categoria selecionada ou traz os kits globais (sem categoria_id)
  return kits.value.filter((k) => k.categoria_id === activeCategoryId.value || !k.categoria_id)
})

// Fixed seed per page visit — preserved across SSR hydration via useState so rotation is stable.
const _visitSeed = useState<number>('catalog:visitSeed', () => Math.floor(Math.random() * 65536))

function pickBanner(pool: CatalogPromocao[]): CatalogPromocao | null {
  return pool.length === 0 ? null : (pool[_visitSeed.value % pool.length] ?? null)
}

const filteredBanners = computed<CatalogPromocao[]>(() => {
  if (!promocoes.value || searchFilterId.value || catalogSearchQuery.value.trim()) return []
  return promocoes.value.filter((p) => {
    if (p.tipo !== 'destaque') return false
    
    // Se a categoria ativa for ALL (nula), não mostra banners que possuem restrição de categoria
    if (activeCategoryId.value === null) {
      const hasCategoryRestriction = (p.categorias_ids && p.categorias_ids.length > 0) || p.categoria_id
      if (!hasCategoryRestriction) return true
      
      // Se houver categoria principal e o banner estiver especificamente restrito a ela, mostra
      const principalCatId = categorias.value.find((c) => c.principal)?.id
      if (principalCatId) {
        if (p.categorias_ids && p.categorias_ids.includes(principalCatId)) return true
        if (p.categoria_id === principalCatId) return true
      }
      return false
    }

    // Multi-category list takes priority over legacy single categoria_id
    if (p.categorias_ids && p.categorias_ids.length > 0) {
      return p.categorias_ids.includes(activeCategoryId.value)
    }
    if (p.categoria_id) {
      return p.categoria_id === activeCategoryId.value
    }
    return true // no category restriction → show everywhere
  })
})

// Explicit position required — no null fallback (migration 055 sets null → 'topo').
const bannersTopo = computed(() => filteredBanners.value.filter((b) => b.posicao_exibicao === 'topo'))
const bannersMeio = computed(() => filteredBanners.value.filter((b) => b.posicao_exibicao === 'meio'))
const bannersRodape = computed(() => filteredBanners.value.filter((b) => b.posicao_exibicao === 'rodape'))

// One banner per position per visit (rotation across multiple banners in same slot).
const activeBannerTopo = computed(() => pickBanner(bannersTopo.value))
const activeBannerMeio = computed(() => pickBanner(bannersMeio.value))
const activeBannerRodape = computed(() => pickBanner(bannersRodape.value))

// Split products for "meio" insertion at actual midpoint of the grid.
const _midpoint = computed(() => Math.ceil(visibleProducts.value.length / 2))
const productsFirstHalf = computed(() => visibleProducts.value.slice(0, _midpoint.value))
const productsSecondHalf = computed(() => visibleProducts.value.slice(_midpoint.value))


function clearSearchFilter() {
  searchFilterId.value = null
  catalogSearchSelected.value = null
  catalogSearchQuery.value = ''
}

const { loja } = useStore()

const openDetails = (produto: CatalogProductItem, mode: 'info' | 'pdv') => {
  if (loja.value?.config_layout?.product_view_mode === 'page') {
    navigateTo(`/catalog/products/${produto.id}`)
    return
  }
  selectedPromotion.value = null
  selectedProductForDetails.value = produto
  selectedModalMode.value = mode
  track('produto_click', { entidade: 'produto', entidade_id: produto.id })
}

// Semeia o modal com a quantidade já no carrinho apenas para produtos normais.
const modalInitialQuantity = computed<number>(() => {
  const p = selectedProductForDetails.value
  if (!p) return 0
  const isPreorder = p.product_type === 'preorder' || p.preorder_config !== null
  if (isPreorder) return 0
  return cartStore.getItemQuantity(p.id)
})

const handleModalConfirm = (
  opcoes: readonly SelectedOption[],
  qty: number,
  deliveryDate: string | null,
) => {
  const p = selectedProductForDetails.value
  if (!p) return
  if (!cartStore.storeStatus.isOpen) {
    notify.warning('Estamos Fechados 😴', cartStore.storeStatus.message)
    return
  }
  const produtoBase = {
    id: p.id,
    nome: p.nome,
    preco: getEffectivePrice(p),
    foto_url: p.foto_url,
    permite_fracionamento: p.permite_fracionamento,
    unidade_medida: p.unidade_medida,
  }
  if (deliveryDate) {
    cartStore.addPreorderItem(produtoBase, qty, deliveryDate, opcoes)
    notify.success('Encomenda adicionada', `Entrega em ${formatDeliveryDate(deliveryDate)}.`)
  } else {
    cartStore.updateQuantity(produtoBase, qty, opcoes)
  }
  track('add_to_cart', { entidade: 'produto', entidade_id: p.id })
  selectedProductForDetails.value = null
}

const proceedToCheckout = () => {
  if (catalogStatus.value && !catalogStatus.value.isOpen) {
    notify.warning('Loja fechada', catalogStatus.value.mensagem || 'Não estamos aceitando pedidos no momento.')
    return
  }

  const sessaoId = route.query.sessao as string | undefined
  if (sessaoId) {
    navigateTo(`/catalog/checkout?sessao=${sessaoId}`)
  } else {
    navigateTo('/catalog/checkout')
  }
}
</script>

<template>
  <div class="w-full flex flex-col justify-start">
    <!-- Active search banner -->
    <div
      v-if="searchFilterId"
      class="flex items-center justify-between px-4 py-2.5 bg-brand/10 border-b border-brand/20 text-sm"
    >
      <span class="text-text-primary font-medium">Mostrando resultado da busca</span>
      <button
        class="text-xs font-bold text-brand hover:underline transition-colors"
        @click="clearSearchFilter"
      >
        Ver todos
      </button>
    </div>

    <!-- Banner topo: one per visit, rotated when multiple banners compete for the slot -->
    <CatalogPromotionBanner
      v-if="activeBannerTopo"
      :key="`banner-topo-${activeBannerTopo.id}`"
      :promocao="activeBannerTopo"
      @click="openPromotionDetails(activeBannerTopo)"
    />

    <!-- Product Grid -->
    <div class="px-3 md:px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 max-w-7xl mx-auto w-full content-start items-start">
      <div v-if="pending" class="col-span-full flex justify-center p-8 text-gray-400">
        Carregando produtos...
      </div>

      <template v-else-if="visibleProducts.length > 0 || filteredKits.length > 0">
        <!-- First half of products (indices 0..midpoint-1) — first 8 get LCP priority -->
        <CatalogProductCard
          v-for="(produto, i) in productsFirstHalf"
          :key="produto.id"
          :produto="produto"
          :priority="i < 8"
          @open-details="openDetails"
        />

        <!-- Banner meio: inserted at actual midpoint of the product grid, one per visit -->
        <div
          v-if="activeBannerMeio"
          :key="`banner-meio-${activeBannerMeio.id}`"
          class="col-span-full -mx-3 md:-mx-5"
        >
          <CatalogPromotionBanner
            :promocao="activeBannerMeio"
            @click="openPromotionDetails(activeBannerMeio)"
          />
        </div>

        <!-- Second half of products (indices midpoint..end) -->
        <CatalogProductCard
          v-for="produto in productsSecondHalf"
          :key="produto.id"
          :produto="produto"
          :priority="false"
          @open-details="openDetails"
        />

        <!-- Kits (Combos) -->
        <CatalogKitCard
          v-for="kit in filteredKits"
          :key="`kit-${kit.id}`"
          :kit="kit"
          @select="selectedKit = kit"
        />
      </template>

      <div v-else class="col-span-full flex flex-col items-center justify-center p-12 text-text-muted min-h-[300px]">
        Nenhum produto encontrado nesta categoria.
      </div>

      <!-- Infinite scroll sentinel -->
      <div
        v-if="!searchFilterId"
        ref="sentinel"
        class="col-span-full"
        aria-hidden="true"
      />
    </div>

    <!-- Banner rodapé: one per visit, rotated when multiple banners compete for the slot -->
    <CatalogPromotionBanner
      v-if="activeBannerRodape"
      :key="`banner-rodape-${activeBannerRodape.id}`"
      :promocao="activeBannerRodape"
      @click="openPromotionDetails(activeBannerRodape)"
    />

    <!-- Loading indicator for infinite scroll -->
    <div
      v-if="loadingMore"
      class="flex justify-center py-6 text-text-muted text-sm"
    >
      <span class="animate-pulse">Carregando mais produtos…</span>
    </div>

    <!-- Kit modal -->
    <CatalogKitDetailsModal
      v-if="selectedKit"
      :is-open="!!selectedKit"
      :kit="selectedKit"
      @close="selectedKit = null"
    />

    <!-- Promotion details modal -->
    <CatalogPromotionDetailsModal
      :promocao="selectedPromotion"
      :produtos="produtos"
      :kits="kits"
      @close="selectedPromotion = null"
      @open-product-options="(produto) => openDetails(produto, 'pdv')"
    />

    <!-- Sticky checkout bar -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div v-if="cartStore.totalItems > 0" class="fixed bottom-0 left-0 w-full z-30">
        <button
          class="catalog-checkout-bar-btn w-full font-roboto font-bold text-2xl py-5 text-center shadow-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors"
          @click="proceedToCheckout"
        >
          FAZER PEDIDO
        </button>
      </div>
    </Transition>

    <UiProductDetailsModal
      :is-open="!!selectedProductForDetails"
      :produto="selectedProductForDetails"
      :mode="selectedModalMode"
      :allow-preorder="true"
      :initial-quantity="modalInitialQuantity"
      @close="selectedProductForDetails = null"
      @confirm="handleModalConfirm"
    />
  </div>
</template>

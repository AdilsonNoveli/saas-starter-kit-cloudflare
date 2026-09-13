<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, ShoppingCart, X, ChevronLeft, ChevronRight } from '@lucide/vue'
import { useCartStore } from '~/stores/cart'
import { useTheme } from '~/composables/useTheme'
import { useStore } from '~/composables/useStore'
import { useTracking } from '~/composables/useTracking'
import { useProducts } from '~/composables/useProducts'
import { getCategoryColor } from '~~/shared/utils/categoryColors'
import { isDarkColor } from '~~/shared/utils/colorUtils'
import { CARD_RADIUS_MAP, BTN_RADIUS_MAP, DEFAULT_CARD_RADIUS, DEFAULT_BTN_RADIUS } from '~~/shared/types/store'

interface CatalogStoreStatus {
  isOpen: boolean
  mostrar_pagina_fechada: boolean
  mostrar_faixa_fechada: boolean
  mensagem_custom: string
  mensagem: string
}

// Sem await — não bloqueia a renderização. Dados chegam reativamente.
const { data: catalogStatus } = useFetch<CatalogStoreStatus | null>('/api/store/status', {
  key: 'catalog:store-status',
  default: () => null,
})

const { loja, fetch: fetchLoja } = useStore()

const getCatColor = (cor: string | null | undefined) => {
  const opt = getCategoryColor(cor)
  const customBrand = loja.value?.config_layout?.brand_color
  if (opt.value === 'brand-green' && customBrand) {
    return {
      ...opt,
      hex: customBrand,
    }
  }
  return opt
}
const getCatIconUrl = (url: unknown): string | undefined => (url as string | undefined) || undefined

const showClosedBanner = computed(() => {
  const s = catalogStatus.value
  if (!s || s.isOpen || s.mostrar_pagina_fechada) return false
  return s.mostrar_faixa_fechada === true
})

const closedBannerText = computed(() => {
  const s = catalogStatus.value
  if (!s) return ''
  return [s.mensagem_custom, s.mensagem].filter(Boolean).join(' · ')
})

const cartStore = useCartStore()
const { resolvedTheme } = useTheme()
const route = useRoute()

const currentLogo = computed(() => {
  if (resolvedTheme.value === 'dark') {
    return loja.value?.logomarca_dark || loja.value?.logomarca || null
  }
  return loja.value?.logomarca || loja.value?.logomarca_dark || null
})

// ── Category Bar ──
const { categorias } = useProducts()
const principalCategory = computed(() => categorias.value.find((c) => c.principal))

const _explicitCategoryId = useState<string | null>('catalog:activeCategory', () => null)
const activeCategoryId = computed<string | null>(
  () => _explicitCategoryId.value,
)

const isProductDetailPage = computed(() => route.path.startsWith('/catalog/products/'))

const categoryContainer = ref<HTMLElement | null>(null)
const hasOverflow = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const checkScroll = () => {
  if (!categoryContainer.value) return
  const { scrollLeft, scrollWidth, clientWidth } = categoryContainer.value
  hasOverflow.value = scrollWidth > clientWidth + 5
  if (hasOverflow.value) {
    canScrollLeft.value = scrollLeft > 10
    canScrollRight.value = Math.ceil(scrollLeft + clientWidth) < scrollWidth - 10
  } else {
    canScrollLeft.value = false
    canScrollRight.value = false
  }
}

const scrollCategories = (direction: 'left' | 'right') => {
  if (!categoryContainer.value) return
  categoryContainer.value.scrollBy({ left: direction === 'left' ? -250 : 250, behavior: 'smooth' })
}

const scrollToActiveCategory = () => {
  if (typeof document === 'undefined') return
  const targetId = activeCategoryId.value || principalCategory.value?.id || categorias.value[0]?.id
  if (!targetId) return
  const buttons = document.querySelectorAll(`[data-category-id="${targetId}"]`)
  buttons.forEach((btn) => {
    (btn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  })
}

const setActiveCategory = (id: string | null) => {
  _explicitCategoryId.value = id
  if (route.path !== '/catalog') navigateTo('/catalog')
  if (typeof window !== 'undefined') {
    if (isScrolled.value) {
      // Se a barra de categorias já estiver recolhida pelo scroll, mantemos ela recolhida
      // rolando suavemente para o topo do conteúdo de produtos sem descolapsar os cards
      const heroBanner = document.querySelector('.catalog-hero-banner') as HTMLElement | null
      const targetTop = heroBanner ? heroBanner.offsetHeight + 10 : 60
      window.scrollTo({ top: targetTop, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}


const goToMainCategory = () => {
  if (isSearchOpen.value) {
    closeSearch()
  }
  catalogSearchSelected.value = null
  catalogSearchQuery.value = ''
  searchQuery.value = ''

  const targetCatId = principalCategory.value ? null : (categorias.value[0]?.id ?? null)
  _explicitCategoryId.value = targetCatId

  if (route.path !== '/catalog') {
    navigateTo('/catalog')
  }

  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  nextTick(() => {
    scrollToActiveCategory()
  })
}

watch(activeCategoryId, () => { nextTick(() => scrollToActiveCategory()) })

watch(categorias, (newCats) => {
  if (newCats.length > 0 && _explicitCategoryId.value === null && !principalCategory.value) {
    _explicitCategoryId.value = newCats[0]?.id ?? null
  }
}, { immediate: true })



await fetchLoja()
useTheme()

// ── Header height — medido dinamicamente para posicionar category bar sticky ──
const headerRef = ref<HTMLElement | null>(null)
const headerHeight = ref(60)
let resizeObserver: ResizeObserver | null = null

// ── Scroll detection — borda e recolhimento da category bar ──
const isScrolled = ref(false)
const onScrollWindow = () => { isScrolled.value = (typeof window !== 'undefined' ? window.scrollY : 0) > 20 }

// Ativa tracking e registra page_view a cada mudança de rota no catálogo.
// O composable é singleton — installOnce() garante um único listener global.
const { trackPage } = useTracking()
onMounted(async () => {
  trackPage()
  // nextTick garante que refs do template estão resolvidos (await no script setup atrasa a montagem)
  await nextTick()
  if (typeof window === 'undefined') return

  window.addEventListener('resize', checkScroll)
  window.addEventListener('scroll', onScrollWindow, { passive: true })
  setTimeout(() => { checkScroll(); scrollToActiveCategory() }, 100)

  // ResizeObserver — mede altura real do header para posicionar category bar sticky
  resizeObserver = new ResizeObserver(() => {
    if (headerRef.value) {
      headerHeight.value = headerRef.value.getBoundingClientRect().height
    }
  })
  if (headerRef.value) {
    resizeObserver.observe(headerRef.value)
    headerHeight.value = headerRef.value.getBoundingClientRect().height
  }
})


onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkScroll)
    window.removeEventListener('scroll', onScrollWindow)
  }
  resizeObserver?.disconnect()
})
watch(() => route.fullPath, () => trackPage())


// ── Search inline ──
interface SearchItem {
  id: string
  name: string
  description?: string
  synonyms?: string[]
}

const catalogSearchItems = useState<SearchItem[]>('catalog:searchItems', () => [])
const catalogSearchSelected = useState<string | null>('catalog:searchSelected', () => null)
const catalogSearchQuery = useState<string>('catalog:searchQuery', () => '')

const isSearchOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const apiSearchResults = ref<SearchItem[]>([])

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  catalogSearchQuery.value = val
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  const q = val.trim()
  if (!q) {
    apiSearchResults.value = []
    return
  }
  searchDebounceTimer = setTimeout(async () => {
    try {
      const data = await $fetch<{ id: string; nome: string; descricao: string | null; sinonimos: string[] }[]>('/api/catalog/search', {
        query: { q },
      })
      apiSearchResults.value = (data ?? []).map((p) => ({
        id: p.id,
        name: p.nome,
        description: p.descricao ?? undefined,
        synonyms: p.sinonimos,
      }))
    } catch {
      apiSearchResults.value = []
    }
  }, 250)
})

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  if (apiSearchResults.value.length > 0) return apiSearchResults.value.slice(0, 8)

  const tokens = q.split(/\s+/).filter(Boolean)
  return catalogSearchItems.value
    .filter((i) => {
      const haystack = [i.name, i.description ?? '', ...(i.synonyms ?? [])].join(' ').toLowerCase()
      return tokens.every((tok) => haystack.includes(tok))
    })
    .slice(0, 8)
})

async function openSearch() {
  isSearchOpen.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

function closeSearch() {
  isSearchOpen.value = false
  searchQuery.value = ''
  catalogSearchQuery.value = ''
  apiSearchResults.value = []
}

function handleCatalogClick(e: MouseEvent) {
  if (!isSearchOpen.value) return
  const target = e.target as HTMLElement
  if (!target.closest('.catalog-search-wrapper') && !target.closest('.catalog-search-results')) {
    closeSearch()
  }
}

onMounted(() => {
  window.addEventListener('click', handleCatalogClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleCatalogClick)
})

function selectItem(item: SearchItem) {
  catalogSearchSelected.value = item.id
  closeSearch()
}

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,400;8..144,500;8..144,700&family=Roboto:wght@700&display=swap' }
  ]
})

/**
 * CSS custom properties injetadas diretamente via :style no elemento raiz.
 * Esta é a única abordagem totalmente reativa ao Vue — useHead({ style }) não
 * re-avalia computed() após a hidratação, tornando-o efetivamente estático.
 */
const catalogLayoutStyles = computed(() => {
  const layout = loja.value?.config_layout
  if (!layout) return {}
  const s: Record<string, string> = {}
  if (layout.brand_color) {
    s['--color-brand'] = layout.brand_color
    s['--color-brand-green'] = layout.brand_color
  }
  if (layout.brand_hover_color) {
    s['--color-brand-hover'] = layout.brand_hover_color
    s['--color-brand-greenDark'] = layout.brand_hover_color
  }
  if (layout.border_radius) {
    s['--catalog-radius'] = CARD_RADIUS_MAP[layout.border_radius] ?? DEFAULT_CARD_RADIUS
    s['--catalog-btn-radius'] = BTN_RADIUS_MAP[layout.border_radius] ?? DEFAULT_BTN_RADIUS
  } else {
    s['--catalog-radius'] = DEFAULT_CARD_RADIUS
    s['--catalog-btn-radius'] = DEFAULT_BTN_RADIUS
  }
  return s
})

watch(
  catalogLayoutStyles,
  (styles) => {
    if (import.meta.client && typeof document !== 'undefined' && document.documentElement) {
      if (styles['--catalog-radius']) {
        document.documentElement.style.setProperty('--catalog-radius', styles['--catalog-radius'])
        document.documentElement.style.setProperty('--catalog-btn-radius', styles['--catalog-btn-radius'] ?? '')
      } else {
        document.documentElement.style.removeProperty('--catalog-radius')
        document.documentElement.style.removeProperty('--catalog-btn-radius')
      }
    }
  },
  { immediate: true },
)

/**
 * Inline styles para os elementos do cabeçalho que não herdam as custom
 * properties do :root (ex: background-color não é herdado via var()).
 * Cada computed retorna um objeto de estilo ou {} quando não configurado.
 */
const headerBgStyle = computed(() => {
  const c = loja.value?.config_layout?.header_bg_color
  return c ? { backgroundColor: c } : {}
})

const searchWrapperStyle = computed(() => {
  const layout = loja.value?.config_layout
  const s: Record<string, string> = {}
  if (layout?.header_buttons_bg_color) {
    s.backgroundColor = layout.header_buttons_bg_color
    if (isDarkColor(layout.header_buttons_bg_color)) {
      s.color = '#ffffff'
    }
  }
  return s
})

const headerTextStyle = computed(() => {
  const customTextColor = loja.value?.config_layout?.header_buttons_text_color
  const bgColor = loja.value?.config_layout?.header_bg_color

  if (bgColor && isDarkColor(bgColor)) {
    if (!customTextColor || isDarkColor(customTextColor)) {
      return { color: '#ffffff' }
    }
    return { color: customTextColor }
  }

  if (customTextColor) {
    return { color: customTextColor }
  }

  return {}
})
</script>

<template>
  <div
    class="bg-surface text-text-primary font-sans antialiased flex flex-col min-h-screen w-full relative"
    :style="catalogLayoutStyles"
  >

    <!-- Faixa de loja fechada (acima de tudo quando mostrar_pagina_fechada=false) -->
    <div
      v-if="showClosedBanner"
      class="sticky top-0 z-60 flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-400 text-amber-950"
    >
      <p class="text-xs font-semibold leading-none tracking-wide">{{ closedBannerText }}</p>
    </div>

    <!-- Header Enterprise -->
    <header
      ref="headerRef"
      class="flex-none bg-surface sticky top-0 z-50 pt-2 md:pt-3 pb-2 md:pb-3 flex flex-col justify-end catalog-header"
      :style="headerBgStyle"
    >

      <div class="flex items-center justify-between px-3 md:px-5 w-full max-w-7xl mx-auto gap-4 relative min-h-[36px] md:min-h-[56px]">
        
        <!-- MOBILE SEARCH ICON (hidden on desktop) -->
        <div class="relative z-20 flex items-center shrink-0 md:hidden" :class="isSearchOpen ? 'hidden' : 'flex'">
          <button
            class="p-2 -ml-2 transition-transform active:scale-90 catalog-header-text"
            :style="headerTextStyle"
            aria-label="Pesquisar produtos"
            @click="openSearch"
          >
            <Search class="w-6 h-6" :stroke-width="2" />
          </button>
        </div>

        <!-- LOGO -->
        <button
          type="button"
          class="relative z-20 flex items-center justify-center md:justify-start min-w-0 cursor-pointer focus:outline-none transition-transform active:scale-95 text-left select-none bg-transparent border-0 p-0"
          :class="isSearchOpen ? 'hidden md:flex flex-none' : 'flex-1 md:flex-none'"
          aria-label="Ir para categoria principal"
          @click="goToMainCategory"
        >
          <img
            v-if="currentLogo"
            :src="currentLogo"
            :alt="loja?.nome_fantasia ?? 'Logo'"
            class="h-9 md:h-14 object-contain max-w-full shrink pointer-events-none"
            loading="eager"
          >
          <span v-else class="text-sm font-semibold tracking-wide truncate catalog-header-text pointer-events-none" :style="headerTextStyle">
            {{ loja?.nome_fantasia ?? '' }}
          </span>
        </button>

        <!-- SEARCH INPUT (Takeover no Mobile, Inline no Desktop) -->
        <div 
          class="flex-1 flex items-center bg-surface-raised rounded-full px-4 py-2 md:py-2.5 transition-all w-full max-w-2xl catalog-search-wrapper"
          :class="isSearchOpen ? 'flex relative z-10 w-full md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2' : 'hidden md:flex md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 z-10'"
          :style="searchWrapperStyle"
        >
          <label for="catalog-search-input" class="sr-only">Pesquisar produtos</label>
          <Search class="w-5 h-5 text-text-muted shrink-0 mr-2 md:mr-3" :stroke-width="2" />
          <input
            id="catalog-search-input"
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Pesquisar produtos…"
            class="flex-1 bg-transparent text-text-primary placeholder-text-muted text-base outline-none w-full"
            @keydown.esc="closeSearch"
            @focus="isSearchOpen = true"
          >
          <button v-if="isSearchOpen" class="p-2 text-text-muted hover:text-text-primary transition-colors md:hidden shrink-0 -mr-2" @click="closeSearch">
            <X class="w-5 h-5" :stroke-width="2" />
          </button>
          <button v-else-if="searchQuery" class="p-1 text-text-muted hover:text-text-primary transition-colors hidden md:block shrink-0" @click="closeSearch">
            <X class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>

        <!-- CART PRICE -->
        <div
          class="relative z-20 flex items-center gap-1.5 md:gap-3 cursor-pointer transition-transform active:scale-95 shrink-0 catalog-header-text"
          :class="isSearchOpen ? 'hidden md:flex' : 'flex'"
          :style="headerTextStyle"
          @click="cartStore.toggleCartSidebar(true)"
        >
          <div class="relative">
            <ShoppingCart class="w-6 h-6 md:w-7 md:h-7" :stroke-width="2" />
            <span
              v-if="cartStore.totalItems > 0"
              class="absolute -top-1.5 -right-2.5 bg-brand text-white text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-full leading-none"
            >
              {{ cartStore.totalItems }}
            </span>
          </div>
          <span class="font-bold text-base md:text-lg">
            {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartStore.totalPrice || 0) }}
          </span>
        </div>
      </div>

      <!-- Resultados dropdown (flutuante) -->
      <Transition
        enter-active-class="duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-2 md:translate-y-0"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-100 ease-in"
        leave-to-class="opacity-0 -translate-y-2 md:translate-y-0"
      >
        <div
          v-if="isSearchOpen && searchResults.length > 0"
          class="absolute top-full left-0 w-full md:left-1/2 md:-translate-x-1/2 md:max-w-2xl bg-surface max-h-[60vh] overflow-y-auto z-50 md:rounded-b-2xl border-x border-b border-border shadow-md catalog-search-results"
        >
          <button
            v-for="item in searchResults"
            :key="item.id"
            class="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-surface-raised active:bg-brand active:text-text-inverse transition-colors"
            @click="selectItem(item)"
          >
            {{ item.name }}
          </button>
        </div>
        <div
          v-else-if="isSearchOpen && searchQuery.trim() && searchResults.length === 0"
          class="absolute top-full left-0 w-full md:left-1/2 md:-translate-x-1/2 md:max-w-2xl bg-surface px-4 py-3 text-sm text-text-muted z-50 md:rounded-b-2xl border-x border-b border-border shadow-md catalog-search-results"
        >
          Nenhum produto encontrado.
        </div>
      </Transition>
    </header>

    <!-- Banner Principal da Loja (Hero) -->
    <div
      v-if="route.path === '/catalog' && loja?.config_layout?.banner_hero_url"
      class="w-full bg-surface shrink-0"
    >
      <div class="w-full max-w-7xl mx-auto px-3 md:px-5 pt-2 md:pt-4">
        <div class="w-full rounded-2xl overflow-hidden aspect-16/6 md:aspect-1920/600 bg-surface-raised border border-border/40 relative">
          <img
            :src="loja.config_layout.banner_hero_url"
            alt="Destaque da Loja"
            class="w-full h-full object-cover"
            loading="eager"
          >
        </div>
      </div>
    </div>

    <!-- Category Bar — sticky colado abaixo do header com sombra discreta enterprise no scroll -->
    <div
      v-if="!isSearchOpen && categorias.length > 0"
      class="flex items-center w-full bg-surface sticky z-40 catalog-category-bar transition-all duration-300"
      :class="isScrolled ? 'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)] border-b border-border/40' : 'border-b border-transparent'"
      :style="{ top: headerHeight + 'px' }"
    >
      <div class="w-full max-w-7xl mx-auto px-3 md:px-5 relative">
        <!-- Chevron Fade Indicators (Mobile) -->
        <div class="absolute right-0 top-0 h-full w-10 bg-linear-to-l from-surface via-surface via-70% to-transparent pointer-events-none flex items-center justify-center text-text-muted lg:hidden z-20">
          <ChevronRight class="w-5 h-5 animate-pulse opacity-70 -mt-1" />
        </div>
        <div class="absolute left-0 top-0 h-full w-10 bg-linear-to-r from-surface via-surface via-70% to-transparent pointer-events-none flex items-center justify-center text-text-muted lg:hidden z-20">
          <ChevronLeft class="w-5 h-5 animate-pulse opacity-70 -mt-1" />
        </div>

        <!-- Mobile: Container com categorias scrolláveis -->
        <div class="lg:hidden flex items-center w-full">
          <!-- Container de categorias com scroll (mobile) - Layout CARD -->
          <div
            v-if="loja?.config_layout?.layout_categoria === 'card' && !isProductDetailPage"
            class="flex-1 overflow-x-auto no-scrollbar flex items-center px-4 scroll-smooth touch-pan-x gap-4 transition-all duration-300"
            :class="isScrolled ? 'py-2' : 'py-3 items-start'"
          >
            <!-- Categorias (mobile) -->
            <button
              v-for="cat in categorias"
              :key="cat.id"
              :data-category-id="cat.id"
              class="flex flex-col items-center shrink-0 transition-all duration-300 select-none cursor-pointer relative pb-1"
              :class="isScrolled ? 'gap-1' : 'gap-2'"
              @click="cat.principal ? setActiveCategory(null) : setActiveCategory(cat.id)"
            >
              <div
                class="w-24 rounded-2xl flex items-center justify-center transition-all duration-300 ease-in-out overflow-hidden"
                :class="[
                  isScrolled
                    ? 'max-h-0 h-0 opacity-0 scale-95 pointer-events-none'
                    : 'h-28 opacity-100 scale-100'
                ]"
                :style="{
                  backgroundColor: resolvedTheme === 'dark' ? getCatColor(cat.cor).hex + '25' : getCatColor(cat.cor).hex + '12',
                  transform: (!isScrolled && (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null))) ? 'scale(1.02)' : 'none'
                }"
              >
                <NuxtImg
                  v-if="cat.icone_url"
                  :src="getCatIconUrl(cat.icone_url)"
                  :alt="cat.nome"
                  loading="lazy"
                  sizes="96px"
                  class="w-full h-full object-cover transition-transform duration-200"
                />
                <span
                  v-else
                  class="text-xl font-bold uppercase"
                  :style="{ color: getCatColor(cat.cor).hex }"
                >
                  {{ cat.nome.slice(0, 2) }}
                </span>
              </div>
              <span
                class="text-xs font-semibold text-text-primary text-center leading-tight truncate max-w-24 transition-all duration-300"
                :class="[
                  (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null))
                    ? 'font-bold scale-105'
                    : 'text-text-muted hover:text-text-primary'
                ]"
                :style="{ color: (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null)) ? getCatColor(cat.cor).hex : undefined }"
              >
                {{ cat.nome }}
              </span>
            </button>
          </div>

          <!-- Container de categorias com scroll (mobile) - Layout NOME -->
          <div
            v-else
            class="flex-1 overflow-x-auto no-scrollbar flex items-center px-8 py-3 scroll-smooth touch-pan-x gap-5"
          >
            <!-- Wrapper para as categorias com scroll -->
            <div class="flex items-center gap-5">
              <button
                v-for="cat in categorias"
                :key="cat.id"
                :data-category-id="cat.id"
                class="whitespace-nowrap pb-2 font-bold text-sm tracking-wide transition-all relative flex items-center gap-1.5 px-1 cursor-pointer"
                :class="[
                  (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null))
                    ? 'scale-105'
                    : 'text-text-muted hover:text-text-primary hover:scale-102'
                ]"
                :style="{ color: (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null)) ? getCatColor(cat.cor).hex : undefined }"
                @click="cat.principal ? setActiveCategory(null) : setActiveCategory(cat.id)"
              >
                <NuxtImg
                  v-if="cat.icone_url"
                  :src="getCatIconUrl(cat.icone_url)"
                  :alt="cat.nome"
                  loading="lazy"
                  sizes="20px"
                  class="w-5 h-5 object-contain shrink-0"
                />
                <span class="uppercase">{{ cat.nome }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Desktop: Container com categorias scrolláveis e setas de navegação (se overflow) -->
        <div class="hidden lg:flex items-center w-full py-3 relative gap-2">
          <!-- Scroll button left -->
          <button
            v-if="hasOverflow"
            :disabled="!canScrollLeft"
            class="z-10 p-2 flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 -mt-2 animate-fade-in"
            aria-label="Rolar categorias para esquerda"
            @click="scrollCategories('left')"
          >
            <ChevronLeft class="w-6 h-6" :stroke-width="2.5" />
          </button>

          <!-- Container de categorias com scroll (desktop) - Layout CARD -->
          <div
            v-if="loja?.config_layout?.layout_categoria === 'card' && !isProductDetailPage"
            ref="categoryContainer"
            class="flex-1 flex items-center gap-5 overflow-x-auto no-scrollbar scroll-smooth transition-all duration-300"
            :class="[
              hasOverflow ? 'justify-start' : 'justify-center',
              isScrolled ? 'py-2' : 'py-1 items-start'
            ]"
            @scroll="checkScroll"
          >
            <!-- Categorias (desktop) -->
            <button
              v-for="cat in categorias"
              :key="cat.id"
              :data-category-id="cat.id"
              class="flex flex-col items-center shrink-0 transition-all duration-300 select-none cursor-pointer group relative pb-1"
              :class="isScrolled ? 'gap-1' : 'gap-2'"
              @click="cat.principal ? setActiveCategory(null) : setActiveCategory(cat.id)"
            >
              <div
                class="w-32 rounded-2xl flex items-center justify-center transition-all duration-300 ease-in-out overflow-hidden"
                :class="[
                  isScrolled
                    ? 'max-h-0 h-0 opacity-0 scale-95 pointer-events-none'
                    : 'h-36 opacity-100 scale-100 group-hover:-translate-y-0.5'
                ]"
                :style="{
                  backgroundColor: resolvedTheme === 'dark' ? getCatColor(cat.cor).hex + '25' : getCatColor(cat.cor).hex + '10',
                  transform: (!isScrolled && (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null))) ? 'scale(1.03)' : 'none'
                }"
              >
                <NuxtImg
                  v-if="cat.icone_url"
                  :src="getCatIconUrl(cat.icone_url)"
                  :alt="cat.nome"
                  loading="lazy"
                  sizes="128px"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <span
                  v-else
                  class="text-2xl font-bold uppercase"
                  :style="{ color: getCatColor(cat.cor).hex }"
                >
                  {{ cat.nome.slice(0, 2) }}
                </span>
              </div>
              <span
                class="text-sm font-semibold text-text-primary text-center leading-tight truncate max-w-32 transition-all duration-300 mt-0.5"
                :class="[
                  (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null))
                    ? 'font-bold scale-105'
                    : 'text-text-muted hover:text-text-primary'
                ]"
                :style="{ color: (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null)) ? getCatColor(cat.cor).hex : undefined }"
              >
                {{ cat.nome }}
              </span>
            </button>
          </div>

          <!-- Container de categorias com scroll (desktop) - Layout NOME -->
          <div
            v-else
            ref="categoryContainer"
            class="flex-1 flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth"
            :class="hasOverflow ? 'justify-start' : 'justify-center'"
            @scroll="checkScroll"
          >
            <!-- Categorias -->
            <button
              v-for="cat in categorias"
              :key="cat.id"
              :data-category-id="cat.id"
              class="whitespace-nowrap pb-2 font-bold text-sm tracking-wide transition-all relative flex items-center gap-1.5 px-1 shrink-0 cursor-pointer"
              :class="[
                (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null))
                  ? 'scale-105'
                  : 'text-text-muted hover:text-text-primary hover:scale-102'
              ]"
              :style="{ color: (activeCategoryId === cat.id || (cat.principal && activeCategoryId === null)) ? getCatColor(cat.cor).hex : undefined }"
              @click="cat.principal ? setActiveCategory(null) : setActiveCategory(cat.id)"
            >
              <NuxtImg
                v-if="cat.icone_url"
                :src="getCatIconUrl(cat.icone_url)"
                :alt="cat.nome"
                loading="lazy"
                sizes="20px"
                class="w-5 h-5 object-contain shrink-0"
              />
              <span class="uppercase">{{ cat.nome }}</span>
            </button>
          </div>

          <!-- Scroll button right -->
          <button
            v-if="hasOverflow"
            :disabled="!canScrollRight"
            class="z-10 p-2 flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 -mt-2 animate-fade-in"
            aria-label="Rolar categorias para direita"
            @click="scrollCategories('right')"
          >
            <ChevronRight class="w-6 h-6" :stroke-width="2.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main :class="['flex-1 w-full overflow-x-hidden bg-surface transition-[padding] duration-200 pt-2 flex flex-col justify-between', cartStore.totalItems > 0 ? 'pb-24' : 'pb-4']">
      <div class="w-full">
        <slot />
      </div>
      <CatalogFooter />
    </main>

    <UiCartSidebar
      :is-open="cartStore.isCartSidebarOpen"
      @close="cartStore.toggleCartSidebar(false)"
    />
    <CatalogFloatingWhatsApp />
    <UiNotificationStack />
    <UiConfirmDialog />
  </div>
</template>

<style>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

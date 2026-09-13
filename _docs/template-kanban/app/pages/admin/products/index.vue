<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useState } from 'nuxt/app'
import { Trash2, PenLine, Copy, Search, Plus, X } from '@lucide/vue'
import type { AdminProductListItem } from '~~/shared/types/product'
import { useNotification } from '~/composables/useNotification'
import { getCategoryColor } from '~~/shared/utils/categoryColors'
import type { MigrationDialogOptions, CategoryOption } from '~/components/ui/CategoryMigrationDialog.vue'

definePageMeta({
  layout: 'admin',
})

const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)

watch(showMobileSearch, async (val) => {
  if (val) {
    await nextTick()
    mobileSearchInput.value?.focus()
  } else {
    searchQuery.value = ''
  }
})

const route = useRoute()
const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()

// === Tipos locais ===
interface CategoriaRow {
  id: string
  nome: string
  descricao: string | null
  icone_url: string | null
  ordem: number
  ativa: boolean
  cor: string | null
}

const PAGE_SIZE = 20

// === STATE ===
const activeTab = ref<'produtos' | 'categorias'>(
  (route.query.tab === 'categorias' || route.query.tab === 'categories') ? 'categorias' : 'produtos'
)
const loading = ref<boolean>(false)
const searchQuery = ref<string>('')
const selectedCategory = ref<string | null>(null)
const selectedProductType = ref<string | null>(null)

const categorias = ref<CategoriaRow[]>([])
const produtos = ref<AdminProductListItem[]>([])
const total = ref<number>(0)
const currentPage = ref<number>(1)
const kitsCount = ref<number>(0)

// Migration dialog state
const isMigrationDialogOpen = ref<boolean>(false)
const migrationDialogOptions = ref<MigrationDialogOptions | null>(null)
const categoryToDelete = ref<CategoriaRow | null>(null)

// === LOAD DATA ===
const fetchProducts = async (): Promise<void> => {
  loading.value = true
  try {
    const res = await $fetch('/api/admin/products', {
      query: {
        limit: PAGE_SIZE,
        offset: (currentPage.value - 1) * PAGE_SIZE,
        ...(searchQuery.value ? { q: searchQuery.value } : {}),
        ...(selectedCategory.value ? { categoria_id: selectedCategory.value } : {}),
        ...(selectedProductType.value ? { product_type: selectedProductType.value } : {}),
      },
    })
    produtos.value = res.data as AdminProductListItem[]
    total.value = res.total
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    notify.error('Erro ao carregar produtos', e.data?.statusMessage ?? e.message ?? 'Erro desconhecido')
  } finally {
    loading.value = false
  }
}

const fetchCategories = async (): Promise<void> => {
  const { data } = await supabase
    .from('categories')
    .select('id, nome:name, descricao:description, icone_url:icon_url, ordem:sort_order, ativa:active, cor:color')
    .order('sort_order', { ascending: true })
  if (data) categorias.value = data as unknown as CategoriaRow[]
}

const fetchKitsCount = async (): Promise<void> => {
  const { count } = await supabase.from('kits').select('*', { count: 'exact', head: true })
  if (count !== null) kitsCount.value = count
}

const loadData = async (): Promise<void> => {
  await Promise.all([fetchCategories(), fetchProducts(), fetchKitsCount()])
}

onMounted(() => {
  void loadData()
})

// Debounced search — evita chamada por keystroke
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    void fetchProducts()
  }, 300)
})

// Reset para página 1 ao trocar filtro de categoria ou tipo de produto
watch([selectedCategory, selectedProductType], () => {
  currentPage.value = 1
  void fetchProducts()
})

// === COMPUTED ===
const filteredCategorias = computed<CategoriaRow[]>(() => {
  if (!searchQuery.value) return categorias.value
  const q = searchQuery.value.toLowerCase()
  return categorias.value.filter((c) => c.nome.toLowerCase().includes(q))
})

const categoryFilterOptions = computed(() => [
  { value: null, label: 'Todas as categorias' },
  ...categorias.value.map((c) => ({ value: c.id, label: c.nome })),
])

const productTypeFilterOptions = computed(() => [
  { value: null, label: 'Todos os tipos' },
  { value: 'stock', label: 'Venda Direta' },
  { value: 'preorder', label: 'Sob Encomenda' },
])

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const pageRangeStart = computed(() => total.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
const pageRangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, total.value))

const goToPage = (page: number): void => {
  currentPage.value = page
  void fetchProducts()
}

// === ACTIONS CATEGORIAS ===
const goToNewCategory = () => navigateTo('/admin/categories/new')
const goToEditCategoria = (cat: CategoriaRow) => navigateTo(`/admin/categories/${cat.id}`)

const toggleCategoriaAtiva = async (cat: CategoriaRow): Promise<void> => {
  const newValue = !cat.ativa
  cat.ativa = newValue // optimistic
  await supabase.from('categories').update({ active: newValue }).eq('id', cat.id)
}

const deleteCategoria = async (cat: CategoriaRow): Promise<void> => {
  const { error: checkError, count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', cat.id)

  if (checkError) {
    notify.error('Erro ao verificar vínculos', checkError.message)
    return
  }

  const productCount = count ?? 0

  if (productCount > 0) {
    const availableCategories: CategoryOption[] = categorias.value
      .filter((c) => c.id !== cat.id && c.ativa)
      .map((c) => ({ value: c.id, label: c.nome }))

    if (availableCategories.length === 0) {
      notify.error(
        'Impossível excluir',
        `A categoria "${cat.nome}" possui ${productCount} produto(s) vinculado(s) e não há outras categorias ativas disponíveis. Crie outra categoria antes de excluir esta.`
      )
      return
    }

    categoryToDelete.value = cat
    migrationDialogOptions.value = {
      title: 'Migrar Produtos',
      categoryName: cat.nome,
      productCount,
      availableCategories,
    }
    isMigrationDialogOpen.value = true
    return
  }

  const ok = await confirm({
    title: 'Excluir Categoria',
    message: `Tem certeza que deseja excluir a categoria "${cat.nome}"?`,
    variant: 'error',
    confirmText: 'Excluir',
  })
  if (!ok) return

  const { error } = await supabase.from('categories').delete().eq('id', cat.id)
  if (error) {
    notify.error('Erro ao excluir', error.message)
    return
  }

  notify.success('Categoria excluída com sucesso')
  categorias.value = categorias.value.filter((c) => c.id !== cat.id)
}

const handleMigrationConfirm = async (targetCategoryId: string): Promise<void> => {
  if (!categoryToDelete.value) return

  const cat = categoryToDelete.value

  try {
    const { error: migrationError } = await supabase
      .from('products')
      .update({ category_id: targetCategoryId })
      .eq('category_id', cat.id)

    if (migrationError) {
      notify.error('Erro ao migrar produtos', migrationError.message)
      return
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', cat.id)

    if (deleteError) {
      notify.error('Erro ao excluir categoria', deleteError.message)
      return
    }

    notify.success(
      'Categoria excluída',
      `Produtos migrados e categoria "${cat.nome}" excluída com sucesso.`
    )
    categorias.value = categorias.value.filter((c) => c.id !== cat.id)
    await fetchProducts()
  } finally {
    isMigrationDialogOpen.value = false
    migrationDialogOptions.value = null
    categoryToDelete.value = null
  }
}

const handleMigrationCancel = (): void => {
  isMigrationDialogOpen.value = false
  migrationDialogOptions.value = null
  categoryToDelete.value = null
}

// === ACTIONS PRODUTOS ===
const goToNewProduct = () => navigateTo('/admin/products/new')
const goToEditProduto = (prod: AdminProductListItem) => navigateTo(`/admin/products/${prod.id}`)

const toggleProdutoDisponivel = async (prod: AdminProductListItem): Promise<void> => {
  const newValue = !prod.disponivel
  prod.disponivel = newValue // optimistic
  await supabase.from('products').update({ available: newValue }).eq('id', prod.id)
}

const deleteProduto = async (prod: AdminProductListItem): Promise<void> => {
  const ok = await confirm({
    title: 'Excluir Produto',
    message: `Tem certeza que deseja excluir o produto "${prod.nome}" e expurgar todos os seus dados vinculados (Pedidos, Imagens do S3, Promoções)?`,
    variant: 'error',
    confirmText: 'Excluir em Cascata',
  })
  if (!ok) return

  try {
    await $fetch(`/api/admin/products/${prod.id}`, { method: 'DELETE' })
    notify.success('Produto excluído em cascata com sucesso')
    void fetchProducts()
  } catch (err: unknown) {
    const error = err as { data?: { statusMessage?: string }; message?: string }
    notify.error('Erro ao excluir', error.data?.statusMessage || error.message || 'Erro desconhecido')
  }
}

/**
 * Duplica um produto (dados base, Opções/Variações, relacionados e receita
 * de insumos — server/api/admin/products/[id]/duplicate.post.ts). A cópia
 * nasce indisponível no catálogo até o lojista revisar; por isso navega
 * direto pra edição dela, em vez de só recarregar a lista.
 */
const duplicatingId = ref<string | null>(null)
const duplicateProduto = async (prod: AdminProductListItem): Promise<void> => {
  if (duplicatingId.value) return
  duplicatingId.value = prod.id
  try {
    const res = await $fetch<{ success: true, id: string }>(`/api/admin/products/${prod.id}/duplicate`, { method: 'POST' })
    notify.success('Produto duplicado', `"${prod.nome} (cópia)" criado — revise e ative quando estiver pronto.`)
    await navigateTo(`/admin/products/${res.id}`)
  } catch (err: unknown) {
    const error = err as { data?: { statusMessage?: string }; message?: string }
    notify.error('Erro ao duplicar', error.data?.statusMessage || error.message || 'Erro desconhecido')
  } finally {
    duplicatingId.value = null
  }
}

// === UTILS ===
const { formatCurrency } = useFormatters()
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans relative">

    <header class="bg-surface sticky top-0 z-20 border-b border-border select-none shrink-0">
      <!-- Linha 1: Botão Novo Quadrado, Busca e Filtros -->
      <div class="h-16 flex items-center justify-between px-4 sm:px-6 bg-surface">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <!-- Botão Novo Quadrado -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
            :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
            :title="activeTab === 'produtos' ? 'Novo Produto' : 'Nova Categoria'"
            @click="activeTab === 'produtos' ? goToNewProduct() : goToNewCategory()"
          >
            <Plus class="w-4.5 h-4.5" stroke-width="2.5" />
          </button>

          <!-- Busca (Desktop) -->
          <div class="hidden md:block relative w-full max-w-[260px] lg:max-w-xs h-9 shrink-0">
            <label for="catalog-search" class="sr-only">Pesquisar produtos</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="catalog-search"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-3 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar produtos..."
            >
          </div>

          <!-- Filtro por Categoria (Desktop) -->
          <div v-if="activeTab === 'produtos'" class="max-md:hidden w-full max-w-[220px] lg:max-w-[240px] shrink-0">
            <UiSelect
              v-model="selectedCategory"
              :options="categoryFilterOptions"
              placeholder="Todas as categorias"
            />
          </div>

          <!-- Filtro por Tipo de Venda (Desktop) -->
          <div v-if="activeTab === 'produtos'" class="max-md:hidden w-full max-w-[220px] lg:max-w-[240px] shrink-0">
            <UiSelect
              v-model="selectedProductType"
              :options="productTypeFilterOptions"
              placeholder="Todos os tipos"
            />
          </div>

          <!-- Busca Mobile Toggle Button -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors active:scale-95 md:hidden shrink-0 cursor-pointer"
            :class="showMobileSearch ? 'bg-brand-light dark:bg-brand-green/25 text-text-primary shadow-sm' : 'bg-surface'"
            aria-label="Pesquisar e Filtrar" title="Pesquisar e Filtrar"
            @click="showMobileSearch = !showMobileSearch"
          >
            <Search class="w-4 h-4" />
          </button>
        </div>

        <!-- Link Acessar Catálogo -->
        <NuxtLink
          to="/"
          target="_blank"
          class="text-[11px] font-extrabold text-admin-primary hover:text-admin-secondary transition-colors uppercase tracking-wider shrink-0 ml-4 max-md:hidden"
        >
          ACESSAR O CATÁLOGO
        </NuxtLink>
      </div>

      <!-- Barra de Busca e Filtro Mobile Expansível -->
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="max-h-0 opacity-0 py-0"
        enter-to-class="max-h-48 opacity-100 py-3"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="max-h-48 opacity-100 py-3"
        leave-to-class="max-h-0 opacity-0 py-0"
      >
        <div
          v-if="showMobileSearch"
          class="px-4 pb-3 border-t border-border/40 md:hidden bg-surface overflow-hidden flex flex-col gap-2.5"
        >
          <div class="relative flex-1 h-9">
            <label for="catalog-search-mobile" class="sr-only">Pesquisar</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="catalog-search-mobile"
              ref="mobileSearchInput"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-8 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar produtos..."
            >
            <button
              v-if="searchQuery"
              type="button"
              class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
              @click="searchQuery = ''"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div v-if="activeTab === 'produtos'" class="flex gap-2">
            <div class="flex-1">
              <UiSelect
                v-model="selectedCategory"
                :options="categoryFilterOptions"
                placeholder="Todas as categorias"
              />
            </div>
            <div class="flex-1">
              <UiSelect
                v-model="selectedProductType"
                :options="productTypeFilterOptions"
                placeholder="Todos os tipos"
              />
            </div>
          </div>
        </div>
      </transition>

      <!-- Linha 2: Abas Segmentadas -->
      <div class="h-10 flex items-center px-4 sm:px-6 bg-surface border-t border-border/50">
        <div class="flex items-center gap-6">
          <button
            type="button"
            class="text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            :class="activeTab === 'produtos'
              ? 'text-brand-green'
              : 'text-text-muted hover:text-text-primary'"
            @click="activeTab = 'produtos'"
          >
            <span>Produtos</span>
            <span v-if="total > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ total }}</span>
          </button>

          <button
            type="button"
            class="text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            :class="activeTab === 'categorias'
              ? 'text-brand-green'
              : 'text-text-muted hover:text-text-primary'"
            @click="activeTab = 'categorias'"
          >
            <span>Categorias</span>
            <span v-if="categorias.length" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ categorias.length }}</span>
          </button>

          <NuxtLink
            to="/admin/products?tab=categories"
            class="hidden"
          />
          <NuxtLink
            to="/admin/kits"
            class="text-sm font-medium transition-colors whitespace-nowrap text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <span>Montar Kits</span>
            <span v-if="kitsCount > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ kitsCount }}</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/inventory"
            class="text-sm font-medium transition-colors whitespace-nowrap text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <span>Estoque</span>
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <div v-if="loading" class="flex justify-center items-center h-64 text-text-muted">
        <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <div v-else>

        <!-- PRODUTOS TAB -->
        <div v-if="activeTab === 'produtos'" class="animate-[fadeIn_0.3s_ease-out]">
          
          <!-- Visão Mobile: Lista de Cards de Produtos -->
          <div class="md:hidden flex flex-col gap-3 p-4">
            <div
              v-for="prod in produtos"
              :key="prod.id"
              class="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
              @click="goToEditProduto(prod)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-raised flex items-center justify-center overflow-hidden border border-border shrink-0">
                  <NuxtImg v-if="prod.foto_url" :src="prod.foto_url" :alt="prod.nome" loading="lazy" sizes="48px" class="w-full h-full object-cover" />
                  <svg v-else class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-sm text-text-primary truncate">{{ prod.nome }}</span>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-raised text-text-secondary border border-border">
                      {{ prod.categorias?.nome || 'Sem Categoria' }}
                    </span>
                    <span class="text-xs font-bold text-text-primary tabular-nums">
                      {{ formatCurrency(prod.preco_promocional ?? prod.preco_venda) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0" @click.stop>
                <UiToggle
                  :model-value="prod.disponivel"
                  size="sm"
                  :title="prod.disponivel ? 'Desativar Produto' : 'Ativar Produto'"
                  @update:model-value="toggleProdutoDisponivel(prod)"
                />
                <button type="button" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer" title="Editar" @click="goToEditProduto(prod)">
                  <PenLine class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Duplicar Produto"
                  :disabled="duplicatingId === prod.id"
                  @click="duplicateProduto(prod)"
                >
                  <Copy class="w-4 h-4" />
                </button>
                <button type="button" class="p-1.5 text-text-muted hover:text-danger-600 hover:bg-danger-50 rounded transition-colors cursor-pointer" title="Excluir" @click="deleteProduto(prod)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-if="produtos.length === 0" class="py-12 text-center text-text-muted text-xs">
              Nenhum produto encontrado.
            </div>
          </div>

          <!-- Visão Desktop: Tabela de Produtos com Cabeçalho Fixo (Sticky) -->
          <div class="hidden md:block">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-raised">
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Produto</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Categoria</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Custo / Margem</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Preço Venda</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Unidade</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Ações</th>
                </tr>
              </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="prod in produtos" :key="prod.id" class="hover:bg-surface-raised/60 transition-colors group cursor-pointer" @click="goToEditProduto(prod)">
                    <td class="px-6 py-3">
                      <div class="flex items-center gap-3.5">
                        <!-- Imagem em w-11 h-11 -->
                        <div class="w-11 h-11 rounded-lg bg-surface-raised flex items-center justify-center overflow-hidden border border-border shrink-0">
                          <NuxtImg v-if="prod.foto_url" :src="prod.foto_url" :alt="prod.nome" loading="lazy" sizes="44px" class="w-full h-full object-cover" />
                          <svg v-else class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <div class="min-w-0">
                          <!-- Nome em text-sm font-semibold e descrição em text-xs -->
                          <div class="font-semibold text-text-primary text-sm truncate max-w-[280px]">{{ prod.nome }}</div>
                          <div class="text-xs text-text-muted truncate max-w-[280px]">{{ prod.descricao || 'Sem descrição' }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-3">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-surface-raised text-text-secondary border border-border/80">
                        {{ prod.categorias?.nome || 'Sem Categoria' }}
                      </span>
                    </td>
                    <td class="px-6 py-3 text-xs">
                      <div class="text-text-primary font-bold">{{ formatCurrency(prod.preco_custo) }}</div>
                      <div class="text-text-muted text-[10px]">Margem: <span class="text-secondary-600 font-bold">{{ prod.margem_lucro }}%</span></div>
                    </td>
                    <td class="px-6 py-3 text-xs">
                      <div v-if="prod.preco_promocional" class="flex flex-col gap-0.5">
                        <span class="text-[10px] text-text-muted line-through leading-none">{{ formatCurrency(prod.preco_venda) }}</span>
                        <span class="font-bold text-warning-600 flex items-center gap-1">
                          {{ formatCurrency(prod.preco_promocional) }}
                          <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-warning-100 text-warning-700 uppercase tracking-wide">promo</span>
                        </span>
                      </div>
                      <div v-else class="font-bold text-text-primary">{{ formatCurrency(prod.preco_venda) }}</div>
                    </td>
                    <td class="px-6 py-3 whitespace-nowrap text-xs text-text-muted">
                      {{ prod.unidade_medida }}
                    </td>
                    <td class="px-6 py-3 whitespace-nowrap text-right">
                      <div class="flex items-center justify-end gap-2.5" @click.stop>
                        <UiToggle
                          :model-value="prod.disponivel"
                          size="sm"
                          :title="prod.disponivel ? 'Desativar Produto' : 'Ativar Produto'"
                          @update:model-value="toggleProdutoDisponivel(prod)"
                        />

                        <button type="button" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer" title="Editar" @click="goToEditProduto(prod)">
                          <PenLine class="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Duplicar Produto"
                          :disabled="duplicatingId === prod.id"
                          @click="duplicateProduto(prod)"
                        >
                          <Copy class="w-4 h-4" />
                        </button>
                        <button type="button" class="p-1.5 text-text-muted hover:text-danger-600 hover:bg-danger-50 rounded transition-colors cursor-pointer" title="Excluir" @click="deleteProduto(prod)">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="produtos.length === 0">
                    <td colspan="6" class="px-6 py-12 text-center text-text-muted text-xs">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                </tbody>
              </table>
          </div>

          <!-- Paginação -->
          <div v-if="totalPages > 1 || total > 0" class="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border bg-surface">
            <span class="text-xs text-text-muted font-medium">
              {{ pageRangeStart }}–{{ pageRangeEnd }} de {{ total }} produtos
            </span>
            <UiPagination
              :current-page="currentPage"
              :total-pages="totalPages"
              size="sm"
              @change="goToPage"
            />
          </div>
        </div>

        <!-- CATEGORIAS TAB -->
        <div v-if="activeTab === 'categorias'" class="animate-[fadeIn_0.3s_ease-out]">

          <!-- Visão Mobile: Lista de Cards de Categorias -->
          <div class="md:hidden flex flex-col gap-3 p-4">
            <div
              v-for="cat in filteredCategorias"
              :key="cat.id"
              class="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
              @click="goToEditCategoria(cat)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded bg-surface-raised flex items-center justify-center shrink-0 border border-border">
                  <NuxtImg v-if="cat.icone_url" :src="cat.icone_url" :alt="cat.nome" loading="lazy" sizes="24px" class="w-4 h-4 object-contain" />
                  <svg v-else class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-sm text-text-primary flex items-center gap-2 truncate">
                    {{ cat.nome }}
                    <span
                      class="w-2.5 h-2.5 rounded-full shrink-0 border border-border/40"
                      :style="{ backgroundColor: getCategoryColor(cat.cor).hex }"
                    />
                  </span>
                  <span class="text-xs text-text-muted truncate">{{ cat.descricao || 'Sem descrição' }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0" @click.stop>
                <UiToggle
                  :model-value="cat.ativa"
                  size="sm"
                  :title="cat.ativa ? 'Ativa' : 'Inativa'"
                  @update:model-value="toggleCategoriaAtiva(cat)"
                />
                <button type="button" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer" title="Editar" @click="goToEditCategoria(cat)">
                  <PenLine class="w-4 h-4" />
                </button>
                <button type="button" class="p-1.5 text-text-muted hover:text-danger-600 hover:bg-danger-50 rounded transition-colors cursor-pointer" title="Excluir" @click="deleteCategoria(cat)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-if="filteredCategorias.length === 0" class="py-12 text-center text-text-muted text-xs">
              Nenhuma categoria encontrada.
            </div>
          </div>

          <!-- Visão Desktop: Tabela de Categorias com Cabeçalho Fixo (Sticky) -->
          <div class="hidden md:block">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-raised">
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Categoria</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Descrição</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center shadow-xs">Ordem</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="cat in filteredCategorias"
                  :key="cat.id"
                  class="hover:bg-surface-raised/60 transition-colors cursor-pointer"
                  @click="goToEditCategoria(cat)"
                >
                  <td class="px-6 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded bg-surface-raised flex items-center justify-center shrink-0 border border-border">
                        <NuxtImg v-if="cat.icone_url" :src="cat.icone_url" :alt="cat.nome" loading="lazy" sizes="24px" class="w-4 h-4 object-contain" />
                        <svg v-else class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      </div>
                      <span class="font-bold text-text-primary text-sm flex items-center gap-2">
                        {{ cat.nome }}
                        <span
                          class="w-2.5 h-2.5 rounded-full shrink-0 border border-border/40"
                          :style="{ backgroundColor: getCategoryColor(cat.cor).hex }"
                          :title="getCategoryColor(cat.cor).label"
                        />
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-3 text-xs text-text-muted max-w-xs truncate">{{ cat.descricao || '—' }}</td>
                  <td class="px-6 py-3 text-xs text-text-muted text-center font-semibold">{{ cat.ordem }}</td>
                  <td class="px-6 py-3 text-right">
                    <div class="flex items-center justify-end gap-2.5" @click.stop>
                      <UiToggle
                        :model-value="cat.ativa"
                        size="sm"
                        :title="cat.ativa ? 'Ativa' : 'Inativa'"
                        @update:model-value="toggleCategoriaAtiva(cat)"
                      />
                      <button type="button" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer" title="Editar" @click="goToEditCategoria(cat)">
                        <PenLine class="w-4 h-4" />
                      </button>
                      <button type="button" class="p-1.5 text-text-muted hover:text-danger-600 hover:bg-danger-50 rounded transition-colors cursor-pointer" title="Excluir" @click="deleteCategoria(cat)">
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredCategorias.length === 0">
                  <td colspan="4" class="px-6 py-12 text-center text-text-muted text-xs">
                    Nenhuma categoria encontrada.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>

    <!-- Migration Dialog -->
    <UiCategoryMigrationDialog
      :is-open="isMigrationDialogOpen"
      :options="migrationDialogOptions"
      @confirm="handleMigrationConfirm"
      @cancel="handleMigrationCancel"
    />

  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

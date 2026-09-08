<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo, useState } from 'nuxt/app'
import { Trash2, Search, Sparkles, Plus } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'

definePageMeta({
  layout: 'admin',
})

const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()
const kits = ref<{ id: string; nome: string; descricao: string | null; foto_url: string | null; preco_fixo: number; disponivel: boolean; kit_itens: Array<{ count: number }> }[]>([])
const loading = ref(true)
const searchQuery = ref('')

const loadKits = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('kits')
    .select('id, nome, descricao, foto_url, preco_fixo, disponivel, kit_itens(count)')
    .order('criado_em', { ascending: false })
    .limit(200)

  if (error) {
    notify.error('Erro ao carregar kits', error.message)
  } else if (data) {
    kits.value = data as typeof kits.value
  }
  loading.value = false
}

const produtosCount = ref<number>(0)
const categoriasCount = ref<number>(0)

const fetchCounts = async (): Promise<void> => {
  const [prodRes, catRes] = await Promise.all([
    supabase.from('produtos').select('*', { count: 'exact', head: true }),
    supabase.from('categorias').select('*', { count: 'exact', head: true })
  ])
  
  if (prodRes.count !== null) produtosCount.value = prodRes.count
  if (catRes.count !== null) categoriasCount.value = catRes.count
}

const filteredKits = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return kits.value
  return kits.value.filter((k) => k.nome.toLowerCase().includes(q))
})

onMounted(() => {
  void loadKits()
  void fetchCounts()
})

const deleteKit = async (id: string) => {
  const ok = await confirm({
    title: 'Remover kit?',
    message: 'Esta ação não pode ser desfeita.',
    variant: 'error',
    confirmText: 'Remover',
  })
  if (!ok) return
  const { error } = await supabase.from('kits').delete().eq('id', id)
  if (error) {
    notify.error('Erro ao remover', error.message)
  } else {
    notify.success('Kit removido')
    await loadKits()
  }
}

const { formatCurrency } = useFormatters()
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans relative">
    
    <!-- Header Otimizado (Consistência Visual Total) -->
    <header class="bg-surface sticky top-0 z-20 border-b border-border select-none shrink-0">
      <!-- Linha 1: Botão Novo Quadrado e Busca -->
      <div class="h-16 flex items-center justify-between px-4 sm:px-6 bg-surface">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <!-- Botão Novo Quadrado -->
          <NuxtLink
            to="/admin/kits/new"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
            :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
            title="Novo Kit"
            aria-label="Novo Kit"
          >
            <Plus class="w-4.5 h-4.5" stroke-width="2.5" />
          </NuxtLink>

          <!-- Busca (Desktop) -->
          <div class="hidden md:block relative w-full max-w-xs h-9 shrink-0">
            <label for="kits-search" class="sr-only">Pesquisar kits</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="kits-search"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-3 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar kits..."
            >
          </div>
        </div>
      </div>

      <!-- Linha 2: Abas Segmentadas (Visual Clear Sem Linha) -->
      <div class="h-10 flex items-center px-6 bg-surface border-t border-border/50">
        <div class="flex items-center gap-6">
          <NuxtLink
            to="/admin/products"
            class="text-sm font-medium transition-colors whitespace-nowrap text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <span>Produtos</span>
            <span v-if="produtosCount > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ produtosCount }}</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/products?tab=categorias"
            class="text-sm font-medium transition-colors whitespace-nowrap text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <span>Categorias</span>
            <span v-if="categoriasCount > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ categoriasCount }}</span>
          </NuxtLink>

          <button
            type="button"
            class="text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-brand-green"
          >
            <span>Montar Kits</span>
            <span v-if="kits.length > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ kits.length }}</span>
          </button>

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
    <main class="flex-1 px-6 pb-12">
      <div class="max-w-6xl mx-auto w-full mt-6">
        <div v-if="loading" class="flex justify-center items-center h-64 text-text-muted">
          <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        </div>
        
        <div v-else-if="filteredKits.length === 0" class="flex flex-col justify-center items-center h-64 border border-dashed border-border rounded-xl bg-surface-raised">
          <svg class="w-12 h-12 text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          <p class="text-text-muted font-medium">Nenhum kit cadastrado</p>
          <button type="button" class="mt-4 text-primary-600 font-semibold hover:text-primary-700 cursor-pointer" @click="navigateTo('/admin/kits/new')">Criar o primeiro Kit</button>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <article 
            v-for="kit in filteredKits"
            :key="kit.id" 
            class="group bg-surface rounded-xl border border-border transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
            @click="navigateTo(`/admin/kits/${kit.id}`)"
          >
            <!-- Card Image -->
            <div class="h-40 bg-surface-raised relative border-b border-border flex items-center justify-center overflow-hidden">
              <NuxtImg v-if="kit.foto_url" :src="kit.foto_url" :alt="kit.nome" loading="lazy" sizes="100vw md:50vw xl:33vw" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <svg v-else class="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              
              <div class="absolute top-3 right-3 flex gap-2">
                <span v-if="!kit.disponivel" class="bg-danger-100 text-danger-700 text-xs font-bold px-2.5 py-1 rounded">Indisponível</span>
              </div>
            </div>
            
            <!-- Card Body -->
            <div class="p-5 flex-1 flex flex-col">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-text-primary text-base line-clamp-1" :title="kit.nome">{{ kit.nome }}</h3>
              </div>
              <p class="text-xs text-text-muted line-clamp-2 mb-4 flex-1">{{ kit.descricao || 'Sem descrição' }}</p>
              
              <div class="flex items-center justify-between pt-4 border-t border-border">
                <div class="flex items-center gap-1.5 text-text-muted text-xs font-medium bg-surface-raised px-2 py-1 rounded border border-border/40">
                  <Sparkles class="w-3.5 h-3.5 text-brand-green animate-pulse" />
                  {{ kit.kit_itens?.[0]?.count || 0 }} Itens
                </div>
                <div class="flex items-center gap-3">
                  <div class="font-bold text-primary-600 text-base">
                    {{ formatCurrency(kit.preco_fixo) }}
                  </div>
                  <button
                    type="button"
                    class="p-1.5 text-text-muted hover:text-danger-600 transition-colors rounded-full hover:bg-danger-50 cursor-pointer"
                    title="Remover kit"
                    @click.stop="deleteKit(kit.id)"
                  >
                    <Trash2 class="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>

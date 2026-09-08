<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo, useState } from 'nuxt/app'
import { useNotification } from '~/composables/useNotification'
import { 
  Tag, 
  TrendingDown, 
  ShoppingCart, 
  Image as ImageIcon, 
  Truck, 
  Ticket, 
  ArrowLeft, 
  Trash2, 
  Calendar 
} from '@lucide/vue'
import type { TipoPromocao } from '#shared/types/promotion'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')

// === Tipos Locais ===
type PromoTab = TipoPromocao | 'frete_gratis' | 'cupom'

interface PromocaoItem {
  id: string
  nome: string
  tipo: string
  ativa: boolean
  data_inicio: string | null
  data_fim: string | null
  foto_url: string | null
  descricao: string | null
}

// === Central de Recursos (Promoções) ===
const promoTypes = [
  {
    id: 'leve_pague',
    label: 'Leve Pague',
    desc: 'Crie campanhas como "Leve 3 e Pague 2" para aumentar o volume de itens no carrinho.',
    icon: Tag
  },
  {
    id: 'progressivo',
    label: 'Desconto Progressivo',
    desc: 'Ofereça descontos maiores conforme a quantidade de produtos comprados.',
    icon: TrendingDown
  },
  {
    id: 'desconto_carrinho',
    label: 'Desconto no Carrinho',
    desc: 'Aplique descontos em porcentagem ou valor fixo sobre o total da compra do cliente.',
    icon: ShoppingCart
  },
  {
    id: 'destaque',
    label: 'Banner Promocional',
    desc: 'Destaque banners promocionais na página inicial para atrair mais vendas.',
    icon: ImageIcon
  },
  {
    id: 'frete_gratis',
    label: 'Frete Grátis',
    desc: 'Configure metas de valor no carrinho para isenção automática do valor de entrega.',
    icon: Truck
  },
  {
    id: 'cupom',
    label: 'Cupons de Desconto',
    desc: 'Gere códigos promocionais exclusivos para seus clientes aplicarem no checkout.',
    icon: Ticket
  }
]

// === STATE ===
const promocoes = ref<PromocaoItem[]>([])
const loading = ref<boolean>(true)

// Seleção do tipo ativo na URL
const activeType = computed<PromoTab | null>(() => {
  const t = route.query.tipo
  if (!t) return null
  return t as PromoTab
})

const isFreteTab = computed(() => activeType.value === 'frete_gratis')
const isCupomTab = computed(() => activeType.value === 'cupom')

const loadPromocoes = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('promocoes')
    .select('id, nome, tipo, ativa, data_inicio, data_fim, foto_url, descricao')
    .order('criado_em', { ascending: false })
    .limit(200)

  if (error) {
    notify.error('Erro ao carregar promoções', error.message)
  } else if (data) {
    promocoes.value = data as PromocaoItem[]
  }
  loading.value = false
}

// Filtragem do tipo ativo
const tabPromocoes = computed(() => {
  if (!activeType.value) return []
  return promocoes.value.filter((p) => p.tipo === activeType.value)
})

onMounted(() => {
  void loadPromocoes()
})

const deletePromocao = async (id: string) => {
  const ok = await confirm({
    title: 'Remover promoção?',
    message: 'Esta ação não pode ser desfeita.',
    variant: 'error',
    confirmText: 'Remover',
  })
  if (!ok) return
  const { error } = await supabase.from('promocoes').delete().eq('id', id)
  if (error) {
    notify.error('Erro ao remover', error.message)
  } else {
    notify.success('Promoção removida')
    void loadPromocoes()
  }
}

// === UTILS ===
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateString))
}


const getActiveLabel = computed(() => {
  return promoTypes.find(p => p.id === activeType.value)?.label ?? ''
})

const selectPromoType = (tipoId: string) => {
  void navigateTo(`/admin/promotions?tipo=${tipoId}`)
}

const goBackToMenu = () => {
  void navigateTo('/admin/promotions')
}

const handleCreateNew = () => {
  if (isCupomTab.value) {
    void navigateTo('/admin/promotions/cupons/new')
  } else if (activeType.value) {
    void navigateTo(`/admin/promotions/new?tipo=${activeType.value}`)
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans relative">

    <!-- === TELA GERAL: MENU DE CARDS DE PROMOÇÃO === -->
    <div v-if="!activeType" class="flex-1 flex flex-col">
      <header class="h-16 flex items-center justify-between px-6 border-b border-border bg-surface shrink-0 select-none">
        <div class="flex flex-col">
          <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">Campanhas &amp; Promoções</h1>
          <p class="text-[10px] text-text-muted mt-0.5">Gerencie ou crie novas regras de descontos para sua loja.</p>
        </div>

        <!-- Link Acessar Catálogo -->
        <NuxtLink
          to="/"
          target="_blank"
          class="text-[11px] font-extrabold text-admin-primary hover:text-admin-secondary transition-colors uppercase tracking-wider shrink-0 ml-4"
        >
          ACESSAR O CATÁLOGO
        </NuxtLink>
      </header>

      <main class="flex-1 w-full max-w-6xl mx-auto px-6 py-8 pb-32">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="pType in promoTypes"
            :key="pType.id"
            class="group bg-surface border border-border/80 rounded-2xl hover:border-brand-green/30 hover:bg-surface-raised/20 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_12px_36px_rgb(0,0,0,0.3)] hover:-translate-y-1 transform"
            @click="selectPromoType(pType.id)"
          >
            <!-- Ilustração Visual da Promoção -->
            <div class="h-48 md:h-52 w-full border-b border-border/40 overflow-hidden relative transition-all duration-300">
              <AdminPromoVisual :tipo="pType.id" class="w-full h-full" />
            </div>

            <!-- Detalhes do Card -->
            <div class="p-5 flex-1 flex flex-col justify-between items-start text-left">
              <div>
                <h2 class="text-sm font-bold text-text-primary tracking-tight mb-1.5 group-hover:text-admin-primary transition-colors duration-200">
                  {{ pType.label }}
                </h2>
                <p class="text-xs text-text-muted leading-relaxed font-normal">
                  {{ pType.desc }}
                </p>
              </div>
              
              <span class="text-[10px] font-bold text-admin-primary mt-4 inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-all duration-200 group-hover:gap-1.5 uppercase tracking-wider">
                Gerenciar Recurso
                <svg class="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- === TELA DE LISTAGEM ESPECÍFICA (COM HEADER CONSISTENTE) === -->
    <div v-else class="flex-1 flex flex-col">
      <!-- Header de Listagem (Consistente com Catálogo e Clientes) -->
      <header class="bg-surface sticky top-0 z-20 border-b border-border select-none shrink-0">
        <div class="h-16 flex items-center justify-between px-4 sm:px-6 bg-surface">
          <div class="flex items-center gap-3">
            <!-- Botão Voltar -->
            <button
              type="button"
              class="text-text-muted hover:text-text-primary hover:bg-surface-raised p-1.5 rounded-full transition-colors shrink-0 cursor-pointer border border-border/60 bg-surface"
              :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
              title="Voltar ao Menu"
              @click="goBackToMenu"
            >
              <ArrowLeft class="w-4.5 h-4.5" />
            </button>
            <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
              {{ getActiveLabel }}
            </h1>
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
      </header>

      <!-- Main Content da Listagem -->
      <main class="flex-1 px-6 pb-12">
        <div class="max-w-6xl mx-auto w-full mt-6">
          
          <!-- Aba Frete Grátis -->
          <div v-if="isFreteTab">
            <AdminFreeShippingConfig />
          </div>

          <!-- Aba Cupons de Desconto -->
          <div v-else-if="isCupomTab">
            <AdminCouponList />
          </div>

          <!-- Loading -->
          <div v-else-if="loading" class="flex justify-center items-center h-64 text-text-muted">
            <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>

          <!-- Grid de Promoções (Cards Quadrados) -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Card Tracejado de Adicionar Campanha -->
            <div
              class="group border-2 border-dashed border-border/80 hover:border-admin-primary/40 hover:bg-surface-raised/20 rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-6 text-center min-h-70"
              @click="handleCreateNew"
            >
              <div class="w-12 h-12 text-admin-primary bg-admin-primary/5 border border-admin-primary/10 flex items-center justify-center rounded-xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">Criar Nova Campanha</h3>
              <p class="text-[10px] text-text-muted leading-relaxed max-w-50">Adicione um novo benefício ou desconto de {{ getActiveLabel }} para seus clientes.</p>
            </div>
            <article
              v-for="promo in tabPromocoes"
              :key="promo.id"
              class="group bg-surface rounded-xl border border-border hover:border-interactive-primary/30 hover:bg-surface-raised/20 transition-all duration-150 flex flex-col cursor-pointer relative overflow-hidden"
              @click="navigateTo(`/admin/promotions/${promo.id}`)"
            >
              <!-- Thumbnail superior com Imagem em Alta Qualidade -->
              <div class="h-40 bg-surface-raised relative border-b border-border flex items-center justify-center overflow-hidden shrink-0">
                <NuxtImg
                  v-if="promo.foto_url"
                  :src="promo.foto_url"
                  :alt="promo.nome"
                  loading="lazy"
                  sizes="100vw md:50vw lg:33vw"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <!-- Sem imagem própria: placeholder neutro. Não reutiliza a
                     imagem padrão do tipo — apenas sinaliza a ausência. -->
                <div v-else class="flex flex-col items-center gap-1.5 text-text-muted">
                  <ImageIcon class="w-8 h-8" aria-hidden="true" />
                  <span class="text-[10px] font-medium uppercase tracking-wider">Sem imagem</span>
                </div>



                <!-- Badge Status -->
                <div class="absolute top-3 right-3">
                  <span
                    v-if="promo.ativa"
                    class="bg-emerald-500 text-white backdrop-blur-xs text-[10px] font-bold px-2.5 py-0.5 rounded shadow-xs uppercase tracking-wider"
                  >
                    Ativa
                  </span>
                  <span
                    v-else
                    class="bg-surface/90 text-text-muted backdrop-blur-xs border border-border text-[10px] font-bold px-2.5 py-0.5 rounded shadow-xs uppercase tracking-wider"
                  >
                    Inativa
                  </span>
                </div>
              </div>

              <!-- Body -->
              <div class="p-5 flex-1 flex flex-col justify-between">
                <div class="min-w-0">
                  <h3 class="font-bold text-text-primary text-base truncate uppercase mb-1" :title="promo.nome">
                    {{ promo.nome }}
                  </h3>
                  <p class="text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {{ promo.descricao || 'Sem descrição cadastrada' }}
                  </p>
                </div>

                <!-- Footer Meta -->
                <div class="flex items-center justify-between mt-5 pt-3 border-t border-border/60 min-w-0">
                  <div class="flex items-start gap-1.5 text-[10px] text-text-muted min-w-0">
                    <Calendar class="w-3.5 h-3.5 text-text-muted opacity-75 shrink-0 mt-0.5" />
                    <div class="flex flex-col min-w-0 leading-tight">
                      <span class="truncate">
                        Início: <strong class="text-text-primary">{{ formatDate(promo.data_inicio) }}</strong>
                      </span>
                      <span class="truncate mt-0.5">
                        Fim: <strong class="text-text-primary">{{ promo.data_fim ? formatDate(promo.data_fim) : 'Indeterminado' }}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="p-1.5 text-text-muted hover:text-danger-600 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-950/20 shrink-0 cursor-pointer"
                    title="Remover promoção"
                    @click.stop="deletePromocao(promo.id)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          </div>

        </div>
      </main>
    </div>

  </div>
</template>

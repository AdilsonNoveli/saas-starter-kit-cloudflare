<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from 'nuxt/app'
import { useNotification } from '~/composables/useNotification'
import { Calendar, Trash2, Ticket } from '@lucide/vue'

const { notify, confirm } = useNotification()

interface Cupom {
  id: string
  codigo: string
  descricao: string | null
  tipo_desconto: 'percentual' | 'fixo'
  valor: number
  uso_maximo: number | null
  uso_atual: number
  ativo: boolean
  data_inicio: string | null
  data_fim: string | null
}

const cupons = ref<Cupom[]>([])
const loading = ref(true)

const loadCupons = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ data: Cupom[] }>('/api/admin/coupons')
    cupons.value = res.data
  } catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Falha ao carregar cupons'
    notify.error('Erro ao carregar cupons', msg)
  }
  loading.value = false
}

const filteredCupons = computed(() => {
  return cupons.value
})

onMounted(() => loadCupons())

const deleteCupom = async (id: string, codigo: string) => {
  const ok = await confirm({
    title: `Remover cupom ${codigo}?`,
    message: 'Esta ação não pode ser desfeita.',
    variant: 'error',
    confirmText: 'Remover',
  })
  if (!ok) return

  try {
    await $fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
    notify.success('Cupom removido com sucesso')
    await loadCupons()
  } catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Falha ao remover cupom'
    notify.error('Erro ao remover', msg)
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Sem limite'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateString))
}

const formatValor = (tipo: 'percentual' | 'fixo', valor: number) => {
  if (tipo === 'percentual') return `${valor}% OFF`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center h-64 text-text-muted">
      <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <!-- Grid de Cupons (Cards Quadrados) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Card Tracejado de Adicionar Cupom -->
      <div
        class="group border-2 border-dashed border-border/80 hover:border-brand-green/40 hover:bg-surface-raised/20 rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-6 text-center min-h-[250px]"
        @click="navigateTo('/admin/promotions/coupons/new')"
      >
        <div class="w-12 h-12 text-brand-green bg-brand-green/5 border border-brand-green/10 flex items-center justify-center rounded-xl mb-4 group-hover:scale-105 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">Criar Novo Cupom</h3>
        <p class="text-[10px] text-text-muted leading-relaxed max-w-[200px]">Adicione um novo código de cupom com regras e limites personalizados.</p>
      </div>

      <article
        v-for="cupom in filteredCupons"
        :key="cupom.id"
        class="group bg-surface rounded-xl border border-border hover:border-interactive-primary/30 hover:bg-surface-raised/20 transition-all duration-150 flex flex-col cursor-pointer relative overflow-hidden"
        @click="navigateTo(`/admin/promotions/coupons/${cupom.id}`)"
      >
        <!-- Icon Thumbnail superior (Visual de card quadrado) -->
        <div class="h-32 bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center border-b border-border relative shrink-0">
          <Ticket class="w-12 h-12 text-primary-600 dark:text-primary-400 group-hover:scale-105 transition-transform duration-300" />
          
          <!-- Status Badge flutuando no topo direito -->
          <div class="absolute top-3 right-3">
            <span
              v-if="cupom.ativo"
              class="bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400 text-[10px] font-bold px-2 py-0.5 rounded"
            >
              Ativo
            </span>
            <span
              v-else
              class="bg-surface border border-border text-text-muted text-[10px] font-bold px-2 py-0.5 rounded"
            >
              Inativo
            </span>
          </div>
        </div>

        <!-- Body -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div class="min-w-0">
            <h3 class="font-bold text-text-primary text-base truncate uppercase tracking-wider mb-1">
              {{ cupom.codigo }}
            </h3>
            <p class="text-xs text-text-muted line-clamp-2 leading-relaxed">
              {{ cupom.descricao || 'Sem descrição cadastrada' }}
            </p>

            <!-- Highlights (Value & Usage) -->
            <div class="flex items-center gap-2.5 mt-4">
              <span class="text-xs font-black text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2.5 py-1 rounded border border-primary-100 dark:border-primary-900 leading-none">
                {{ formatValor(cupom.tipo_desconto, cupom.valor) }}
              </span>
              <div class="text-[10px] text-text-muted font-bold bg-surface-raised px-2.5 py-1 rounded border border-border leading-none">
                Usos: 
                <strong :class="(cupom.uso_maximo !== null && cupom.uso_atual >= cupom.uso_maximo) ? 'text-danger-600' : 'text-text-primary'">
                  {{ cupom.uso_atual }} / {{ cupom.uso_maximo !== null ? cupom.uso_maximo : '∞' }}
                </strong>
              </div>
            </div>
          </div>

          <!-- Footer Meta -->
          <div class="flex items-center justify-between mt-5 pt-3 border-t border-border/60 min-w-0">
            <div class="flex items-start gap-1.5 text-[10px] text-text-muted min-w-0">
              <Calendar class="w-3.5 h-3.5 text-text-muted opacity-75 shrink-0 mt-0.5" />
              <div class="flex flex-col leading-tight">
                <span class="truncate">
                  Vigência Fim: <strong class="text-text-primary">{{ formatDate(cupom.data_fim) }}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Remover cupom"
              class="p-1.5 text-text-muted hover:text-danger-600 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-950/20 shrink-0 cursor-pointer"
              title="Remover cupom"
              @click.stop="deleteCupom(cupom.id, cupom.codigo)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

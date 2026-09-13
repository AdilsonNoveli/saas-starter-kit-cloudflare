<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ArrowLeft, Ticket, Percent, Settings, AlertCircle, CalendarDays } from '@lucide/vue'
import { navigateTo } from 'nuxt/app'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import DatePicker from '~/components/ui/DatePicker.vue'
import { useNotification } from '~/composables/useNotification'

definePageMeta({
  layout: 'admin',
})

const router = useRouter()
const route = useRoute()
const supabase = useSupabaseClient()
const { notify } = useNotification()

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/admin/promotions?tab=cupons')
  }
}

const isNew = computed(() => route.params.id === 'new')
const loading = ref(false)
const saving = ref(false)

const formSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50, 'Código muito longo').transform(v => v.toUpperCase().trim()),
  description: z.string().max(255).nullable(),
  discount_type: z.enum(['percentual', 'fixo']),
  amount: z.number().min(0.01, 'Valor deve ser maior que 0'),
  minimum_amount: z.number().min(0, 'Valor mínimo não pode ser negativo'),
  max_uses: z.number().min(1, 'Se informado, uso máximo deve ser ao menos 1').nullable(),
  active: z.boolean(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
})

type CupomForm = z.infer<typeof formSchema> & { id: string | null }

const form = ref<CupomForm>({
  id: null,
  code: '',
  description: '',
  discount_type: 'percentual',
  amount: 10,
  minimum_amount: 0,
  max_uses: null,
  active: true,
  start_date: null,
  end_date: null,
})

const isSemFim = ref(true)
const temLimiteUso = ref(false)

watch(isSemFim, (val) => {
  if (val) form.value.end_date = null
})

watch(temLimiteUso, (val) => {
  if (!val) form.value.max_uses = null
  else if (form.value.max_uses === null) form.value.max_uses = 100
})

const loadData = async () => {
  if (isNew.value) return

  loading.value = true
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', route.params.id as string)
    .single()

  if (error || !data) {
    notify.error('Cupom não encontrado', error?.message || '')
    await navigateTo('/admin/promotions?tab=cupom')
  } else {
    form.value = {
      id: data.id,
      code: data.code,
      description: data.description ?? '',
      discount_type: data.discount_type as 'percentual' | 'fixo',
      amount: Number(data.amount),
      minimum_amount: Number(data.minimum_amount),
      max_uses: data.max_uses,
      active: data.active,
      start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0]! : null,
      end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0]! : null,
    }
    
    isSemFim.value = !data.end_date
    temLimiteUso.value = data.max_uses !== null
  }
  loading.value = false
}

onMounted(() => loadData())

const save = async () => {
  if (!form.value.code.trim()) {
    notify.error('Validação', 'O código do cupom é obrigatório.')
    return
  }

  const parsed = formSchema.safeParse({
    ...form.value,
    code: form.value.code,
    description: form.value.description?.trim() || null,
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    notify.error('Erro de validação', first?.message ?? 'Verifique os campos do cupom.')
    return
  }

  saving.value = true
  const payload = {
    ...parsed.data,
    start_date: parsed.data.start_date ? new Date(parsed.data.start_date).toISOString() : null,
    end_date: parsed.data.end_date ? new Date(parsed.data.end_date).toISOString() : null,
  }

  let errorResult = null

  if (isNew.value) {
    // Check if code exists
    const { count } = await supabase
      .from('coupons')
      .select('id', { count: 'exact', head: true })
      .eq('code', payload.code)
      
    if (count && count > 0) {
      saving.value = false
      notify.error('Cupom duplicado', 'Já existe um cupom com este código.')
      return
    }

    const { error } = await supabase.from('coupons').insert([payload])
    errorResult = error
  } else if (form.value.id) {
    const { error } = await supabase.from('coupons').update(payload).eq('id', form.value.id)
    errorResult = error
  } else {
    saving.value = false
    notify.error('Erro ao salvar cupom', 'ID do cupom ausente.')
    return
  }

  saving.value = false

  if (errorResult) {
    notify.error('Erro ao salvar cupom', errorResult.message)
  } else {
    notify.success('Sucesso', `Cupom ${payload.code} salvo com sucesso.`)
    goBack()
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface font-sans text-text-primary">

    <!-- Header Sticky de Ações (Enterprise Grade Padrão) -->
    <header class="h-16 flex items-center justify-between px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
          title="Voltar"
          aria-label="Voltar"
          @click="goBack()"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <div class="flex items-center gap-3">
          <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
            {{ isNew ? 'Novo Cupom' : 'Editar Cupom' }}
          </h1>
          <span class="shrink-0 text-[10px] font-black px-2.5 py-1 rounded bg-brand-green/10 text-brand-green border border-brand-green/20 uppercase tracking-wider">
            Cupom de Desconto
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          @click="goBack()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          :disabled="saving"
          @click="save()"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ saving ? 'Salvando…' : 'Salvar Alterações' }}
        </button>
      </div>
    </header>

    <!-- Main Content Area: Grid 2 Colunas -->
    <main class="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 pb-32">

      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">

        <!-- COLUNA DA ESQUERDA: Identificação e Regras de Negócio (7/12) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Card 2.1: Identificação do Cupom -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Ticket class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Identificação do Cupom</h3>
            </div>

            <div class="space-y-4">
              <div>
                <label for="cupom-codigo" class="block text-xs font-semibold text-text-secondary mb-1.5">Código do Cupom *</label>
                <input
                  id="cupom-codigo"
                  v-model="form.code"
                  type="text"
                  class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors uppercase font-mono font-bold"
                  placeholder="Ex: BLACKFRIDAY20"
                  :disabled="!isNew"
                >
                <p v-if="!isNew" class="mt-1 text-[10px] text-amber-600 dark:text-amber-400">O código não pode ser alterado após a criação.</p>
              </div>

              <div>
                <label for="cupom-desc" class="block text-xs font-semibold text-text-secondary mb-1.5">Descrição (Uso Interno)</label>
                <textarea
                  id="cupom-desc"
                  v-model="form.description"
                  rows="3"
                  class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors resize-none"
                  placeholder="Descreva a finalidade ou campanha para controle interno…"
                />
              </div>
            </div>
          </div>

          <!-- Card 2.2: Regras de Desconto -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Percent class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Regras de Desconto</h3>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="cupom-tipo" class="block text-xs font-semibold text-text-secondary mb-1.5">Tipo de Desconto</label>
                  <UiSelect
                    id="cupom-tipo"
                    v-model="form.discount_type"
                    :options="[
                      { value: 'percentual', label: 'Percentual (%)' },
                      { value: 'fixo', label: 'Fixo (R$)' }
                    ]"
                  />
                </div>

                <div>
                  <label for="cupom-valor" class="block text-xs font-semibold text-text-secondary mb-1.5">Valor do Desconto *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                      {{ form.discount_type === 'percentual' ? '%' : 'R$' }}
                    </span>
                    <input
                      id="cupom-valor"
                      v-model.number="form.amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      class="w-full pl-9 pr-3 py-2 rounded-md border border-brand-green bg-surface text-sm font-bold text-brand-green focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors"
                    >
                  </div>
                </div>
              </div>

              <div>
                <label for="cupom-minimo" class="block text-xs font-semibold text-text-secondary mb-1.5">Valor Mínimo do Carrinho</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">R$</span>
                  <input
                    id="cupom-minimo"
                    v-model.number="form.minimum_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-surface text-sm font-semibold text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors"
                  >
                </div>
                <p class="mt-1 text-[10px] text-text-muted">Zero (0) significa que o cupom pode ser aplicado em qualquer valor de compra.</p>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUNA DA DIREITA: Limites, Vigência e Status Sticky (5/12) -->
        <div class="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
          
          <!-- Card 2.3: Limites & Vigência -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <CalendarDays class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Limites &amp; Vigência</h3>
            </div>

            <div class="space-y-4">
              <!-- Sem fim toggle -->
              <div class="flex items-center justify-between p-3.5 border border-border bg-surface rounded-md">
                <div>
                  <h4 class="font-bold text-text-primary text-xs leading-none">Sem data de término</h4>
                  <p class="text-[10px] text-text-muted mt-1">O cupom fica active continuamente.</p>
                </div>
                <UiToggle id="toggle-cupom-sem-fim" v-model="isSemFim" size="sm" />
              </div>

              <!-- DatePickers -->
              <div class="grid grid-cols-2 gap-3 pt-2 border-b border-border/60 pb-4">
                <div class="w-full">
                  <label class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Início</label>
                  <DatePicker v-model="form.start_date" />
                </div>
                <div class="w-full" :class="isSemFim ? 'opacity-40 pointer-events-none' : ''">
                  <label class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Término</label>
                  <DatePicker v-model="form.end_date" />
                </div>
              </div>

              <!-- Limite de Usos toggle -->
              <div class="flex items-center justify-between p-3.5 border border-border bg-surface rounded-md">
                <div>
                  <h4 class="font-bold text-text-primary text-xs leading-none">Limitar número de usos</h4>
                  <p class="text-[10px] text-text-muted mt-1">Restringir utilizações globais deste cupom.</p>
                </div>
                <UiToggle id="toggle-cupom-limite" v-model="temLimiteUso" size="sm" />
              </div>

              <!-- Input de Usos Máximos -->
              <div v-if="temLimiteUso" class="pt-2">
                <label for="cupom-uso-max" class="block text-xs font-semibold text-text-secondary mb-1.5">Máximo de Utilizações Totais</label>
                <input
                  id="cupom-uso-max"
                  v-model.number="form.max_uses"
                  type="number"
                  min="1"
                  class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm font-semibold text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                >
              </div>
            </div>
          </div>

          <!-- Card 2.4: Status do Cupom -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Settings class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Status do Cupom</h3>
            </div>

            <div class="space-y-4">
              <!-- Cupom Ativo Toggle -->
              <div class="flex items-center justify-between p-3.5 border border-border bg-surface rounded-md">
                <div>
                  <h4 class="font-bold text-text-primary text-xs leading-none">Cupom Disponível</h4>
                  <p class="text-[10px] text-text-muted mt-1">Define se o cupom pode ser aplicado.</p>
                </div>
                <UiToggle id="toggle-cupom-ativa" v-model="form.active" size="sm" />
              </div>

              <!-- Alerta reativo -->
              <div
                v-if="form.active"
                class="bg-green-50 dark:bg-green-950/10 rounded-md border border-green-200 p-3.5 flex items-center gap-2.5"
              >
                <svg class="w-4.5 h-4.5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-bold text-green-800 dark:text-green-400 text-xs">Cupom ativo e apto para uso no checkout.</span>
              </div>
              <div
                v-else
                class="bg-amber-50 dark:bg-amber-950/10 rounded-md border border-amber-200 p-3.5 flex items-start gap-2.5"
              >
                <AlertCircle class="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 class="font-bold text-amber-800 dark:text-amber-400 text-xs">Cupom Inativo</h5>
                  <p class="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">Os clientes não conseguirão validar este código no checkout.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- Footer das Ações do Formulário - Removido para o Header -->

    </main>

  </div>
</template>

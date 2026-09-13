<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, User, Clipboard, AlertTriangle, TrendingUp, Camera } from '@lucide/vue'
import { z } from 'zod'
import { navigateTo, useState } from 'nuxt/app'

import Select from '~/components/ui/Select.vue'
import DatePicker from '~/components/ui/DatePicker.vue'
import { useNotification } from '~/composables/useNotification'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const supabase = useSupabaseClient()
const { notify } = useNotification()
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')

const id = route.params.id as string
const isNew = id === 'new'

const loading = ref(!isNew)
const saving = ref(false)

const clienteSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  whatsapp_phone: z.string().min(5, 'WhatsApp obrigatório').max(50),
  birth_date: z.string().nullable().optional(),
  status: z.enum(['Novo', 'Ocasional', 'Frequente', 'VIP', 'Inativo']),
  has_pending_issues: z.boolean(),
  pending_issue_description: z.string().optional(),
  preferences: z.string().optional(),
  internal_notes: z.string().optional(),
  photo_url: z.string().optional(),
})

const form = ref({
  id: '',
  name: '',
  whatsapp_phone: '',
  birth_date: null as string | null,
  status: 'Novo',
  has_pending_issues: false,
  pending_issue_description: '',
  preferences: '',
  internal_notes: '',
  photo_url: '',
})

// Métricas read-only
const metrics = ref({
  customer_since: '',
  total_orders: 0,
  total_cancellations: 0,
  total_amount_spent: 0,
  purchase_frequency: '',
})

onMounted(async () => {
  if (!isNew) await fetchCliente()
})

async function fetchCliente(): Promise<void> {
  loading.value = true
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error || !data) {
    notify.error('Cliente não encontrado')
    await navigateTo('/admin/customers')
    return
  }
  form.value = {
    id: data.id,
    name: data.name ?? '',
    whatsapp_phone: data.whatsapp_phone ?? '',
    birth_date: data.birth_date ?? null,
    status: data.status ?? 'Novo',
    has_pending_issues: data.has_pending_issues ?? false,
    pending_issue_description: data.pending_issue_description ?? '',
    preferences: data.preferences ?? '',
    internal_notes: data.internal_notes ?? '',
    photo_url: data.photo_url ?? '',
  }
  metrics.value = {
    customer_since: data.customer_since ?? '',
    total_orders: data.total_orders ?? 0,
    total_cancellations: data.total_cancellations ?? 0,
    total_amount_spent: data.total_amount_spent ?? 0,
    purchase_frequency: data.purchase_frequency ?? 'Novo',
  }
  loading.value = false
}

async function save(): Promise<void> {
  const parsed = clienteSchema.safeParse(form.value)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    notify.error('Campos inválidos', first?.message)
    return
  }
  saving.value = true

  // photo_url nullable: string vazia → null (coluna aceita ausência de foto).
  const payload = { ...parsed.data, photo_url: parsed.data.photo_url || null }

  if (isNew) {
    const { error } = await supabase.from('customers').insert([payload])
    if (error) {
      notify.error('Erro ao criar cliente', error.message)
      saving.value = false
      return
    }
  } else {
    const { error } = await supabase.from('customers').update(payload).eq('id', form.value.id)
    if (error) {
      notify.error('Erro ao atualizar cliente', error.message)
      saving.value = false
      return
    }
  }
  saving.value = false
  notify.success('Cliente salvo')
  await navigateTo('/admin/customers')
}

const { formatCurrency } = useFormatters()
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface font-sans text-text-primary">
    
    <!-- Header Sticky de Ações (Enterprise Grade Padrão) -->
    <header class="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 -ml-2 rounded-full hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors mr-1 cursor-pointer"
          :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
          @click="navigateTo('/admin/customers')"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
          {{ isNew ? 'Novo Cliente' : 'Ficha do Cliente' }}
        </h1>
      </div>

      <!-- Ações superiores de página -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          @click="navigateTo('/admin/customers')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          :disabled="saving"
          @click="save"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ isNew ? 'Criar Cliente' : 'Salvar Cliente' }}
        </button>
      </div>
    </header>

    <!-- Main Content Area: Grid 2 Colunas -->
    <main class="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 pb-32">
      
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        
        <!-- COLUNA DA ESQUERDA: Informações e Anotações (7/12) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Card 1: Dados Pessoais -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <User class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Dados Pessoais</h3>
            </div>

            <div class="space-y-4">
              <div>
                <label for="cli-nome" class="block text-xs font-semibold text-text-secondary mb-1.5">Nome Completo *</label>
                <input
                  id="cli-nome"
                  v-model="form.name"
                  type="text"
                  class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-text-muted"
                  placeholder="Nome do cliente (ex: João da Silva)"
                >
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="cli-whatsapp" class="block text-xs font-semibold text-text-secondary mb-1.5">WhatsApp *</label>
                  <input
                    id="cli-whatsapp"
                    v-model="form.whatsapp_phone"
                    type="text"
                    class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-text-muted"
                    placeholder="Ex: 5511999999999"
                  >
                </div>
                <div>
                  <label for="cli-nasc" class="block text-xs font-semibold text-text-secondary mb-1.5">Data de Nascimento</label>
                  <DatePicker id="cli-nasc" v-model="form.birth_date" />
                </div>
              </div>

              <div class="w-full sm:w-1/2">
                <label for="cli-status" class="block text-xs font-semibold text-text-secondary mb-1.5">Classificação / Status</label>
                <Select
                  id="cli-status"
                  v-model="form.status"
                  size="sm"
                  :options="[
                    { value: 'Novo', label: 'Novo' },
                    { value: 'Ocasional', label: 'Ocasional' },
                    { value: 'Frequente', label: 'Frequente' },
                    { value: 'VIP', label: 'VIP' },
                    { value: 'Inativo', label: 'Inativo' }
                  ]"
                />
              </div>
            </div>
          </div>

          <!-- Card 2: Anotações & Preferências -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Clipboard class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Anotações e Preferências</h3>
            </div>

            <div class="space-y-4">
              <div>
                <label for="cli-prefs" class="block text-xs font-semibold text-text-secondary mb-1.5">Preferências do Cliente</label>
                <textarea
                  id="cli-prefs"
                  v-model="form.preferences"
                  rows="3"
                  class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none placeholder:text-text-muted"
                  placeholder="Ex: Não gosta de cebola, prefere entrega rápida..."
                />
              </div>
              <div>
                <label for="cli-obs" class="block text-xs font-semibold text-text-secondary mb-1.5">Observações Internas (Equipe)</label>
                <textarea
                  id="cli-obs"
                  v-model="form.internal_notes"
                  rows="3"
                  class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none placeholder:text-text-muted"
                  placeholder="Anotações internas privadas sobre o comportamento de compras..."
                />
              </div>
            </div>
          </div>

        </div>

        <!-- COLUNA DA DIREITA: Mídias e Métricas Sticky (5/12) -->
        <div class="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
          
          <!-- Card 1: Foto do Cliente (Quadrada e Enterprise-grade) -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Camera class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Foto do Cliente</h3>
            </div>

            <div class="flex justify-center py-1">
              <ImageUploader
                v-model="form.photo_url"
                bucket="produtos"
                placeholder-text="Arraste ou clique para enviar foto"
                shape="square"
                :hide-url-input="true"
              />
            </div>
          </div>

          <!-- Card 2: Sinalizações / Pendências (Movido para a Direita) -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <AlertTriangle class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Sinalizações</h3>
            </div>

            <div class="p-4 rounded-md border bg-surface transition-colors" :class="form.has_pending_issues ? 'border-danger-400/60 bg-danger-50/5' : 'border-border bg-surface'">
              <label class="flex items-start gap-3 cursor-pointer">
                <div class="mt-0.5 shrink-0">
                  <input
                    v-model="form.has_pending_issues"
                    type="checkbox"
                    class="w-4 h-4 rounded border-border accent-danger-600 focus:ring-danger-500 cursor-pointer"
                  >
                </div>
                <div class="flex-1">
                  <div class="font-bold text-text-primary text-sm leading-none">Cliente possui Pendências / Inadimplência</div>
                  <p class="text-xs text-text-secondary mt-1">Marque se o cliente tiver valores em aberto ou histórico problemático. Uma bandeira vermelha será exibida no Kanban de Pedidos.</p>
                </div>
              </label>
              
              <div v-if="form.has_pending_issues" class="mt-3 pl-7 animate-fade-in">
                <label for="cli-pendencia" class="block text-xs font-semibold text-danger-600 mb-1.5">Descrição da Pendência</label>
                <textarea
                  id="cli-pendencia"
                  v-model="form.pending_issue_description"
                  rows="2"
                  class="w-full px-3 py-2 rounded-md border border-danger-300 bg-surface text-sm text-text-primary focus:outline-none focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20 transition-all resize-none"
                  placeholder="Ex: Faltou pagar R$ 10,00 na última compra..."
                />
              </div>
            </div>
          </div>

          <!-- Card 2: Métricas (Apenas em edições) -->
          <div v-if="!isNew" class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <TrendingUp class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Engajamento & Métricas</h3>
            </div>

            <div class="space-y-4">
              <div class="bg-surface p-4 rounded-md border border-border">
                <h4 class="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Valor LTV Acumulado</h4>
                <p class="text-2xl font-bold text-primary-600 leading-none">{{ formatCurrency(metrics.total_amount_spent) }}</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-surface border border-border rounded-md">
                  <div class="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Pedidos</div>
                  <div class="text-lg font-bold text-text-primary leading-none">{{ metrics.total_orders }}</div>
                </div>
                <div class="p-3 bg-surface border border-border rounded-md">
                  <div class="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Cancelados</div>
                  <div class="text-lg font-bold text-danger-600 leading-none">{{ metrics.total_cancellations }}</div>
                </div>
              </div>

              <div class="p-3 bg-surface border border-border rounded-md flex justify-between items-center">
                <span class="text-[10px] text-text-muted font-bold uppercase tracking-wider">Frequência</span>
                <span class="text-xs font-bold text-text-primary bg-surface-raised px-2.5 py-1 rounded-full border border-border leading-none">
                  {{ metrics.purchase_frequency }}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  </div>
</template>

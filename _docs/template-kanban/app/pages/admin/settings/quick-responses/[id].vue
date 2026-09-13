<script setup lang="ts">
/**
 * @descricao: Formulário de criação/edição de uma Resposta Rápida do Agente IA.
 * @objetivo: Página única serve os dois modos (`route.params.id === 'new'`
 *   decide), mesmo padrão de `app/pages/admin/products/[id].vue` — nunca
 *   modal. Delega os campos condicionais por gatilho a
 *   `QuickResponseTriggerFields.vue` e a seleção de status a
 *   `QuickResponseStatusPicker.vue`; esta página só orquestra carregar/salvar.
 */
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft } from '@lucide/vue'
import { navigateTo, useRoute } from 'nuxt/app'
import { useNotification } from '~/composables/useNotification'
import {
  QUICK_RESPONSE_TRIGGERS,
  type AgentQuickResponse,
  type CustomerStatus,
  type QuickResponseTrigger,
} from '#shared/types/agentQuickResponse'
import type { Option as SelectOption } from '~/components/ui/Select.vue'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { notify } = useNotification()

const isNew = computed<boolean>(() => route.params.id === 'new')
const loading = ref<boolean>(!isNew.value)
const saving = ref<boolean>(false)

const TRIGGER_LABELS: Record<QuickResponseTrigger, string> = {
  greeting: 'Saudação',
  first_message: 'Primeira mensagem',
  keyword: 'Palavra-chave',
  kanban_stage: 'Etapa do Kanban',
}
const triggerOptions: SelectOption[] = QUICK_RESPONSE_TRIGGERS.map((t) => ({ value: t, label: TRIGGER_LABELS[t] }))

interface RuleForm {
  name: string
  triggerType: QuickResponseTrigger
  keywordsText: string
  kanbanStageKey: string | null
  customerStatuses: CustomerStatus[]
  replyText: string
  active: boolean
}

const form = ref<RuleForm>({
  name: '',
  triggerType: 'greeting',
  keywordsText: '',
  kanbanStageKey: null,
  customerStatuses: [],
  replyText: '',
  active: true,
})

/** Só existe em modo edição — precisamos preservar o `sortOrder` atual ao salvar. */
const existingSortOrder = ref<number | null>(null)

async function loadRule(): Promise<void> {
  loading.value = true
  try {
    const res = await $fetch<{ data: AgentQuickResponse }>(`/api/admin/quick-responses/${route.params.id}`)
    const rule = res.data
    existingSortOrder.value = rule.sortOrder
    form.value = {
      name: rule.name,
      triggerType: rule.triggerType,
      keywordsText: (rule.keywords ?? []).join(', '),
      kanbanStageKey: rule.kanbanStageKey,
      customerStatuses: [...(rule.customerStatuses ?? [])],
      replyText: rule.replyText,
      active: rule.active,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Resposta rápida não encontrada.'
    notify.error('Erro ao carregar', msg)
    await navigateTo('/admin/settings/quick-responses')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!isNew.value) void loadRule()
})

function goBack(): void {
  navigateTo('/admin/settings/quick-responses')
}

async function save(): Promise<void> {
  if (!form.value.name.trim()) {
    notify.warning('Nome obrigatório', 'Dê um nome interno para identificar a regra (o cliente nunca vê esse nome).')
    return
  }
  if (!form.value.replyText.trim()) {
    notify.warning('Resposta obrigatória', 'Escreva o texto que será enviado ao cliente.')
    return
  }
  if (form.value.triggerType === 'keyword' && !form.value.keywordsText.trim()) {
    notify.warning('Palavras-chave obrigatórias', 'Para o gatilho "Palavra-chave", informe ao menos um termo.')
    return
  }
  if (form.value.triggerType === 'kanban_stage' && !form.value.kanbanStageKey) {
    notify.warning('Etapa obrigatória', 'Para o gatilho "Etapa do Kanban", selecione a coluna.')
    return
  }

  saving.value = true
  try {
    const keywords = form.value.keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)

    const payload = {
      name: form.value.name.trim(),
      triggerType: form.value.triggerType,
      keywords,
      kanbanStageKey: form.value.triggerType === 'kanban_stage' ? form.value.kanbanStageKey : null,
      customerStatuses: form.value.customerStatuses,
      replyText: form.value.replyText.trim(),
      active: form.value.active,
    }

    if (isNew.value) {
      // `sortOrder` omitido: o server calcula o fim da lista (nextSortOrder,
      // quickResponseService.ts) — esta página não tem a lista carregada.
      await $fetch('/api/admin/quick-responses', {
        method: 'POST',
        body: payload,
      })
    } else {
      await $fetch(`/api/admin/quick-responses/${route.params.id}`, {
        method: 'PUT',
        body: payload,
      })
    }

    notify.success(isNew.value ? 'Resposta rápida criada' : 'Resposta rápida atualizada')
    await navigateTo('/admin/settings/quick-responses')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Não foi possível salvar.'
    notify.error('Erro ao salvar', msg)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center py-24">
    <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <div class="flex items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 -ml-2 rounded-full hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          @click="goBack"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <h2 class="text-lg font-bold">{{ isNew ? 'Nova Resposta Rápida' : 'Editar Resposta Rápida' }}</h2>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-text-primary bg-surface hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
          @click="goBack"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </div>

    <section class="space-y-4 border border-border rounded-lg bg-surface p-6">
      <div>
        <label for="quick-response-name" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
          Nome interno
        </label>
        <input
          id="quick-response-name"
          v-model="form.name"
          type="text"
          maxlength="120"
          class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
          placeholder="Ex.: Saudação clientes VIP"
        >
      </div>

      <div>
        <label class="block text-xs font-semibold text-text-primary mb-1.5">Gatilho</label>
        <UiSelect v-model="form.triggerType" :options="triggerOptions" />
      </div>

      <AdminQuickResponseTriggerFields
        :trigger-type="form.triggerType"
        :keywords-text="form.keywordsText"
        :kanban-stage-key="form.kanbanStageKey"
        @update:keywords-text="form.keywordsText = $event"
        @update:kanban-stage-key="form.kanbanStageKey = $event"
      />

      <AdminQuickResponseStatusPicker v-model="form.customerStatuses" />

      <UiTextarea v-model="form.replyText" label="Resposta enviada ao cliente" :rows="3" :maxlength="1000" />

      <div class="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-raised">
        <span class="text-sm font-medium text-text-primary">Regra ativa</span>
        <UiToggle v-model="form.active" size="sm" />
      </div>
    </section>
  </main>
</template>

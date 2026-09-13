<script setup lang="ts">
/**
 * @descricao: Lista de Respostas Rápidas do Agente IA — regras de resposta
 *   automática (sem chamar o modelo) configuráveis pelo lojista.
 * @objetivo: Só a lista (carregar, reordenar, ativar/desativar, excluir).
 *   Criar/editar é página própria (`[id].vue`) — nunca modal, cada arquivo
 *   uma responsabilidade. Uma linha da lista é `QuickResponseRow.vue`.
 */
import { onMounted, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { navigateTo } from 'nuxt/app'
import { useNotification } from '~/composables/useNotification'
import type { AgentQuickResponse } from '#shared/types/agentQuickResponse'

definePageMeta({ layout: 'admin' })

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()

const loading = ref(true)
const rules = ref<AgentQuickResponse[]>([])

/** `chave -> label` das colunas do Kanban, só pra exibir o nome legível nas regras `kanban_stage` (a regra guarda só a `chave`). */
const kanbanStageLabels = ref<Record<string, string>>({})

async function loadKanbanStageLabels(): Promise<void> {
  const { data } = await supabase.from('kanban_column').select('chave:key, label')
  kanbanStageLabels.value = Object.fromEntries((data ?? []).map((c) => [c.chave, c.label]))
}

async function loadRules(): Promise<void> {
  loading.value = true
  try {
    const res = await $fetch<{ data: AgentQuickResponse[] }>('/api/admin/quick-responses')
    rules.value = [...res.data]
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Não foi possível carregar as respostas rápidas.'
    notify.error('Erro ao carregar', msg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRules()
  void loadKanbanStageLabels()
})

function goToNew(): void {
  navigateTo('/admin/settings/quick-responses/new')
}

function goToEdit(rule: AgentQuickResponse): void {
  navigateTo(`/admin/settings/quick-responses/${rule.id}`)
}

async function deleteRule(rule: AgentQuickResponse): Promise<void> {
  const ok = await confirm({
    title: 'Excluir resposta rápida',
    message: `Excluir "${rule.name}"? Essa ação não pode ser desfeita.`,
    variant: 'error',
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
  })
  if (!ok) return

  try {
    await $fetch(`/api/admin/quick-responses/${rule.id}`, { method: 'DELETE' })
    rules.value = rules.value.filter((r) => r.id !== rule.id)
    notify.success('Resposta rápida excluída')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Não foi possível excluir.'
    notify.error('Erro ao excluir', msg)
  }
}

async function toggleActive(rule: AgentQuickResponse): Promise<void> {
  const nextActive = !rule.active
  const idx = rules.value.findIndex((r) => r.id === rule.id)
  if (idx === -1) return
  rules.value[idx] = { ...rule, active: nextActive }

  try {
    await $fetch(`/api/admin/quick-responses/${rule.id}`, { method: 'PUT', body: { active: nextActive } })
  } catch (err: unknown) {
    rules.value[idx] = rule
    const msg = err instanceof Error ? err.message : 'Não foi possível atualizar.'
    notify.error('Erro ao atualizar', msg)
  }
}

// ============= REORDENAÇÃO (drag & drop, mesmo padrão de useProductOptionGroups.ts) =============

const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(event: DragEvent, index: number): void {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, index: number): void {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDragLeave(_event: DragEvent, index: number): void {
  if (dragOverIndex.value === index) dragOverIndex.value = null
}

async function onDrop(event: DragEvent, targetIndex: number): Promise<void> {
  event.preventDefault()
  const fromIndex = draggedIndex.value
  draggedIndex.value = null
  dragOverIndex.value = null
  if (fromIndex === null || fromIndex === targetIndex) return

  const [item] = rules.value.splice(fromIndex, 1)
  if (!item) return
  rules.value.splice(targetIndex, 0, item)
  rules.value = rules.value.map((r, i) => ({ ...r, sortOrder: i }))

  const items = rules.value.map((r, i) => ({ id: r.id, sortOrder: i }))
  try {
    await $fetch('/api/admin/quick-responses', { method: 'PUT', body: { items } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Não foi possível salvar a nova ordem.'
    notify.error('Erro ao reordenar', msg)
    await loadRules()
  }
}

function onDragEnd(): void {
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center py-24">
    <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold mb-1">Respostas Rápidas do Agente IA</h2>
          <p class="text-sm text-text-muted">
            Regras que respondem automaticamente ao cliente sem chamar o modelo — mesma velocidade e custo zero
            do léxico de transbordo. A primeira regra ativa que combinar com a situação e o status do cliente vence.
          </p>
        </div>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 shrink-0"
          @click="goToNew"
        >
          <Plus class="w-4 h-4" />
          Nova Resposta
        </button>
      </div>

      <div v-if="rules.length === 0" class="border border-border rounded-lg bg-surface px-4 py-10 text-center">
        <p class="text-sm text-text-muted">Nenhuma resposta rápida configurada ainda.</p>
        <p class="text-xs text-text-muted mt-1">Sem regras, o agente responde saudações com a frase padrão do sistema.</p>
      </div>

      <div v-else class="border border-border rounded-lg bg-surface overflow-hidden">
        <div class="divide-y divide-border">
          <AdminQuickResponseRow
            v-for="(rule, index) in rules"
            :key="rule.id"
            :rule="rule"
            :drag-over="dragOverIndex === index"
            :kanban-stage-label="rule.kanbanStageKey ? (kanbanStageLabels[rule.kanbanStageKey] ?? null) : null"
            @edit="goToEdit(rule)"
            @delete="deleteRule(rule)"
            @toggle="toggleActive(rule)"
            @dragstart="onDragStart($event, index)"
            @dragover="onDragOver($event, index)"
            @dragleave="onDragLeave($event, index)"
            @drop="onDrop($event, index)"
            @dragend="onDragEnd"
          />
        </div>
      </div>
    </section>
  </main>
</template>

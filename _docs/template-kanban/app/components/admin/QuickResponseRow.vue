<!--
  @descricao: Uma linha da lista de Respostas Rápidas do Agente IA.
  @responsabilidade: Só exibir + emitir intenção (editar/excluir/ativar/
    arrastar) — toda a lógica de estado/persistência fica na página de lista.
-->
<script setup lang="ts">
import { GripVertical, Pencil, Trash2 } from '@lucide/vue'
import type { AgentQuickResponse, QuickResponseTrigger } from '#shared/types/agentQuickResponse'

defineProps<{
  readonly rule: AgentQuickResponse
  readonly dragOver: boolean
  /** Rótulo legível da coluna do Kanban (`kanban_coluna.label`), quando `rule.triggerType === 'kanban_stage'`. `null` = coluna excluída (regra inerte). */
  readonly kanbanStageLabel?: string | null
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  toggle: []
  dragstart: [event: DragEvent]
  dragover: [event: DragEvent]
  dragleave: [event: DragEvent]
  drop: [event: DragEvent]
  dragend: []
}>()

const TRIGGER_LABELS: Record<QuickResponseTrigger, string> = {
  greeting: 'Saudação',
  first_message: 'Primeira mensagem',
  keyword: 'Palavra-chave',
  kanban_stage: 'Etapa do Kanban',
}
</script>

<template>
  <div
    class="flex items-center gap-3 px-3 py-3 transition-colors"
    :class="[dragOver ? 'bg-brand-green/10 dark:bg-brand-green/20' : '', !rule.active ? 'opacity-60' : '']"
    draggable="true"
    @dragstart="emit('dragstart', $event)"
    @dragover="emit('dragover', $event)"
    @dragleave="emit('dragleave', $event)"
    @drop="emit('drop', $event)"
    @dragend="emit('dragend')"
  >
    <span class="cursor-grab active:cursor-grabbing text-text-muted shrink-0" title="Arraste para reordenar">
      <GripVertical class="w-4 h-4" />
    </span>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap mb-1">
        <span class="text-sm font-semibold text-text-primary truncate">{{ rule.name }}</span>
        <UiTag size="sm" variant="info">{{ TRIGGER_LABELS[rule.triggerType] }}</UiTag>
        <UiTag v-if="rule.triggerType === 'kanban_stage'" size="sm" :variant="kanbanStageLabel ? 'default' : 'warning'">
          {{ kanbanStageLabel ?? 'coluna excluída' }}
        </UiTag>
        <UiTag v-if="rule.customerStatuses && rule.customerStatuses.length > 0" size="sm">
          {{ rule.customerStatuses.join(', ') }}
        </UiTag>
        <UiTag v-else size="sm">Qualquer status</UiTag>
      </div>
      <p class="text-xs text-text-muted truncate">{{ rule.replyText }}</p>
    </div>

    <span
      class="text-[11px] text-text-muted shrink-0 hidden sm:inline"
      :title="'Disparada ' + rule.triggerCount + ' vez(es)'"
    >
      {{ rule.triggerCount }}x
    </span>

    <UiToggle :model-value="rule.active" size="sm" @update:model-value="emit('toggle')" />

    <button
      type="button"
      class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors shrink-0 cursor-pointer"
      title="Editar"
      @click="emit('edit')"
    >
      <Pencil class="w-3.5 h-3.5" />
    </button>
    <button
      type="button"
      class="p-1.5 rounded-lg text-alert hover:bg-alert/10 transition-colors shrink-0 cursor-pointer"
      title="Excluir"
      @click="emit('delete')"
    >
      <Trash2 class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

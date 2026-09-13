<!--
  @descricao: Seletor de status do cliente (checkboxes) para filtrar uma
    Resposta Rápida do Agente IA por segmento.
  @responsabilidade: Só isso — receber a lista selecionada, emitir a lista
    atualizada. Não sabe nada sobre gatilho, texto, ou o resto do formulário.
-->
<script setup lang="ts">
import { CUSTOMER_STATUS_VALUES, type CustomerStatus } from '#shared/types/agentQuickResponse'

const props = defineProps<{
  readonly modelValue: readonly CustomerStatus[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CustomerStatus[]]
}>()

function toggle(status: CustomerStatus, checked: boolean): void {
  const next = checked
    ? [...props.modelValue, status]
    : props.modelValue.filter((s) => s !== status)
  emit('update:modelValue', next)
}
</script>

<template>
  <div>
    <label class="block text-xs font-semibold text-text-primary mb-1.5">Status do cliente</label>
    <p class="text-xs text-text-muted mb-2">Deixe tudo desmarcado para disparar em qualquer status.</p>
    <div class="flex flex-wrap gap-x-4 gap-y-2">
      <UiCheckbox
        v-for="status in CUSTOMER_STATUS_VALUES"
        :key="status"
        :model-value="modelValue.includes(status)"
        :label="status"
        @update:model-value="(checked: boolean) => toggle(status, checked)"
      />
    </div>
  </div>
</template>

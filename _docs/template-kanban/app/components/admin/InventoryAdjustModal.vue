<!--
  @descricao: Modal de ajuste manual de estoque (produto ou insumo), Gestão de Estoque (migration 111).
  @objetivo: Delta assinado (positivo=entrada, negativo=saída) + motivo — mesmo
    padrão de OrderNoteModal.vue (UiModal + UiTextarea + POST + notify).
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNotification } from '~/composables/useNotification'

const props = defineProps<{
  readonly tipoEntidade: 'produto' | 'insumo'
  readonly entidadeId: string | null
  readonly entidadeNome: string
  readonly estoqueAtual: number
  readonly open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', novoEstoqueAtual: number): void
}>()

const { notify } = useNotification()

const delta = ref<number>(0)
const motivo = ref<string>('')
const saving = ref(false)
const errorMessage = ref<string | null>(null)

watch(
  () => [props.entidadeId, props.open] as const,
  ([, isOpen]) => {
    if (isOpen) {
      delta.value = 0
      motivo.value = ''
      errorMessage.value = null
    }
  },
  { immediate: true },
)

async function handleSave(): Promise<void> {
  if (!props.entidadeId) return
  if (delta.value === 0) {
    errorMessage.value = 'Informe um ajuste diferente de zero.'
    return
  }

  saving.value = true
  errorMessage.value = null
  try {
    const result = await $fetch<{ success: true, estoque_atual: number }>('/api/admin/inventory/movements', {
      method: 'POST',
      body: {
        tipo_entidade: props.tipoEntidade,
        entidade_id: props.entidadeId,
        quantidade: delta.value,
        motivo: motivo.value.trim() || null,
      },
    })
    notify.success('Estoque ajustado', `Novo saldo: ${result.estoque_atual}`)
    emit('saved', result.estoque_atual)
    emit('close')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = message ?? 'Erro ao ajustar o estoque. Tente novamente.'
  } finally {
    saving.value = false
  }
}

const handleClose = (): void => emit('close')
</script>

<template>
  <UiModal
    :open="open"
    title="Ajustar estoque"
    size="md"
    @update:open="(v) => !v && handleClose()"
  >
    <div class="space-y-3 text-sm">
      <div class="bg-surface-raised border border-border rounded-lg p-3">
        <p class="text-xs text-text-muted">Ajustando</p>
        <p class="font-semibold text-text-primary">{{ entidadeNome }}</p>
        <p class="text-xs text-text-muted mt-1">Estoque atual: <span class="font-bold text-text-primary tabular-nums">{{ estoqueAtual }}</span></p>
      </div>

      <div>
        <label for="ajuste-delta" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Ajuste (positivo = entrada, negativo = saída)
        </label>
        <input
          id="ajuste-delta"
          v-model.number="delta"
          type="number"
          step="any"
          placeholder="Ex.: 10 ou -5"
          class="block w-full h-9 px-3 border border-border rounded-md bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
        >
        <p v-if="delta !== 0" class="text-xs text-text-muted mt-1">
          Novo saldo: <span class="font-bold text-text-primary tabular-nums">{{ estoqueAtual + delta }}</span>
        </p>
      </div>

      <UiTextarea
        v-model="motivo"
        label="Motivo (opcional)"
        placeholder="Ex.: contagem física, perda, compra de insumo"
        :rows="3"
        :maxlength="500"
        no-shadow
      />

      <p v-if="errorMessage" class="text-xs text-danger-600 bg-danger-50 dark:bg-danger-950/15 border border-danger-200/50 rounded-lg px-3 py-2">
        {{ errorMessage }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          :disabled="saving"
          @click="handleClose"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </template>
  </UiModal>
</template>

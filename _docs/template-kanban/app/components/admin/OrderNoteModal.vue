<!--
  @descricao: Modal de nota do atendente por pedido (item 4b — pós-venda, migration 109).
  @objetivo: Texto livre STAFF-ONLY sobre o andamento do pedido (ex.: "atraso
    por trânsito, previsão 15h"), editável a qualquer momento pelo ícone no
    card de /admin/orders. Nunca aparece em recibo — só o agente de WhatsApp
    lê isso via getCustomerContext.ts/getOrderDetail.ts no pós-venda.
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Headset } from '@lucide/vue'

const NOTA_MAX = 2000

const props = defineProps<{
  /** Quando `null`, o modal é fechado. */
  readonly pedidoId: string | null
  readonly notaAtual: string | null
  readonly open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', nota: string | null): void
}>()

const nota = ref<string>('')
const saving = ref<boolean>(false)
const errorMessage = ref<string | null>(null)

watch(
  () => [props.pedidoId, props.open] as const,
  ([, isOpen]) => {
    if (isOpen) {
      nota.value = props.notaAtual ?? ''
      errorMessage.value = null
    }
  },
  { immediate: true },
)

async function handleSave(): Promise<void> {
  if (!props.pedidoId) return

  saving.value = true
  errorMessage.value = null
  try {
    const result = await $fetch<{ success: true, nota: string | null }>(
      `/api/admin/orders/${props.pedidoId}/nota-atendimento`,
      { method: 'PUT', body: { nota: nota.value } },
    )
    emit('saved', result.nota)
    emit('close')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = message ?? 'Erro ao salvar a nota. Tente novamente.'
  } finally {
    saving.value = false
  }
}

const handleClose = (): void => emit('close')
</script>

<template>
  <UiModal
    :open="open"
    title="Nota do atendente"
    size="md"
    @update:open="(v) => !v && handleClose()"
  >
    <div class="space-y-3 text-sm">
      <div class="flex items-start gap-2.5 bg-surface-raised border border-border rounded-lg p-3">
        <Headset class="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
        <p class="text-xs text-text-muted leading-relaxed">
          Visível só para a equipe e para o atendente de IA no pós-venda — nunca aparece no recibo do cliente.
        </p>
      </div>

      <UiTextarea
        v-model="nota"
        label="O que está acontecendo com este pedido?"
        placeholder="Ex.: atraso por trânsito, previsão de chegada às 15h"
        :rows="4"
        :maxlength="NOTA_MAX"
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

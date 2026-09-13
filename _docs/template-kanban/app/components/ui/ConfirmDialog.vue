<!--
  @descricao: Renderizador do diálogo de confirmação singleton via `useNotification`
  @objetivo: Exibir um modal crítico (yes/no) reaproveitando `<UiModal>`.
    Deve ser montado UMA ÚNICA VEZ no layout — consumido por `confirm()`.
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useNotification } from '~/composables/useNotification'

const { dialog } = useNotification()

const isOpen = computed<boolean>(() => dialog.value !== null)

const handleConfirm = (): void => {
  dialog.value?.resolve(true)
}

const handleCancel = (): void => {
  dialog.value?.resolve(false)
}
</script>

<template>
  <UiModal
    v-if="dialog"
    :open="isOpen"
    :variant="dialog.options.variant ?? 'default'"
    :title="dialog.options.title"
    :closeable="true"
    size="sm"
    @close="handleCancel"
    @confirm="handleConfirm"
    @update:open="(value: boolean) => { if (!value) handleCancel() }"
  >
    <p v-if="dialog.options.message" class="text-sm text-text-secondary">
      {{ dialog.options.message }}
    </p>

    <template #footer>
      <button
        type="button"
        class="px-4 py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-text-primary bg-surface hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
        @click="handleCancel"
      >
        {{ dialog.options.cancelText ?? 'Cancelar' }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
        :class="dialog.options.variant === 'warning' || dialog.options.variant === 'error' ? 'bg-danger-600 hover:bg-danger-700 text-white' : 'bg-brand-green hover:bg-brand-greenDark text-white'"
        @click="handleConfirm"
      >
        {{ dialog.options.confirmText ?? 'Confirmar' }}
      </button>
    </template>
  </UiModal>
</template>

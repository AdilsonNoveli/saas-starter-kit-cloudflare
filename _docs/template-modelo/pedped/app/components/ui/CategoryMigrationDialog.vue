<script setup lang="ts">
/**
 * @descricao: Modal de confirmação com seleção de categoria de migração.
 * @objetivo: Antes de deletar uma categoria com produtos vinculados, permite
 *   selecionar outra categoria para migrar esses produtos. Enterprise-grade:
 *   tipagem forte, validação completa, dark mode nativo, zero hardcoded.
 */
import { ref, computed, watch } from 'vue'
import { X } from '@lucide/vue'

export interface CategoryOption {
  readonly value: string
  readonly label: string
}

export interface MigrationDialogOptions {
  readonly title: string
  readonly categoryName: string
  readonly productCount: number
  readonly availableCategories: readonly CategoryOption[]
}

const props = defineProps<{
  isOpen: boolean
  options: MigrationDialogOptions | null
}>()

const emit = defineEmits<{
  (e: 'confirm', targetCategoryId: string): void
  (e: 'cancel'): void
}>()

const selectedCategoryId = ref<string | null>(null)

const isValid = computed<boolean>(() => selectedCategoryId.value !== null)

const handleConfirm = (): void => {
  if (!isValid.value || !selectedCategoryId.value) return
  emit('confirm', selectedCategoryId.value)
  selectedCategoryId.value = null
}

const handleCancel = (): void => {
  emit('cancel')
  selectedCategoryId.value = null
}

const selectOptions = computed(() => {
  if (!props.options) return []
  return props.options.availableCategories.map(cat => ({
    label: cat.label,
    value: cat.value,
  }))
})

// Refs para controle do dialog nativo
const dialogRef = ref<HTMLDialogElement | null>(null)

// Sincronizar estado isOpen com dialog nativo
watch(() => props.isOpen, (isOpen) => {
  if (!dialogRef.value) return
  if (isOpen) {
    dialogRef.value.showModal()
  } else {
    dialogRef.value.close()
  }
}, { immediate: true })
</script>

<template>
  <dialog
    ref="dialogRef"
    class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-0 bg-surface border border-border rounded-xl shadow-float w-full max-w-md backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    :aria-labelledby="`migration-dialog-title`"
    @cancel.prevent="handleCancel"
  >
    <div v-if="options">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2
          id="migration-dialog-title"
          class="text-lg font-bold text-text-primary"
        >
          {{ options.title }}
        </h2>
        <button
          type="button"
          class="p-1 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
          aria-label="Fechar"
          @click="handleCancel"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-5 space-y-4 pb-48">
        <div class="text-sm text-text-secondary space-y-2">
          <p>
            A categoria <strong class="text-text-primary font-semibold">"{{ options.categoryName }}"</strong> possui
            <strong class="text-text-primary font-semibold">{{ options.productCount }} produto(s)</strong> vinculado(s).
          </p>
          <p>
            Selecione uma categoria de destino para migrar esses produtos antes de excluir:
          </p>
        </div>

        <div class="space-y-2">
          <label
            for="target-category"
            class="block text-sm font-semibold text-text-primary"
          >
            Categoria de Destino *
          </label>
          <UiSelect
            id="target-category"
            v-model="selectedCategoryId"
            :options="selectOptions"
            placeholder="Selecione uma categoria..."
            aria-label="Selecione a categoria de destino"
          />
          <p class="text-xs text-text-muted">
            Os produtos serão transferidos para a categoria selecionada.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 bg-surface-raised border-t border-border">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-text-primary bg-surface hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
          @click="handleCancel"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-danger-600 hover:bg-danger-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!isValid"
          @click="handleConfirm"
        >
          Migrar e Excluir
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Upload, FileCheck, X } from '@lucide/vue'
import type { OptionGroup } from '~~/shared/types/product'

/**
 * Step de upload de arquivo (tipo `upload_arquivo`).
 * Dropzone com tokens 100% do design system do catálogo (sem tokens `alma-*`).
 * Estados: vazio, enviando (spinner), arquivo selecionado (preview + remover).
 */
interface FileValue {
  url: string
  key: string
  nomeOriginal: string
}

const props = defineProps<{
  grupo: OptionGroup
  fileValue: FileValue | undefined
  uploading: boolean
  error: string
}>()

const emit = defineEmits<{
  'file-selected': [file: File]
  'file-remove': []
}>()

const acceptedTypes = computed(
  () => props.grupo.arquivo_tipos_aceitos ?? ['application/pdf'],
)
const maxMb = computed(() => props.grupo.arquivo_tamanho_maximo_mb ?? 10)

const acceptLabel = computed(() =>
  acceptedTypes.value
    .map((t) => (t.split('/')[1] ?? t).toUpperCase())
    .join(', '),
)

function handleInput(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('file-selected', file)
}
</script>

<template>
  <div class="p-5">
    <!-- Arquivo selecionado -->
    <div
      v-if="fileValue"
      class="flex items-center justify-between gap-3 px-4 py-3.5 rounded-md border border-border bg-surface-raised"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-sm bg-brand/10 flex items-center justify-center shrink-0">
          <FileCheck class="w-5 h-5 text-brand" />
        </div>
        <span class="text-sm font-medium text-text-primary truncate">
          {{ fileValue.nomeOriginal }}
        </span>
      </div>
      <button
        type="button"
        class="p-1.5 rounded-sm text-text-muted hover:text-danger-600 hover:bg-danger-50 transition-colors shrink-0"
        :aria-label="`Remover ${fileValue.nomeOriginal}`"
        @click="emit('file-remove')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Drop zone (quando não há arquivo) -->
    <label
      v-else
      class="flex flex-col items-center justify-center gap-3 px-4 py-10 rounded-md border-2 border-dashed transition-all"
      :class="
        uploading
          ? 'border-brand/40 bg-brand/5 cursor-wait'
          : 'border-border hover:border-brand/50 hover:bg-surface-raised cursor-pointer'
      "
    >
      <!-- Ícone / spinner -->
      <div class="preserve-circle w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center">
        <span
          v-if="uploading"
          class="preserve-circle w-5 h-5 border-2 border-border border-t-brand rounded-full animate-spin"
          role="status"
          aria-label="Enviando arquivo"
        />
        <Upload v-else class="w-5 h-5 text-text-muted" />
      </div>

      <div class="text-center">
        <p class="text-sm font-semibold text-text-primary">
          {{ uploading ? 'Enviando arquivo…' : 'Toque para selecionar' }}
        </p>
        <p class="text-xs text-text-muted mt-1">
          {{ acceptLabel }} · máx. {{ maxMb }} MB
        </p>
      </div>

      <input
        type="file"
        class="sr-only"
        :accept="acceptedTypes.join(',')"
        :disabled="uploading"
        @change="handleInput"
      >
    </label>

    <!-- Erro de upload -->
    <p v-if="error" class="mt-2 text-xs text-danger-600 font-medium" role="alert">
      {{ error }}
    </p>
  </div>
</template>

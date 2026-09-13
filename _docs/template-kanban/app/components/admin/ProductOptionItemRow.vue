<!--
  @descricao: Linha de item dentro de um grupo de opções (ex: "Grande", "Coca-Cola").
  @objetivo: Foto, nome, acréscimo de preço e toggles Padrão/Ativo — extraído
    de `[id].vue`. Cada linha gerencia seu PRÓPRIO upload de foto
    (`useImageUpload` local) em vez do rastreamento global por índice
    (gi, ii) que o arquivo original usava — simplificação: não há mais
    necessidade de comparar "qual item está em upload/drag-over agora".
-->

<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, Trash2, X } from '@lucide/vue'
import { useImageUpload } from '~/composables/useImageUpload'
import type { ItemForm } from '~/composables/useProductOptionGroups'

defineProps<{
  idPrefix: string
}>()

const emit = defineEmits<{
  remove: []
}>()

const item = defineModel<ItemForm>('item', { required: true })

const { uploading, uploadImage } = useImageUpload()
const fileInput = ref<HTMLInputElement | null>(null)
const isDraggingOver = ref(false)

function triggerUpload(): void {
  fileInput.value?.click()
}

async function onFileSelected(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const url = await uploadImage(file, 'produtos')
    if (url) item.value.foto_url = url
  }
  if (fileInput.value) fileInput.value.value = ''
}

async function onFileDropped(event: DragEvent): Promise<void> {
  isDraggingOver.value = false
  if (uploading.value) return
  const files = event.dataTransfer?.files
  if (!files) return
  const file = Array.from(files).find((f) => f.type.startsWith('image/'))
  if (file) {
    const url = await uploadImage(file, 'produtos')
    if (url) item.value.foto_url = url
  }
}

function removePhoto(): void {
  item.value.foto_url = null
}
</script>

<template>
  <div class="rounded-xl border border-border bg-surface hover:border-border-strong p-3.5 space-y-3 transition-all">
    <!-- Linha 1: Foto da Opção, Nome do Item e Lixeira -->
    <div class="flex items-center gap-2.5">
      <!-- Foto da Opção (H-9 W-9) -->
      <div
        class="relative w-9 h-9 rounded-lg border border-border bg-surface-raised flex items-center justify-center shrink-0 overflow-hidden group/thumb transition-all duration-200"
        :class="isDraggingOver ? 'border-primary-500 ring-2 ring-primary-500/20 scale-105' : 'border-border'"
        @dragover.prevent="isDraggingOver = true"
        @dragleave.prevent="isDraggingOver = false"
        @drop.prevent="onFileDropped"
      >
        <!-- Se já tem foto -->
        <template v-if="item.foto_url">
          <NuxtImg :src="item.foto_url" class="w-full h-full object-cover" />
          <button
            type="button"
            class="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"
            title="Remover foto"
            @click="removePhoto"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </template>
        <!-- Se não tem foto -->
        <button
          v-else
          type="button"
          class="w-full h-full flex items-center justify-center text-text-muted hover:text-primary-600 transition-colors cursor-pointer"
          title="Adicionar foto"
          :disabled="uploading"
          @click="triggerUpload"
        >
          <span v-if="uploading" class="w-4 h-4 border-2 border-border border-t-primary-500 rounded-full animate-spin" />
          <ImagePlus v-else class="w-4 h-4" />
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileSelected"
        >
      </div>

      <!-- Nome do Item (H-9) -->
      <input
        :id="`item-nome-${idPrefix}`"
        v-model="item.nome"
        type="text"
        class="flex-1 min-w-0 h-9 px-3.5 rounded-lg border border-border bg-surface-raised/30 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        placeholder="Nome do item (ex: Vermelho, Grande, Coca-Cola)"
        :aria-label="`Nome do item ${idPrefix}`"
      >

      <!-- Botão Remover Item (H-9 W-9) -->
      <button
        type="button"
        class="h-9 w-9 bg-surface-raised hover:bg-danger-50 dark:hover:bg-danger-950/40 border border-border hover:border-danger-400 text-text-muted hover:text-danger-600 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        title="Remover item"
        @click="emit('remove')"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <!-- Linha 2: Delta Preço (+ R$), Toggle Padrão e Toggle Ativo -->
    <div class="flex flex-wrap items-center gap-4 pt-0.5 pl-0 sm:pl-[2.875rem]">
      <!-- Delta Preço (+ R$) -->
      <div class="h-9 rounded-lg border border-border bg-surface-raised flex items-center overflow-hidden shrink-0">
        <span class="h-full px-2.5 bg-surface border-r border-border text-xs text-text-muted font-medium flex items-center select-none">+ R$</span>
        <input
          :id="`item-delta-${idPrefix}`"
          v-model.number="item.preco_delta"
          type="number"
          step="0.01"
          min="0"
          class="h-full w-24 px-2 text-xs text-right font-bold text-text-primary bg-transparent focus:outline-none"
          placeholder="0,00"
          :aria-label="`Acréscimo de preço do item ${idPrefix}`"
        >
      </div>

      <!-- Toggles Padrão e Ativo sem bordas quadradas -->
      <div class="flex items-center gap-4 shrink-0">
        <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary hover:text-text-primary select-none" aria-label="Selecionado por padrão">
          <UiToggle v-model="item.selecionado_padrao" size="sm" />
          <span>Padrão</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary hover:text-text-primary select-none" aria-label="Item ativo">
          <UiToggle v-model="item.ativo" size="sm" />
          <span>Ativo</span>
        </label>
      </div>
    </div>
  </div>
</template>

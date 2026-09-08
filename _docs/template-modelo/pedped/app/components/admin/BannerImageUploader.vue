<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, Trash2 } from '@lucide/vue'
import { useImageUpload } from '~/composables/useImageUpload'

const props = defineProps<{
  modelValue: string | null | undefined
  bucket?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const { uploading, error, uploadImage } = useImageUpload()
const isDragging = ref<boolean>(false)

function triggerUpload(): void {
  if (!uploading.value) fileInput.value?.click()
}

async function handleFileSelected(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    const url = await uploadImage(file, props.bucket)
    if (url) emit('update:modelValue', url)
  }
  if (fileInput.value) fileInput.value.value = ''
}

async function handleDrop(event: DragEvent): Promise<void> {
  isDragging.value = false
  if (uploading.value) return

  const files = event.dataTransfer?.files
  if (!files) return

  const file = Array.from(files).find((f) => f.type.startsWith('image/'))
  if (file) {
    const url = await uploadImage(file, props.bucket)
    if (url) emit('update:modelValue', url)
  }
}

function clearImage(e?: MouseEvent): void {
  if (e) e.stopPropagation()
  emit('update:modelValue', null)
}
</script>

<template>
  <div
    class="flex flex-col gap-2 w-full transition-all duration-200"
    :class="isDragging ? 'opacity-90 scale-[1.01]' : ''"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelected"
    >

    <!-- Área de preview do Banner — 16/7 mobile, 1600/360 desktop -->
    <div
      class="relative w-full overflow-hidden rounded-xl border-2 border-dashed bg-surface-raised group transition-all duration-200 aspect-[16/7] md:aspect-[1600/360]"
      :class="[
        uploading ? 'cursor-wait opacity-70 border-border' : 'cursor-pointer hover:border-brand-green/60 hover:bg-surface-raised/80',
        isDragging ? 'border-brand-green bg-brand-green/5 ring-4 ring-brand-green/15' : 'border-border',
      ]"
      @click="triggerUpload"
    >
      <!-- Overlay de carregamento -->
      <div
        v-if="uploading"
        class="absolute inset-0 bg-surface/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10"
      >
        <span class="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin" />
        <span class="text-xs font-bold text-text-primary">Enviando imagem…</span>
      </div>

      <!-- Imagem carregada (Preview) com Ações Flutuantes no Hover -->
      <template v-else-if="modelValue">
        <NuxtImg
          :src="modelValue"
          alt="Preview do banner promocional"
          class="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />

        <div
          class="absolute inset-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <button
            type="button"
            class="px-3.5 py-2 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer shadow-md"
            title="Trocar imagem do banner"
            @click.stop="triggerUpload"
          >
            <ImagePlus class="w-4 h-4" />
            Trocar Banner
          </button>

          <button
            type="button"
            class="px-3.5 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-all cursor-pointer shadow-md"
            title="Remover imagem do banner"
            @click.stop="clearImage"
          >
            <Trash2 class="w-4 h-4" />
            Remover
          </button>
        </div>
      </template>

      <!-- Estado Vazio (Dropzone) -->
      <div
        v-else
        class="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center text-text-muted"
      >
        <div class="w-12 h-12 rounded-full bg-surface border border-border/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:border-brand-green/30 transition-all duration-300">
          <ImagePlus class="w-6 h-6 transition-colors" :class="isDragging ? 'text-brand-green scale-110' : 'group-hover:text-brand-green'" />
        </div>
        <div>
          <p class="text-sm font-bold transition-colors" :class="isDragging ? 'text-brand-green' : 'text-text-primary group-hover:text-brand-green'">
            {{ isDragging ? 'Solte a imagem aqui' : 'Clique ou arraste a imagem do banner' }}
          </p>
          <p class="text-xs text-text-muted mt-0.5 font-normal">
            Recomendado: 1600 × 360 px · PNG, JPG ou WebP (máx. 5MB)
          </p>
        </div>
      </div>
    </div>

    <!-- Linha de Dica ou Erro -->
    <div class="flex items-center justify-between text-[11px] text-text-muted px-0.5">
      <p v-if="error" class="font-medium text-danger-500">{{ error }}</p>
      <p v-else class="text-text-muted">Proporção panorâmica (4.4:1) · Exibição de alta resolução em todos os dispositivos</p>

      <button
        v-if="modelValue && !uploading"
        type="button"
        class="flex items-center gap-1 font-semibold text-text-muted hover:text-danger-600 transition-colors ml-4 shrink-0 cursor-pointer"
        @click="clearImage"
      >
        <Trash2 class="w-3 h-3" />
        Remover foto
      </button>
    </div>
  </div>
</template>

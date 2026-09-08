<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus } from '@lucide/vue'
import { useImageUpload } from '~/composables/useImageUpload'

const props = defineProps<{
  modelValue: string | null | undefined
  bucket?: string
  placeholderText?: string
  shape?: 'square' | 'circle'
  customClass?: string
  hideUrlInput?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const { uploading, error, uploadImage } = useImageUpload()
const isDragging = ref<boolean>(false)

function triggerUpload() {
  if (!uploading.value) {
    fileInput.value?.click()
  }
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const url = await uploadImage(file, props.bucket)
    if (url) emit('update:modelValue', url)
  }
  if (fileInput.value) fileInput.value.value = ''
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (uploading.value) return
  
  const files = event.dataTransfer?.files
  if (!files) return
  
  const file = Array.from(files).find(f => f.type.startsWith('image/'))
  if (file) {
    const url = await uploadImage(file, props.bucket)
    if (url) emit('update:modelValue', url)
  }
}
</script>

<template>
  <div
    class="flex flex-col gap-3 w-full transition-all duration-200"
    :class="isDragging ? 'opacity-90 scale-[1.01]' : ''"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <!-- Input invisível de arquivo -->
    <input 
      ref="fileInput" 
      type="file" 
      accept="image/*" 
      class="hidden" 
      @change="handleFileSelected"
    >
    
    <!-- Botão de Upload Visual -->
    <div
      class="w-full bg-surface-raised border-2 border-dashed flex items-center justify-center overflow-hidden relative group transition-colors"
      :class="[
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',
        !customClass && 'aspect-square',
        uploading ? 'cursor-wait opacity-70 border-border' : 'cursor-pointer hover:border-primary-400',
        isDragging ? 'border-primary-500 bg-primary-500/5 ring-4 ring-primary-500/10' : 'border-border',
        customClass || ''
      ]"
      @click="triggerUpload"
    >
      <!-- Estado: Uploading -->
      <div v-if="uploading" class="absolute inset-0 bg-surface/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
        <span class="w-7 h-7 border-2 border-border border-t-primary-500 rounded-full animate-spin" />
        <span class="text-xs font-bold text-text-primary">Enviando…</span>
      </div>

      <!-- Imagem carregada (hover: trocar) -->
      <template v-else-if="modelValue">
        <NuxtImg :src="modelValue" alt="Pré-visualização" loading="lazy" class="w-full h-full" :class="shape === 'circle' ? 'object-cover' : 'object-contain'" />
        <div class="absolute inset-0 flex items-center justify-center gap-1 bg-black/45 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
          <ImagePlus class="w-4 h-4" /> Trocar
        </div>
      </template>

      <!-- Vazio -->
      <div v-else class="flex flex-col items-center justify-center gap-1.5 px-3 py-2 text-text-muted">
        <ImagePlus class="w-6 h-6 group-hover:text-primary-500 transition-colors" />
        <span class="text-[11px] font-medium text-center leading-tight">{{ placeholderText || 'Adicionar' }}</span>
      </div>
    </div>

    <p v-if="error" class="text-xs font-medium text-danger-500 text-center">{{ error }}</p>

    <!-- Input URL Opcional -->
    <input
      v-if="!hideUrlInput"
      :value="modelValue"
      type="text"
      class="w-full text-sm px-3 py-2 rounded-md border border-border outline-none bg-surface text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-text-muted"
      placeholder="Ou cole a URL…"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>

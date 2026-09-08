<script setup lang="ts">
/**
 * @descricao: Editor de galeria de imagens do produto (até `max` fotos).
 * @objetivo: Gerencia um array ordenado de URLs (a primeira é a CAPA). Faz upload
 *   via `useImageUpload` (mesmo endpoint S3 do ImageUploader — DRY), permite
 *   remover e definir qualquer foto como capa. O split capa/extras é feito pelo
 *   consumidor no momento de salvar (foto_url = [0], imagens = resto).
 */
import { computed, ref } from 'vue'
import { ImagePlus, Star, X } from '@lucide/vue'
import { MAX_PRODUCT_IMAGES } from '~~/shared/types/product'
import { useImageUpload } from '~/composables/useImageUpload'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    max?: number
    bucket?: string
  }>(),
  {
    max: MAX_PRODUCT_IMAGES,
    bucket: 'produtos',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const { uploading, error, uploadImage } = useImageUpload()

const canAddMore = computed<boolean>(() => props.modelValue.length < props.max)
const isDragging = ref<boolean>(false)

function triggerUpload(): void {
  if (!uploading.value && canAddMore.value) fileInput.value?.click()
}

async function handleFileSelected(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && canAddMore.value) {
    const url = await uploadImage(file, props.bucket)
    if (url) emit('update:modelValue', [...props.modelValue, url])
  }
  if (fileInput.value) fileInput.value.value = ''
}

async function handleDrop(event: DragEvent): Promise<void> {
  isDragging.value = false
  if (uploading.value || !canAddMore.value) return
  
  const files = event.dataTransfer?.files
  if (!files) return
  
  const file = Array.from(files).find(f => f.type.startsWith('image/'))
  if (file) {
    const url = await uploadImage(file, props.bucket)
    if (url) emit('update:modelValue', [...props.modelValue, url])
  }
}

function removeAt(index: number): void {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

/** Move a imagem para a primeira posição (capa). */
function setCover(index: number): void {
  if (index === 0) return
  const next = [...props.modelValue]
  const [picked] = next.splice(index, 1)
  next.unshift(picked!)
  emit('update:modelValue', next)
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
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelected">

    <!-- Estado vazio: dropzone grande e prominente -->
    <button
      v-if="modelValue.length === 0"
      type="button"
      class="w-full aspect-4/3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-text-muted transition-all duration-200"
      :class="[
        uploading ? 'cursor-wait opacity-70 border-border' : 'hover:bg-surface-raised hover:border-primary-400 cursor-pointer',
        isDragging ? 'border-primary-500 bg-primary-500/5 ring-4 ring-primary-500/10' : 'border-border'
      ]"
      :disabled="uploading"
      @click="triggerUpload"
    >
      <span v-if="uploading" class="w-8 h-8 border-2 border-border border-t-primary-500 rounded-full animate-spin" />
      <template v-else>
        <ImagePlus class="w-9 h-9 transition-transform" :class="isDragging ? 'scale-110 text-primary-500' : ''" />
        <span class="text-sm font-semibold" :class="isDragging ? 'text-primary-600' : 'text-text-primary'">
          {{ isDragging ? 'Solte a foto aqui' : 'Adicionar fotos ou arrastar aqui' }}
        </span>
      </template>
    </button>

    <!-- Com imagens: grade de miniaturas -->
    <div v-else class="grid grid-cols-3 gap-2">
      <!-- Imagens existentes -->
      <div
        v-for="(url, index) in modelValue"
        :key="url"
        class="relative aspect-square rounded-lg overflow-hidden border group"
        :class="index === 0 ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-border'"
      >
        <NuxtImg :src="url" alt="Imagem do produto" loading="lazy" class="w-full h-full object-cover" />

        <!-- Badge da capa -->
        <span
          v-if="index === 0"
          class="absolute top-1 left-1 bg-primary-600 text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm leading-none"
        >
          Capa
        </span>

        <!-- Ações (aparecem no hover) -->
        <div
          class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        >
          <button
            v-if="index !== 0"
            type="button"
            class="p-1 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Definir como capa"
            aria-label="Definir como capa"
            @click="setCover(index)"
          >
            <Star class="w-3.5 h-3.5" />
          </button>
          <span v-else />

          <button
            type="button"
            class="p-1 rounded bg-black/50 text-white hover:bg-danger-600 transition-colors ml-auto"
            title="Remover imagem"
            aria-label="Remover imagem"
            @click="removeAt(index)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <button
        v-if="canAddMore"
        type="button"
        class="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-text-muted transition-all duration-200"
        :class="[
          uploading ? 'cursor-wait opacity-70 border-border' : 'hover:bg-surface-raised hover:border-primary-400 cursor-pointer',
          isDragging ? 'border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/10' : 'border-border'
        ]"
        :disabled="uploading"
        @click="triggerUpload"
      >
        <span v-if="uploading" class="w-5 h-5 border-2 border-border border-t-primary-500 rounded-full animate-spin" />
        <template v-else>
          <ImagePlus class="w-6 h-6" :class="isDragging ? 'text-primary-500 scale-105' : ''" />
          <span class="text-[10px] font-medium" :class="isDragging ? 'text-primary-600' : 'text-text-primary'">Adicionar</span>
        </template>
      </button>
    </div>

    <p class="text-[11px] text-text-muted">
      {{ modelValue.length }}/{{ max }} fotos · a primeira é a capa
    </p>
    <p v-if="error" class="text-xs font-medium text-danger-500">{{ error }}</p>
  </div>
</template>

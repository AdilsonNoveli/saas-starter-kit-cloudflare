<!--
  @descricao: Componente Dropzone reutilizável para upload de arquivos
  @objetivo: Área de drag-and-drop com validação e feedback visual
  @props: accept (string[]), maxSize (number), multiple (boolean)
-->

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  accept?: string[]
  maxSize?: number // em MB
  multiple?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: () => ['application/pdf', 'image/dwg', 'application/step'],
  maxSize: 50,
  multiple: false,
  disabled: false
})

const emit = defineEmits<{
  upload: [files: File[]]
  error: [message: string]
}>()

const isHovered = ref(false)
const isDragging = ref(false)

const acceptedFormats = computed(() => {
  return props.accept.map(type => {
    const parts = type.split('/')
    const ext = parts[1] || 'FILE'
    return ext.toUpperCase()
  }).join(', ')
})

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  
  if (props.disabled) return
  
  const files = Array.from(e.dataTransfer?.files || [])
  validateAndEmit(files)
}

const handleFileInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  validateAndEmit(files)
}

const validateAndEmit = (files: File[]) => {
  if (files.length === 0) return
  
  // Validar tamanho
  const oversizedFiles = files.filter(f => f.size > props.maxSize * 1024 * 1024)
  if (oversizedFiles.length > 0) {
    emit('error', `Arquivo(s) excedem o tamanho máximo de ${props.maxSize}MB`)
    return
  }
  
  // Validar tipo
  const invalidFiles = files.filter(f => !props.accept.includes(f.type))
  if (invalidFiles.length > 0) {
    emit('error', `Formato(s) não suportado(s). Aceitos: ${acceptedFormats.value}`)
    return
  }
  
  emit('upload', files)
}
</script>

<template>
  <div
    class="dropzone p-5 text-center cursor-crosshair relative"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="scan-line"/>
    <div class="relative z-10 space-y-2">
      <svg class="w-10 h-10 mx-auto text-alma-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
      </svg>
      <p class="text-xs text-alma-muted font-mono">
        Arraste arquivos ou clique
      </p>
      <p class="text-[10px] text-alma-muted/50 font-mono">
        Máx. {{ maxSize }}MB
      </p>
    </div>
    
    <!-- Hidden File Input -->
    <input
      type="file"
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      :accept="accept.join(',')"
      :multiple="multiple"
      :disabled="disabled"
      @change="handleFileInput"
    >
  </div>
</template>

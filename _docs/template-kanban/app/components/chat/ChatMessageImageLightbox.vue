<!--
  @descricao: Lightbox / Visualizador modal para imagens de mensagens (armazenadas no S3).
  @responsabilidade: Exibição em alta resolução, fechamento por ESC e botão de fechar.
-->

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { X, ExternalLink } from '@lucide/vue'

const props = defineProps<{
  readonly isOpen: boolean
  readonly imageUrl: string | null
  readonly imageName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen && imageUrl"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        @click.self="emit('close')"
      >
        <!-- Barra de ferramentas superior -->
        <div class="absolute top-4 right-4 flex items-center gap-2 z-10">
          <a
            :href="imageUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-lg"
            title="Abrir imagem original"
          >
            <ExternalLink class="w-5 h-5" />
          </a>

          <button
            type="button"
            class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
            title="Fechar visualização"
            @click="emit('close')"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Imagem Ampliada -->
        <div class="max-w-4xl max-h-[85vh] flex items-center justify-center select-none">
          <img
            :src="imageUrl"
            :alt="imageName || 'Imagem anexada'"
            class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          >
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

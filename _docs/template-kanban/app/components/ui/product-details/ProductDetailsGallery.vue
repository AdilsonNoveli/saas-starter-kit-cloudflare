<script setup lang="ts">
import { ref, computed } from 'vue'
import { X } from '@lucide/vue'

/**
 * Foto principal com swipe + botão fechar + badge indisponível + dots +
 * miniaturas. Extraído de `ProductDetailsModal.vue` (god component).
 */
const props = withDefaults(defineProps<{
  gallery: readonly string[]
  productName: string
  disponivel: boolean
  /** Índice inicial da galeria — ex.: veio de uma miniatura específica tocada fora deste componente (chat). */
  initialIndex?: number
}>(), {
  initialIndex: 0,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const activeImageIndex = ref<number>(
  props.initialIndex >= 0 && props.initialIndex < props.gallery.length ? props.initialIndex : 0,
)
const galleryHasMultiple = computed<boolean>(() => props.gallery.length > 1)
const activeImageSrc = computed<string | null>(() => props.gallery[activeImageIndex.value] ?? null)

// Controle de touch/swipe para galeria no mobile
const touchStartX = ref<number>(0)
const touchEndX = ref<number>(0)

function handleTouchStart(e: TouchEvent): void {
  touchStartX.value = e.changedTouches[0]?.clientX ?? 0
}

function handleTouchEnd(e: TouchEvent): void {
  touchEndX.value = e.changedTouches[0]?.clientX ?? 0
  handleSwipe()
}

function handleSwipe(): void {
  if (!galleryHasMultiple.value) return
  const diffX = touchEndX.value - touchStartX.value
  if (Math.abs(diffX) > 50) {
    if (diffX > 0) {
      if (activeImageIndex.value > 0) {
        activeImageIndex.value--
      } else {
        activeImageIndex.value = props.gallery.length - 1
      }
    } else {
      if (activeImageIndex.value < props.gallery.length - 1) {
        activeImageIndex.value++
      } else {
        activeImageIndex.value = 0
      }
    }
  }
}
</script>

<template>
  <!-- Foto (galeria) -->
  <div
    class="relative w-full aspect-4/3 sm:aspect-video max-h-[25vh] sm:max-h-[30vh] bg-surface-raised flex items-center justify-center shrink-0 overflow-hidden select-none touch-pan-y"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <NuxtImg
      v-if="activeImageSrc"
      :src="activeImageSrc"
      :alt="productName"
      class="w-full h-full object-cover pointer-events-none"
      loading="eager"
    />
    <div v-else class="w-full h-full flex items-center justify-center bg-surface-raised">
      <span class="text-text-muted opacity-20 text-6xl font-black select-none">?</span>
    </div>

    <!-- Fechar sobreposto -->
    <button
      class="modal-close-btn preserve-circle absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
      @click="emit('close')"
    >
      <X class="w-4 h-4" stroke-width="2.5" />
    </button>

    <!-- Badge indisponível -->
    <span
      v-if="!disponivel"
      class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-sm leading-none z-10"
    >
      Indisponível
    </span>

    <!-- Indicador de paginação overlay (dots) -->
    <div v-if="galleryHasMultiple" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2.5 py-1 rounded-full shrink-0 z-10">
      <span
        v-for="(_, i) in gallery"
        :key="i"
        class="pagination-dot preserve-circle w-1.5 h-1.5 rounded-full transition-all"
        :class="i === activeImageIndex ? 'bg-white scale-125' : 'bg-white/50'"
      />
    </div>
  </div>

  <!-- Miniaturas da galeria -->
  <div
    v-if="galleryHasMultiple"
    class="flex gap-2 px-5 pt-3 overflow-x-auto shrink-0"
  >
    <button
      v-for="(img, i) in gallery"
      :key="img"
      type="button"
      class="w-14 h-14 rounded-md overflow-hidden border shrink-0 transition-all"
      :class="i === activeImageIndex ? 'border-brand ring-1 ring-brand/40' : 'border-border opacity-70 hover:opacity-100'"
      :aria-label="`Ver imagem ${i + 1} de ${gallery.length}`"
      @click="activeImageIndex = i"
    >
      <NuxtImg :src="img" :alt="`${productName} — imagem ${i + 1}`" loading="lazy" class="w-full h-full object-cover" />
    </button>
  </div>
</template>

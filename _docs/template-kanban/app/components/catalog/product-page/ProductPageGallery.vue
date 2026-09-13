<script setup lang="ts">
/**
 * @descricao: Galeria multimídia da página dedicada do produto.
 * @objetivo: Exibe lista de miniaturas verticais no desktop (com scroll suave),
 *   imagem principal em alta definição e lightbox modal de zoom com navegação
 *   por teclado e gestos.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CameraOff, ZoomIn, ChevronLeft, ChevronRight, X } from '@lucide/vue'

const props = defineProps<{
  gallery: string[]
  productName: string
  discountPercent?: number | null
  isPreorder?: boolean
  available?: boolean
}>()

const activeIndex = ref<number>(0)
const isZoomOpen = ref<boolean>(false)

const currentImage = computed<string | null>(() => {
  if (props.gallery.length === 0) return null
  return props.gallery[activeIndex.value] ?? props.gallery[0] ?? null
})

const hasMultipleImages = computed<boolean>(() => props.gallery.length > 1)

function selectImage(index: number) {
  if (index >= 0 && index < props.gallery.length) {
    activeIndex.value = index
  }
}

function nextImage() {
  if (props.gallery.length <= 1) return
  activeIndex.value = (activeIndex.value + 1) % props.gallery.length
}

function prevImage() {
  if (props.gallery.length <= 1) return
  activeIndex.value = (activeIndex.value - 1 + props.gallery.length) % props.gallery.length
}

function openZoom() {
  if (currentImage.value) {
    isZoomOpen.value = true
  }
}

function closeZoom() {
  isZoomOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (!isZoomOpen.value) return
  if (e.key === 'Escape') closeZoom()
  if (e.key === 'ArrowRight') nextImage()
  if (e.key === 'ArrowLeft') prevImage()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <div class="flex flex-col-reverse md:flex-row gap-3 lg:gap-4 w-full">
    <!-- Miniaturas (Desktop: coluna vertical à esquerda; Mobile: faixa horizontal) -->
    <div
      v-if="hasMultipleImages"
      class="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0 md:w-20 lg:w-24 max-h-[560px] py-1"
    >
      <button
        v-for="(img, idx) in gallery"
        :key="img"
        type="button"
        class="relative aspect-square w-16 md:w-full rounded-md overflow-hidden border-2 transition-all cursor-pointer bg-surface-raised shrink-0 focus:outline-none"
        :class="activeIndex === idx ? 'border-brand ring-2 ring-brand/20 opacity-100 scale-100' : 'border-border opacity-70 hover:opacity-100 hover:border-text-muted'"
        :aria-label="`Ver imagem ${idx + 1} de ${gallery.length}`"
        @click="selectImage(idx)"
        @mouseenter="selectImage(idx)"
      >
        <NuxtImg
          :src="img"
          :alt="`${productName} - Miniatura ${idx + 1}`"
          loading="lazy"
          sizes="96px"
          class="w-full h-full object-cover"
        />
      </button>
    </div>

    <!-- Imagem Principal -->
    <div class="relative flex-1 aspect-4/5 sm:aspect-square md:aspect-4/5 rounded-lg bg-surface-raised border border-border overflow-hidden flex items-center justify-center group">
      <!-- Badges Superiores -->
      <div class="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <span
          v-if="discountPercent && discountPercent > 0"
          class="bg-warning-500 text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm backdrop-blur-xs"
        >
          -{{ discountPercent }}% OFF
        </span>
        <span
          v-if="isPreorder"
          class="bg-brand text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm"
        >
          Encomenda
        </span>
        <span
          v-if="available === false"
          class="bg-danger-600 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm"
        >
          Indisponível
        </span>
      </div>

      <!-- Botão de Zoom / Lightbox -->
      <button
        v-if="currentImage"
        type="button"
        class="absolute top-3 right-3 z-10 p-2.5 rounded-md bg-surface/90 hover:bg-surface text-text-primary border border-border/60 transition-all active:scale-95 focus:outline-none cursor-pointer group-hover:scale-105"
        title="Ampliar imagem"
        aria-label="Ampliar imagem do produto"
        @click="openZoom"
      >
        <ZoomIn class="w-4.5 h-4.5" />
      </button>

      <!-- Imagem com NuxtImg ou Fallback -->
      <NuxtImg
        v-if="currentImage"
        :src="currentImage"
        :alt="productName"
        loading="eager"
        fetchpriority="high"
        sizes="100vw sm:50vw lg:600px"
        class="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 md:group-hover:scale-103"
        @click="openZoom"
      />

      <div v-else class="flex flex-col items-center justify-center p-8 text-text-muted">
        <CameraOff class="w-16 h-16 stroke-1 mb-2" />
        <span class="text-xs uppercase font-semibold">Sem foto cadastrada</span>
      </div>

      <!-- Setas de Navegação Sobrepostas (Mobile/Touch) -->
      <template v-if="hasMultipleImages">
        <button
          type="button"
          class="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/90 text-text-primary border border-border md:hidden transition-transform active:scale-90"
          aria-label="Imagem anterior"
          @click.stop="prevImage"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/90 text-text-primary border border-border md:hidden transition-transform active:scale-90"
          aria-label="Próxima imagem"
          @click.stop="nextImage"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </template>

      <!-- Indicador de Paginação por Pontos (Mobile) -->
      <div
        v-if="hasMultipleImages"
        class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full md:hidden z-10"
      >
        <span
          v-for="(_, i) in gallery"
          :key="i"
          class="w-2 h-2 rounded-full transition-all"
          :class="i === activeIndex ? 'bg-white scale-125' : 'bg-white/40'"
        />
      </div>
    </div>

    <!-- Lightbox Zoom Modal Fullscreen -->
    <ClientOnly>
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isZoomOpen && currentImage"
            class="fixed inset-0 z-100 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Visualizador de imagem ampliada"
            @click.self="closeZoom"
          >
            <!-- Botão Fechar -->
            <button
              type="button"
              class="absolute top-4 right-4 z-110 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none cursor-pointer"
              aria-label="Fechar ampliação"
              @click="closeZoom"
            >
              <X class="w-6 h-6" />
            </button>

            <!-- Imagem Ampliada -->
            <div class="relative max-w-5xl max-h-[85vh] flex items-center justify-center">
              <img
                :src="currentImage"
                :alt="productName"
                class="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
              >
            </div>

            <!-- Setas no Lightbox -->
            <template v-if="hasMultipleImages">
              <button
                type="button"
                class="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer focus:outline-none active:scale-90"
                aria-label="Imagem anterior"
                @click.stop="prevImage"
              >
                <ChevronLeft class="w-8 h-8" />
              </button>
              <button
                type="button"
                class="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer focus:outline-none active:scale-90"
                aria-label="Próxima imagem"
                @click.stop="nextImage"
              >
                <ChevronRight class="w-8 h-8" />
              </button>
            </template>

            <!-- Contador de Imagens no Rodapé do Lightbox -->
            <div
              v-if="hasMultipleImages"
              class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold tracking-wider"
            >
              {{ activeIndex + 1 }} / {{ gallery.length }}
            </div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>

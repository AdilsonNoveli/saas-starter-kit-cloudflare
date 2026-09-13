<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X, Package2 } from '@lucide/vue'
import { getProductGallery } from '~~/shared/types/product'

interface KitItem {
  quantidade: number
  produtos: { nome: string; preco_venda: number } | null
}

interface Kit {
  id: string
  nome: string
  descricao: string | null
  foto_url: string | null
  imagens: string[]
  preco_fixo: number
  etiqueta: string
  kit_itens: KitItem[]
}

const props = defineProps<{ kit: Kit | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const somaOriginal = computed<number>(() =>
  (props.kit?.kit_itens ?? []).reduce(
    (acc, i) => acc + (i.produtos?.preco_venda ?? 0) * i.quantidade,
    0,
  ),
)

// Galeria (capa + extras) — reset na capa ao trocar de kit.
const activeImageIndex = ref<number>(0)
const gallery = computed<string[]>(() => (props.kit ? getProductGallery(props.kit) : []))
const galleryHasMultiple = computed<boolean>(() => gallery.value.length > 1)
const activeImageSrc = computed<string | null>(
  () => gallery.value[activeImageIndex.value] ?? props.kit?.foto_url ?? null,
)
watch(() => props.kit?.id, () => { activeImageIndex.value = 0 })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="kit"
        class="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="duration-150 ease-in"
          leave-to-class="opacity-0 translate-y-4 sm:scale-95"
        >
          <div
            v-if="kit"
            class="bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-xl overflow-hidden shadow-xl"
          >
            <!-- Foto (galeria) -->
            <div class="relative w-full aspect-video bg-surface-raised flex items-center justify-center">
              <NuxtImg
                v-if="activeImageSrc"
                :src="activeImageSrc"
                :alt="kit.nome"
                class="w-full h-full object-cover"
              />
              <Package2 v-else class="w-16 h-16 text-text-muted stroke-1" />

              <!-- Badge etiqueta -->
              <span class="absolute top-3 left-3 bg-black text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-sm leading-none">
                {{ kit.etiqueta }}
              </span>

              <!-- Fechar -->
              <button
                type="button"
                aria-label="Fechar"
                class="modal-close-btn preserve-circle absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                @click="emit('close')"
              >
                <X class="w-4 h-4" stroke-width="2.5" />
              </button>
            </div>

            <!-- Miniaturas da galeria -->
            <div v-if="galleryHasMultiple" class="flex gap-2 px-5 pt-3 overflow-x-auto">
              <button
                v-for="(img, i) in gallery"
                :key="img"
                type="button"
                class="w-14 h-14 rounded-md overflow-hidden border shrink-0 transition-all"
                :class="i === activeImageIndex ? 'border-brand ring-1 ring-brand/40' : 'border-border opacity-70 hover:opacity-100'"
                :aria-label="`Ver imagem ${i + 1} de ${gallery.length}`"
                @click="activeImageIndex = i"
              >
                <NuxtImg :src="img" :alt="`${kit.nome} — imagem ${i + 1}`" loading="lazy" class="w-full h-full object-cover" />
              </button>
            </div>

            <!-- Conteúdo -->
            <div class="px-5 py-5 space-y-4">
              <div>
                <h2 class="text-lg font-bold text-text-primary uppercase leading-snug">{{ kit.nome }}</h2>
                <p v-if="kit.descricao" class="text-sm text-text-muted mt-1 leading-relaxed">{{ kit.descricao }}</p>
              </div>

              <!-- Itens -->
              <div v-if="kit.kit_itens.length" class="space-y-1.5">
                <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Inclui</p>
                <ul class="space-y-1">
                  <li
                    v-for="(item, i) in kit.kit_itens.filter(x => x.produtos)"
                    :key="i"
                    class="flex items-baseline justify-between text-sm"
                  >
                    <span class="text-text-primary">
                      <span class="font-bold">{{ item.quantidade }}×</span> {{ item.produtos!.nome }}
                    </span>
                    <span class="text-text-muted tabular-nums text-xs ml-2 shrink-0">
                      {{ formatCurrency(item.produtos!.preco_venda * item.quantidade) }}
                    </span>
                  </li>
                </ul>
              </div>

              <!-- Preços -->
              <div class="border-t border-border pt-4 flex items-baseline justify-between">
                <div class="space-y-0.5">
                  <p class="text-[11px] text-text-muted uppercase tracking-wider">Economia</p>
                  <p v-if="somaOriginal > kit.preco_fixo" class="text-sm text-text-muted line-through tabular-nums">
                    {{ formatCurrency(somaOriginal) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-[11px] text-text-muted uppercase tracking-wider">Preço do kit</p>
                  <p class="text-2xl font-bold text-text-primary tabular-nums leading-none">
                    {{ formatCurrency(kit.preco_fixo) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

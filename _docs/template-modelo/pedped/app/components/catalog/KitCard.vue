<script setup lang="ts">
import { computed, ref } from 'vue'
import { Minus, Plus, CameraOff } from '@lucide/vue'
import { useCartStore } from '~/stores/cart'
import { useNotification } from '~/composables/useNotification'
import { useStore } from '~/composables/useStore'
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

const props = defineProps<{ kit: Kit }>()
const emit = defineEmits<{ (e: 'select', kit: Kit): void }>()

const cartStore = useCartStore()
const { notify } = useNotification()
const { loja } = useStore()

const showMiniaturesOnCard = computed<boolean>(() => {
  return loja.value?.config_promocoes?.mostrar_miniaturas_card === true
})

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const somaOriginal = computed<number>(() =>
  props.kit.kit_itens.reduce(
    (acc, i) => acc + (i.produtos?.preco_venda ?? 0) * i.quantidade,
    0,
  ),
)

const descricaoExibida = computed<string>(() => {
  if (props.kit.descricao?.trim()) return props.kit.descricao.trim()
  return props.kit.kit_itens
    .filter((i) => i.produtos)
    .map((i) => `${i.quantidade}× ${i.produtos!.nome}`)
    .join(' · ')
})

const hasOriginalPrice = computed(() => somaOriginal.value > props.kit.preco_fixo)

// Galeria (capa + extras). activeIndex controla qual imagem a área principal exibe.
const gallery = computed(() => getProductGallery(props.kit))
const hasMultipleImages = computed(() => gallery.value.length > 1)
const activeIndex = ref(0)
const activeSrc = computed<string | null>(() => gallery.value[activeIndex.value] ?? props.kit.foto_url)

const kitCartKey = computed(() => `kit::${props.kit.id}`)
const quantityInCart = computed(() => cartStore.getItemQuantity(kitCartKey.value))
const formattedQuantity = computed(() => quantityInCart.value.toString().padStart(2, '0'))

function addKit(): void {
  if (!cartStore.storeStatus.isOpen) {
    notify.warning('Estamos Fechados 😴', cartStore.storeStatus.message)
    return
  }
  cartStore.updateQuantity(
    { id: kitCartKey.value, nome: props.kit.nome, preco: props.kit.preco_fixo, foto_url: props.kit.foto_url },
    1,
    [],
  )
  notify.success(`${props.kit.etiqueta} adicionado!`, props.kit.nome)
}

function removeKit(): void {
  if (quantityInCart.value > 0) {
    cartStore.updateQuantity(
      { id: kitCartKey.value, nome: props.kit.nome, preco: props.kit.preco_fixo, foto_url: props.kit.foto_url },
      -1,
      [],
    )
  }
}
</script>

<template>
  <article class="flex flex-col bg-surface border border-border rounded-2xl overflow-hidden hover:border-brand/40 transition-colors duration-200 relative w-full h-full shadow-none">

    <!-- Badge do Kit -->
    <div class="absolute top-2 left-2 z-10 bg-purple-500 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
      {{ kit.etiqueta }}
    </div>

    <!-- Seção de Mídia (Imagem da Capa + Opcional Galeria Lateral no Desktop) -->
    <div
      class="relative w-full shrink-0 flex flex-col transition-all"
      :class="showMiniaturesOnCard ? 'p-2 bg-surface-raised/40 border-b border-border/40' : ''"
    >
      <div class="flex gap-2 w-full">
        <!-- Desktop: miniaturas em cards ao lado (Se ativado nas configurações da loja) -->
        <div
          v-if="showMiniaturesOnCard && hasMultipleImages"
          class="hidden md:flex md:flex-col gap-1.5 w-11 shrink-0"
        >
          <button
            v-for="(img, i) in gallery"
            :key="img"
            type="button"
            class="aspect-square w-full rounded-md overflow-hidden border transition-all"
            :class="i === activeIndex ? 'border-brand ring-1 ring-brand/40' : 'border-border opacity-70 hover:opacity-100'"
            :aria-label="`Ver imagem ${i + 1} de ${gallery.length}`"
            @mouseenter="activeIndex = i"
            @click.stop="activeIndex = i"
          >
            <NuxtImg :src="img" :alt="`${kit.nome} — imagem ${i + 1}`" loading="lazy" class="w-full h-full object-cover" />
          </button>
        </div>

        <!-- Imagem principal -->
        <button
          class="relative flex-1 aspect-square bg-surface-raised flex items-center justify-center overflow-hidden group"
          :class="showMiniaturesOnCard ? 'rounded-lg border border-border/60' : 'rounded-t-2xl'"
          aria-label="Ver detalhes do kit"
          @click="emit('select', kit)"
        >
          <NuxtImg
            v-if="activeSrc"
            :src="activeSrc"
            :alt="kit.nome"
            loading="lazy"
            sizes="50vw lg:25vw"
            class="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-300"
          />
          <CameraOff v-else class="w-12 h-12 text-text-muted stroke-1" />

          <!-- Bolinhas de paginação overlay (ocultas no desktop caso as miniaturas estejam sendo exibidas na lateral) -->
          <div
            v-if="hasMultipleImages"
            class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 px-2 py-0.5 rounded-full shrink-0 z-10"
            :class="showMiniaturesOnCard ? 'md:hidden' : ''"
          >
            <span
              v-for="(_, i) in gallery"
              :key="i"
              class="w-1.5 h-1.5 rounded-full transition-all"
              :class="i === activeIndex ? 'bg-white scale-110' : 'bg-white/40'"
            />
          </div>
        </button>
      </div>
    </div>

    <!-- Detalhes do Kit -->
    <div class="flex-1 flex flex-col p-2.5 md:p-4 min-w-0">
      <!-- Título e descrição clicáveis para abrir detalhes -->
      <div class="mb-2 cursor-pointer flex-1" @click="emit('select', kit)">
        <h2 class="text-sm font-bold leading-tight text-text-primary uppercase line-clamp-1" :title="kit.nome">
          {{ kit.nome }}
        </h2>
        <p class="text-[11px] text-text-muted mt-1 leading-snug line-clamp-2 min-h-[32px]">
          {{ descricaoExibida }}
        </p>
      </div>

      <!-- Precificação e Ações (Padrão PDV/Premium) -->
      <div class="mt-auto pt-2 md:pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-x-1 gap-y-2">
        <!-- Preços -->
        <div class="flex flex-col min-w-[40%]">
          <span v-if="hasOriginalPrice" class="text-[10px] text-text-muted line-through leading-none mb-0.5 select-none">{{ formatCurrency(somaOriginal) }}</span>
          <span
            class="text-[16px] md:text-[18px] font-bold leading-normal truncate"
            :class="hasOriginalPrice ? 'text-purple-600' : 'text-text-primary'"
          >
            {{ formatCurrency(kit.preco_fixo) }}
          </span>
        </div>

        <!-- Botões de Compra -->
        <div class="flex items-center shrink-0 justify-end">
          <!-- Quantidade > 0: Controles de incremento/decremento (Shopify Style) -->
          <div v-if="quantityInCart > 0" class="flex items-center border border-border/60 rounded-md h-[32px] bg-surface-raised overflow-hidden">
            <button
              type="button"
              class="px-2.5 h-full hover:bg-surface transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
              aria-label="Diminuir quantidade"
              @click.stop="removeKit"
            >
              <Minus class="w-3.5 h-3.5" />
            </button>
            <span class="w-8 text-center font-semibold text-xs text-text-primary select-none">
              {{ formattedQuantity }}
            </span>
            <button
              type="button"
              class="px-2.5 h-full hover:bg-surface transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
              aria-label="Aumentar quantidade"
              @click.stop="addKit"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Quantidade == 0: Botão Adicionar -->
          <button
            v-else
            type="button"
            class="bg-brand-green hover:bg-brand-greenDark text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md transition-colors active:scale-95 disabled:opacity-50"
            :disabled="!cartStore.storeStatus.isOpen"
            @click.stop="addKit"
          >
            <span class="hidden sm:inline">ADICIONAR AO PEDIDO</span>
            <span class="sm:hidden">ADICIONAR</span>
          </button>
        </div>
      </div>
    </div>

  </article>
</template>

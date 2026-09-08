<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCartStore } from '~/stores/cart'
import { useNotification } from '~/composables/useNotification'
import { useTracking } from '~/composables/useTracking'
import { useStore } from '~/composables/useStore'
import { Minus, Plus, CameraOff } from '@lucide/vue'
import type { CatalogProductItem } from '~~/shared/types/product'
import { getEffectivePrice, getProductGallery } from '~~/shared/types/product'

const props = defineProps<{
  produto: CatalogProductItem
  /** Set true for above-the-fold cards to enable eager loading + high fetch priority (LCP) */
  priority?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-details', produto: CatalogProductItem, mode: 'info' | 'pdv'): void
}>()

const cartStore = useCartStore()
const { notify } = useNotification()
const { track } = useTracking()
const { loja } = useStore()

const showMiniaturesOnCard = computed<boolean>(() => {
  return loja.value?.config_promocoes?.mostrar_miniaturas_card === true
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const effectivePrice = computed(() => getEffectivePrice(props.produto))
const isOnPromotion = computed(() => props.produto.preco_promocional != null)

// Galeria (capa + extras). activeIndex controla qual imagem a área principal exibe.
const gallery = computed(() => getProductGallery(props.produto))
const hasMultipleImages = computed(() => gallery.value.length > 1)
const activeIndex = ref(0)
const activeSrc = computed<string | null>(() => gallery.value[activeIndex.value] ?? props.produto.foto_url)

const quantityInCart = computed(() => cartStore.getItemQuantity(props.produto.id))

/**
 * Produto de encomenda: o card não tem compra direta nem controles +/-
 * (quantidade é definida no modal; a data de entrega, no checkout). O CTA vira
 * "Fazer Encomenda" e sempre abre o modal.
 */
const isPreorder = computed(() => props.produto.product_type === 'preorder' || props.produto.preorder_config !== null)

/**
 * Gestão de Estoque (migration 111). `null` = sem controle configurado, sem
 * limite (comportamento de sempre). Encomenda usa sua própria capacidade
 * diária (daily_capacity) — os dois sistemas são mutuamente exclusivos por
 * design (shared/types/preorder.ts), então este campo nunca se aplica a ela.
 */
const quantidadeDisponivel = computed<number | null>(() => props.produto.quantidade_disponivel ?? null)

/** Já está no limite — mais 1 unidade estouraria o estoque disponível. */
const semEstoqueParaMais = computed<boolean>(() => {
  if (isPreorder.value || quantidadeDisponivel.value === null) return false
  return quantityInCart.value >= quantidadeDisponivel.value
})

/** Esgotado de vez — nem a primeira unidade cabe. */
const esgotado = computed<boolean>(() => !isPreorder.value && quantidadeDisponivel.value === 0)

const formattedQuantity = computed(() => {
  if (props.produto.permite_fracionamento) {
    return quantityInCart.value.toString()
  }
  return quantityInCart.value.toString().padStart(2, '0')
})

/**
 * Adiciona 1 ao carrinho diretamente (sem opções) ou abre o modal para selecionar opções.
 * Se a loja estiver fechada, avisa via notificação.
 */
const handleAdd = () => {
  if (!cartStore.storeStatus.isOpen) {
    notify.warning('Estamos Fechados 😴', cartStore.storeStatus.message)
    return
  }

  // Encomenda: quantidade e opções no modal; a data de entrega, no checkout.
  if (isPreorder.value) {
    emit('open-details', props.produto, 'pdv')
    return
  }

  // Gestão de Estoque (migration 111): bloqueia ANTES de abrir o modal ou somar
  // ao carrinho — `quantityInCart` já soma TODAS as variações de opção deste
  // produto (mesmo estoque físico), então o limite vale mesmo pra quem tem
  // opções. Sem isto o cliente só descobria no checkout, várias telas depois.
  // Backend continua sendo a autoridade final (consumir_estoque_pedido,
  // atômico); isto é só feedback imediato.
  if (semEstoqueParaMais.value) {
    notify.warning(
      'Estoque insuficiente',
      quantidadeDisponivel.value === 0
        ? `${props.produto.nome} está esgotado no momento.`
        : `Só temos ${quantidadeDisponivel.value} ${props.produto.unidade_medida || 'unidade(s)'} de ${props.produto.nome} disponível(is) agora.`,
    )
    return
  }

  // Se tiver opções OU for fracionado e ainda não estiver no carrinho,
  // abrimos o modal de detalhes para o cliente escolher o peso/opções.
  if (props.produto.tem_opcoes || (props.produto.permite_fracionamento && quantityInCart.value === 0)) {
    emit('open-details', props.produto, 'pdv')
    return
  }

  // Se for fracionado e já estiver no carrinho, o botão de "+" adiciona 0.1 (100g)
  const delta = props.produto.permite_fracionamento ? 0.1 : 1
  cartStore.updateQuantity(
    { 
      id: props.produto.id, 
      nome: props.produto.nome, 
      preco: effectivePrice.value, 
      foto_url: props.produto.foto_url,
      permite_fracionamento: props.produto.permite_fracionamento,
      unidade_medida: props.produto.unidade_medida
    },
    delta,
  )
  track('add_to_cart', { entidade: 'produto', entidade_id: props.produto.id })
}

const removeItem = () => {
  if (quantityInCart.value > 0) {
    const delta = props.produto.permite_fracionamento ? -0.1 : -1
    cartStore.updateQuantity(
      { 
        id: props.produto.id, 
        nome: props.produto.nome, 
        preco: effectivePrice.value,
        permite_fracionamento: props.produto.permite_fracionamento,
        unidade_medida: props.produto.unidade_medida
      },
      delta,
    )
  }
}
</script>

<template>
  <article class="flex flex-col bg-surface border border-border rounded-2xl overflow-hidden hover:border-brand/40 transition-colors duration-200 relative w-full h-full shadow-none">



    <!-- Seção de Mídia (Imagem da Capa + Opcional Galeria Lateral no Desktop) -->
    <div
      class="relative w-full shrink-0 flex flex-col transition-all"
      :class="showMiniaturesOnCard ? 'p-2 bg-surface-raised/40 border-b border-border/40' : ''"
    >
      <!-- Badge de Desconto (preco_promocional definido pelo comerciante) -->
      <div
        v-if="isOnPromotion"
        class="absolute top-2 left-2 z-10 bg-warning-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow pointer-events-none"
      >
        Desconto
      </div>
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
            <NuxtImg :src="img" :alt="`${produto.nome} — imagem ${i + 1}`" loading="lazy" class="w-full h-full object-cover" />
          </button>
        </div>

        <!-- Imagem principal -->
        <div
          class="relative flex-1 aspect-square bg-surface-raised flex items-center justify-center overflow-hidden cursor-pointer group"
          :class="showMiniaturesOnCard ? 'rounded-lg border border-border/60' : 'rounded-t-2xl'"
          role="button"
          aria-label="Ver detalhes do produto"
          @click="emit('open-details', produto, 'pdv')"
        >
          <NuxtImg
            v-if="activeSrc"
            :src="activeSrc"
            :alt="produto.nome"
            :loading="priority ? 'eager' : 'lazy'"
            :fetchpriority="priority ? 'high' : 'low'"
            :decoding="priority ? 'sync' : 'async'"
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
        </div>
      </div>
    </div>

    <!-- Detalhes do Produto -->
    <div class="flex-1 flex flex-col p-2.5 md:p-4 min-w-0">
      <!-- Título e descrição clicáveis para abrir detalhes -->
      <div class="mb-2 cursor-pointer flex-1" @click="emit('open-details', produto, 'pdv')">
        <h2 class="text-sm font-bold leading-tight text-text-primary uppercase line-clamp-1" :title="produto.nome">
          {{ produto.nome }}
        </h2>
        <p class="text-[11px] text-text-muted mt-1 leading-snug line-clamp-2 min-h-[32px]">
          {{ produto.descricao || 'Ver detalhes e opções disponíveis.' }}
        </p>
      </div>

      <!-- Precificação e Ações (Padrão PDV/Premium) -->
      <div class="mt-auto pt-2 md:pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-x-1 gap-y-2">
        <!-- Preços -->
        <div class="flex flex-col min-w-[40%]">
          <span v-if="isOnPromotion" class="text-[10px] text-text-muted line-through leading-none mb-0.5 select-none">{{ formatCurrency(produto.preco_venda) }}</span>
          <span
            class="text-[16px] md:text-[18px] font-bold leading-normal truncate"
            :class="isOnPromotion ? 'text-warning-600' : 'text-text-primary'"
          >
            {{ formatCurrency(effectivePrice) }}
          </span>
        </div>

        <!-- Botões de Compra -->
        <div class="flex items-center shrink-0 justify-end">
          <!-- Quantidade > 0: Controles de incremento/decremento (Shopify Style).
               Encomendas não têm +/- no card: quantidade/data vivem no modal. -->
          <div v-if="quantityInCart > 0 && !isPreorder" class="flex items-center border border-border/60 rounded-md h-[32px] bg-surface-raised overflow-hidden">
            <button
              type="button"
              class="px-2.5 h-full hover:bg-surface transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
              aria-label="Diminuir quantidade"
              @click.stop="removeItem"
            >
              <Minus class="w-3.5 h-3.5" />
            </button>
            <span class="w-8 text-center font-semibold text-xs text-text-primary select-none">
              {{ formattedQuantity }}
            </span>
            <button
              type="button"
              class="px-2.5 h-full hover:bg-surface transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface-raised"
              aria-label="Aumentar quantidade"
              :disabled="semEstoqueParaMais"
              :title="semEstoqueParaMais ? 'Estoque no limite' : undefined"
              @click.stop="handleAdd"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Quantidade == 0: Botão Adicionar -->
          <button
            v-else
            type="button"
            class="text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="esgotado ? 'bg-surface-raised text-text-muted border border-border' : 'bg-brand-green hover:bg-brand-greenDark text-white'"
            :disabled="!cartStore.storeStatus.isOpen || esgotado"
            @click.stop="handleAdd"
          >
            <template v-if="esgotado">
              <span>ESGOTADO</span>
            </template>
            <template v-else>
              <span class="hidden sm:inline">{{ isPreorder ? 'FAZER ENCOMENDA' : produto.tem_opcoes ? 'VER AS OPÇÕES' : 'ADICIONAR AO PEDIDO' }}</span>
              <span class="sm:hidden">{{ isPreorder ? 'ENCOMENDAR' : produto.tem_opcoes ? 'OPÇÕES' : 'ADICIONAR' }}</span>
            </template>
          </button>
        </div>
      </div>
    </div>

  </article>
</template>

<script setup lang="ts">
/**
 * @descricao: Barra fixa inferior de compra — mobile E desktop.
 * @objetivo: Mantém o CTA sempre visível independente do scroll ou da quantidade
 *   de promoções/opções na página. Desktop exibe preço total + botão de compra;
 *   mobile exibe miniatura + nome + preço + botão compacto.
 *   Visibilidade controlada pelo pai via prop `show`.
 *   `totalPrice` já vem PRONTO do pai (preço + extras − desconto elegível) —
 *   este componente nunca recalcula preço, só formata (fonte única em [id].vue).
 */
import { computed } from 'vue'
import { ShoppingBag, Check } from '@lucide/vue'
import type { CatalogProductItem } from '~~/shared/types/product'

const props = defineProps<{
  product: CatalogProductItem
  totalPrice: number
  quantity: number
  isOpen: boolean
  isEsgotado: boolean
  show: boolean
  ctaText?: string
  quantityInCart?: number
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'open-cart'): void
}>()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const label = computed(() => {
  if (props.isEsgotado) return 'Esgotado'
  if ((props.quantityInCart ?? 0) > 0) {
    return `Atualizar Pedido (${props.quantityInCart} no carrinho) · ${formatCurrency(props.totalPrice)}`
  }
  return props.ctaText ?? `Adicionar ao pedido · ${formatCurrency(props.totalPrice)}`
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="show"
      class="fixed bottom-0 left-0 w-full z-40 bg-surface/95 backdrop-blur-md border-t border-border"
    >
      <!-- Desktop -->
      <div class="hidden md:flex items-center justify-between gap-4 max-w-7xl mx-auto px-5 py-3">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtImg
            v-if="product.foto_url"
            :src="product.foto_url"
            :alt="product.nome"
            class="w-9 h-9 rounded-sm object-cover border border-border shrink-0"
            sizes="36px"
          />
          <span class="text-sm font-bold text-text-primary uppercase truncate">{{ product.nome }}</span>
        </div>
        <button
          type="button"
          class="px-7 py-2.5 rounded-md bg-brand-green hover:bg-brand-greenDark text-white text-sm font-extrabold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          :disabled="!isOpen || isEsgotado"
          @click="emit('confirm')"
        >
          <ShoppingBag class="w-4 h-4" />
          <span>{{ label }}</span>
        </button>
      </div>

      <!-- Mobile -->
      <div class="flex md:hidden items-center justify-between gap-3 px-4 py-3">
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <NuxtImg
            v-if="product.foto_url"
            :src="product.foto_url"
            :alt="product.nome"
            class="w-10 h-10 rounded-sm object-cover border border-border shrink-0"
            sizes="40px"
          />
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold text-text-primary uppercase truncate">{{ product.nome }}</span>
            <span class="text-xs font-extrabold text-brand tabular-nums">{{ formatCurrency(totalPrice) }}</span>
          </div>
        </div>
        <button
          type="button"
          class="px-5 py-2.5 rounded-md bg-brand-green hover:bg-brand-greenDark text-white text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap select-none"
          :disabled="!isOpen || isEsgotado"
          @click="emit('confirm')"
        >
          <ShoppingBag class="w-4 h-4" />
          <span>{{ isEsgotado ? 'Esgotado' : 'Adicionar' }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  tipo: string
}>()

const imageMap: Record<string, string> = {
  leve_pague: '/icons/buy-x-get-y.svg',
  progressivo: '/icons/progressive-discount.svg',
  desconto_carrinho: '/icons/cart-discount.svg',
  destaque: '/icons/promo-banner.svg',
  frete_gratis: '/icons/free-shipping.svg',
  cupom: '/icons/discount-coupon.svg',
}

const imageSrc = computed(() => imageMap[props.tipo] ?? '/icons/promo-banner.svg')
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-surface-raised/35 p-6 select-none overflow-hidden">
    <img
      :src="imageSrc"
      :alt="tipo"
      class="w-24 h-24 md:w-28 md:h-28 object-contain group-hover:scale-110 transition-transform duration-300"
      loading="lazy"
    >
  </div>
</template>

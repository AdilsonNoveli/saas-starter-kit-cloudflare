<script setup lang="ts">
import { Truck } from '@lucide/vue'
import type { UpsellMessage } from '~/stores/cart'

/**
 * Versão compacta e discreta do progresso de frete grátis, para o checkout
 * (o carrinho usa o banner maior). Mesma fonte de dados: cartStore.upsellMessage.
 */
defineProps<{ upsell: UpsellMessage }>()
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg border px-3 py-2"
    :class="upsell.type === 'success'
      ? 'border-brand-green/30 bg-brand-green/[0.06]'
      : 'border-amber-500/30 bg-amber-500/[0.05]'"
  >
    <div class="flex items-center gap-2">
      <Truck
        class="w-3.5 h-3.5 shrink-0"
        :class="upsell.type === 'success' ? 'text-brand-green' : 'text-amber-600 dark:text-amber-400'"
      />
      <p
        class="text-[11px] font-semibold leading-snug"
        :class="upsell.type === 'success' ? 'text-brand-green' : 'text-text-primary'"
      >
        {{ upsell.text }}
      </p>
    </div>
    <div class="mt-1.5 h-1 rounded-full bg-surface-raised overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-700 ease-out"
        :class="upsell.type === 'success' ? 'bg-brand-green' : 'bg-amber-500'"
        :style="{ width: `${upsell.progress}%` }"
      />
    </div>
  </div>
</template>

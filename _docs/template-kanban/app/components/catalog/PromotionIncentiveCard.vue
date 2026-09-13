<script setup lang="ts">
import { Gift } from '@lucide/vue'
import type { PromotionIncentive } from '~/stores/cart'

/**
 * Card premium de incentivo à conversão: mostra quanto falta para desbloquear
 * o próximo nível de desconto (progressivo ou desconto no carrinho).
 * Sem estado próprio — renderiza o que o cart store calcula (fonte única).
 */
defineProps<{ incentive: PromotionIncentive }>()
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl border border-brand-green/30 bg-gradient-to-br from-brand-green/[0.08] to-brand-green/[0.01] p-3 shadow-sm"
  >
    <div class="flex items-center gap-2.5">
      <div class="shrink-0 p-2 rounded-lg bg-brand-green/12 text-brand-green">
        <Gift class="w-4 h-4" stroke-width="2.25" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-brand-green/80 truncate">
          {{ incentive.promocaoNome }}
        </p>
        <p class="text-[11px] font-semibold text-text-primary leading-snug">
          {{ incentive.text }}
        </p>
      </div>
    </div>

    <!-- Barra de progresso até o próximo nível -->
    <div class="mt-2.5 h-1.5 rounded-full bg-surface-raised overflow-hidden">
      <div
        class="h-full bg-brand-green rounded-full transition-all duration-700 ease-out"
        :style="{ width: `${incentive.progress}%` }"
      />
    </div>
  </div>
</template>

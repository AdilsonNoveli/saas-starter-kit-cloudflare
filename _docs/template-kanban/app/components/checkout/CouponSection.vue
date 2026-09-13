<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { useFormatters } from '~/composables/useFormatters'

interface CouponResult {
  readonly codigo: string
  readonly desconto: number
  readonly descricao: string
}

const { formatCurrency } = useFormatters()

defineProps<{
  couponResult: CouponResult | null
  couponOpen: boolean
  couponCode: string
  couponLoading: boolean
  couponError: string
  /** Mobile mostra o valor do desconto na lista de linhas acima — aqui só o estado "aplicado" + remover. Desktop mostra código + valor aqui, é a única exibição. */
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:couponOpen', value: boolean): void
  (e: 'update:couponCode', value: string): void
  (e: 'apply' | 'remove'): void
}>()
</script>

<template>
  <div class="mt-3 pt-3 border-t border-border">
    <!-- Cupom aplicado -->
    <div
      v-if="couponResult && compact"
      class="flex items-center justify-between text-xs"
    >
      <span class="text-green-600 dark:text-green-400 font-semibold">Cupom aplicado!</span>
      <button
        type="button"
        class="text-text-muted hover:text-red-500 transition-colors"
        @click="emit('remove')"
      >
        Remover
      </button>
    </div>
    <div
      v-else-if="couponResult"
      class="flex justify-between items-baseline text-xs text-green-600 dark:text-green-400 font-semibold"
    >
      <span class="flex items-center gap-1">
        <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        Cupom {{ couponResult.codigo }}
      </span>
      <span class="tabular-nums flex items-center gap-1.5">
        - {{ formatCurrency(couponResult.desconto) }}
        <button
          type="button"
          class="text-text-muted hover:text-red-500 transition-colors"
          title="Remover cupom"
          @click="emit('remove')"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </span>
    </div>

    <!-- Toggle + input do cupom -->
    <template v-if="!couponResult">
      <button
        type="button"
        class="w-full flex items-center justify-between text-xs text-text-muted hover:text-text-primary transition-colors py-0.5"
        @click="emit('update:couponOpen', !couponOpen)"
      >
        <span class="font-semibold uppercase tracking-wider">Aplicar cupom de desconto</span>
        <ChevronDown class="w-3.5 h-3.5 transition-transform shrink-0" :class="{ 'rotate-180': couponOpen }" />
      </button>
      <div v-if="couponOpen" class="mt-2 flex gap-2">
        <input
          :value="couponCode"
          type="text"
          aria-label="Código do cupom"
          placeholder="Código do cupom"
          class="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-green"
          @input="emit('update:couponCode', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('apply')"
        >
        <button
          type="button"
          :disabled="couponLoading"
          class="px-3 py-1.5 text-xs font-semibold bg-brand-green text-white rounded hover:bg-brand-greenDark transition-colors disabled:opacity-50"
          @click="emit('apply')"
        >
          {{ couponLoading ? '…' : 'Aplicar' }}
        </button>
      </div>
      <p v-if="couponError" class="text-[11px] text-red-500 mt-1">{{ couponError }}</p>
    </template>
  </div>
</template>

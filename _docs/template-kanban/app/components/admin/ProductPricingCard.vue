<!--
  @descricao: Card "Precificação" do formulário de produto.
  @objetivo: Custo, margem, preço final (editável, recalcula a margem) e
    preço promocional — extraído de `[id].vue` (Card 2, coluna direita).
-->

<script setup lang="ts">
import { DollarSign } from '@lucide/vue'
import { useFormatters } from '~/composables/useFormatters'
import type { useProductPricing } from '~/composables/useProductPricing'

defineProps<{
  pricing: ReturnType<typeof useProductPricing>
}>()

const precoCusto = defineModel<number>('precoCusto', { required: true })
const margemLucro = defineModel<number>('margemLucro', { required: true })
const precoPromocional = defineModel<number | null>('precoPromocional', { required: true })

const { formatCurrency } = useFormatters()
</script>

<template>
  <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
    <div class="flex items-center gap-2 border-b border-border pb-3">
      <DollarSign class="w-4.5 h-4.5 text-brand-green" />
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Precificação</h3>
    </div>

    <div class="space-y-4">
      <div>
        <label for="prod-custo" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Custo (R$)</label>
        <input
          id="prod-custo"
          v-model.number="precoCusto"
          type="number"
          min="0"
          step="0.01"
          class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors"
        >
      </div>

      <div>
        <label for="prod-margem" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Margem (%)</label>
        <input
          id="prod-margem"
          v-model.number="margemLucro"
          type="number"
          min="0"
          step="0.1"
          class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors"
        >
      </div>

      <div>
        <label
          for="prod-preco-venda"
          class="block text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1.5"
        >
          Preço Final
          <span class="normal-case font-normal text-text-muted ml-1 text-[10px]">(editável)</span>
        </label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary-500 font-semibold pointer-events-none select-none">R$</span>
          <input
            id="prod-preco-venda"
            type="text"
            inputmode="decimal"
            :value="pricing.precoFinalDisplay.value"
            class="w-full pl-9 pr-3 py-2 border border-primary-300 bg-primary-50 dark:bg-primary-950/20 text-sm text-primary-700 font-semibold focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors"
            aria-label="Preço final — editável; altera a margem automaticamente"
            @input="pricing.onPrecoFinalInput"
            @blur="pricing.onPrecoFinalBlur"
          >
        </div>
      </div>

      <div>
        <label for="prod-preco-promo" class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-warning-600">
          Aplicar Desconto
        </label>
        <div class="relative">
          <input
            id="prod-preco-promo"
            v-model.number="precoPromocional"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Deixe vazio para sem desconto"
            class="w-full px-3 py-2 border text-sm transition-colors placeholder:text-text-muted focus:outline-none focus:ring-1"
            :class="precoPromocional
              ? 'border-warning-400 bg-warning-50 text-warning-700 font-semibold focus:border-warning-500 focus:ring-warning-400/20'
              : 'border-border bg-surface text-text-primary focus:border-primary-500 focus:ring-primary-500/20'"
          >
          <button
            v-if="precoPromocional"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-danger-500 transition-colors"
            title="Remover desconto"
            @click="precoPromocional = null"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p v-if="precoPromocional" class="mt-1 text-[10px] text-warning-600 font-medium leading-tight">
          Preço com desconto: {{ formatCurrency(precoPromocional) }}
          <span v-if="pricing.precoFinalEfetivo.value > precoPromocional" class="block mt-0.5">
            (economia de {{ formatCurrency(pricing.precoFinalEfetivo.value - precoPromocional) }})
          </span>
        </p>
        <p v-else class="mt-1 text-[10px] text-text-muted leading-tight">
          Preço promocional exibido no catálogo. Opcional.
        </p>
      </div>
    </div>
  </div>
</template>

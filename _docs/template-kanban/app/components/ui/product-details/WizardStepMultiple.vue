<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { OptionGroup } from '~~/shared/types/product'

/**
 * Step de seleção múltipla (tipo `multiple`).
 * Mesmo padrão visual de chips do WizardStepSingle, mas com checkbox embutido
 * e sem auto-advance (múltiplas seleções exigem confirmação explícita).
 */
defineProps<{
  grupo: OptionGroup
  selectedIds: Set<string>
}>()

const emit = defineEmits<{
  toggle: [itemId: string]
}>()

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
</script>

<template>
  <div class="p-5 grid grid-cols-2 gap-3">
    <button
      v-for="item in grupo.produto_opcao_item"
      :key="item.id"
      type="button"
      :aria-pressed="selectedIds.has(item.id)"
      class="relative flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      :class="
        selectedIds.has(item.id)
          ? 'border-brand bg-brand/5'
          : 'border-border bg-surface hover:border-brand/40 hover:bg-surface-raised'
      "
      @click="emit('toggle', item.id)"
    >
      <!-- Miniatura -->
      <div
        v-if="item.foto_url"
        class="w-14 h-14 rounded-sm overflow-hidden border border-border shrink-0"
      >
        <NuxtImg
          :src="item.foto_url"
          :alt="item.nome"
          loading="lazy"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Nome -->
      <span class="text-sm font-semibold text-text-primary text-center leading-snug">
        {{ item.nome }}
      </span>

      <!-- Badge de preço extra -->
      <span
        v-if="Number(item.preco_delta) !== 0"
        class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
        :class="
          Number(item.preco_delta) > 0
            ? 'bg-brand/10 text-brand'
            : 'bg-danger-50 text-danger-600'
        "
      >
        {{ Number(item.preco_delta) > 0 ? '+' : '' }}{{ formatCurrency(Number(item.preco_delta)) }}
      </span>

      <!-- Checkbox embutido (canto superior direito) -->
      <div
        class="absolute top-2 right-2 w-5 h-5 rounded-xs border-2 flex items-center justify-center transition-all duration-150"
        :class="
          selectedIds.has(item.id)
            ? 'bg-brand border-brand'
            : 'bg-surface border-border'
        "
      >
        <Check
          v-if="selectedIds.has(item.id)"
          class="w-3 h-3 text-text-inverse"
          :stroke-width="3"
        />
      </div>
    </button>
  </div>
</template>

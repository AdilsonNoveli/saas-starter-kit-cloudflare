<script setup lang="ts">
import type { OptionGroup } from '~~/shared/types/product'

/**
 * Step de interruptores individuais (tipo `toggle`).
 * Lista vertical: miniatura opcional + label + preço delta + UiToggle.
 * O clique na linha inteira inverte o toggle (delegado ao pai via evento).
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
  <ul class="divide-y divide-border px-5 py-2">
    <li
      v-for="item in grupo.produto_opcao_item"
      :key="item.id"
      class="flex items-center gap-4 py-4 cursor-pointer select-none"
      role="option"
      :aria-selected="selectedIds.has(item.id)"
      @click="emit('toggle', item.id)"
    >
      <!-- Miniatura opcional -->
      <NuxtImg
        v-if="item.foto_url"
        :src="item.foto_url"
        :alt="item.nome"
        loading="lazy"
        class="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
      />

      <!-- Label + preço -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-text-primary">{{ item.nome }}</p>
        <p v-if="Number(item.preco_delta) !== 0" class="text-xs text-text-muted mt-0.5">
          {{ Number(item.preco_delta) > 0 ? '+' : '' }}{{ formatCurrency(Number(item.preco_delta)) }}
        </p>
      </div>

      <!-- Toggle (o .stop evita duplo-clique pelo listener da <li>) -->
      <UiToggle
        :model-value="selectedIds.has(item.id)"
        size="md"
        @click.stop
        @update:model-value="emit('toggle', item.id)"
      />
    </li>
  </ul>
</template>

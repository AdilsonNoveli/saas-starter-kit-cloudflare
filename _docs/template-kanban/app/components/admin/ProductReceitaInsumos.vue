<!--
  @descricao: Seção "Insumos usados" (receita/BOM) do produto.
  @objetivo: Lista de insumos consumidos por unidade vendida — extraída de
    `[id].vue` (dentro do Card 1c Estoque). Sempre visível, independente da
    política de controle de estoque.
-->

<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import type { useProductReceitaInsumos } from '~/composables/useProductReceitaInsumos'

defineProps<{
  receita: ReturnType<typeof useProductReceitaInsumos>
}>()
</script>

<template>
  <div class="pt-3 border-t border-border/70 space-y-2.5">
    <div class="flex items-center justify-between">
      <label class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Insumos usados</label>
      <button
        type="button"
        class="text-xs font-bold uppercase tracking-wider text-brand-green flex items-center gap-1 cursor-pointer"
        @click="receita.addReceitaItem"
      >
        <Plus class="w-3.5 h-3.5" /> Adicionar
      </button>
    </div>
    <p v-if="receita.receitaInsumos.value.length === 0" class="text-xs text-text-muted italic">Este produto não consome insumo nenhum.</p>
    <div v-for="(item, idx) in receita.receitaInsumos.value" :key="idx" class="flex items-center gap-2">
      <div class="flex-1">
        <UiSelect
          :model-value="item.insumo_id || null"
          :options="receita.insumoOptions.value"
          placeholder="Selecione o insumo"
          @update:model-value="(v) => item.insumo_id = String(v ?? '')"
        />
      </div>
      <input
        v-model.number="item.quantidade_por_unidade"
        type="number"
        min="0.001"
        step="any"
        class="w-28 px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-colors"
        title="Quantidade por unidade vendida"
      >
      <button type="button" class="p-1.5 text-text-muted hover:text-danger-600 hover:bg-danger-50 rounded transition-colors cursor-pointer shrink-0" title="Remover" @click="receita.removeReceitaItem(idx)">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

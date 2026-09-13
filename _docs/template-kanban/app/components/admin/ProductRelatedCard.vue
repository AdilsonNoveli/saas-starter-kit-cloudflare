<!--
  @descricao: Card "Produtos Relacionados" do formulário de produto.
  @objetivo: Sugeridos no checkout quando este produto está no carrinho
    (máx. 3) — extraído de `[id].vue` (Card 5). Busca via `AdminProductPicker`
    (já existe, usado por kits/promoções) em vez de reimplementar a busca.
-->

<script setup lang="ts">
import { computed } from 'vue'
import { Link2 } from '@lucide/vue'
import { useFormatters } from '~/composables/useFormatters'
import type { useProductRelated } from '~/composables/useProductRelated'
import type { AdminProductListItem } from '~~/shared/types/product'

const props = defineProps<{
  related: ReturnType<typeof useProductRelated>
  excludeId: string
}>()

const { formatCurrency } = useFormatters()

const excludedIds = computed(() => [props.excludeId, ...props.related.relacionados.value.map((r) => r.id)])

function handleSelect(produto: AdminProductListItem): void {
  props.related.addRelacionado({
    id: produto.id,
    nome: produto.nome,
    foto_url: produto.foto_url,
    preco_venda: Number(produto.preco_venda ?? 0),
  })
}
</script>

<template>
  <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
    <div class="flex items-center gap-2 border-b border-border pb-3">
      <Link2 class="w-4.5 h-4.5 text-brand-green" />
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Produtos Relacionados</h3>
    </div>

    <p class="text-xs text-text-muted">Sugeridos no checkout quando este produto está no carrinho (máx. 3).</p>

    <!-- Lista de selecionados -->
    <div v-if="related.relacionados.value.length > 0" class="space-y-2 mb-4">
      <div
        v-for="rel in related.relacionados.value"
        :key="rel.id"
        class="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface"
      >
        <NuxtImg
          v-if="rel.foto_url"
          :src="rel.foto_url"
          :alt="rel.nome"
          class="w-10 h-10 object-cover rounded shrink-0"
        />
        <div v-else class="w-10 h-10 rounded bg-surface-raised shrink-0 flex items-center justify-center">
          <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-text-primary line-clamp-1">{{ rel.nome }}</p>
          <p class="text-xs text-text-muted tabular-nums">{{ formatCurrency(rel.preco_venda) }}</p>
        </div>
        <button
          type="button"
          class="p-1.5 text-text-muted hover:text-danger-600 transition-colors rounded hover:bg-surface-raised shrink-0"
          title="Remover"
          @click="related.removeRelacionado(rel.id)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <!-- Busca (apenas se < 3 selecionados) -->
    <AdminProductPicker
      v-if="related.relacionados.value.length < 3"
      :excluded-ids="excludedIds"
      placeholder="Buscar produto para relacionar…"
      @select="handleSelect"
    />
    <p v-else class="text-xs text-text-muted">Máximo de 3 produtos atingido.</p>
  </div>
</template>

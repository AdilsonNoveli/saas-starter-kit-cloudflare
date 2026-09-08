<!--
  @descricao: Picker de produtos com busca paginada (Fase 5.7).
  @objetivo: Substituir os selects/checkboxes com "todos os produtos" por
    uma caixa de busca que consulta /api/admin/products sob demanda.
    Escala a qualquer número de produtos (paginação real, sem "carregar tudo").

    Uso:
    <AdminProductPicker
      :excluded-ids="['uuid1', 'uuid2']"
      @select="produto => form.itens.push({ produto_id: produto.id, ... })"
    />
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import type { AdminProductListItem, AdminProductsResponse } from '~~/shared/types/product'

const props = defineProps<{
  /** IDs de produtos que não devem aparecer nas sugestões (já adicionados). */
  readonly excludedIds?: readonly string[]
  readonly placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'select', produto: AdminProductListItem): void
}>()

const query = ref<string>('')
const results = ref<readonly AdminProductListItem[]>([])
const loading = ref<boolean>(false)
const open = ref<boolean>(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function search(q: string): Promise<void> {
  if (!q.trim()) {
    results.value = []
    open.value = false
    return
  }
  loading.value = true
  const params = new URLSearchParams({
    q: q.trim(),
    disponivel: 'true',
    limit: '10',
    orderBy: 'nome',
    order: 'asc',
  })
  try {
    const res = await $fetch<AdminProductsResponse>(`/api/admin/products?${params.toString()}`)
    // Filtra produtos já adicionados
    const excluded = new Set(props.excludedIds ?? [])
    results.value = res.data.filter((p) => !excluded.has(p.id))
    open.value = results.value.length > 0
  } catch {
    results.value = []
    open.value = false
  } finally {
    loading.value = false
  }
}

watch(query, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!q.trim()) {
    results.value = []
    open.value = false
    return
  }
  debounceTimer = setTimeout(() => search(q), 300)
})

function selectProduto(produto: AdminProductListItem): void {
  emit('select', produto)
  query.value = ''
  results.value = []
  open.value = false
}

// Fecha o dropdown ao clicar fora
function handleBlur(): void {
  // Delay para permitir o clique no item da lista antes de fechar
  setTimeout(() => { open.value = false }, 150)
}
</script>

<template>
  <div class="relative">
    <div class="relative">
      <Search class="absolute left-3 top-2.5 w-4 h-4 text-text-muted pointer-events-none" />
      <input
        v-model="query"
        type="text"
        class="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
        :placeholder="placeholder ?? 'Buscar produto por nome…'"
        autocomplete="off"
        @blur="handleBlur"
      >
      <div v-if="loading" class="absolute right-3 top-2.5">
        <div class="w-4 h-4 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>
    </div>

    <!-- Dropdown de resultados -->
    <ul
      v-if="open && results.length > 0"
      class="absolute z-30 w-full mt-1 bg-surface border border-border rounded-md shadow-float max-h-56 overflow-y-auto"
    >
      <li
        v-for="produto in results"
        :key="produto.id"
        class="flex items-center justify-between px-3 py-2.5 hover:bg-surface-raised cursor-pointer text-sm"
        @mousedown.prevent="selectProduto(produto)"
      >
        <div class="flex-1 min-w-0">
          <span class="font-medium text-text-primary truncate block">{{ produto.nome }}</span>
          <span v-if="produto.categorias" class="text-xs text-text-muted">{{ produto.categorias.nome }}</span>
        </div>
        <span class="ml-3 text-xs font-semibold text-text-muted tabular-nums shrink-0">
          {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco_venda || 0) }}
        </span>
      </li>
    </ul>

    <div
      v-else-if="open && !loading && query.trim().length > 0"
      class="absolute z-30 w-full mt-1 bg-surface border border-border rounded-md shadow-float px-3 py-2.5 text-sm text-text-muted"
    >
      Nenhum produto encontrado.
    </div>
  </div>
</template>

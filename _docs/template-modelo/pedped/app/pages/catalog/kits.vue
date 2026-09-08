<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({ layout: 'catalog' })
useHead({ title: 'Kits — Combos Especiais' })

interface KitItem {
  quantidade: number
  produtos: { nome: string; preco_venda: number } | null
}

interface Kit {
  id: string
  nome: string
  descricao: string | null
  foto_url: string | null
  imagens: string[]
  preco_fixo: number
  etiqueta: string
  kit_itens: KitItem[]
}

const { data, pending } = await useFetch<{ kits: Kit[] }>('/api/kits/public', {
  key: 'catalog-kits',
  default: () => ({ kits: [] }),
})

const selectedKit = ref<Kit | null>(null)
</script>

<template>
  <div>
    <!-- Grid de kits -->
    <div class="px-3 md:px-5 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 max-w-5xl mx-auto">
      <div v-if="pending" class="col-span-full flex justify-center p-8 text-text-muted">
        Carregando kits…
      </div>

      <template v-else-if="data?.kits.length">
        <CatalogKitCard
          v-for="kit in data.kits"
          :key="kit.id"
          :kit="kit"
          @select="selectedKit = $event"
        />
      </template>

      <div v-else class="col-span-full text-center p-8 text-text-muted text-sm">
        Nenhum kit disponível no momento.
      </div>
    </div>

    <CatalogKitDetailsModal :kit="selectedKit" @close="selectedKit = null" />
  </div>
</template>

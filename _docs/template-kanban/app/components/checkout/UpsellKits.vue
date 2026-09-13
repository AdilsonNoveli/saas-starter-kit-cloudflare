<script setup lang="ts">
import { useFormatters } from '~/composables/useFormatters'

interface CheckoutKitItem {
  produto_id: string
  quantidade: number
  produtos: { nome: string; preco_venda: number } | null
}
interface CheckoutKit {
  id: string
  nome: string
  descricao: string | null
  foto_url: string | null
  preco_fixo: number
  etiqueta: string
  kit_itens: CheckoutKitItem[]
}

const { formatCurrency } = useFormatters()

defineProps<{
  kits: CheckoutKit[]
  selectedKits: Set<string>
  /** Cabeçalho maior + imagem maior (mobile). Sem isso: cabeçalho discreto + imagem menor (desktop). */
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
}>()

function somaOriginalKit(kit: CheckoutKit): number {
  return kit.kit_itens.reduce(
    (acc, i) => acc + (i.produtos?.preco_venda ?? 0) * i.quantidade,
    0,
  )
}
</script>

<template>
  <h2
    :class="compact
      ? 'text-base font-bold text-text-primary mb-3'
      : 'text-xs font-bold text-text-muted uppercase tracking-wider'"
  >
    Adicionar ao pedido
  </h2>
  <div
    v-for="kit in kits"
    :key="kit.id"
    class="border rounded-lg overflow-hidden transition-all bg-surface"
    :class="selectedKits.has(kit.id) ? 'border-brand-green bg-brand-green/[0.01]' : 'border-border'"
  >
    <!-- Kit header band -->
    <div class="bg-black px-4 py-2.5 flex items-center justify-between" :class="{ 'bg-brand-green': selectedKits.has(kit.id) }">
      <span class="text-white text-xs font-bold tracking-wide uppercase">{{ kit.nome }}</span>
      <span class="text-white/70 text-xs">{{ kit.etiqueta }}</span>
    </div>
    <!-- Kit body -->
    <div class="p-3.5 flex gap-3 items-start">
      <NuxtImg
        v-if="kit.foto_url"
        :src="kit.foto_url"
        :alt="kit.nome"
        :class="compact ? 'w-16 h-16 object-cover rounded-md shrink-0' : 'w-14 h-14 object-cover rounded-md shrink-0'"
      />
      <div class="flex-1 min-w-0">
        <p v-if="kit.descricao" class="text-xs text-text-muted leading-snug mb-2 line-clamp-2">{{ kit.descricao }}</p>
        <div class="flex items-baseline gap-2">
          <span class="text-xs text-text-muted line-through tabular-nums">{{ formatCurrency(somaOriginalKit(kit)) }}</span>
          <span class="text-sm font-bold text-text-primary tabular-nums">{{ formatCurrency(kit.preco_fixo) }}</span>
        </div>
      </div>
    </div>
    <!-- Toggle checkbox row -->
    <label
      class="flex items-center gap-3 px-3.5 py-3 border-t cursor-pointer select-none"
      :class="selectedKits.has(kit.id) ? 'bg-brand-green text-white border-brand-green' : 'bg-surface-raised border-border text-text-primary'"
    >
      <input
        type="checkbox"
        class="w-4 h-4 accent-white shrink-0"
        :checked="selectedKits.has(kit.id)"
        @change="emit('toggle', kit.id)"
      >
      <span class="text-sm font-semibold">
        Sim, desejo adicionar {{ kit.nome }}
      </span>
    </label>
  </div>
</template>

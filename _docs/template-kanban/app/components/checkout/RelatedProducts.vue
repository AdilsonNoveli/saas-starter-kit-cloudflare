<script setup lang="ts">
import { useFormatters } from '~/composables/useFormatters'

interface RelatedProduct {
  readonly id: string
  readonly nome: string
  readonly foto_url: string | null
  readonly preco_venda: number
  readonly descricao: string | null
  /** Gestão de Estoque (migration 111). `null` = sem controle, sem limite. */
  readonly quantidade_disponivel: number | null
}

const { formatCurrency } = useFormatters()

defineProps<{
  products: RelatedProduct[]
  selected: Set<string>
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
}>()
</script>

<template>
  <!-- Produtos Relacionados (sugestões com base no carrinho) -->
  <section v-if="products.length > 0" class="space-y-3">
    <h2 class="text-base font-bold text-text-primary">Você também pode gostar</h2>
    <div class="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
      <div
        v-for="rel in products"
        :key="rel.id"
        class="p-4 flex items-center justify-between gap-4 bg-surface hover:bg-surface-raised/30 transition-colors"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <!-- Imagem -->
          <NuxtImg
            v-if="rel.foto_url"
            :src="rel.foto_url"
            :alt="rel.nome"
            class="w-12 h-12 md:w-14 md:h-14 object-cover rounded-lg shrink-0 border border-border/60"
          />
          <div v-else class="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-surface-raised shrink-0 flex items-center justify-center border border-border/60">
            <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>

          <!-- Info do Produto -->
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-bold text-text-primary leading-tight uppercase truncate" :title="rel.nome">
              {{ rel.nome }}
            </h3>
            <p v-if="rel.descricao" class="text-[11px] text-text-muted leading-tight mt-0.5 line-clamp-1">
              {{ rel.descricao }}
            </p>
            <span class="text-sm font-bold text-text-primary mt-1 inline-block tabular-nums">
              {{ formatCurrency(rel.preco_venda) }}
            </span>
          </div>
        </div>

        <!-- Botão de Ação (CTA Vigoroso com Herança de Raio de Borda) -->
        <button
          type="button"
          :disabled="rel.quantidade_disponivel !== null && rel.quantidade_disponivel <= 0 && !selected.has(rel.id)"
          :class="[
            'px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 active:scale-95 select-none shrink-0 flex items-center gap-1 shadow-xs',
            rel.quantidade_disponivel !== null && rel.quantidade_disponivel <= 0 && !selected.has(rel.id)
              ? 'bg-surface-raised text-text-muted border border-border cursor-not-allowed opacity-60'
              : selected.has(rel.id)
                ? 'bg-surface-raised text-brand-green border border-brand-green/30 hover:bg-surface cursor-pointer'
                : 'bg-brand-green text-white hover:bg-brand-greenDark shadow-sm cursor-pointer'
          ]"
          @click="emit('toggle', rel.id)"
        >
          <span v-if="selected.has(rel.id)" class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            ADICIONADO
          </span>
          <span v-else-if="rel.quantidade_disponivel !== null && rel.quantidade_disponivel <= 0" class="flex items-center gap-1">
            ESGOTADO
          </span>
          <span v-else class="flex items-center gap-1">
            + ADICIONAR AGORA
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

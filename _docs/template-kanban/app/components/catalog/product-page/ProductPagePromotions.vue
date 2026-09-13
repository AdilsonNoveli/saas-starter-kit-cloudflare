<script setup lang="ts">
/**
 * @descricao: Promoções ativas elegíveis para o produto (progressivo, leve/pague, desconto carrinho, frete grátis).
 * @objetivo: Exibir benefícios reais de forma clara e orientada à conversão, antes do CTA de compra.
 *   - Desconto progressivo → delega a `ProductPageProgressivoTable.vue` (SoC).
 *   - Leve/Pague e Desconto Carrinho → badges informativos.
 *   - Frete Grátis → badge derivado da config_promocoes da loja.
 *   Zero fetches próprios: dados chegam via props (DRY e SSR-safe).
 */
import { computed } from 'vue'
import { Tag, Truck, ShoppingCart } from '@lucide/vue'
import type { CatalogPromocao, LevePagueConfig, DescontoCarrinhoConfig } from '~~/shared/types/promotion'
import ProductPageProgressivoTable from './ProductPageProgressivoTable.vue'

const props = defineProps<{
  promocoes: CatalogPromocao[]
  produtoId: string
  effectivePrice: number
  /** Quantidade atualmente selecionada — repassada à tabela progressiva para realçar a linha correspondente. */
  quantidade: number
  freteGratisMeta?: number | null
  freteGratisHabilitado?: boolean
}>()

const emit = defineEmits<{
  'selecionar-quantidade': [quantidade: number]
}>()

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ── Separadores por tipo ─────────────────────────────────────────────────────
const progressivo = computed(() =>
  props.promocoes.find((p) => p.tipo === 'progressivo') ?? null,
)

const levePague = computed(() =>
  props.promocoes.find((p) => p.tipo === 'leve_pague') ?? null,
)

const descontoCarrinho = computed(() =>
  props.promocoes.find((p) => p.tipo === 'desconto_carrinho') ?? null,
)

// Frete grátis existe se habilitado e meta > 0
const mostraFreteGratis = computed(() =>
  props.freteGratisHabilitado === true && (props.freteGratisMeta ?? 0) > 0,
)

const hasAnyPromotion = computed(() =>
  progressivo.value !== null
  || levePague.value !== null
  || descontoCarrinho.value !== null
  || mostraFreteGratis.value,
)

// ── Helpers de tipo ──────────────────────────────────────────────────────────
function levePagueConfig(promo: CatalogPromocao): LevePagueConfig {
  return promo.configuracao as LevePagueConfig
}

function descontoCarrinhoConfig(promo: CatalogPromocao): DescontoCarrinhoConfig {
  return promo.configuracao as DescontoCarrinhoConfig
}
</script>

<template>
  <div v-if="hasAnyPromotion" class="w-full space-y-3">
    <!-- ── Badges informativos ────────────────────────────────────────────── -->
    <div class="flex flex-wrap gap-2">
      <!-- Leve/Pague -->
      <div
        v-if="levePague"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-brand/30 bg-brand/5 text-xs font-semibold text-brand"
      >
        <Tag class="w-3.5 h-3.5 shrink-0" />
        <span>Leve {{ levePagueConfig(levePague).leve }}, pague {{ levePagueConfig(levePague).compre }}</span>
      </div>

      <!-- Desconto no Carrinho -->
      <div
        v-if="descontoCarrinho"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-brand/30 bg-brand/5 text-xs font-semibold text-brand"
      >
        <ShoppingCart class="w-3.5 h-3.5 shrink-0" />
        <span>
          {{ descontoCarrinhoConfig(descontoCarrinho).desconto_percentual }}% acima de {{ formatCurrency(descontoCarrinhoConfig(descontoCarrinho).valor_minimo) }}
        </span>
      </div>

      <!-- Frete Grátis -->
      <div
        v-if="mostraFreteGratis"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
      >
        <Truck class="w-3.5 h-3.5 shrink-0" />
        <span>Frete grátis a partir de {{ formatCurrency(freteGratisMeta!) }}</span>
      </div>
    </div>

    <!-- ── Tabela de Desconto Progressivo (colapsável, seletor de quantidade) ── -->
    <ProductPageProgressivoTable
      v-if="progressivo"
      :promocao="progressivo"
      :promocoes="promocoes"
      :produto-id="produtoId"
      :effective-price="effectivePrice"
      :quantidade-atual="quantidade"
      @selecionar-quantidade="(v) => emit('selecionar-quantidade', v)"
    />
  </div>
</template>

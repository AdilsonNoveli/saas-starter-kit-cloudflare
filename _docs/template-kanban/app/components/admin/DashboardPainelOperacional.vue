<script setup lang="ts">
import { computed } from 'vue'
import {
  Eye,
  EyeOff,
  Clock,
  TrendingUp,
  MousePointerClick,
  FileText,
  Filter,
  ShoppingBag,
  Wallet,
} from '@lucide/vue'
import type {
  DashboardMetrics,
  DashboardCounts,
  TopProdutoItem,
  FunnelStep,
  TopCategoriaItem,
  TopProdutoClickItem,
  DashboardPeriod,
} from '~~/shared/types/dashboard'
import { DASHBOARD_PERIOD_LABELS } from '~~/shared/types/dashboard'
import type { KanbanColunaRow } from '~~/shared/types/order'

type KanbanOption = Pick<KanbanColunaRow, 'chave' | 'label' | 'is_revenue_trigger'>

interface Props {
  metrics: DashboardMetrics
  counts: DashboardCounts
  topProdutos: TopProdutoItem[]
  topCategorias: TopCategoriaItem[]
  topProdutosClick: TopProdutoClickItem[]
  /** Funil já reconciliado com o faturamento (etapas web + pedidos reais). */
  funilEtapas: FunnelStep[]
  allKanbanColumns: KanbanOption[]
  revenueChave: string
  savingRevenue: boolean
  valorVisivel: boolean
  selectedPeriod: DashboardPeriod
  isToday: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  setRevenueStatus: [chave: string]
  toggleValorVisivel: []
}>()

const { formatCurrency } = useFormatters()

const formatPercent = (val: number): string => `${Math.round(val)}%`

const valorMascarado = '••••••'

const funilLabel = (etapa: string): string => {
  const labels: Record<string, string> = {
    page_view:          'Visitas',
    add_to_cart:        'Itens no carrinho',
    checkout_iniciado:  'Checkout iniciado',
    pedido:             'Pedidos faturados',
  }
  return labels[etapa] ?? etapa
}

/** Nº de pessoas que abandonam entre esta etapa e a próxima. */
const funilDropoff = (index: number): number => {
  if (index >= props.funilEtapas.length - 1) return 0
  const atual = props.funilEtapas[index]?.total ?? 0
  const prox  = props.funilEtapas[index + 1]?.total ?? 0
  return Math.max(0, atual - prox)
}

/** % que abandona entre esta etapa e a próxima (relativo a esta etapa). */
const funilDropPercent = (index: number): number => {
  const atual = props.funilEtapas[index]?.total ?? 0
  if (atual <= 0) return 0
  return Math.round((funilDropoff(index) / atual) * 100)
}

/**
 * Largura da barra da etapa = volume ABSOLUTO relativo ao topo do funil.
 * Garante barras monotonicamente decrescentes (um funil de verdade). Usar a taxa
 * de conversão do passo — como fazia o remodel — produzia barras fora de ordem
 * (uma etapa posterior podia ficar mais larga que a anterior) e enganosas.
 */
const funilVolumePct = (total: number): number => {
  const topo = props.funilEtapas[0]?.total ?? 0
  if (topo <= 0) return 0
  return Math.min(100, Math.round((total / topo) * 100))
}

/** Taxa de retenção do passo: % desta etapa em relação à anterior. */
const funilTaxa = (index: number): number => {
  if (index <= 0) return 100
  const anterior = props.funilEtapas[index - 1]?.total ?? 0
  const atual    = props.funilEtapas[index]?.total ?? 0
  if (anterior <= 0) return 0
  return Math.min(100, Math.round((atual / anterior) * 100))
}

const funilConversaoTotal = computed<number>(() => {
  const etapas = props.funilEtapas
  if (etapas.length < 2) return 0
  const primeiro = etapas[0]?.total ?? 0
  const ultimo   = etapas[etapas.length - 1]?.total ?? 0
  if (primeiro <= 0) return 0
  return Math.round((ultimo / primeiro) * 100)
})

function maxOf<T extends { total: number }>(items: readonly T[]): number {
  return items.length === 0 ? 0 : Math.max(...items.map((i) => i.total))
}

const maxCategorias    = computed<number>(() => maxOf(props.topCategorias))
const maxProdutosClick = computed<number>(() => maxOf(props.topProdutosClick))
const maxProduto = computed<number>(() =>
  props.topProdutos.length === 0 ? 0 : Math.max(...props.topProdutos.map((i) => i.qtde)),
)
</script>

<template>
  <!-- LINHA 1: Faturamento + KPIs -->
  <section class="grid grid-cols-12 gap-5">

    <!-- Card herói: Faturamento -->
    <article class="dash-card col-span-12 lg:col-span-5 p-6 flex flex-col">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
            <Wallet class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="eyebrow">FATURAMENTO</p>
            <p class="text-xs text-text-muted mt-0.5">{{ DASHBOARD_PERIOD_LABELS[selectedPeriod] }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UiSelect
            :model-value="revenueChave"
            :options="allKanbanColumns.map((c) => ({ value: c.chave, label: c.label.toLowerCase() }))"
            :disabled="savingRevenue || allKanbanColumns.length === 0"
            size="sm"
            ghost
            aria-label="Status que define o faturamento"
            class="min-w-44"
            @update:model-value="emit('setRevenueStatus', String($event))"
          />
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors shrink-0"
            :aria-label="valorVisivel ? 'Ocultar faturamento' : 'Exibir faturamento'"
            :title="valorVisivel ? 'Ocultar faturamento' : 'Exibir faturamento'"
            @click="emit('toggleValorVisivel')"
          >
            <Eye v-if="valorVisivel" class="w-4 h-4" aria-hidden="true" />
            <EyeOff v-else class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p
        class="font-display text-5xl xl:text-6xl font-bold tracking-normal leading-none tabular-nums mb-6"
        style="font-feature-settings: 'tnum' 1, 'lnum' 1;"
        :aria-live="valorVisivel ? 'polite' : 'off'"
      >
        {{ valorVisivel ? formatCurrency(metrics.faturamento) : valorMascarado }}
      </p>

      <div class="grid grid-cols-2 gap-3 mt-auto">
        <div class="rounded-lg bg-surface-raised/80 border border-border/60 px-4 py-3 flex flex-col gap-1">
          <p class="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Ticket médio</p>
          <p class="text-base font-bold tabular-nums text-text-primary" style="font-feature-settings: 'tnum' 1, 'lnum' 1;">
            {{ valorVisivel ? formatCurrency(metrics.ticket_medio) : valorMascarado }}
          </p>
        </div>
        <div class="rounded-lg bg-surface-raised/80 border border-border/60 px-4 py-3 flex flex-col gap-1">
          <p class="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Conversão</p>
          <p class="text-base font-bold tabular-nums text-brand-green flex items-center gap-1" style="font-feature-settings: 'tnum' 1, 'lnum' 1;">
            <TrendingUp v-if="valorVisivel" class="w-4 h-4" aria-hidden="true" />
            {{ valorVisivel ? formatPercent(funilConversaoTotal) : valorMascarado }}
          </p>
        </div>
      </div>

      <!-- Alerta de pedidos em aberto — apenas em "Hoje" (dado é acionável) -->
      <div
        v-if="isToday && counts.em_aberto > 0"
        class="mt-4 flex items-center gap-2 rounded-lg bg-warning-50 text-warning-800 border border-warning-200/80 px-3 py-2.5"
      >
        <Clock class="w-4 h-4 shrink-0 text-warning-700" aria-hidden="true" />
        <span class="text-xs font-semibold">
          {{ counts.em_aberto }}
          {{ counts.em_aberto === 1 ? 'pedido aguardando' : 'pedidos aguardando' }} ação
        </span>
      </div>
    </article>

    <!-- Gráfico de Ondas Interativo (ShadcnUI Style): Pedidos, Cancelados, Novos Clientes, Leads -->
    <AdminDashboardMetricsChart
      :pedidos-faturados="metrics.total_pedidos"
      :cancelados="counts.cancelados"
      :novos-clientes="counts.clientes_novos"
      :leads="counts.leads"
      :period-label="DASHBOARD_PERIOD_LABELS[selectedPeriod]"
    />
  </section>

  <!-- LINHA 2: Funil + Top Produtos -->
  <section class="grid grid-cols-12 gap-5">

    <!-- Funil de Conversão -->
    <article class="dash-card col-span-12 lg:col-span-5 p-6 flex flex-col justify-between">
      <header class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
            <Filter class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="eyebrow">FUNIL DE CONVERSÃO</p>
            <p class="text-xs text-text-muted mt-0.5">{{ DASHBOARD_PERIOD_LABELS[selectedPeriod] }}</p>
          </div>
        </div>
      </header>

      <div v-if="funilEtapas.length > 0" class="flex flex-col gap-3">
        <div
          v-for="(item, index) in funilEtapas"
          :key="`fun-${index}-${item.etapa}`"
          class="p-3.5 rounded-lg border border-border/80 bg-surface-raised/40 hover:bg-surface-raised/80 transition-colors flex flex-col gap-2 relative overflow-hidden group"
        >
          <!-- Barra visual do estágio: volume absoluto (funil real, sempre
               decrescente), não a taxa do passo. -->
          <div
            class="absolute left-0 top-0 bottom-0 bg-brand-green/10 dark:bg-brand-green/15 transition-all duration-500"
            :style="{ width: `${funilVolumePct(item.total)}%` }"
          />

          <!-- Info principal -->
          <div class="flex items-center justify-between relative z-10">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-5 h-5 rounded-md bg-surface border border-border/80 flex items-center justify-center text-[10px] font-bold text-text-muted shrink-0">
                {{ index + 1 }}
              </span>
              <p class="text-xs font-bold text-text-primary truncate">
                {{ funilLabel(item.etapa) }}
              </p>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
              <span class="text-sm font-bold text-text-primary tabular-nums">
                {{ item.total }}
              </span>
              <span
                class="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider"
                :class="index === 0
                  ? 'bg-surface border border-border text-text-muted'
                  : funilTaxa(index) >= 50
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'"
              >
                {{ index === 0 ? '100%' : `${funilTaxa(index)}%` }}
              </span>
            </div>
          </div>

          <!-- Abandono para a próxima etapa (rótulo e valor coerentes) -->
          <div
            v-if="index < funilEtapas.length - 1 && funilDropoff(index) > 0"
            class="flex items-center justify-between text-[10px] text-text-muted relative z-10 pt-1 border-t border-border/40"
          >
            <span>Abandono para a próxima etapa</span>
            <span class="font-semibold text-text-secondary tabular-nums">↓ {{ funilDropoff(index) }} · {{ funilDropPercent(index) }}%</span>
          </div>
        </div>

        <!-- Rodapé: conversão total -->
        <div class="flex items-center justify-between border-t border-border pt-4 mt-2">
          <div>
            <p class="text-xs font-bold text-text-primary">Conversão geral</p>
            <p class="text-[10px] text-text-muted mt-0.5">
              {{ funilEtapas[0]?.total ?? 0 }} visitas → {{ funilEtapas[funilEtapas.length - 1]?.total ?? 0 }} pedidos
            </p>
          </div>
          <span
            class="font-display text-2xl font-bold tabular-nums"
            :class="funilConversaoTotal >= 10 ? 'text-brand-green' : 'text-text-primary'"
          >
            {{ funilConversaoTotal }}%
          </span>
        </div>
      </div>
      <div v-else class="flex-1 flex items-center justify-center text-sm text-text-muted italic py-10">
        Sem eventos instrumentados nas últimas 24h.
      </div>
    </article>

    <!-- Top Produtos -->
    <article class="dash-card col-span-12 lg:col-span-7 p-6 flex flex-col">
      <header class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
            <ShoppingBag class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="eyebrow">PRODUTOS MAIS VENDIDOS</p>
            <p class="text-xs text-text-muted mt-0.5">{{ counts.produtos_ativos }} produtos ativos</p>
          </div>
        </div>
      </header>

      <ul v-if="topProdutos.length > 0" class="space-y-5">
        <li
          v-for="(item, index) in topProdutos"
          :key="`prod-${item.produto_id}`"
          class="flex items-center gap-4"
        >
          <span class="rank-badge">{{ index + 1 }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-3 mb-1.5">
              <span class="text-sm font-medium truncate">{{ item.nome }}</span>
              <span class="text-sm font-semibold tabular-nums text-text-secondary shrink-0">
                {{ item.qtde }}x
              </span>
            </div>
            <div class="track">
              <div
                class="bar bg-secondary-500 motion-reduce:transition-none"
                :style="{ width: `${maxProduto > 0 ? (item.qtde / maxProduto) * 100 : 0}%` }"
              />
            </div>
          </div>
        </li>
      </ul>
      <div v-else class="flex-1 flex items-center justify-center text-sm text-text-muted italic py-10">
        O dia está apenas começando.
      </div>
    </article>
  </section>

  <!-- LINHA 3: Top Produtos Visualizados + Top Categorias -->
  <section class="grid grid-cols-12 gap-5">

    <article class="dash-card col-span-12 lg:col-span-6 p-6 flex flex-col">
      <header class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
            <MousePointerClick class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="eyebrow">PRODUTOS MAIS VISTOS</p>
            <p class="text-xs text-text-muted mt-0.5">Últimas 24h</p>
          </div>
        </div>
      </header>

      <ul v-if="topProdutosClick.length > 0" class="space-y-5">
        <li
          v-for="(item, index) in topProdutosClick"
          :key="`pclick-${item.produto_id}`"
          class="flex items-center gap-4"
        >
          <span class="rank-badge">{{ index + 1 }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-3 mb-1.5">
              <span class="text-sm font-medium truncate">{{ item.nome }}</span>
              <span class="text-sm font-semibold tabular-nums text-text-secondary shrink-0">
                {{ item.total }}x
              </span>
            </div>
            <div class="track">
              <div
                class="bar bg-info-500 motion-reduce:transition-none"
                :style="{ width: `${maxProdutosClick > 0 ? (item.total / maxProdutosClick) * 100 : 0}%` }"
              />
            </div>
          </div>
        </li>
      </ul>
      <div v-else class="flex-1 flex items-center justify-center text-sm text-text-muted italic py-10">
        Nenhum produto visualizado nas últimas 24h.
      </div>
    </article>

    <article class="dash-card col-span-12 lg:col-span-6 p-6 flex flex-col">
      <header class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
            <FileText class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="eyebrow">CATEGORIAS MAIS NAVEGADAS</p>
            <p class="text-xs text-text-muted mt-0.5">Últimas 24h</p>
          </div>
        </div>
      </header>

      <ul v-if="topCategorias.length > 0" class="space-y-5">
        <li
          v-for="(item, index) in topCategorias"
          :key="`cat-${index}-${item.categoria_nome}`"
          class="flex items-center gap-4"
        >
          <span class="rank-badge">{{ index + 1 }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-3 mb-1.5">
              <span class="text-sm font-medium truncate">{{ item.categoria_nome }}</span>
              <span class="text-sm font-semibold tabular-nums text-text-secondary shrink-0">
                {{ item.total }}
              </span>
            </div>
            <div class="track">
              <div
                class="bar bg-primary-600 motion-reduce:transition-none"
                :style="{ width: `${maxCategorias > 0 ? (item.total / maxCategorias) * 100 : 0}%` }"
              />
            </div>
          </div>
        </li>
      </ul>
      <div v-else class="flex-1 flex items-center justify-center text-sm text-text-muted italic py-10">
        Sem navegação de categorias nas últimas 24h.
      </div>
    </article>
  </section>

  <footer aria-hidden="true" class="h-32 md:h-48" />
</template>

<style scoped>
.dash-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  box-shadow: none;
}

.eyebrow {
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-text-muted);
}

.rank-badge {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  background-color: var(--color-surface-raised);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.track {
  width: 100%;
  height: 0.375rem;
  border-radius: 9999px;
  background-color: var(--color-surface-raised);
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 9999px;
  transition: width 1s ease-out;
}
</style>

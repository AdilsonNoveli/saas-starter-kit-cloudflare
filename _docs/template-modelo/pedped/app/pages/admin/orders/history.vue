<script setup lang="ts">
/**
 * @descricao: Histórico de pedidos arquivados (Fase 5.2).
 * @objetivo: Tabela paginada **server-side** dos pedidos arquivados,
 *   filtros por período, status, cliente e faixa de valor. Reusa a nota
 *   térmica (`UiOrderThermalReceiptModal`) e o modal de cliente
 *   (`AdminCustomerInfoModal`).
 *
 *   Pagination and filters operate against `/api/admin/orders/history`
 *   — toda lógica de filtro vive no servidor (5.2 / 3.3).
 */

import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { ArchiveRestore, Search, X, Plus } from '@lucide/vue'
import { useState } from 'nuxt/app'
import {
  HISTORY_PERIODS,
  type HistoryPeriod,
  type OrderHistoryItem,
  type OrderHistoryResponse,
  type OrderStatus,
} from '~~/shared/types/order'
import Select, { type Option } from '~/components/ui/Select.vue'
import { useNotification } from '~/composables/useNotification'
import { spDayStartISO, spDayEndISO } from '~~/shared/utils/datetime'
import { formatOrderNumber } from '~~/shared/utils/orderNumber'

definePageMeta({ layout: 'admin' })

const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)

watch(showMobileSearch, async (val) => {
  if (val) {
    await nextTick()
    mobileSearchInput.value?.focus()
  } else {
    clienteQuery.value = ''
  }
})

const supabase = useSupabaseClient()
const { notify } = useNotification()

// ===== Filtros =====
const periodo = ref<HistoryPeriod>('30d')
const customFrom = ref<string>('')
const customTo = ref<string>('')
const statusFilter = ref<OrderStatus | ''>('')
const clienteQuery = ref<string>('')
const valorMin = ref<string>('')
const valorMax = ref<string>('')

const page = ref<number>(1)
const pageSize = ref<number>(25)

// ===== Estado =====
const items = ref<readonly OrderHistoryItem[]>([])
const total = ref<number>(0)
const loading = ref<boolean>(false)
const colunas = ref<KanbanColunaRow[]>([])

// ===== Modais =====
const selectedClienteId = ref<string | null>(null)
const showClienteModal = ref<boolean>(false)
const selectedPedidoForReceipt = ref<PedidoFullForReceipt | null>(null)

interface PedidoFullForReceipt {
  readonly id: string
  readonly criado_em: string
  readonly status: OrderStatus
  readonly tipo_entrega: 'entrega' | 'retirada'
  readonly forma_pagamento: string
  readonly valor_subtotal: number | null
  readonly valor_total: number
  readonly valor_entrega: number | null
  readonly frete_gratis_aplicado: boolean | null
  readonly observacoes: string | null
  readonly clientes: { nome: string | null; telefone_whatsapp: string | null } | null
  readonly enderecos_cliente: { rua: string | null; numero: string | null; bairro: string | null } | null
  readonly itens_pedido: Array<{
    id: string
    nome_produto_congelado: string | null
    quantidade: number
    subtotal: number | null
    produtos: { nome: string } | null
  }>
}

const totalPages = computed<number>(() =>
  Math.max(1, Math.ceil(total.value / pageSize.value)),
)

/** Constrói os params do endpoint a partir dos filtros. */
function buildQuery(): URLSearchParams {
  const q = new URLSearchParams()
  q.set('period', periodo.value)
  if (periodo.value === 'custom') {
    // O endpoint aplica `from`/`to` direto em `gte`/`lte` sobre `criado_em`,
    // então os limites precisam ser instantes no fuso de SP. Antes, `to` virava
    // 21:00 do dia anterior e excluía quase todo o último dia selecionado.
    if (customFrom.value) q.set('from', spDayStartISO(customFrom.value))
    if (customTo.value) q.set('to', spDayEndISO(customTo.value))
  }
  if (statusFilter.value) q.set('status', statusFilter.value)
  if (clienteQuery.value) q.set('cliente', clienteQuery.value)
  if (valorMin.value) q.set('valor_min', valorMin.value)
  if (valorMax.value) q.set('valor_max', valorMax.value)
  q.set('page', String(page.value))
  q.set('pageSize', String(pageSize.value))
  return q
}

async function fetchPage(): Promise<void> {
  loading.value = true
  try {
    const res = await $fetch<OrderHistoryResponse>(
      `/api/admin/orders/history?${buildQuery().toString()}`,
    )
    items.value = res.data
    total.value = res.total
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    notify.error('Falha ao carregar histórico', message)
  } finally {
    loading.value = false
  }
}

// Refetch quando page/pageSize/filtros mudam (filtros disparam volta para page 1).
watch([periodo, customFrom, customTo, statusFilter, clienteQuery, valorMin, valorMax], () => {
  page.value = 1
})
watch([page, pageSize, periodo, customFrom, customTo, statusFilter, clienteQuery, valorMin, valorMax], () => {
  void fetchPage()
})

async function fetchColunas(): Promise<void> {
  const { data, error } = await supabase
    .from('kanban_coluna')
    .select('chave, label, cor, ordem, visivel')
    .order('ordem', { ascending: true })
  if (error) {
    notify.error('Falha ao carregar colunas', error.message)
    return
  }
  colunas.value = (data ?? []) as unknown as KanbanColunaRow[]
}

onMounted(() => {
  void fetchColunas()
  void fetchPage()
})

// ===== Modais =====

function openCliente(id: string | null): void {
  if (!id) return
  selectedClienteId.value = id
  showClienteModal.value = true
}

async function openReceipt(item: OrderHistoryItem): Promise<void> {
  // Carrega o pedido completo (com itens + endereço) sob demanda.
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      criado_em,
      status,
      tipo_entrega,
      forma_pagamento,
      valor_subtotal,
      valor_total,
      valor_entrega,
      frete_gratis_aplicado,
      observacoes,
      clientes(nome, telefone_whatsapp),
      enderecos_cliente(rua, numero, bairro),
      itens_pedido(
        id,
        nome_produto_congelado,
        quantidade,
        subtotal,
        produtos(nome)
      )
    `)
    .eq('id', item.id)
    .maybeSingle()

  if (error || !data) {
    notify.error('Falha ao abrir nota térmica', error?.message ?? 'Pedido não encontrado')
    return
  }
  selectedPedidoForReceipt.value = data as unknown as PedidoFullForReceipt
}

// ===== Helpers =====

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))


/** Mapa chave -> label das colunas (dinâmico). */
const statusLabelMap = computed<Map<string, string>>(() => {
  const map = new Map<string, string>()
  for (const c of colunas.value) map.set(c.chave, c.label)
  return map
})

/** Rótulo da coluna; cai para a própria chave caso a coluna tenha sido excluída. */
const statusLabel = (chave: OrderStatus): string => statusLabelMap.value.get(chave) ?? chave

const periodoLabels: Record<HistoryPeriod, string> = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  custom: 'Personalizado',
}

// ===== Desarquivamento =====
const unarchivingId = ref<string | null>(null)

async function unarchiveOrder(id: string): Promise<void> {
  if (unarchivingId.value) return
  unarchivingId.value = id
  try {
    await $fetch(`/api/admin/orders/${id}/unarchive`, { method: 'POST' })
    items.value = items.value.filter((i) => i.id !== id)
    total.value = Math.max(0, total.value - 1)
    notify.success('Pedido devolvido ao kanban')
  } catch {
    notify.error('Falha ao desarquivar', 'Tente novamente.')
  } finally {
    unarchivingId.value = null
  }
}

// ===== Opções dos seletores (UiSelect) =====
const periodoOptions: readonly Option[] = HISTORY_PERIODS.map((p) => ({
  value: p,
  label: periodoLabels[p],
}))

const statusOptions = computed<Option[]>(() => [
  { value: '', label: 'Todos' },
  ...colunas.value.map((c) => ({ value: c.chave, label: c.label })),
])
</script>

<template>
  <div id="history-page" class="flex flex-col min-h-screen bg-surface text-text-primary font-sans">
    <!-- Header com toolbar de 3 ícones (mesma da tela kanban) -->
    <!-- Header -->
    <header class="flex flex-col border-b border-border bg-surface shrink-0 relative select-none">
      <div class="h-16 flex items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <!-- Botão Plus (+) para Nova Venda (PDV) antes da busca -->
          <NuxtLink
            to="/admin/orders/new"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-all shadow-xs shrink-0 active:scale-95"
            :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
            title="Nova Venda (PDV)"
            aria-label="Nova Venda (PDV)"
          >
            <Plus class="w-4.5 h-4.5" stroke-width="2.5" />
          </NuxtLink>

          <!-- Busca (Desktop) - Esquerda -->
          <div class="hidden md:block relative w-full max-w-md h-9 shrink-0">
            <label for="header-search-desktop" class="sr-only">Pesquisar</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="header-search-desktop"
              v-model="clienteQuery"
              type="text"
              class="block w-full h-full pl-9 pr-3 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar..."
            >
          </div>

          <!-- Busca Mobile Toggle Button - Esquerda -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors active:scale-95 md:hidden shrink-0 cursor-pointer"
            :class="showMobileSearch ? 'bg-brand-light dark:bg-brand-green/25 text-text-primary shadow-sm' : 'bg-surface'"
            aria-label="Pesquisar" title="Pesquisar"
            @click="showMobileSearch = !showMobileSearch"
          >
            <Search class="w-4 h-4" />
          </button>

          <!-- Menu de Navegação em Caixa Alta - Iniciando após a Busca -->
          <AdminOrdersNavMenu />

          <!-- Espaço flexível no meio -->
          <div class="flex-1"/>

          <div class="text-xs text-text-muted tabular-nums shrink-0 ml-2 hidden sm:block">
            {{ total }} {{ total === 1 ? 'pedido' : 'pedidos' }}
          </div>
        </div>
      </div>

      <!-- Barra de Busca Mobile -->
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="max-h-0 opacity-0 py-0"
        enter-to-class="max-h-16 opacity-100 py-3"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="max-h-16 opacity-100 py-3"
        leave-to-class="max-h-0 opacity-0 py-0"
      >
        <div
          v-if="showMobileSearch"
          class="px-6 pb-3 border-t border-border/40 md:hidden bg-surface overflow-hidden flex items-center gap-2"
        >
          <div class="relative flex-1 h-9">
            <label for="pedidos-search-mobile" class="sr-only">Pesquisar</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="pedidos-search-mobile"
              ref="mobileSearchInput"
              v-model="clienteQuery"
              type="text"
              class="block w-full h-full pl-9 pr-8 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar..."
            >
            <button
              v-if="clienteQuery"
              type="button"
              class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
              @click="clienteQuery = ''"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </transition>
    </header>

    <!-- Filtros -->
    <section class="px-6 py-4 border-b border-border bg-surface-raised">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        <!-- Período -->
        <div class="flex flex-col">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">
            Período
          </span>
          <Select
            :model-value="periodo"
            :options="periodoOptions"
            size="md"
            aria-label="Período"
            @update:model-value="(v) => (periodo = v as HistoryPeriod)"
          />
        </div>

        <!-- Custom from -->
        <div v-if="periodo === 'custom'" class="flex flex-col">
          <label
            for="hist-from"
            class="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1"
          >
            De
          </label>
          <input
            id="hist-from"
            v-model="customFrom"
            type="date"
            class="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
          >
        </div>

        <!-- Custom to -->
        <div v-if="periodo === 'custom'" class="flex flex-col">
          <label
            for="hist-to"
            class="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1"
          >
            Até
          </label>
          <input
            id="hist-to"
            v-model="customTo"
            type="date"
            class="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
          >
        </div>

        <!-- Status -->
        <div class="flex flex-col">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">
            Status
          </span>
          <Select
            :model-value="statusFilter"
            :options="statusOptions"
            size="md"
            aria-label="Status"
            @update:model-value="(v) => (statusFilter = v as OrderStatus | '')"
          />
        </div>

        <!-- Valor Min -->
        <div class="flex flex-col">
          <label
            for="hist-valor-min"
            class="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1"
          >
            Valor min
          </label>
          <input
            id="hist-valor-min"
            v-model="valorMin"
            type="number"
            min="0"
            step="0.01"
            class="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
          >
        </div>

        <!-- Valor Max -->
        <div class="flex flex-col">
          <label
            for="hist-valor-max"
            class="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1"
          >
            Valor máx
          </label>
          <input
            id="hist-valor-max"
            v-model="valorMax"
            type="number"
            min="0"
            step="0.01"
            class="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
          >
        </div>
      </div>
    </section>

    <!-- Tabela: mesmo padrão da visão Tabela de pedidos — scroll no container,
         cabeçalho sticky e largura mínima para rolagem horizontal correta -->
    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="text-center text-text-muted py-12">Carregando…</div>
      <div v-else-if="items.length === 0" class="text-center text-text-muted py-12">
        Nenhum pedido arquivado encontrado para os filtros selecionados.
      </div>
      <table v-else class="w-full min-w-[880px] text-left border-collapse text-sm">
        <thead class="sticky top-0 z-10">
          <tr class="text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-raised">
            <th class="px-4 py-3 border-b border-border w-24">Nº</th>
            <th class="px-4 py-3 border-b border-border">Data</th>
            <th class="px-4 py-3 border-b border-border">Cliente</th>
            <th class="px-4 py-3 border-b border-border">Status</th>
            <th class="px-4 py-3 border-b border-border">Tipo</th>
            <th class="px-4 py-3 border-b border-border">Pagamento</th>
            <th class="px-4 py-3 border-b border-border text-right">Valor</th>
            <th class="px-4 py-3 border-b border-border w-12" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="item in items"
            :key="item.id"
            class="hover:bg-surface-raised transition-colors"
          >
            <td class="px-4 py-3">
              <button
                type="button"
                class="bg-warning-100 hover:bg-warning-200 dark:bg-warning-950/40 dark:hover:bg-warning-900/50 text-text-primary px-2 py-1 rounded border border-warning-500 dark:border-warning-700 font-mono text-xs font-bold cursor-pointer transition-colors"
                title="Ver nota térmica"
                @click="openReceipt(item)"
              >
                #{{ formatOrderNumber(item.id, item.short_id) }}
              </button>
            </td>
            <td class="px-4 py-3 tabular-nums text-text-primary">
              {{ formatDateTime(item.criado_em) }}
            </td>
            <td class="px-4 py-3 font-medium">
              <button
                v-if="item.cliente_id"
                type="button"
                class="text-text-primary hover:underline"
                @click="openCliente(item.cliente_id)"
              >
                {{ item.cliente_nome ?? '—' }}
              </button>
              <span v-else class="text-text-muted">Anônimo</span>
            </td>
            <td class="px-4 py-3 text-text-primary">
              {{ statusLabel(item.status) }}
            </td>
            <td class="px-4 py-3 capitalize text-text-primary">{{ item.tipo_entrega }}</td>
            <td class="px-4 py-3 capitalize text-text-primary">{{ item.forma_pagamento }}</td>
            <td class="px-4 py-3 text-right tabular-nums font-medium text-text-primary">
              {{ formatCurrency(item.valor_total) }}
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors disabled:opacity-40"
                title="Devolver ao kanban"
                :disabled="unarchivingId === item.id"
                @click="unarchiveOrder(item.id)"
              >
                <ArchiveRestore class="w-4 h-4" stroke-width="1.75" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginação -->
    <footer
      v-if="!loading && total > 0"
      class="px-6 py-3 border-t border-border bg-surface flex items-center justify-between"
    >
      <div class="text-xs text-text-muted">
        Página {{ page }} de {{ totalPages }} · {{ total }} pedidos
      </div>
      <UiPagination :current-page="page" :total-pages="totalPages" @change="page = $event" />
    </footer>

    <!-- Modais -->
    <UiOrderThermalReceiptModal
      :is-open="!!selectedPedidoForReceipt"
      :pedido="selectedPedidoForReceipt"
      @close="selectedPedidoForReceipt = null"
    />

    <AdminCustomerInfoModal
      :open="showClienteModal"
      :cliente-id="selectedClienteId"
      @close="showClienteModal = false"
    />
  </div>
</template>

<style>
/* Mesmo padrão do Kanban (#kanban-page): trava a página na altura da viewport
   para a tabela rolar internamente com cabeçalho sticky e paginação visível.
   Cada página declara o próprio bloco porque o CSS só é carregado com a rota. */
.admin-layout:has(#history-page) main {
  overflow: hidden !important;
  height: 100vh !important;
}

.admin-layout:has(#history-page) main > .flex-1 {
  height: 100% !important;
  max-height: 100vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* Oculta o rodapé institucional do layout global no Histórico */
.admin-layout:has(#history-page) footer {
  display: none !important;
}
</style>

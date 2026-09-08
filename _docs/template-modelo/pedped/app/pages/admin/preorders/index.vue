<script setup lang="ts">
/**
 * @descricao: Painel de Encomendas (Pre-Order System) — agenda fluida responsiva.
 * @objetivo: Visão de colunas limpas sem réguas/grades de horários.
 *   - Arraste lateral livre (Grab-to-Scroll) exatamente como no Kanban de Vendas.
 *   - Ao recolher colunas (ou em telas maiores), os próximos dias puxam automaticamente para a área visível.
 *   - Scroll vertical interno em cada coluna quando a lista de encomendas aumenta.
 *   - Ícone `Ban` no cabeçalho de cada coluna para gerenciar bloqueio de datas (desabilitado em datas passadas).
 *   - Navegação por semana e suporte a link direto via query param `?date=YYYY-MM-DD`.
 */

import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  Ban, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  Clock, Plus, Search, Store, Truck, X,
} from '@lucide/vue'
import { useState, useRoute } from 'nuxt/app'
import type { KanbanColunaRow, OrderStatus } from '~~/shared/types/order'
import type { PreorderBlockedDateRow } from '~~/shared/types/preorder'
import type { StoreScheduleConfig } from '~~/shared/types/store'
import { formatOrderNumber } from '~~/shared/utils/orderNumber'
import {
  addDays, dayOfWeek, formatDeliveryDate, isDayOpen, spToday, weekStartMonday,
} from '~~/shared/utils/preorders'
import Select, { type Option } from '~/components/ui/Select.vue'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)

watch(showMobileSearch, async (val) => {
  if (val) {
    await nextTick()
    mobileSearchInput.value?.focus()
  } else {
    searchQuery.value = ''
  }
})

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()

/** Quantidade de dias contínuos carregados a partir da data inicial da semana. */
const DISPLAY_DAYS_COUNT = 14

/** Papéis que enxergam pedidos (espelha `is_staff()` no banco). */
const STAFF_ROLES: ReadonlySet<string> = new Set([
  'atendente', 'producao', 'gerente', 'administrador', 'proprietario',
])

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

type KanbanColunaView = Pick<KanbanColunaRow, 'chave' | 'label' | 'cor' | 'ordem' | 'visivel' | 'is_cancelled'>

/** Card de encomenda: linha de `preorders` com o pedido e cliente embutidos. */
interface PreorderCard {
  readonly id: string
  readonly order_id: string
  readonly product_id: string
  readonly delivery_date: string
  readonly quantity: number
  readonly unit: string
  readonly produtos: { nome: string } | null
  readonly pedidos: {
    readonly id: string
    readonly short_id: number | null
    readonly criado_em: string
    status: OrderStatus
    readonly tipo_entrega: 'entrega' | 'retirada'
    readonly forma_pagamento: string
    readonly valor_total: number
    readonly valor_subtotal: number | null
    readonly valor_entrega: number | null
    readonly frete_gratis_aplicado: boolean | null
    readonly troco_para: number | null
    readonly observacoes: string | null
    readonly nota_operacional: string | null
    readonly cliente_id: string | null
    readonly clientes: { nome: string | null; telefone_whatsapp: string | null } | null
    readonly enderecos_cliente: { rua: string | null; numero: string | null; bairro: string | null } | null
    readonly itens_pedido: Array<{
      id: string
      nome_produto_congelado: string | null
      quantidade: number
      subtotal: number | null
      produtos: { nome: string } | null
    }>
  } | null
}

const loading = ref<boolean>(true)
const accessoNegado = ref<boolean>(false)
const preorders = ref<PreorderCard[]>([])
const colunas = ref<KanbanColunaView[]>([])
const schedule = ref<StoreScheduleConfig | null>(null)
const blockedDates = ref<PreorderBlockedDateRow[]>([])

// === Período e Dias Exibidos ===

const today = spToday()
const weekStart = ref<string>(weekStartMonday(today))

const weekDays = computed(() =>
  Array.from({ length: DISPLAY_DAYS_COUNT }, (_, i) => {
    const date = addDays(weekStart.value, i)
    const dow = dayOfWeek(date)
    return {
      date,
      label: `${WEEKDAY_SHORT[dow] ?? ''} ${date.slice(8, 10)}/${date.slice(5, 7)}`,
      isOpen: isDayOpen(schedule.value, date),
      isToday: date === today,
    }
  }),
)

const weekRangeLabel = computed<string>(() =>
  `${formatDeliveryDate(weekStart.value)} — ${formatDeliveryDate(addDays(weekStart.value, 6))}`,
)

function shiftWeek(deltaWeeks: number): void {
  weekStart.value = addDays(weekStart.value, deltaWeeks * 7)
}

function goToday(): void {
  weekStart.value = weekStartMonday(today)
}

// === Grab to Scroll Agenda Board (Arrastar para os lados) ===

const boardWrapper = ref<HTMLElement | null>(null)
const isDown = ref(false)
const startX = ref(0)
const scrollLeftStart = ref(0)

function onMouseDown(e: MouseEvent): void {
  const target = e.target as HTMLElement

  if (
    target.closest('.kanban-card') ||
    target.closest('button') ||
    target.closest('input') ||
    target.closest('select') ||
    target.closest('a')
  ) {
    return
  }

  isDown.value = true
  const wrapper = boardWrapper.value
  if (!wrapper) return

  startX.value = e.pageX - wrapper.offsetLeft
  scrollLeftStart.value = wrapper.scrollLeft

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent): void {
  if (!isDown.value) return
  const wrapper = boardWrapper.value
  if (!wrapper) return

  const x = e.pageX - wrapper.offsetLeft
  const walk = (x - startX.value) * 1.5
  wrapper.scrollLeft = scrollLeftStart.value - walk
}

function onMouseUp(): void {
  isDown.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

// === Colapso de colunas por data ===

const COLLAPSED_STORAGE_KEY = 'admin:preorders:collapsed'
const collapsedDays = ref<ReadonlySet<string>>(new Set())

function restoreCollapsed(): void {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      collapsedDays.value = new Set(parsed.filter((v): v is string => typeof v === 'string'))
    }
  } catch {
    // Preferência corrompida: ignora.
  }
}

function toggleCollapse(date: string): void {
  const next = new Set(collapsedDays.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  collapsedDays.value = next
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...next]))
  } catch {
    // Sem localStorage: vale só para a sessão.
  }
}

const isCollapsed = (date: string): boolean => collapsedDays.value.has(date)

// === Carga de dados ===

async function verificarAcesso(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    accessoNegado.value = true
    return false
  }
  const { data, error } = await supabase
    .from('usuarios')
    .select('role, ativo')
    .eq('id', user.id)
    .maybeSingle()
  const perfil = (data ?? null) as { role: string; ativo: boolean } | null
  const liberado = !error && perfil !== null && perfil.ativo === true && STAFF_ROLES.has(perfil.role)
  accessoNegado.value = !liberado
  return liberado
}

async function loadColunas(): Promise<void> {
  const { data, error } = await supabase
    .from('kanban_coluna')
    .select('chave, label, cor, ordem, visivel, is_cancelled')
    .order('ordem', { ascending: true })
  if (error) {
    notify.error('Falha ao carregar status', error.message)
    return
  }
  colunas.value = (data ?? []) as unknown as KanbanColunaView[]
}

async function loadSchedule(): Promise<void> {
  const { data } = await supabase
    .from('loja')
    .select('config_horarios')
    .limit(1)
    .maybeSingle()
  schedule.value = (data?.config_horarios as unknown as StoreScheduleConfig | null) ?? null
}

async function loadBlockedDates(): Promise<void> {
  const { data, error } = await supabase
    .from('preorder_blocked_dates')
    .select('id, blocked_date, product_id, reason, created_at')
    .order('blocked_date', { ascending: true })
  if (error) {
    notify.error('Falha ao carregar datas bloqueadas', error.message)
    return
  }
  blockedDates.value = (data ?? []) as unknown as PreorderBlockedDateRow[]
}

async function loadPreorders(): Promise<void> {
  loading.value = true
  const [resRange, resOverdue] = await Promise.all([
    supabase
      .from('preorders')
      .select(`
        id, order_id, product_id, delivery_date, quantity, unit,
        produtos(nome),
        pedidos(
          id, short_id, criado_em, status, tipo_entrega, forma_pagamento, valor_total,
          valor_subtotal, valor_entrega, frete_gratis_aplicado,
          troco_para, observacoes, nota_operacional, cliente_id,
          clientes(nome, telefone_whatsapp),
          enderecos_cliente(rua, numero, bairro),
          itens_pedido(id, nome_produto_congelado, quantidade, subtotal, produtos(nome))
        )
      `)
      .gte('delivery_date', weekStart.value)
      .lte('delivery_date', addDays(weekStart.value, DISPLAY_DAYS_COUNT - 1))
      .order('delivery_date', { ascending: true }),
    supabase
      .from('preorders')
      .select(`
        id, order_id, product_id, delivery_date, quantity, unit,
        produtos(nome),
        pedidos(
          id, short_id, criado_em, status, tipo_entrega, forma_pagamento, valor_total,
          valor_subtotal, valor_entrega, frete_gratis_aplicado,
          troco_para, observacoes, nota_operacional, cliente_id,
          clientes(nome, telefone_whatsapp),
          enderecos_cliente(rua, numero, bairro),
          itens_pedido(id, nome_produto_congelado, quantidade, subtotal, produtos(nome))
        )
      `)
      .lt('delivery_date', weekStart.value)
      .order('delivery_date', { ascending: true }),
  ])

  if (resRange.error) {
    notify.error('Falha ao carregar encomendas', resRange.error.message)
  } else {
    const cancelledKeys = new Set(colunas.value.filter((c) => c.is_cancelled).map((c) => c.chave))
    const overdueCards = (resOverdue.data ?? []).filter((p) => {
      const status = (p as unknown as PreorderCard).pedidos?.status
      return status && !cancelledKeys.has(status) && status !== 'entregue' && status !== 'concluido'
    })

    const map = new Map<string, PreorderCard>()
    for (const card of (overdueCards as unknown as PreorderCard[])) map.set(card.id, card)
    for (const card of ((resRange.data ?? []) as unknown as PreorderCard[])) map.set(card.id, card)

    preorders.value = Array.from(map.values())
  }
  loading.value = false
}

let realtimeChannel: RealtimeChannel | null = null

onMounted(async () => {
  if (route.query.date && typeof route.query.date === 'string') {
    weekStart.value = weekStartMonday(route.query.date)
  }
  restoreCollapsed()
  const liberado = await verificarAcesso()
  if (!liberado) {
    loading.value = false
    return
  }
  await Promise.all([loadColunas(), loadSchedule(), loadBlockedDates(), loadPreorders()])

  // Realtime: atualizações de status em tempo real
  realtimeChannel = supabase
    .channel('preorders-status')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pedidos' },
      (payload) => {
        const updated = payload.new as { id: string; status: OrderStatus }
        if (!updated?.id || !updated?.status) return
        preorders.value = preorders.value.map((card) => {
          if (card.pedidos && card.pedidos.id === updated.id && card.pedidos.status !== updated.status) {
            return {
              ...card,
              pedidos: {
                ...card.pedidos,
                status: updated.status,
              },
            }
          }
          return card
        })
      },
    )
    .subscribe()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

watch(() => route.query.date, (newDate) => {
  if (newDate && typeof newDate === 'string') {
    weekStart.value = weekStartMonday(newDate)
  }
})

watch(weekStart, () => { void loadPreorders() })

// === Filtros & Busca ===

const searchQuery = ref<string>('')

const colunasVisiveis = computed<KanbanColunaView[]>(() =>
  colunas.value.filter((c) => c.visivel).sort((a, b) => a.ordem - b.ordem),
)

const statusOptions = computed<Option[]>(() =>
  colunasVisiveis.value.map((c) => ({ value: c.chave, label: c.label })),
)

const statusMeta = computed<Map<OrderStatus, { label: string; cor: string }>>(() => {
  const map = new Map<OrderStatus, { label: string; cor: string }>()
  for (const c of colunas.value) map.set(c.chave, { label: c.label, cor: c.cor })
  return map
})

const filteredPreorders = computed<PreorderCard[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return preorders.value
  return preorders.value.filter((p) => {
    const cliente = p.pedidos?.clientes?.nome?.toLowerCase() ?? ''
    const shortId = p.pedidos?.short_id != null ? String(p.pedidos.short_id) : ''
    const orderId = p.order_id.toLowerCase()
    return cliente.includes(q) || shortId.includes(q) || orderId.includes(q)
  })
})

/** Encomendas atrasadas (com data anterior a semana inicial e status não final). */
const overduePreorders = computed<PreorderCard[]>(() => {
  const cancelledKeys = new Set(colunas.value.filter((c) => c.is_cancelled).map((c) => c.chave))
  return filteredPreorders.value.filter((p) => {
    const isPast = p.delivery_date < weekStart.value
    const status = p.pedidos?.status
    return isPast && status && !cancelledKeys.has(status) && status !== 'entregue' && status !== 'concluido'
  })
})

function preordersByDate(date: string): PreorderCard[] {
  return filteredPreorders.value.filter((p) => p.delivery_date === date)
}

/** Soma reservada do dia (ignorando pedidos cancelados). */
function reservedByDate(date: string): number {
  const cancelled = new Set(colunas.value.filter((c) => c.is_cancelled).map((c) => c.chave))
  return preorders.value
    .filter((p) => p.delivery_date === date && (!p.pedidos || !cancelled.has(p.pedidos.status)))
    .reduce((sum, p) => sum + Number(p.quantity), 0)
}

function isDateBlocked(date: string): boolean {
  return blockedDates.value.some((b) => b.blocked_date === date)
}

// === Bloqueio / Desbloqueio Rápido de Data (ícone Ban no cabeçalho da coluna) ===

async function toggleBlockDate(dateStr: string): Promise<void> {
  if (dateStr < today) return
  const isBlocked = isDateBlocked(dateStr)
  if (isBlocked) {
    const ok = await confirm({
      title: 'Desbloquear data',
      message: `Desbloquear ${formatDeliveryDate(dateStr)} para todas as encomendas?`,
      confirmText: 'Desbloquear',
      variant: 'warning',
    })
    if (!ok) return
    const { error } = await supabase.from('preorder_blocked_dates').delete().eq('blocked_date', dateStr)
    if (error) {
      notify.error('Falha ao desbloquear', error.message)
      return
    }
    notify.success('Data desbloqueada', formatDeliveryDate(dateStr))
  } else {
    const ok = await confirm({
      title: 'Bloquear data',
      message: `Bloquear ${formatDeliveryDate(dateStr)} para novas encomendas?`,
      confirmText: 'Bloquear',
      variant: 'warning',
    })
    if (!ok) return
    const { error } = await supabase.from('preorder_blocked_dates').insert({
      blocked_date: dateStr,
      product_id: null,
      reason: 'Bloqueio rápido via painel',
    })
    if (error) {
      notify.error('Falha ao bloquear', error.message)
      return
    }
    notify.success('Data bloqueada', formatDeliveryDate(dateStr))
  }
  await loadBlockedDates()
}

// === Drag & Drop de Cards de Encomenda Entre Dias ===

const draggedPreorderId = ref<string | null>(null)

function onCardDragStart(event: DragEvent, cardId: string): void {
  draggedPreorderId.value = cardId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
  }
}

function onCardDragEnd(): void {
  draggedPreorderId.value = null
}

function onDateDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

async function onDateDrop(targetDate: string, event: DragEvent): Promise<void> {
  event.preventDefault()
  event.stopPropagation()
  const cardId = draggedPreorderId.value
  draggedPreorderId.value = null
  if (!cardId) return
  await updatePreorderDate(cardId, targetDate)
}

async function updatePreorderDate(cardId: string, newDate: string): Promise<void> {
  const cardIndex = preorders.value.findIndex((p) => p.id === cardId)
  if (cardIndex === -1) return

  const card = preorders.value[cardIndex]!
  const oldDate = card.delivery_date
  if (oldDate === newDate) return

  // Validação: Verificar se a data de destino está bloqueada
  if (isDateBlocked(newDate)) {
    notify.warning('Data Bloqueada', `A data ${formatDeliveryDate(newDate)} está bloqueada para encomendas.`)
    return
  }

  // Optimistic UI: Mover o card imutavelmente para a nova data
  preorders.value[cardIndex] = {
    ...card,
    delivery_date: newDate,
  }

  try {
    await $fetch<{ success: boolean }>(`/api/admin/preorders/${cardId}/date`, {
      method: 'PUT',
      body: { delivery_date: newDate },
    })

    const shortId = card.pedidos ? formatOrderNumber(card.pedidos.id, card.pedidos.short_id) : ''
    notify.success('Data da Encomenda Alterada', `Encomenda #${shortId} movida para ${formatDeliveryDate(newDate)}`)
  } catch (err) {
    const errorObj = err as { data?: { message?: string }; message?: string }
    // Rollback imutável em caso de erro na API
    preorders.value[cardIndex] = {
      ...card,
      delivery_date: oldDate,
    }
    const message = errorObj?.data?.message || errorObj?.message || 'Falha ao mover a encomenda de dia.'
    notify.error('Erro ao mover encomenda', message)
  }
}

// === Status (mesmo endpoint/webhook do kanban de vendas com reatividade profunda) ===

async function updateStatus(card: PreorderCard, novoStatus: OrderStatus): Promise<void> {
  const pedido = card.pedidos
  if (!pedido || pedido.status === novoStatus) return

  const statusAntigo = pedido.status

  // Reatividade imutável profunda: atualiza TODAS as encomendas do mesmo pedido no estado local
  preorders.value = preorders.value.map((p) => {
    if (p.pedidos && p.pedidos.id === pedido.id) {
      return {
        ...p,
        pedidos: {
          ...p.pedidos,
          status: novoStatus as OrderStatus,
        },
      }
    }
    return p
  })

  try {
    await $fetch(`/api/admin/orders/${pedido.id}/status`, {
      method: 'PUT',
      body: { status: novoStatus },
    })
    notify.success('Status atualizado', `Pedido #${formatOrderNumber(pedido.id, pedido.short_id)}`)
  } catch (err) {
    const errorObj = err as { data?: { message?: string }; message?: string }
    // Rollback imutável em caso de erro
    preorders.value = preorders.value.map((p) => {
      if (p.pedidos && p.pedidos.id === pedido.id) {
        return {
          ...p,
          pedidos: {
            ...p.pedidos,
            status: statusAntigo,
          },
        }
      }
      return p
    })
    const message = errorObj?.data?.message || errorObj?.message || 'Falha ao atualizar status.'
    notify.error('Erro ao atualizar', message)
  }
}

// === Modais ===

const selectedPedidoForReceipt = ref<PreorderCard['pedidos'] | null>(null)
const selectedClienteId = ref<string | null>(null)
const showClienteModal = ref<boolean>(false)

function openClienteModal(clienteId: string | null): void {
  if (!clienteId) return
  selectedClienteId.value = clienteId
  showClienteModal.value = true
}

// === Helpers visuais ===

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const formatTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const corDoStatus = (status: OrderStatus): string => statusMeta.value.get(status)?.cor ?? '#6B7280'
</script>

<template>
  <div id="preorders-page" class="flex flex-col h-screen bg-surface text-text-primary font-sans overflow-hidden">
    <!-- Header Principal -->
    <header class="bg-surface border-b border-border select-none shrink-0 flex flex-col">
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

          <!-- Busca (Desktop) -->
          <div class="hidden md:block relative w-full max-w-md h-9 shrink-0">
            <label for="header-search-desktop" class="sr-only">Pesquisar</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="header-search-desktop"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-3 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar cliente ou pedido..."
            >
          </div>

          <!-- Busca Mobile Toggle Button -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors active:scale-95 md:hidden shrink-0 cursor-pointer"
            :class="showMobileSearch ? 'bg-brand-light dark:bg-brand-green/25 text-text-primary shadow-sm' : 'bg-surface'"
            aria-label="Pesquisar" title="Pesquisar"
            @click="showMobileSearch = !showMobileSearch"
          >
            <Search class="w-4 h-4" />
          </button>

          <!-- Menu de Navegação -->
          <AdminOrdersNavMenu />

          <!-- Espaço flexível -->
          <div class="flex-1"/>

          <!-- Navegação de Semana -->
          <div class="flex items-center gap-1 bg-surface-raised rounded-lg p-1 h-9 border border-border/60 shrink-0">
            <button
              type="button"
              class="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
              aria-label="Semana anterior" title="Semana anterior"
              @click="shiftWeek(-1)"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="px-2 h-7 text-xs font-bold text-text-primary tabular-nums whitespace-nowrap rounded-md hover:bg-surface transition-colors"
              title="Ir para a semana atual"
              @click="goToday"
            >
              {{ weekRangeLabel }}
            </button>
            <button
              type="button"
              class="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
              aria-label="Próxima semana" title="Próxima semana"
              @click="shiftWeek(1)"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
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
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-8 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar cliente ou pedido..."
            >
            <button
              v-if="searchQuery"
              type="button"
              class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
              @click="searchQuery = ''"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </transition>
    </header>

    <!-- Acesso negado -->
    <div v-if="accessoNegado" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-md text-center border border-border bg-surface-raised rounded-xl p-8">
        <h2 class="text-lg font-semibold text-text-primary">Sem permissão para ver encomendas</h2>
        <p class="text-sm text-text-muted mt-2">
          Seu usuário não tem um perfil ativo com acesso à operação de pedidos.
          Solicite a um administrador que conceda o papel adequado.
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading && preorders.length === 0" class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin" />
    </div>

    <!-- Agenda Responsiva (próximos dias ao recolher colunas) -->
    <div
      v-else
      ref="boardWrapper"
      class="flex-1 overflow-x-auto overflow-y-hidden kanban-board-wrapper p-4"
      @mousedown="onMouseDown"
    >
      <div class="flex gap-2.5 min-w-max h-full">
        <!-- Coluna de Encomendas Atrasadas (Datas Anteriores Não Finalizadas) -->
        <div
          v-if="overduePreorders.length > 0"
          class="flex flex-col h-full bg-surface rounded-lg border border-danger-300 dark:border-danger-900/60 shrink-0 w-64 shadow-xs"
        >
          <div class="shrink-0 px-3 py-2.5 flex items-center justify-between gap-2 border-b border-danger-200 dark:border-danger-900/50 bg-danger-500/10 select-none rounded-t-lg">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="text-xs font-bold uppercase tracking-wider truncate text-danger-600 dark:text-danger-400">
                Atrasadas
              </span>
              <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-danger-600 text-white uppercase shrink-0">
                {{ overduePreorders.length }}
              </span>
            </div>
          </div>
          <div class="px-3 py-1.5 bg-danger-500/5 border-b border-border/50 text-[11px] text-danger-600 dark:text-danger-400 font-medium select-none">
            Aguardando conclusão
          </div>
          <div class="flex-1 p-2.5 overflow-y-auto flex flex-col gap-2.5 min-h-0 [scrollbar-gutter:stable]">
            <div
              v-for="card in overduePreorders"
              :key="card.id"
              class="kanban-card bg-surface rounded-lg p-2.5 flex flex-col gap-2 shadow-xs hover:shadow-md transition-all select-none border border-danger-300 dark:border-danger-800"
            >
              <div class="flex items-center justify-between text-[10px] font-bold text-danger-600 dark:text-danger-400">
                <span>Data: {{ formatDeliveryDate(card.delivery_date) }}</span>
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: corDoStatus(card.pedidos?.status ?? '') }" />
              </div>
              <div class="flex items-start justify-between gap-1">
                <div class="flex items-center gap-1.5 min-w-0">
                  <Truck v-if="card.pedidos?.tipo_entrega === 'entrega'" class="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <Store v-else class="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span class="font-bold text-xs text-text-primary tabular-nums truncate">
                    {{ formatCurrency(card.pedidos?.valor_total ?? 0) }}
                  </span>
                </div>
              </div>
              <div v-if="card.pedidos" class="flex items-center text-[10px] text-text-muted gap-1.5 font-medium">
                <Clock class="w-3 h-3 shrink-0" />
                <span>{{ formatTime(card.pedidos.criado_em) }}</span>
                <span class="uppercase bg-surface-raised px-1.5 py-0.5 rounded text-[9px] truncate border border-border/50">
                  {{ card.pedidos.forma_pagamento }}
                </span>
              </div>
              <div class="flex gap-1.5 text-[10px] font-bold">
                <button
                  v-if="card.pedidos"
                  type="button"
                  class="bg-warning-100 hover:bg-warning-200 dark:bg-warning-950/40 dark:hover:bg-warning-900/50 text-text-primary px-1.5 py-0.5 rounded border border-warning-500 dark:border-warning-700 cursor-pointer transition-colors focus:outline-none"
                  title="Ver Nota Térmica"
                  @click="selectedPedidoForReceipt = card.pedidos"
                >
                  #{{ formatOrderNumber(card.pedidos.id, card.pedidos.short_id) }}
                </button>
                <button
                  v-if="card.pedidos?.clientes && card.pedidos.cliente_id"
                  type="button"
                  class="bg-surface-raised hover:bg-surface text-text-primary px-1.5 py-0.5 rounded flex-1 text-center truncate border border-border cursor-pointer transition-colors focus:outline-none"
                  :title="card.pedidos.clientes.nome ?? 'Cliente'"
                  @click="openClienteModal(card.pedidos.cliente_id)"
                >
                  {{ card.pedidos.clientes.nome }}
                </button>
              </div>
              <Select
                v-if="card.pedidos"
                :model-value="card.pedidos.status"
                :options="statusOptions"
                size="sm"
                :aria-label="`Status do pedido ${formatOrderNumber(card.pedidos.id, card.pedidos.short_id)}`"
                @update:model-value="(v) => updateStatus(card, v as string)"
              />
            </div>
          </div>
        </div>

        <div
          v-for="day in weekDays"
          :key="day.date"
          class="flex flex-col h-full bg-surface rounded-lg border border-border shrink-0 transition-all duration-200"
          :class="isCollapsed(day.date) ? 'w-11' : 'w-64'"
        >
          <!-- Cabeçalho da Coluna -->
          <div
            class="shrink-0 px-3 py-2.5 flex items-center justify-between gap-2 border-b border-border bg-surface-raised select-none rounded-t-lg"
            :class="[
              !day.isOpen && 'opacity-60',
              day.isToday && 'border-b-2 border-b-brand-green bg-brand-green/5',
            ]"
          >
            <template v-if="isCollapsed(day.date)">
              <div class="flex flex-col items-center gap-2 w-full py-1">
                <button
                  type="button"
                  class="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                  :title="`Expandir ${day.label}`"
                  @click="toggleCollapse(day.date)"
                >
                  <ChevronLast class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="p-1 rounded-md transition-colors"
                  :class="day.date < today ? 'opacity-25 cursor-not-allowed text-text-muted' : (isDateBlocked(day.date) ? 'text-danger-500 hover:text-danger-600' : 'text-text-muted hover:text-text-primary hover:bg-surface')"
                  :disabled="day.date < today"
                  :title="day.date < today ? 'Data passada' : (isDateBlocked(day.date) ? 'Data bloqueada (clique para desbloquear)' : 'Bloquear data')"
                  @click="toggleBlockDate(day.date)"
                >
                  <Ban class="w-3.5 h-3.5" />
                </button>
                <span class="text-xs font-bold uppercase tracking-wider whitespace-nowrap [writing-mode:vertical-rl] py-2">
                  {{ day.label }}
                </span>
                <span class="text-xs font-extrabold tabular-nums bg-surface px-1.5 py-0.5 rounded border border-border">
                  {{ preordersByDate(day.date).length }}
                </span>
              </div>
            </template>

            <template v-else>
              <div class="flex items-center gap-1.5 min-w-0 flex-1">
                <span class="text-xs font-bold uppercase tracking-wider truncate" :class="day.isToday ? 'text-brand-green' : 'text-text-primary'">
                  {{ day.label }}
                </span>
                <span v-if="day.isToday" class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-brand-green text-white uppercase shrink-0">
                  Hoje
                </span>
                <span v-if="!day.isOpen" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted uppercase shrink-0">
                  Fechado
                </span>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <!-- Ícone Ban (Bloquear/Desbloquear data) -->
                <button
                  type="button"
                  class="p-1 rounded-md transition-colors"
                  :class="day.date < today ? 'opacity-25 cursor-not-allowed text-text-muted' : (isDateBlocked(day.date) ? 'text-danger-500 hover:text-danger-600' : 'text-text-muted hover:text-text-primary hover:bg-surface')"
                  :disabled="day.date < today"
                  :title="day.date < today ? 'Data passada' : (isDateBlocked(day.date) ? 'Data bloqueada (clique para desbloquear)' : 'Bloquear esta data para novas encomendas')"
                  @click="toggleBlockDate(day.date)"
                >
                  <Ban class="w-3.5 h-3.5" />
                </button>

                <!-- Recolher coluna -->
                <button
                  type="button"
                  class="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                  :title="`Recolher ${day.label}`"
                  @click="toggleCollapse(day.date)"
                >
                  <ChevronFirst class="w-4 h-4" />
                </button>
              </div>
            </template>
          </div>

          <!-- Sub-cabeçalho de quantidade encomendada (quando aberta) -->
          <div v-if="!isCollapsed(day.date)" class="px-3 py-1.5 bg-surface-raised/40 border-b border-border/50 flex items-center justify-between text-[11px] text-text-muted select-none">
            <span>{{ reservedByDate(day.date) }} encomendado(s)</span>
            <span v-if="isDateBlocked(day.date)" class="text-danger-500 font-bold">
              Bloqueado
            </span>
          </div>

          <!-- Corpo da coluna: scroll vertical limpo com os cards -->
          <div
            v-if="!isCollapsed(day.date)"
            class="flex-1 p-2.5 overflow-y-auto flex flex-col gap-2.5 min-h-0 [scrollbar-gutter:stable] transition-colors"
            :class="draggedPreorderId ? 'bg-brand-green/5 ring-1 ring-brand-green/20' : ''"
            @dragover="onDateDragOver"
            @drop="(e) => onDateDrop(day.date, e)"
          >
            <div v-if="preordersByDate(day.date).length === 0" class="text-center text-xs text-text-muted/60 italic py-8 select-none">
              {{ day.isOpen ? 'Sem encomendas' : 'Dia fechado' }}
            </div>

            <div
              v-for="card in preordersByDate(day.date)"
              :key="card.id"
              draggable="true"
              class="kanban-card bg-surface rounded-lg p-2.5 flex flex-col gap-2 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 select-none border cursor-grab active:cursor-grabbing"
              :class="[
                card.pedidos?.tipo_entrega === 'entrega' ? 'border-order-entrega' : 'border-order-retirada',
                draggedPreorderId === card.id ? 'opacity-40 scale-95 border-dashed border-brand-green' : ''
              ]"
              @dragstart="(e) => onCardDragStart(e, card.id)"
              @dragend="onCardDragEnd"
            >
              <div class="flex items-start justify-between gap-1">
                <div class="flex items-center gap-1.5 min-w-0">
                  <Truck v-if="card.pedidos?.tipo_entrega === 'entrega'" class="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <Store v-else class="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span class="font-bold text-xs text-text-primary tabular-nums truncate">
                    {{ formatCurrency(card.pedidos?.valor_total ?? 0) }}
                  </span>
                </div>
                <span
                  class="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                  :style="{ backgroundColor: corDoStatus(card.pedidos?.status ?? '') }"
                  :title="statusMeta.get(card.pedidos?.status ?? '')?.label"
                />
              </div>

              <div v-if="card.pedidos" class="flex items-center text-[10px] text-text-muted gap-1.5 font-medium">
                <Clock class="w-3 h-3 shrink-0" />
                <span>{{ formatTime(card.pedidos.criado_em) }}</span>
                <span class="uppercase bg-surface-raised px-1.5 py-0.5 rounded text-[9px] truncate border border-border/50">
                  {{ card.pedidos.forma_pagamento }}
                </span>
              </div>

              <div class="flex gap-1.5 text-[10px] font-bold">
                <button
                  v-if="card.pedidos"
                  type="button"
                  class="bg-warning-100 hover:bg-warning-200 dark:bg-warning-950/40 dark:hover:bg-warning-900/50 text-text-primary px-1.5 py-0.5 rounded border border-warning-500 dark:border-warning-700 cursor-pointer transition-colors focus:outline-none"
                  title="Ver Nota Térmica"
                  @click="selectedPedidoForReceipt = card.pedidos"
                >
                  #{{ formatOrderNumber(card.pedidos.id, card.pedidos.short_id) }}
                </button>
                <button
                  v-if="card.pedidos?.clientes && card.pedidos.cliente_id"
                  type="button"
                  class="bg-surface-raised hover:bg-surface text-text-primary px-1.5 py-0.5 rounded flex-1 text-center truncate border border-border cursor-pointer transition-colors focus:outline-none"
                  :title="card.pedidos.clientes.nome ?? 'Cliente'"
                  @click="openClienteModal(card.pedidos.cliente_id)"
                >
                  {{ card.pedidos.clientes.nome }}
                </button>
                <span
                  v-else
                  class="bg-surface-raised text-text-primary px-1.5 py-0.5 rounded flex-1 text-center truncate border border-border"
                >
                  Anônimo
                </span>
              </div>

              <!-- Status do pedido -->
              <Select
                v-if="card.pedidos"
                :model-value="card.pedidos.status"
                :options="statusOptions"
                size="sm"
                :aria-label="`Status do pedido ${formatOrderNumber(card.pedidos.id, card.pedidos.short_id)}`"
                @update:model-value="(v) => updateStatus(card, v as string)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Nota Térmica -->
    <UiOrderThermalReceiptModal
      :is-open="!!selectedPedidoForReceipt"
      :pedido="selectedPedidoForReceipt"
      @close="selectedPedidoForReceipt = null"
    />

    <!-- Modal cliente -->
    <AdminCustomerInfoModal
      :open="showClienteModal"
      :cliente-id="selectedClienteId"
      @close="showClienteModal = false; selectedClienteId = null"
    />
  </div>
</template>

<style>
/* Padrão de viewport estrito para o painel de encomendas */
.admin-layout:has(#preorders-page) main {
  overflow: hidden !important;
  height: 100vh !important;
}

.admin-layout:has(#preorders-page) main > .flex-1 {
  height: 100% !important;
  max-height: 100vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.admin-layout:has(#preorders-page) footer {
  display: none !important;
}
</style>

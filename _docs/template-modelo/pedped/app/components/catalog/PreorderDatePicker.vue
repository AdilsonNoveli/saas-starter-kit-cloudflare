<script setup lang="ts">
/**
 * @descricao: Seletor de data de encomenda (Pre-Order System) — Faixa Semanal Compacta.
 * @objetivo: Exibir 7 dias por vez a partir da semana vigente (sem scroll vertical no modal).
 *   Permite navegar semanas (← / →) e mantém cache por mês de GET /api/preorders/calendar.
 *   Datas passadas, fechadas, bloqueadas ou lotadas são desabilitadas visualmente.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Check } from '@lucide/vue'
import type { CalendarDay, PreorderCalendarResponse } from '~~/shared/types/preorder'
import { addDays, formatDeliveryDate, spToday, weekStartMonday } from '~~/shared/utils/preorders'

const props = defineProps<{
  productId: string
  modelValue: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'day-selected', day: CalendarDay | null): void
}>()

const WEEKDAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const

const today = spToday()
const currentWeekStart = weekStartMonday(today)

/** Offset de semanas a partir da semana vigente (0 = semana atual). */
const weekOffset = ref<number>(0)

/** Data ISO da segunda-feira da semana ativa. */
const activeWeekStart = computed<string>(() => addDays(currentWeekStart, weekOffset.value * 7))

/** As 7 datas ISO (YYYY-MM-DD) da semana ativa. */
const activeWeekDays = computed<string[]>(() => {
  const start = activeWeekStart.value
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

/** Rótulo legível no cabeçalho (ex: "Julho 2026" ou "Julho / Agosto 2026"). */
const headerLabel = computed<string>(() => {
  const days = activeWeekDays.value
  const start = days[0]!
  const end = days[6]!
  const [y1, m1] = start.split('-')
  const [y2, m2] = end.split('-')

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  const m1Name = monthNames[Number(m1) - 1]
  const m2Name = monthNames[Number(m2) - 1]

  if (m1 === m2) {
    return `${m1Name} ${y1}`
  }
  return `${m1Name} / ${m2Name} ${y2}`
})

const canGoPrev = computed<boolean>(() => weekOffset.value > 0)

// Cache de dias do mês: "YYYY-MM" -> Map<"YYYY-MM-DD", CalendarDay>
const monthsCache = ref<Map<string, Map<string, CalendarDay>>>(new Map())
const loading = ref<boolean>(false)
const loadError = ref<boolean>(false)

async function fetchMonth(monthStr: string): Promise<void> {
  if (monthsCache.value.has(monthStr)) return
  const res = await $fetch<PreorderCalendarResponse>('/api/preorders/calendar', {
    query: { product_id: props.productId, month: monthStr },
  })
  const dayMap = new Map<string, CalendarDay>()
  for (const day of res.days) {
    dayMap.set(day.date, day)
  }
  monthsCache.value.set(monthStr, dayMap)
}

async function loadActiveWeek(): Promise<void> {
  if (!props.productId) return
  loading.value = true
  loadError.value = false
  try {
    const days = activeWeekDays.value
    const m1 = days[0]!.slice(0, 7)
    const m2 = days[6]!.slice(0, 7)

    const promises = [fetchMonth(m1)]
    if (m2 !== m1) promises.push(fetchMonth(m2))

    await Promise.all(promises)
  } catch (e) {
    console.error('[PreorderDatePicker] Erro ao carregar disponibilidade:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

watch([activeWeekStart, () => props.productId], () => {
  void loadActiveWeek()
}, { immediate: true })

function setInitialWeekOffset(): void {
  if (!props.modelValue || props.modelValue < today) {
    weekOffset.value = 0
    return
  }
  const targetWeekStart = weekStartMonday(props.modelValue)
  const [y1, m1, d1] = targetWeekStart.split('-').map(Number)
  const [y2, m2, d2] = currentWeekStart.split('-').map(Number)
  const t1 = Date.UTC(y1!, m1! - 1, d1!)
  const t2 = Date.UTC(y2!, m2! - 1, d2!)
  const diffWeeks = Math.round((t1 - t2) / (7 * 86400000))
  weekOffset.value = Math.max(0, diffWeeks)
}

onMounted(() => {
  setInitialWeekOffset()
})

function getCalendarDay(dateStr: string): CalendarDay | null {
  const monthStr = dateStr.slice(0, 7)
  return monthsCache.value.get(monthStr)?.get(dateStr) ?? null
}

function isSelectable(dateStr: string): boolean {
  if (dateStr < today) return false
  const day = getCalendarDay(dateStr)
  return day ? day.status === 'available' : false
}

function selectDate(dateStr: string): void {
  if (!isSelectable(dateStr)) return
  const next = props.modelValue === dateStr ? null : dateStr
  emit('update:modelValue', next)
  const day = getCalendarDay(dateStr)
  emit('day-selected', next && day ? day : null)
}

const selectedDayInfo = computed<CalendarDay | null>(() => {
  if (!props.modelValue) return null
  return getCalendarDay(props.modelValue)
})

function getDayClasses(dateStr: string): string {
  const isSelected = props.modelValue === dateStr
  const selectable = isSelectable(dateStr)
  const dayInfo = getCalendarDay(dateStr)

  if (isSelected) {
    return 'bg-brand-green text-white border-brand-green shadow-sm font-bold'
  }
  if (selectable) {
    return 'bg-surface-raised border-border text-text-primary hover:border-brand-green/60 hover:bg-brand-green/15 cursor-pointer font-semibold'
  }
  if (dayInfo?.status === 'full') {
    return 'bg-surface/30 border-border/40 text-danger-400 opacity-60 cursor-not-allowed line-through'
  }
  return 'bg-surface/20 border-transparent text-text-muted/40 cursor-not-allowed'
}
</script>

<template>
  <div class="border border-border rounded-lg bg-surface overflow-hidden select-none">
    <!-- Cabeçalho: título centralizado em caixa alta + navegação de semana -->
    <div class="flex items-center justify-between px-3.5 py-2 bg-surface-raised border-b border-border">
      <div class="flex-1 text-center select-none">
        <span class="text-[11px] font-normal uppercase tracking-wider text-text-muted">
          ESCOLHA A DATA DE ENTREGA <span class="text-text-primary font-medium ml-1">({{ headerLabel }})</span>
        </span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          type="button"
          class="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          :disabled="!canGoPrev"
          aria-label="Semana anterior"
          @click="weekOffset--"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          aria-label="Próxima semana"
          @click="weekOffset++"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Faixa semanal de 7 dias -->
    <div class="p-2.5">
      <div v-if="loading" class="py-4 text-center text-xs text-text-muted animate-pulse">
        Carregando disponibilidade…
      </div>
      <div v-else-if="loadError" class="py-4 text-center text-xs text-danger-500">
        Não foi possível carregar a disponibilidade. Tente novamente.
      </div>
      <div v-else class="grid grid-cols-7 gap-1.5">
        <button
          v-for="(dateStr, idx) in activeWeekDays"
          :key="dateStr"
          type="button"
          class="aspect-square flex flex-col items-center justify-center p-1 rounded-md transition-all select-none border text-center"
          :class="getDayClasses(dateStr)"
          :disabled="!isSelectable(dateStr)"
          :aria-label="`Dia ${dateStr}${isSelectable(dateStr) ? ' disponível' : ' indisponível'}`"
          @click="selectDate(dateStr)"
        >
          <span
            class="text-[9px] font-bold uppercase tracking-wider leading-none transition-colors"
            :class="props.modelValue === dateStr ? 'text-white/90' : 'text-text-muted'"
          >
            {{ WEEKDAY_LABELS[idx] }}
          </span>
          <span class="text-xs font-extrabold leading-none tabular-nums mt-1">
            {{ Number(dateStr.slice(8, 10)) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Rodapé: confirmação do dia selecionado -->
    <div
      v-if="selectedDayInfo"
      class="px-3 py-1.5 border-t border-border bg-brand-green/10 text-xs font-semibold text-text-primary flex items-center justify-between"
    >
      <span class="flex items-center gap-1.5">
        <Check class="w-3.5 h-3.5 text-brand-green shrink-0" />
        <span>{{ formatDeliveryDate(selectedDayInfo.date) }}</span>
      </span>
      <span class="text-[10px] text-text-muted">
        {{ selectedDayInfo.remaining_capacity }} vaga(s) restante(s)
      </span>
    </div>
  </div>
</template>

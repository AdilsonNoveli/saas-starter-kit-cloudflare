<!--
  @descricao: Componente Pagination reutilizável, enterprise-grade.
  @objetivo: Navegar entre páginas de listas com paginação inteligente
    (janela deslizante + primeira/última + reticências).
  @variantes: default, success, warning, error, info (cor do estado ativo)
  @tamanhos: sm, md, lg
-->

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  currentPage?: number
  totalPages?: number
  maxVisible?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  currentPage: 1,
  totalPages: 10,
  maxVisible: 5,
})

const emit = defineEmits<{ change: [page: number] }>()

function handlePageChange(page: number): void {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('change', page)
  }
}

/** Janela deslizante de páginas visíveis ao redor da atual. */
function getVisiblePages(): number[] {
  const pages: number[] = []
  const half = Math.floor(props.maxVisible / 2)
  let start = Math.max(1, props.currentPage - half)
  const end = Math.min(props.totalPages, start + props.maxVisible - 1)
  if (end - start + 1 < props.maxVisible) {
    start = Math.max(1, end - props.maxVisible + 1)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

// Cor de preenchimento do botão ativo por variante (fundo + borda implícita).
const ACTIVE_FILL: Record<NonNullable<Props['variant']>, string> = {
  default: 'bg-brand text-text-inverse',
  success: 'bg-success text-text-inverse',
  warning: 'bg-warning text-text-inverse',
  error: 'bg-alert text-text-inverse',
  info: 'bg-info text-text-inverse',
}

// Dimensões por tamanho — botões de página são quadrados (min-w == h).
const PAGE_SIZE: Record<NonNullable<Props['size']>, string> = {
  sm: 'min-w-8 h-8 px-2 text-xs',
  md: 'min-w-9 h-9 px-2.5 text-sm',
  lg: 'min-w-10 h-10 px-3 text-base',
}
const NAV_SIZE: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
}

const PAGE_BASE = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const NAV_BASE = 'inline-flex items-center gap-1 rounded-lg font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const pageClasses = (isActive: boolean): string => {
  const state = isActive
    ? `${ACTIVE_FILL[props.variant]} shadow-sm cursor-default`
    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary cursor-pointer'
  return `${PAGE_BASE} ${PAGE_SIZE[props.size]} ${state}`
}

const navClasses = (disabled: boolean): string => {
  const state = disabled
    ? 'text-text-muted opacity-40 cursor-not-allowed'
    : 'text-text-primary hover:bg-surface-raised cursor-pointer'
  return `${NAV_BASE} ${NAV_SIZE[props.size]} ${state}`
}

const visiblePages = computed(() => getVisiblePages())
const canGoPrevious = computed(() => props.currentPage > 1)
const canGoNext = computed(() => props.currentPage < props.totalPages)
const showFirst = computed(() => (visiblePages.value[0] ?? 1) > 1)
const showLast = computed(() => (visiblePages.value[visiblePages.value.length - 1] ?? props.totalPages) < props.totalPages)
const showFirstEllipsis = computed(() => (visiblePages.value[0] ?? 1) > 2)
const showLastEllipsis = computed(() => (visiblePages.value[visiblePages.value.length - 1] ?? props.totalPages) < props.totalPages - 1)
</script>

<template>
  <nav class="flex items-center justify-center gap-1" aria-label="Paginação">
    <!-- Anterior -->
    <button
      type="button"
      :class="navClasses(!canGoPrevious)"
      :disabled="!canGoPrevious"
      aria-label="Página anterior"
      @click="handlePageChange(currentPage - 1)"
    >
      <ChevronLeft class="w-4 h-4" aria-hidden="true" />
      <span class="hidden sm:inline">Anterior</span>
    </button>

    <!-- Primeira página + reticências -->
    <button v-if="showFirst" type="button" :class="pageClasses(currentPage === 1)" @click="handlePageChange(1)">1</button>
    <span v-if="showFirstEllipsis" class="px-1 text-text-muted select-none" aria-hidden="true">…</span>

    <!-- Janela de páginas -->
    <button
      v-for="page in visiblePages"
      :key="page"
      type="button"
      :class="pageClasses(currentPage === page)"
      :aria-current="currentPage === page ? 'page' : undefined"
      @click="handlePageChange(page)"
    >
      {{ page }}
    </button>

    <!-- Reticências + última página -->
    <span v-if="showLastEllipsis" class="px-1 text-text-muted select-none" aria-hidden="true">…</span>
    <button v-if="showLast" type="button" :class="pageClasses(currentPage === totalPages)" @click="handlePageChange(totalPages)">{{ totalPages }}</button>

    <!-- Próximo -->
    <button
      type="button"
      :class="navClasses(!canGoNext)"
      :disabled="!canGoNext"
      aria-label="Próxima página"
      @click="handlePageChange(currentPage + 1)"
    >
      <span class="hidden sm:inline">Próximo</span>
      <ChevronRight class="w-4 h-4" aria-hidden="true" />
    </button>
  </nav>
</template>

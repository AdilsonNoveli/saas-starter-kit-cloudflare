<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Activity } from '@lucide/vue'

interface Props {
  pedidosFaturados: number
  cancelados: number
  novosClientes: number
  leads: number
  periodLabel: string
}

const props = defineProps<Props>()

interface SeriesConfig {
  id: 'pedidos' | 'cancelados' | 'clientes' | 'leads'
  label: string
  color: string
  gradientId: string
  valueFormatter: (val: number) => string
  weights: number[]
}

const seriesList: SeriesConfig[] = [
  {
    id: 'pedidos',
    label: 'PEDIDOS FATURADOS',
    color: '#0e46e2', // Admin Primary
    gradientId: 'grad-pedidos',
    valueFormatter: (val: number) => Math.round(val).toString(),
    weights: [0.1, 0.25, 0.4, 0.6, 0.5, 0.85, 1.0],
  },
  {
    id: 'cancelados',
    label: 'CANCELADOS',
    color: '#11379a', // Admin Secondary (Deep Navy Blue)
    gradientId: 'grad-cancelados',
    valueFormatter: (val: number) => Math.round(val).toString(),
    weights: [0.0, 0.3, 0.1, 0.5, 0.2, 0.4, 1.0],
  },
  {
    id: 'clientes',
    label: 'NOVOS CLIENTES',
    color: '#3485d6', // Admin Blue
    gradientId: 'grad-clientes',
    valueFormatter: (val: number) => `+${Math.round(val)}`,
    weights: [0.05, 0.15, 0.35, 0.45, 0.65, 0.8, 1.0],
  },
  {
    id: 'leads',
    label: 'LEADS (VISITANTES)',
    color: '#44acee', // Admin Accent (Light Sky Blue)
    gradientId: 'grad-leads',
    valueFormatter: (val: number) => Math.round(val).toString(),
    weights: [0.15, 0.35, 0.55, 0.7, 0.6, 0.9, 1.0],
  },
]

// State to control active/visible series
const activeSeries = ref<Record<string, boolean>>({
  pedidos: true,
  cancelados: true,
  clientes: true,
  leads: true,
})

function toggleSeries(id: string): void {
  const activeCount = Object.values(activeSeries.value).filter(Boolean).length
  if (activeCount === 1 && activeSeries.value[id]) return
  activeSeries.value[id] = !activeSeries.value[id]
}

// Target values for each series
const targetValues = computed<Record<string, number>>(() => ({
  pedidos: props.pedidosFaturados,
  cancelados: props.cancelados,
  clientes: props.novosClientes,
  leads: props.leads,
}))

// Animation state
const animProgress = ref<number>(0)
let animFrameId: number | null = null

function triggerWaveAnimation(): void {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
  }
  animProgress.value = 0
  const startTime = performance.now()
  const duration = 1200

  function animate(now: number): void {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    // Smooth ease-out cubic curve
    animProgress.value = 1 - Math.pow(1 - progress, 3)

    if (progress < 1) {
      animFrameId = requestAnimationFrame(animate)
    } else {
      animFrameId = null
    }
  }

  animFrameId = requestAnimationFrame(animate)
}

watch(
  [() => props.pedidosFaturados, () => props.cancelados, () => props.novosClientes, () => props.leads, () => props.periodLabel],
  () => {
    triggerWaveAnimation()
  },
  { immediate: true },
)

onMounted(() => {
  triggerWaveAnimation()
})

onUnmounted(() => {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
  }
})

// Chart dimensions
const viewWidth = 720
const viewHeight = 200
const padding = { top: 20, right: 20, bottom: 35, left: 35 }
const innerWidth = viewWidth - padding.left - padding.right
const innerHeight = viewHeight - padding.top - padding.bottom

// X-axis time points
const xLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59']

// Calculate max Y value across all visible series to scale the chart dynamically
const maxY = computed<number>(() => {
  let maxVal = 10
  for (const s of seriesList) {
    if (activeSeries.value[s.id]) {
      const val = targetValues.value[s.id] ?? 0
      if (val > maxVal) maxVal = val
    }
  }
  return Math.ceil(maxVal * 1.15)
})

// Y-axis grid lines (4 ticks)
const yTicks = computed(() => {
  const max = maxY.value
  return [0, Math.round(max * 0.33), Math.round(max * 0.66), max]
})

// Calculate point coordinates for a series
function getSeriesPoints(series: SeriesConfig): { x: number; y: number; value: number }[] {
  const target = targetValues.value[series.id] ?? 0
  const count = series.weights.length

  return series.weights.map((weight, i) => {
    const x = padding.left + (i / (count - 1)) * innerWidth
    // Wave animation offset: adds a gentle fluid sine wave during rising animation
    const waveOffset = Math.sin(i * 0.8 + animProgress.value * Math.PI) * (1 - animProgress.value) * 12
    const currentVal = target * weight * animProgress.value
    const scaledVal = Math.max(0, currentVal + waveOffset)

    const y = padding.top + innerHeight - (scaledVal / maxY.value) * innerHeight
    return { x, y: Math.max(padding.top, Math.min(padding.top + innerHeight, y)), value: currentVal }
  })
}

// Generate smooth cubic bezier SVG path string from points
function createSmoothPath(points: { x: number; y: number }[]): string {
  const first = points[0]
  if (!first) return ''
  let d = `M ${first.x.toFixed(2)},${first.y.toFixed(2)}`

  // Índices sempre clampeados ao intervalo válido → elemento garantido.
  const at = (idx: number) => points[Math.max(0, Math.min(points.length - 1, idx))]!

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)

    const cp1x = p1.x + (p2.x - p0.x) * 0.18
    const cp1y = p1.y + (p2.y - p0.y) * 0.18
    const cp2x = p2.x - (p3.x - p1.x) * 0.18
    const cp2y = p2.y - (p3.y - p1.y) * 0.18

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }

  return d
}

// Generate closed area path for gradient fill under wave
function createAreaPath(points: { x: number; y: number }[]): string {
  const firstP = points[0]
  const lastP = points[points.length - 1]
  if (!firstP || !lastP) return ''
  const linePath = createSmoothPath(points)
  const bottomY = padding.top + innerHeight
  return `${linePath} L ${lastP.x.toFixed(2)},${bottomY} L ${firstP.x.toFixed(2)},${bottomY} Z`
}

// Hover / Tooltip logic
const hoverIndex = ref<number | null>(null)
const hoverX = computed<number | null>(() => {
  if (hoverIndex.value === null) return null
  return padding.left + (hoverIndex.value / (xLabels.length - 1)) * innerWidth
})

function onSvgMouseMove(e: MouseEvent): void {
  const svg = e.currentTarget as SVGSVGElement | null
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const relativeX = (mouseX / rect.width) * viewWidth - padding.left
  const index = Math.round((relativeX / innerWidth) * (xLabels.length - 1))
  hoverIndex.value = Math.max(0, Math.min(xLabels.length - 1, index))
}

function onSvgMouseLeave(): void {
  hoverIndex.value = null
}
</script>

<template>
  <article class="dash-card p-5 md:p-6 flex flex-col justify-between col-span-12 lg:col-span-7">
    <!-- Header: Icon Chip + Uppercase Eyebrow Title -->
    <div class="flex flex-col gap-4 mb-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Activity class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="eyebrow">ATIVIDADE & MÉTRICAS</p>
          <p class="text-xs text-text-muted mt-0.5">{{ periodLabel }}</p>
        </div>
      </div>

      <!-- 4 Legend Cards / Metric Pills (Minimalist Linear style matching Ticket Médio / Conversão) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          v-for="s in seriesList"
          :key="s.id"
          type="button"
          class="flex flex-col justify-center p-3 rounded-xl border transition-all cursor-pointer text-left select-none"
          :class="[
            activeSeries[s.id]
              ? 'bg-surface-raised/80 border-border opacity-100'
              : 'bg-surface-card border-border/40 opacity-40 hover:opacity-70'
          ]"
          @click="toggleSeries(s.id)"
        >
          <span class="text-[10px] font-bold uppercase tracking-wider text-text-muted truncate leading-none">
            {{ s.label }}
          </span>
          <span
            class="font-display text-base md:text-lg font-bold tabular-nums leading-tight mt-1.5"
            :style="{ color: activeSeries[s.id] ? s.color : 'var(--color-text-primary)' }"
          >
            {{ s.valueFormatter(targetValues[s.id] ?? 0) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Interactive Wave Chart SVG -->
    <div class="relative w-full overflow-hidden pt-2">
      <svg
        class="w-full h-auto overflow-visible cursor-crosshair select-none"
        :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
        preserveAspectRatio="xMidYMid meet"
        @mousemove="onSvgMouseMove"
        @mouseleave="onSvgMouseLeave"
      >
        <defs>
          <linearGradient
            v-for="s in seriesList"
            :id="s.gradientId"
            :key="s.gradientId"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" :stop-color="s.color" stop-opacity="0.25" />
            <stop offset="100%" :stop-color="s.color" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Horizontal Grid Lines & Y-Axis Ticks (Continuous, fine, clear border lines) -->
        <g class="stroke-border/60 text-text-muted text-[10px]">
          <g v-for="yVal in yTicks" :key="yVal">
            <line
              :x1="padding.left"
              :y1="padding.top + innerHeight - (yVal / maxY) * innerHeight"
              :x2="viewWidth - padding.right"
              :y2="padding.top + innerHeight - (yVal / maxY) * innerHeight"
              stroke="currentColor"
              stroke-width="1"
            />
            <text
              :x="padding.left - 8"
              :y="padding.top + innerHeight - (yVal / maxY) * innerHeight + 3"
              text-anchor="end"
              fill="currentColor"
              stroke="none"
              class="font-mono text-[9px] opacity-70"
            >
              {{ yVal }}
            </text>
          </g>
        </g>

        <!-- X-Axis Labels -->
        <g class="text-text-muted text-[10px]">
          <text
            v-for="(label, idx) in xLabels"
            :key="idx"
            :x="padding.left + (idx / (xLabels.length - 1)) * innerWidth"
            :y="viewHeight - 10"
            text-anchor="middle"
            fill="currentColor"
            class="font-mono text-[9px] opacity-70"
          >
            {{ label }}
          </text>
        </g>

        <!-- Wave Areas & Wave Lines -->
        <g v-for="s in seriesList" :key="s.id">
          <template v-if="activeSeries[s.id]">
            <!-- Area Gradient Fill -->
            <path
              :d="createAreaPath(getSeriesPoints(s))"
              :fill="`url(#${s.gradientId})`"
              class="transition-opacity duration-300 pointer-events-none"
            />
            <!-- Wave Stroke Line -->
            <path
              :d="createSmoothPath(getSeriesPoints(s))"
              fill="none"
              :stroke="s.color"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="transition-all duration-300 pointer-events-none"
            />

            <!-- Data Point Circles -->
            <circle
              v-for="(pt, pIdx) in getSeriesPoints(s)"
              :key="pIdx"
              :cx="pt.x"
              :cy="pt.y"
              :r="hoverIndex === pIdx ? 4.5 : 2.5"
              :fill="s.color"
              stroke="#ffffff"
              :stroke-width="hoverIndex === pIdx ? 2 : 1"
              class="transition-all duration-150 pointer-events-none"
            />
          </template>
        </g>

        <!-- Hover Crosshair Line -->
        <g v-if="hoverX !== null" class="pointer-events-none">
          <line
            :x1="hoverX"
            :y1="padding.top"
            :x2="hoverX"
            :y2="padding.top + innerHeight"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-dasharray="4 4"
            class="text-admin-primary/60 dark:text-admin-accent/60"
          />
        </g>
      </svg>

      <!-- Hover Tooltip Overlay (No shadow) -->
      <div
        v-if="hoverIndex !== null"
        class="absolute top-2 pointer-events-none z-20 bg-surface-card/95 backdrop-blur-xs border border-border/80 rounded-xl p-2.5 text-xs flex flex-col gap-1 transition-all duration-75"
        :style="{
          left: `${Math.min(80, Math.max(10, (hoverX! / viewWidth) * 100))}%`,
          transform: 'translateX(-50%)'
        }"
      >
        <p class="text-[10px] font-bold text-text-muted border-b border-border/50 pb-1 uppercase tracking-wider">
          Horário: {{ xLabels[hoverIndex] }}
        </p>
        <div
          v-for="s in seriesList"
          :key="s.id"
          class="flex items-center justify-between gap-3 text-[11px]"
        >
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: s.color }" />
            <span class="font-medium text-text-muted">{{ s.label }}:</span>
          </div>
          <span class="font-bold text-text-primary tabular-nums">
            {{ s.valueFormatter(getSeriesPoints(s)[hoverIndex]?.value ?? 0) }}
          </span>
        </div>
      </div>
    </div>
  </article>
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
</style>

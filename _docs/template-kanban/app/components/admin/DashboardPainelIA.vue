<script setup lang="ts">
import {
  Bot,
  Loader2,
  Workflow,
  Wallet,
  Sparkles,
  BotMessageSquare,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from '@lucide/vue'
import type { DashboardPeriod } from '~~/shared/types/dashboard'
import { DASHBOARD_PERIOD_LABELS } from '~~/shared/types/dashboard'
import { LAB_PERSONA_META, labPersonaLabel, JUDGE_FINDING_TYPE_LABELS } from '~~/shared/types/lab'

interface AiMetrics {
  turnos: number
  promptTokens: number
  completionTokens: number
  latenciaMediaMs: number
  roundsMedio: number
  custoUsd: number
}

interface ChurnSummary {
  low: number
  medium: number
  high: number
  critical: number
  no_orders: number
}

interface AchadoRecorrenteExemplo {
  evidencia: string
  sugestao?: string
}

interface AchadoRecorrente {
  tipo: string
  total: number
  exemplos: AchadoRecorrenteExemplo[]
}

interface QualityMetrics {
  total: number
  /**
   * % por veredito do Judge (conformidade do AGENTE às regras — alucinação,
   * formato, tom, fora do briefing, deveria escalar) — não é "tarefa
   * concluída" nem "cliente frustrado". Corrigido em 2026-08-04: os campos
   * antigos ligavam esses rótulos ao veredito, mas o veredito mede outra
   * coisa (confirmado com dado real: vermelho ali era 100% causado por
   * `alucinacao`, nunca por `tom`).
   */
  percentualVerde: number
  percentualAmarelo: number
  percentualVermelho: number
  scoreQualidade: number
  achadosRecorrentes: AchadoRecorrente[]
}

// ── Laboratório de avaliação sob demanda (§6/§8 fase 6 do PRD) ────────────
interface LabFinding {
  tipo: string
  evidencia: string
  sugestao?: string
}

interface LabRunSummary {
  id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  score: number | null
  erro: string | null
  iniciado_em: string
  finalizado_em: string | null
}

interface LabAvaliacao {
  persona: string | null
  status: string
  veredicto: 'verde' | 'amarelo' | 'vermelho' | null
  achados: LabFinding[] | null
  tokens_avaliacao: number | null
  avaliado_em: string
}

interface LabRunDetail {
  run: LabRunSummary
  avaliacoes: LabAvaliacao[]
}

interface Props {
  aiMetrics: AiMetrics
  aiChurn: ChurnSummary
  aiQuality: QualityMetrics
  labCurrentRun: LabRunDetail | null
  labStarting: boolean
  evaluateNowRunning: boolean
  valorVisivel: boolean
  selectedPeriod: DashboardPeriod
}

defineProps<Props>()

const emit = defineEmits<{
  startLabRun: []
  evaluateNow: []
}>()

const { formatCurrency } = useFormatters()

const valorMascarado = '••••••'

// Taxa de conversão USD -> BRL para projeção de custo do agente
const USD_TO_BRL_RATE = 5.70

function formatBrlCost(costUsd: number): string {
  const costBrl = costUsd * USD_TO_BRL_RATE
  if (costBrl <= 0) return 'R$ 0,00'
  if (costBrl < 0.01) return `R$ ${costBrl.toFixed(4).replace('.', ',')}`
  return formatCurrency(costBrl)
}

function veredictoLabel(v: LabAvaliacao['veredicto']): string {
  return v === 'verde' ? 'Verde' : v === 'amarelo' ? 'Amarelo' : v === 'vermelho' ? 'Vermelho' : 'Sem julgamento'
}

function veredictoClasse(v: LabAvaliacao['veredicto']): string {
  return v === 'verde'
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    : v === 'amarelo'
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
      : v === 'vermelho'
        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
        : 'bg-surface-raised text-text-muted'
}
</script>

<template>
  <!-- LINHA 1 — 4 KPI cards de IA -->
  <section class="grid grid-cols-12 gap-5">

    <!-- Turnos do agente -->
    <article class="dash-card col-span-12 sm:col-span-6 lg:col-span-3 p-5 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Bot class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="eyebrow">TURNOS DO AGENTE</p>
          <p class="text-xs text-text-muted mt-0.5">{{ DASHBOARD_PERIOD_LABELS[selectedPeriod] }}</p>
        </div>
      </div>
      <p class="font-display text-3xl font-bold tabular-nums text-text-primary" style="font-feature-settings: 'tnum' 1;">
        {{ aiMetrics.turnos.toLocaleString('pt-BR') }}
      </p>
    </article>

    <!-- Latência média (ícone: Loader2) -->
    <article class="dash-card col-span-12 sm:col-span-6 lg:col-span-3 p-5 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Loader2 class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="eyebrow">LATÊNCIA MÉDIA</p>
          <p class="text-xs text-text-muted mt-0.5">Tempo de resposta</p>
        </div>
      </div>
      <p class="font-display text-3xl font-bold tabular-nums text-text-primary" style="font-feature-settings: 'tnum' 1;">
        {{ aiMetrics.latenciaMediaMs.toLocaleString('pt-BR') }}
        <span class="text-base font-normal text-text-muted">ms</span>
      </p>
    </article>

    <!-- Rounds médios (ícone: Workflow) -->
    <article class="dash-card col-span-12 sm:col-span-6 lg:col-span-3 p-5 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Workflow class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="eyebrow">ROUNDS MÉDIOS</p>
          <p class="text-xs text-text-muted mt-0.5">Tool calls por resposta</p>
        </div>
      </div>
      <p class="font-display text-3xl font-bold tabular-nums text-text-primary" style="font-feature-settings: 'tnum' 1;">
        {{ aiMetrics.roundsMedio > 0 ? aiMetrics.roundsMedio.toFixed(1) : '–' }}
        <span class="text-base font-normal text-text-muted">/ 8</span>
      </p>
    </article>

    <!-- Custo estimado (convertido para Real Brasileiro) -->
    <article class="dash-card col-span-12 sm:col-span-6 lg:col-span-3 p-5 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Wallet class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="eyebrow">CUSTO ESTIMADO</p>
          <p class="text-xs text-text-muted mt-0.5">Real Brasileiro (R$)</p>
        </div>
      </div>
      <p
        class="font-display text-3xl font-bold tabular-nums text-text-primary"
        style="font-feature-settings: 'tnum' 1;"
        :aria-live="valorVisivel ? 'polite' : 'off'"
      >
        {{ valorVisivel
          ? formatBrlCost(aiMetrics.custoUsd)
          : valorMascarado
        }}
      </p>
      <p class="text-[10px] text-text-muted">
        {{ aiMetrics.promptTokens.toLocaleString('pt-BR') }}k input · {{ aiMetrics.completionTokens.toLocaleString('pt-BR') }}k output
      </p>
    </article>
  </section>

  <!-- LINHA 2 — Saúde da Base + Tokens -->
  <section class="grid grid-cols-12 gap-5">

    <!-- Saúde da Base de Clientes (ícone: Sparkles) -->
    <article class="dash-card col-span-12 lg:col-span-6 p-6 flex flex-col">
      <header class="flex items-center gap-3 mb-5">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Sparkles class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">SAÚDE DA BASE</p>
          <p class="text-xs text-text-muted mt-0.5">Distribuição de risco de churn</p>
        </div>
      </header>

      <div
        v-if="aiChurn.low + aiChurn.medium + aiChurn.high + aiChurn.critical + aiChurn.no_orders > 0"
        class="space-y-3 flex-1"
      >
        <div
          v-for="item in [
            { key: 'low',      label: 'Baixo risco',     color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-400', count: aiChurn.low },
            { key: 'medium',   label: 'Risco médio',     color: 'bg-amber-400',   textColor: 'text-amber-700 dark:text-amber-400',   count: aiChurn.medium },
            { key: 'high',     label: 'Risco alto',      color: 'bg-orange-500',  textColor: 'text-orange-700 dark:text-orange-400',  count: aiChurn.high },
            { key: 'critical', label: 'Crítico',         color: 'bg-red-500',     textColor: 'text-red-700 dark:text-red-400',     count: aiChurn.critical },
            { key: 'no_orders',label: 'Sem pedidos',     color: 'bg-text-muted/30', textColor: 'text-text-muted',                 count: aiChurn.no_orders },
          ]"
          :key="item.key"
          class="space-y-1"
        >
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-text-secondary">{{ item.label }}</span>
            <span :class="item.textColor" class="font-semibold tabular-nums">{{ item.count }}</span>
          </div>
          <div class="track">
            <div
              :class="item.color"
              class="bar motion-reduce:transition-none"
              :style="{
                width: `${(aiChurn.low + aiChurn.medium + aiChurn.high + aiChurn.critical + aiChurn.no_orders) > 0
                  ? (item.count / (aiChurn.low + aiChurn.medium + aiChurn.high + aiChurn.critical + aiChurn.no_orders)) * 100
                  : 0}%`
              }"
            />
          </div>
        </div>
      </div>
      <div v-else class="flex-1 flex items-center justify-center text-sm text-text-muted italic py-10">
        Nenhum cliente com inteligência calculada ainda.
      </div>
    </article>

    <!-- Tokens consumidos (ícone: BotMessageSquare) -->
    <article class="dash-card col-span-12 lg:col-span-6 p-6 flex flex-col">
      <header class="flex items-center gap-3 mb-5">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <BotMessageSquare class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">TOKENS CONSUMIDOS</p>
          <p class="text-xs text-text-muted mt-0.5">{{ DASHBOARD_PERIOD_LABELS[selectedPeriod] }}</p>
        </div>
      </header>

      <div v-if="aiMetrics.turnos > 0" class="space-y-4 flex-1">
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg bg-surface-raised/80 border border-border/60 px-4 py-3 flex flex-col gap-1">
            <p class="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Input (prompt)</p>
            <p class="text-lg font-bold tabular-nums text-text-primary" style="font-feature-settings: 'tnum' 1;">
              {{ aiMetrics.promptTokens >= 1000
                ? `${(aiMetrics.promptTokens / 1000).toFixed(1)}k`
                : aiMetrics.promptTokens }}
            </p>
          </div>
          <div class="rounded-lg bg-surface-raised/80 border border-border/60 px-4 py-3 flex flex-col gap-1">
            <p class="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Output (completion)</p>
            <p class="text-lg font-bold tabular-nums text-text-primary" style="font-feature-settings: 'tnum' 1;">
              {{ aiMetrics.completionTokens >= 1000
                ? `${(aiMetrics.completionTokens / 1000).toFixed(1)}k`
                : aiMetrics.completionTokens }}
            </p>
          </div>
        </div>
        <div class="rounded-lg bg-surface-raised/80 border border-border/60 px-4 py-3 flex items-center justify-between">
          <p class="text-xs font-semibold text-text-secondary">Total</p>
          <p class="text-base font-bold tabular-nums text-text-primary" style="font-feature-settings: 'tnum' 1;">
            {{ (aiMetrics.promptTokens + aiMetrics.completionTokens >= 1000
              ? `${((aiMetrics.promptTokens + aiMetrics.completionTokens) / 1000).toFixed(1)}k`
              : aiMetrics.promptTokens + aiMetrics.completionTokens) }}
            tokens
          </p>
        </div>
        <div class="flex items-center justify-between border-t border-border pt-3">
          <p class="text-xs text-text-muted">Custo estimado em Reais (R$)</p>
          <p class="text-sm font-bold tabular-nums text-brand-green">
            {{ valorVisivel ? formatBrlCost(aiMetrics.custoUsd) : valorMascarado }}
          </p>
        </div>
      </div>
      <div v-else class="flex-1 flex items-center justify-center text-sm text-text-muted italic py-10">
        Nenhum turno registrado no período.
      </div>
    </article>
  </section>

  <!-- LINHA 3 — Qualidade (LLM-as-a-Judge) -->
  <section class="grid grid-cols-12 gap-5">

    <!-- Conversas sem problema (veredito verde) -->
    <article class="dash-card col-span-12 sm:col-span-4 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <CheckCircle2 class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">CONVERSAS SEM PROBLEMA</p>
          <p class="text-xs text-text-muted mt-0.5">Veredito verde do Judge</p>
        </div>
      </div>

      <div v-if="aiQuality.total > 0" class="space-y-2">
        <p
          class="font-display text-4xl font-bold tabular-nums"
          :class="aiQuality.percentualVerde >= 70 ? 'text-brand-green' : aiQuality.percentualVerde >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'"
          style="font-feature-settings: 'tnum' 1;"
        >
          {{ aiQuality.percentualVerde }}%
        </p>
        <div class="track">
          <div
            class="bar transition-all duration-700"
            :class="aiQuality.percentualVerde >= 70 ? 'bg-emerald-500' : aiQuality.percentualVerde >= 50 ? 'bg-amber-400' : 'bg-red-500'"
            :style="{ width: `${aiQuality.percentualVerde}%` }"
          />
        </div>
        <p class="text-[10px] text-text-muted">{{ aiQuality.total }} turnos avaliados</p>
      </div>
      <div v-else class="flex-1 flex flex-col items-center justify-center text-center py-6 gap-2">
        <Sparkles class="w-8 h-8 text-text-muted/40" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Aguardando avaliações do Judge</p>
        <p class="text-[10px] text-text-muted/70">Configurar em Configurações → Agente IA</p>
      </div>
    </article>

    <!-- Achados críticos (veredito vermelho — alucinação, fora do briefing ou dano ao cliente) -->
    <article class="dash-card col-span-12 sm:col-span-4 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <AlertTriangle class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">ACHADOS CRÍTICOS</p>
          <p class="text-xs text-text-muted mt-0.5">Veredito vermelho — ver "Achados Recorrentes" abaixo para a causa</p>
        </div>
      </div>

      <div v-if="aiQuality.total > 0" class="space-y-2">
        <p
          class="font-display text-4xl font-bold tabular-nums"
          :class="aiQuality.percentualVermelho <= 10 ? 'text-brand-green' : aiQuality.percentualVermelho <= 25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'"
          style="font-feature-settings: 'tnum' 1;"
        >
          {{ aiQuality.percentualVermelho }}%
        </p>
        <div class="track">
          <div
            class="bar transition-all duration-700"
            :class="aiQuality.percentualVermelho <= 10 ? 'bg-emerald-500' : aiQuality.percentualVermelho <= 25 ? 'bg-amber-400' : 'bg-red-500'"
            :style="{ width: `${aiQuality.percentualVermelho}%` }"
          />
        </div>
        <p class="text-[10px] text-text-muted">Meta: abaixo de 10%</p>
      </div>
      <div v-else class="flex-1 flex flex-col items-center justify-center text-center py-6 gap-2">
        <Sparkles class="w-8 h-8 text-text-muted/40" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Aguardando avaliações do Judge</p>
      </div>
    </article>

    <!-- Score de Qualidade (ícone: Sparkles) -->
    <article class="dash-card col-span-12 sm:col-span-4 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Sparkles class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">SCORE DE QUALIDADE</p>
          <p class="text-xs text-text-muted mt-0.5">Média 0–10 (Judge)</p>
        </div>
      </div>

      <div v-if="aiQuality.total > 0" class="space-y-2">
        <p
          class="font-display text-4xl font-bold tabular-nums"
          :class="aiQuality.scoreQualidade >= 7 ? 'text-brand-green' : aiQuality.scoreQualidade >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'"
          style="font-feature-settings: 'tnum' 1;"
        >
          {{ aiQuality.scoreQualidade.toFixed(1) }}
        </p>
        <div class="track">
          <div
            class="bar transition-all duration-700"
            :class="aiQuality.scoreQualidade >= 7 ? 'bg-emerald-500' : aiQuality.scoreQualidade >= 5 ? 'bg-amber-400' : 'bg-red-500'"
            :style="{ width: `${(aiQuality.scoreQualidade / 10) * 100}%` }"
          />
        </div>
        <p class="text-[10px] text-text-muted">Baseado em {{ aiQuality.total }} avaliações do período</p>
      </div>
      <div v-else class="flex-1 flex flex-col items-center justify-center text-center py-6 gap-2">
        <Sparkles class="w-8 h-8 text-text-muted/40" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Aguardando avaliações do Judge</p>
      </div>
    </article>
  </section>

  <!-- LINHA 4 — Achados recorrentes do agente (produção) -->
  <section class="grid grid-cols-12 gap-5">
    <article class="dash-card col-span-12 p-6 flex flex-col gap-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
            <FileText class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
          </div>
          <div>
            <p class="eyebrow">ACHADOS RECORRENTES DO AGENTE</p>
            <p class="text-xs text-text-muted mt-0.5">O que o Judge apontou nas conversas reais do período — não é dica de negócio, é ajuste de configuração do agente</p>
          </div>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg bg-admin-primary hover:bg-admin-secondary text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:cursor-not-allowed shrink-0"
          :disabled="evaluateNowRunning"
          title="Roda o avaliador agora, sem esperar o próximo ciclo do cron (15 min)"
          @click="emit('evaluateNow')"
        >
          <Loader2 v-if="evaluateNowRunning" class="w-4 h-4 animate-spin" aria-hidden="true" />
          {{ evaluateNowRunning ? 'Avaliando…' : 'Avaliar agora' }}
        </button>
      </div>

      <div v-if="aiQuality.total === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <Sparkles class="w-8 h-8 text-text-muted/40" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Ainda sem dado suficiente — nenhuma avaliação de produção no período</p>
      </div>
      <div v-else-if="aiQuality.achadosRecorrentes.length === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <CheckCircle2 class="w-8 h-8 text-brand-green/60" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Nenhum achado categorizado nas {{ aiQuality.total }} avaliações do período</p>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="achado in aiQuality.achadosRecorrentes"
          :key="achado.tipo"
          class="rounded-lg bg-surface-raised/80 border border-border/60 p-4 flex flex-col gap-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-text-primary">{{ JUDGE_FINDING_TYPE_LABELS[achado.tipo] ?? achado.tipo }}</span>
            <span class="tabular-nums text-xs font-bold rounded-full bg-admin-primary/10 dark:bg-admin-accent/20 text-admin-primary dark:text-admin-accent px-2.5 py-1">
              {{ achado.total }}×
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <div
              v-for="(exemplo, idx) in achado.exemplos"
              :key="idx"
              class="text-xs border-l-2 border-border pl-3 py-0.5"
            >
              <p class="text-text-secondary italic">"{{ exemplo.evidencia }}"</p>
              <p v-if="exemplo.sugestao" class="text-text-muted mt-1">
                <span class="font-semibold">Sugestão:</span> {{ exemplo.sugestao }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  </section>

  <!-- LINHA 5 — Laboratório de avaliação sob demanda -->
  <section class="grid grid-cols-12 gap-5">
    <article class="dash-card col-span-12 p-6 flex flex-col gap-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
            <Bot class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
          </div>
          <div>
            <p class="eyebrow">LABORATÓRIO DE AVALIAÇÃO</p>
            <p class="text-xs text-text-muted mt-0.5">
              {{ LAB_PERSONA_META.length }} personas roteirizadas rodam contra o agente real, sob demanda
            </p>
          </div>
        </div>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-admin-primary hover:bg-admin-secondary text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
          :disabled="labStarting || labCurrentRun?.run.status === 'running'"
          @click="emit('startLabRun')"
        >
          <Loader2 v-if="labStarting || labCurrentRun?.run.status === 'running'" class="w-4 h-4 animate-spin" aria-hidden="true" />
          {{ labCurrentRun?.run.status === 'running' ? 'Rodando…' : 'Rodar laboratório' }}
        </button>
      </div>

      <div v-if="labCurrentRun" class="flex flex-col gap-4">
        <div class="flex items-center gap-4 flex-wrap">
          <p
            v-if="labCurrentRun.run.status === 'done'"
            class="font-display text-3xl font-bold tabular-nums"
            :class="(labCurrentRun.run.score ?? 0) >= 70 ? 'text-brand-green' : (labCurrentRun.run.score ?? 0) >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ labCurrentRun.run.score }}<span class="text-base font-medium text-text-muted">/100</span>
          </p>
          <p v-else-if="labCurrentRun.run.status === 'failed'" class="text-sm font-semibold text-red-600 dark:text-red-400">
            Corrida falhou{{ labCurrentRun.run.erro ? `: ${labCurrentRun.run.erro}` : '' }}
          </p>
          <p v-else class="text-sm text-text-muted italic flex items-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin" aria-hidden="true" />
            {{ labCurrentRun.avaliacoes.length }}/{{ LAB_PERSONA_META.length }} personas concluídas
          </p>
          <p class="text-xs text-text-muted">
            Iniciada em {{ new Date(labCurrentRun.run.iniciado_em).toLocaleString('pt-BR') }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="avaliacao in labCurrentRun.avaliacoes"
            :key="avaliacao.persona ?? ''"
            class="rounded-lg bg-surface-raised/80 border border-border/60 p-4 flex flex-col gap-2"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-text-primary">{{ labPersonaLabel(avaliacao.persona) }}</p>
              <span class="text-[10px] font-bold uppercase rounded-full px-2 py-0.5" :class="veredictoClasse(avaliacao.veredicto)">
                {{ veredictoLabel(avaliacao.veredicto) }}
              </span>
            </div>
            <ul v-if="avaliacao.achados && avaliacao.achados.length > 0" class="flex flex-col gap-1.5">
              <li v-for="(achado, idx) in avaliacao.achados" :key="idx" class="text-xs text-text-secondary">
                <span class="font-semibold text-text-primary">{{ JUDGE_FINDING_TYPE_LABELS[achado.tipo] ?? achado.tipo }}:</span>
                "{{ achado.evidencia }}"
                <span v-if="achado.sugestao" class="block text-text-muted italic mt-0.5">Sugestão: {{ achado.sugestao }}</span>
              </li>
            </ul>
            <p v-else-if="avaliacao.status === 'done'" class="text-xs text-text-muted italic">Sem achados — conversa sem problema relevante.</p>
            <p v-else class="text-xs text-text-muted italic">{{ avaliacao.status === 'judge_failed' ? 'O juiz falhou ao avaliar esta persona.' : 'Esta persona falhou ao rodar.' }}</p>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-text-muted italic">Nenhuma corrida ainda. Clique em "Rodar laboratório" para a primeira.</p>
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

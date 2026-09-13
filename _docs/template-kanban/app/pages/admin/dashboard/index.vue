<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { CalendarDays, RefreshCw } from '@lucide/vue'
import { useCookie } from 'nuxt/app'
import type {
  DashboardMetrics,
  DashboardCounts,
  TopProdutoItem,
  FunnelStep,
  TopCategoriaItem,
  TopProdutoClickItem,
  DashboardPeriod,
} from '~~/shared/types/dashboard'
import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABELS } from '~~/shared/types/dashboard'
import type { KanbanColunaRow } from '~~/shared/types/order'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: 'admin' })

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()

const loading = ref<boolean>(true)

// ── Aba ativa do dashboard ────────────────────────────────────────────────
type DashboardView = 'operacional' | 'ia' | 'insights'
const activeView = ref<DashboardView>('operacional')

// ── Tipos e state da aba Investimento IA ─────────────────────────────────
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

// ── Aba Insights de Negócio (Iniciativa B, Grupo 1 — §2.2 do PRD) ─────────
interface AfinidadePar {
  produtoAId: string
  produtoBId: string
  coOcorrencias: number
  lift: number
}

interface AfinidadeCestaResponse {
  pares: AfinidadePar[]
  produtos: Record<string, string>
  totalPedidosConsiderados: number
}

interface ProdutoCandidato {
  produtoId: string
  nome: string
  precoVenda: number
  margemLucroPct: number
  lucroUnitario: number
  quantidadeVendida: number
  score: number
}

interface MargemAltaVendaBaixaResponse {
  candidatos: ProdutoCandidato[]
}

interface ClienteEmRisco {
  customerId: string
  nome: string | null
  whatsapp: string | null
  churnRisk: 'low' | 'medium' | 'high' | 'critical' | 'no_orders'
  rfmSegment: 'champion' | 'loyal' | 'at_risk' | 'dormant' | 'new' | null
  avgTicket: number
  score: number
}

interface DominanteComPct {
  valor: string
  pct: number
}

interface PerfilSegmento {
  segmento: 'champion' | 'loyal' | 'at_risk' | 'dormant' | 'new'
  totalClientes: number
  ticketMedio: number | null
  pagamentoDominante: DominanteComPct | null
  entregaDominante: DominanteComPct | null
  diaPicoDominante: DominanteComPct | null
  horaPicoDominante: DominanteComPct | null
}

interface SegmentacaoClientesResponse {
  listaRisco: ClienteEmRisco[]
  perfilPorSegmento: PerfilSegmento[]
}

interface EstoqueMinimoCandidato {
  id: string
  nome: string
  tipo: 'produto' | 'insumo'
  estoqueAtual: number
  estoqueMinimo: number
}

interface EstoqueMinimoResponse {
  candidatos: EstoqueMinimoCandidato[]
}

const aiMetrics = ref<AiMetrics>({
  turnos: 0,
  promptTokens: 0,
  completionTokens: 0,
  latenciaMediaMs: 0,
  roundsMedio: 0,
  custoUsd: 0,
})

const aiChurn = ref<ChurnSummary>({
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
  no_orders: 0,
})

const aiQuality = ref<QualityMetrics>({
  total: 0,
  percentualVerde: 0,
  percentualAmarelo: 0,
  percentualVermelho: 0,
  scoreQualidade: 0,
  achadosRecorrentes: [],
})

const aiLoading = ref(false)
let aiDataLoaded = false

const afinidadeCesta = ref<AfinidadeCestaResponse>({ pares: [], produtos: {}, totalPedidosConsiderados: 0 })
const margemAltaVendaBaixa = ref<MargemAltaVendaBaixaResponse>({ candidatos: [] })
const segmentacaoClientes = ref<SegmentacaoClientesResponse>({ listaRisco: [], perfilPorSegmento: [] })
const estoqueMinimo = ref<EstoqueMinimoResponse>({ candidatos: [] })
const insightsLoading = ref(false)
let insightsDataLoaded = false

const labRuns = ref<LabRunSummary[]>([])
const labCurrentRun = ref<LabRunDetail | null>(null)
const labStarting = ref(false)
let labPollTimer: ReturnType<typeof setTimeout> | null = null

// ── Avaliação sob demanda (§4.3 fase C3 do PRD de achados recorrentes) ────
const evaluateNowRunning = ref(false)

// ── Métricas principais (RPC get_dashboard_metrics) ───────────────────────
const metrics = ref<DashboardMetrics>({
  faturamento: 0,
  total_pedidos: 0,
  ticket_medio: 0,
})

// ── Contadores auxiliares (RPC get_dashboard_counts) ──────────────────────
const counts = ref<DashboardCounts>({
  cancelados: 0,
  em_aberto: 0,
  clientes_novos: 0,
  leads: 0,
  produtos_ativos: 0,
})

// ── Top produtos (RPC get_top_produtos) ───────────────────────────────────
const topProdutos = ref<TopProdutoItem[]>([])

// ── Observabilidade interna ───────────────────────────────────────────────
const topCategorias = ref<TopCategoriaItem[]>([])
const topProdutosClick = ref<TopProdutoClickItem[]>([])
// Etapas web do funil (page_view → add_to_cart → checkout_iniciado) vindas da RPC.
// A etapa final de pedidos reais é anexada em `funilEtapas` a partir das métricas.
const funilEventStages = ref<FunnelStep[]>([])

/**
 * Funil completo, reconciliado com o faturamento: as 3 etapas web + a etapa
 * final = PEDIDOS REAIS do período (`metrics.total_pedidos`, mesma base do card
 * de faturamento). Assim os dois cards contam a MESMA conversão — o funil valida
 * o que de fato converteu. Vazio até as etapas web carregarem (mostra o estado
 * "sem eventos"). Ver migration 076.
 */
const funilEtapas = computed<FunnelStep[]>(() => {
  if (funilEventStages.value.length === 0) return []
  return [...funilEventStages.value, { etapa: 'pedido', total: metrics.value.total_pedidos }]
})

// ── Kanban columns + seletor de status de receita ────────────────────────
type KanbanOption = Pick<KanbanColunaRow, 'chave' | 'label' | 'is_revenue_trigger'>
const allKanbanColumns = ref<KanbanOption[]>([])
const savingRevenue = ref<boolean>(false)

const revenueChave = computed<string>(
  () => allKanbanColumns.value.find((c) => c.is_revenue_trigger)?.chave ?? '',
)

// ── Visibilidade do faturamento (cookie SSR-safe) ─────────────────────────
const valorVisivel = useCookie<boolean>('dashboard:faturamento_visivel', {
  default: () => true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
})
const toggleValorVisivel = (): void => { valorVisivel.value = !valorVisivel.value }

// ── Seletor de período ────────────────────────────────────────────────────
const selectedPeriod = ref<DashboardPeriod>('today')
const customFrom = ref<string>('')
const customTo = ref<string>('')

const isToday  = computed(() => selectedPeriod.value === 'today')
const isCustom = computed(() => selectedPeriod.value === 'custom')

const customRangeValid = computed<boolean>(() =>
  isCustom.value
    ? customFrom.value !== '' && customTo.value !== '' && customFrom.value <= customTo.value
    : true,
)

/** Returns today's date as YYYY-MM-DD in America/Sao_Paulo, avoiding UTC drift. */
function todaySP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00') // noon avoids DST edge-cases
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Date range for the current period, in YYYY-MM-DD (SP timezone).
 * Returns null when custom period is selected but not yet fully valid.
 * The server converts these dates to timestamptz at SP midnight.
 */
function periodDateRange(): { dateStart: string; dateEnd: string } | null {
  const today = todaySP()
  switch (selectedPeriod.value) {
    case 'today':     return { dateStart: today, dateEnd: today }
    case 'yesterday': return { dateStart: offsetDate(today, -1), dateEnd: offsetDate(today, -1) }
    case '7d':        return { dateStart: offsetDate(today, -6), dateEnd: today }
    case '30d':       return { dateStart: offsetDate(today, -29), dateEnd: today }
    case 'custom':    return customRangeValid.value
      ? { dateStart: customFrom.value, dateEnd: customTo.value }
      : null
  }
}

// ── Carregamento de dados ─────────────────────────────────────────────────

async function loadKanbanColumns(): Promise<void> {
  const { data } = await supabase
    .from('kanban_column')
    .select('chave:key, label, is_revenue_trigger')
    .order('sort_order')
  allKanbanColumns.value = (data ?? []) as KanbanOption[]
}

/** Persists the selected revenue status: sets chosen to true, all others to false. */
async function setRevenueStatus(chave: string): Promise<void> {
  if (savingRevenue.value || chave === revenueChave.value) return
  savingRevenue.value = true

  // Optimistic update so the dropdown reflects change immediately
  allKanbanColumns.value = allKanbanColumns.value.map((c) => ({
    ...c,
    is_revenue_trigger: c.chave === chave,
  }))

  const { error } = await supabase.rpc('set_revenue_status', { p_key: chave })
  if (error) {
    notify.error('Falha ao salvar status de receita', error.message)
    // Revert optimistic update
    await loadKanbanColumns()
  } else {
    await loadMetrics()
  }
  savingRevenue.value = false
}

async function loadMetrics(): Promise<void> {
  const range = periodDateRange()
  if (!range) return
  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    p_date_start: range.dateStart,
    p_date_end:   range.dateEnd,
  })
  if (error) {
    notify.error('Falha ao carregar métricas', error.message)
    return
  }
  const row = (Array.isArray(data) ? data[0] : data) ?? null
  if (row) {
    metrics.value = {
      faturamento:   Number(row.faturamento    ?? 0),
      total_pedidos: Number(row.total_orders   ?? 0),
      ticket_medio:  Number(row.average_ticket ?? 0),
    }
  }
}

async function loadCounts(): Promise<void> {
  const range = periodDateRange()
  if (!range) return
  const { data, error } = await supabase.rpc('get_dashboard_counts', {
    p_date_start: range.dateStart,
    p_date_end:   range.dateEnd,
  })
  if (error) {
    notify.error('Falha ao carregar contadores', error.message)
    return
  }
  const row = (Array.isArray(data) ? data[0] : data) as DashboardCounts | null
  if (row) {
    counts.value = {
      cancelados:     Number(row.cancelados     ?? 0),
      em_aberto:      Number(row.em_aberto      ?? 0),
      clientes_novos: Number(row.clientes_novos ?? 0),
      leads:          Number(row.leads          ?? 0),
      produtos_ativos:Number(row.produtos_ativos?? 0),
    }
  }
}

async function loadTopProdutos(): Promise<void> {
  const range = periodDateRange()
  if (!range) return
  const { data, error } = await supabase.rpc('get_top_products', {
    p_date_start: range.dateStart,
    p_date_end:   range.dateEnd,
    p_limit:      5,
  })
  if (error) {
    notify.error('Falha ao carregar top produtos', error.message)
    return
  }
  topProdutos.value = (data ?? []).map((r) => ({
    produto_id: r.product_id,
    nome:       r.name,
    qtde:       Number(r.qtde),
  }))
}

async function loadObservabilidade(): Promise<void> {
  const range = periodDateRange()
  if (!range) return
  // Categorias e produtos vistos são observabilidade em tempo real (24h fixas,
  // rotuladas na UI). O funil segue o PERÍODO selecionado para reconciliar com
  // o faturamento (ambos na mesma janela).
  const [categoriasRes, produtosClickRes, funilRes] = await Promise.all([
    supabase.rpc('get_top_categories',       { p_hours: 24, p_limit: 5 }),
    supabase.rpc('get_top_clicked_products', { p_hours: 24, p_limit: 5 }),
    supabase.rpc('get_conversion_funnel',    { p_date_start: range.dateStart, p_date_end: range.dateEnd }),
  ])
  const firstError = categoriasRes.error ?? produtosClickRes.error ?? funilRes.error
  if (firstError) {
    notify.error('Falha ao carregar observabilidade', firstError.message)
    return
  }
  topCategorias.value    = (categoriasRes.data ?? []) as unknown as TopCategoriaItem[]
  topProdutosClick.value = (produtosClickRes.data ?? []).map((r) => ({
    produto_id: r.product_id,
    nome:       r.name,
    total:      Number(r.total),
  }))
  funilEventStages.value = (funilRes.data ?? []) as unknown as FunnelStep[]
}

const refreshing = ref<boolean>(false)
let autoRefreshInterval: ReturnType<typeof setInterval> | null = null

// Rajadas de realtime (vários pedidos em segundos) disparariam vários
// `loadAllData` concorrentes, 4 RPCs cada, e a resposta mais lenta poderia
// sobrescrever a mais recente. O auto-refresh de 30s cobre o que for descartado.
let loadInFlight = false

async function loadAllData(silent = false): Promise<void> {
  if (loadInFlight) return
  loadInFlight = true

  if (silent) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  try {
    await Promise.all([
      loadMetrics(),
      loadCounts(),
      loadTopProdutos(),
      loadObservabilidade(),
    ])
  } finally {
    loadInFlight = false
    loading.value = false
    refreshing.value = false
  }
}

// ── Carregamento da aba Investimento IA (lazy — só na primeira troca) ─────

/** Métricas de qualidade: já vêm agregadas pela rota (a agregação é lá porque `resumo` é texto de debugging e não deve atravessar a rede). */
function fetchAiQuality(range: { dateStart: string, dateEnd: string }): Promise<QualityMetrics> {
  return $fetch<QualityMetrics>('/api/admin/dashboard/ai-quality', {
    query: { dateStart: range.dateStart, dateEnd: range.dateEnd },
  })
}

async function loadAiMetrics(): Promise<void> {
  const range = periodDateRange()
  if (!range) return
  aiLoading.value = true
  try {
    // Rota de API, não client Supabase, para `agente_uso_tokens` e
    // `agente_avaliacao_turnos`: ambas têm RLS sem policy de acesso para o
    // client autenticado (deny-all — migrations 087/098) e devolveriam zero
    // linha sem erro — os cards mostrariam "0" em vez de dizer que não sabem.
    const [usageRes, churnRes, qualityRes] = await Promise.all([
      $fetch<AiMetrics>('/api/admin/dashboard/ai-usage', {
        query: { dateStart: range.dateStart, dateEnd: range.dateEnd },
      }),
      supabase
        .from('customer_intelligence')
        .select('churn_risk')
        .not('churn_risk', 'is', null),
      fetchAiQuality(range),
    ])

    aiMetrics.value = usageRes

    // Distribuição de churn
    const churnRows = (churnRes.data ?? []) as { churn_risk: string }[]
    const churnCount = { low: 0, medium: 0, high: 0, critical: 0, no_orders: 0 }
    for (const row of churnRows) {
      const key = row.churn_risk as keyof typeof churnCount
      if (key in churnCount) churnCount[key]++
    }
    aiChurn.value = churnCount

    aiQuality.value = qualityRes

    aiDataLoaded = true
  } catch (e) {
    notify.error('Erro ao carregar métricas de IA', (e as Error).message)
  } finally {
    aiLoading.value = false
  }

  await loadLabRuns()
}

/** Botão "Avaliar agora" — dispara um ciclo síncrono do avaliador e recarrega o card de achados recorrentes. */
async function evaluateNow(): Promise<void> {
  evaluateNowRunning.value = true
  try {
    const { avaliados, erros, total } = await $fetch<{ avaliados: number, erros: number, total: number }>(
      '/api/admin/ai-quality/evaluate-now',
      { method: 'POST' },
    )
    if (total === 0) {
      notify.success('Nada pendente', 'Não havia turnos aguardando avaliação.')
    } else {
      notify.success('Avaliação concluída', `${avaliados} turno(s) avaliado(s)${erros > 0 ? `, ${erros} com erro` : ''}.`)
    }
    const range = periodDateRange()
    if (range) aiQuality.value = await fetchAiQuality(range)
  } catch (e) {
    const message = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? (e as Error).message
    notify.error('Não foi possível rodar a avaliação', message)
  } finally {
    evaluateNowRunning.value = false
  }
}

// ── Carregamento da aba Insights de Negócio (lazy — só na primeira troca) ─
async function loadInsights(): Promise<void> {
  const range = periodDateRange()
  if (!range) return
  insightsLoading.value = true
  try {
    const [afinidadeRes, margemRes, segmentacaoRes, estoqueMinimoRes] = await Promise.all([
      $fetch<AfinidadeCestaResponse>('/api/admin/dashboard/insights/afinidade-cesta', {
        query: { dateStart: range.dateStart, dateEnd: range.dateEnd },
      }),
      $fetch<MargemAltaVendaBaixaResponse>('/api/admin/dashboard/insights/margem-alta-venda-baixa', {
        query: { dateStart: range.dateStart, dateEnd: range.dateEnd },
      }),
      // Snapshot de customer_intelligence — não escopado por período (§ do endpoint).
      $fetch<SegmentacaoClientesResponse>('/api/admin/dashboard/insights/segmentacao-clientes'),
      // Snapshot de estoque atual (Gestão de Estoque, migration 111) — também não escopado por período.
      $fetch<EstoqueMinimoResponse>('/api/admin/dashboard/insights/estoque-minimo'),
    ])
    afinidadeCesta.value = afinidadeRes
    margemAltaVendaBaixa.value = margemRes
    segmentacaoClientes.value = segmentacaoRes
    estoqueMinimo.value = estoqueMinimoRes
    insightsDataLoaded = true
  } catch (e) {
    notify.error('Erro ao carregar insights de negócio', (e as Error).message)
  } finally {
    insightsLoading.value = false
  }
}

// ── Laboratório de avaliação sob demanda (§6/§8 fase 6 do PRD) ────────────
// Visão "config real vs. sob demanda" — relatório à parte da tendência
// contínua de produção acima, mesma infraestrutura (`agente_avaliacao`).

async function loadLabRuns(): Promise<void> {
  try {
    const { runs } = await $fetch<{ runs: LabRunSummary[] }>('/api/admin/lab/runs')
    labRuns.value = runs
    const maisRecente = runs[0]
    if (maisRecente && (maisRecente.status === 'running' || maisRecente.status === 'pending')) {
      void pollLabRun(maisRecente.id)
    } else if (maisRecente) {
      void loadLabRunDetail(maisRecente.id)
    }
  } catch (e) {
    notify.error('Erro ao carregar corridas do laboratório', (e as Error).message)
  }
}

async function loadLabRunDetail(runId: string): Promise<void> {
  try {
    labCurrentRun.value = await $fetch<LabRunDetail>(`/api/admin/lab/runs/${runId}`)
  } catch (e) {
    notify.error('Erro ao carregar a corrida do laboratório', (e as Error).message)
  }
}

function stopLabPolling(): void {
  if (labPollTimer) {
    clearTimeout(labPollTimer)
    labPollTimer = null
  }
}

/** Sondagem enquanto a corrida está em andamento — 6 personas em paralelo, poucos segundos. */
async function pollLabRun(runId: string): Promise<void> {
  stopLabPolling()
  await loadLabRunDetail(runId)
  const status = labCurrentRun.value?.run.status
  if (status === 'running' || status === 'pending') {
    labPollTimer = setTimeout(() => void pollLabRun(runId), 4000)
  } else {
    void loadLabRuns()
  }
}

async function startLabRun(): Promise<void> {
  // Cada corrida dispara ~26 chamadas de LLM (6 personas × conversa completa
  // + avaliação cada) — gasto real de OpenAI que fica fora do card "Custo
  // Estimado" (`ai-usage.get.ts` só lê `agente_uso_tokens`, e tráfego de
  // laboratório nunca é gravado ali de propósito, ver `whatsapp-lab-queue.ts`).
  // Confirmação evita que vire clique de rotina durante ajuste de prompt.
  const ok = await confirm({
    title: 'Rodar o laboratório de avaliação?',
    message: 'Cada corrida roda 6 personas simuladas contra o agente real (~26 chamadas de LLM) — gasto de OpenAI de verdade, que não aparece no card "Custo Estimado" acima. Use só quando precisar checar se o agente está respondendo errado, não como rotina.',
    confirmText: 'Rodar mesmo assim',
    cancelText: 'Cancelar',
    variant: 'warning',
  })
  if (!ok) return

  labStarting.value = true
  try {
    const { runId } = await $fetch<{ runId: string }>('/api/admin/lab/runs', { method: 'POST' })
    notify.success('Laboratório disparado', '6 personas rodando contra o agente real — isso leva alguns segundos.')
    void pollLabRun(runId)
  } catch (e) {
    const message = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? (e as Error).message
    notify.error('Não foi possível iniciar o laboratório', message)
  } finally {
    labStarting.value = false
  }
}

function startAutoRefresh(): void {
  stopAutoRefresh()
  autoRefreshInterval = setInterval(() => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      !loading.value &&
      !refreshing.value
    ) {
      void loadAllData(true)
    }
  }, 30000) // 30 segundos
}

function stopAutoRefresh(): void {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
}

// ── Realtime — ativo apenas no período "Hoje" ─────────────────────────────
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

function connectRealtime(): void {
  if (realtimeChannel) return
  realtimeChannel = supabase
    .channel('dashboard-pedidos')
    .on(
      'postgres_changes',
      // Filter: only non-archived orders to avoid spurious reloads
      { event: '*', schema: 'public', table: 'orders', filter: 'archived=eq.false' },
      // `silent`: sem isso, cada pedido que entra troca o dashboard inteiro
      // pelo skeleton — em horário de pico o painel pisca sem parar.
      () => { void loadAllData(true) },
    )
    .subscribe()
}

function disconnectRealtime(): void {
  if (!realtimeChannel) return
  supabase.removeChannel(realtimeChannel)
  realtimeChannel = null
}

onMounted(async () => {
  await Promise.all([loadKanbanColumns(), loadAllData()])
  connectRealtime()
  startAutoRefresh()
})

onUnmounted(() => {
  disconnectRealtime()
  stopAutoRefresh()
  stopLabPolling()
})

// Reload when period changes; disconnect realtime for historical periods
watch(selectedPeriod, (period) => {
  if (period !== 'custom') void loadAllData()
  if (period === 'today') {
    connectRealtime()
  } else {
    disconnectRealtime()
  }
  // Recarrega métricas de IA/Insights quando o período muda e a aba está visível
  if (activeView.value === 'ia') {
    aiDataLoaded = false
    void loadAiMetrics()
  } else if (activeView.value === 'insights') {
    insightsDataLoaded = false
    void loadInsights()
  }
})

// Reload when custom range becomes fully valid
watch([customFrom, customTo], () => {
  if (isCustom.value && customRangeValid.value) {
    void loadAllData()
    if (activeView.value === 'ia') {
      aiDataLoaded = false
      void loadAiMetrics()
    } else if (activeView.value === 'insights') {
      insightsDataLoaded = false
      void loadInsights()
    }
  }
})

// Lazy load das abas IA/Insights: carrega apenas na primeira ativação por período
watch(activeView, (view) => {
  if (view === 'ia' && !aiDataLoaded && !aiLoading.value) {
    void loadAiMetrics()
  } else if (view === 'insights' && !insightsDataLoaded && !insightsLoading.value) {
    void loadInsights()
  }
})

</script>

<template>
  <div
    class="min-h-full bg-surface text-text-primary font-sans px-4 pt-6 pb-10 sm:px-6 md:px-8 md:pt-8 md:pb-12 selection:bg-interactive-primary selection:text-text-inverse"
  >
    <div class="max-w-[1400px] mx-auto">

      <!-- Cabeçalho + seletor de período -->
      <header class="flex flex-wrap items-center justify-between gap-4 mb-7">
        <!-- Menu de abas simples: apenas texto em caixa alta, azul quando selecionado (SEM BARRA EMBAIXO) -->
        <div
          class="flex items-center gap-6"
          role="tablist"
          aria-label="Selecionar painel"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="activeView === 'operacional'"
            :class="[
              'text-xs font-bold uppercase tracking-wider transition-colors py-1 cursor-pointer select-none',
              activeView === 'operacional'
                ? 'text-admin-primary dark:text-admin-accent'
                : 'text-text-muted hover:text-text-primary',
            ]"
            @click="activeView = 'operacional'"
          >
            PAINEL OPERACIONAL
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="activeView === 'ia'"
            :class="[
              'text-xs font-bold uppercase tracking-wider transition-colors py-1 cursor-pointer select-none',
              activeView === 'ia'
                ? 'text-admin-primary dark:text-admin-accent'
                : 'text-text-muted hover:text-text-primary',
            ]"
            @click="activeView = 'ia'"
          >
            INVESTIMENTO IA
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="activeView === 'insights'"
            :class="[
              'text-xs font-bold uppercase tracking-wider transition-colors py-1 cursor-pointer select-none',
              activeView === 'insights'
                ? 'text-admin-primary dark:text-admin-accent'
                : 'text-text-muted hover:text-text-primary',
            ]"
            @click="activeView = 'insights'"
          >
            INSIGHTS DE NEGÓCIO
          </button>
        </div>

        <div class="flex items-center gap-2">
          <!-- Pills de período -->
          <div
            class="flex items-center rounded-lg border border-border bg-surface p-1 gap-0.5"
            role="group"
            aria-label="Selecionar período"
          >
            <button
              v-for="opt in DASHBOARD_PERIODS"
              :key="opt"
              type="button"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                selectedPeriod === opt
                  ? 'bg-admin-primary text-white font-bold'
                  : 'text-text-muted hover:text-text-primary',
              ]"
              :aria-pressed="selectedPeriod === opt"
              @click="selectedPeriod = opt"
            >
              {{ DASHBOARD_PERIOD_LABELS[opt] }}
            </button>
          </div>

          <!-- Botão de Atualizar -->
          <button
            type="button"
            class="inline-flex items-center justify-center p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all active:scale-95 h-9 w-9 shrink-0"
            :class="{ 'cursor-not-allowed opacity-50': loading || refreshing || aiLoading || insightsLoading }"
            :disabled="loading || refreshing || aiLoading || insightsLoading"
            title="Atualizar dados"
            aria-label="Atualizar dados"
            @click="activeView === 'ia'
              ? (aiDataLoaded = false, loadAiMetrics())
              : activeView === 'insights'
                ? (insightsDataLoaded = false, loadInsights())
                : loadAllData(true)"
          >
            <RefreshCw
              class="w-3.5 h-3.5"
              :class="{ 'animate-spin': refreshing || aiLoading || insightsLoading }"
            />
          </button>
        </div>
      </header>

      <!-- Range customizado — visível apenas quando "Personalizado" selecionado -->
      <div
        v-if="isCustom"
        class="flex flex-wrap items-center gap-3 mb-5 p-4 rounded-lg border border-border bg-surface"
      >
        <CalendarDays class="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
        <label class="text-xs text-text-muted font-medium" for="dash-date-from">De</label>
        <input
          id="dash-date-from"
          v-model="customFrom"
          type="date"
          :max="customTo || undefined"
          class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
        >
        <label class="text-xs text-text-muted font-medium" for="dash-date-to">até</label>
        <input
          id="dash-date-to"
          v-model="customTo"
          type="date"
          :min="customFrom || undefined"
          class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
        >
        <span v-if="!customRangeValid && customFrom && customTo" class="text-xs text-danger-600 font-medium">
          Data final deve ser ≥ data inicial
        </span>
      </div>

      <!-- LOADING (painel operacional) -->
      <div v-if="loading && activeView === 'operacional'" class="space-y-5">
        <div class="grid grid-cols-12 gap-5">
          <div class="dash-card col-span-12 lg:col-span-4 h-48 skeleton-shimmer" />
          <div class="col-span-12 lg:col-span-8 grid grid-cols-2 gap-5">
            <div v-for="n in 4" :key="`sk-kpi-${n}`" class="dash-card h-[88px] skeleton-shimmer" />
          </div>
        </div>
        <div class="grid grid-cols-12 gap-5">
          <div class="dash-card col-span-12 lg:col-span-5 h-80 skeleton-shimmer" />
          <div class="dash-card col-span-12 lg:col-span-7 h-80 skeleton-shimmer" />
        </div>
      </div>

      <!-- LOADING (aba IA) -->
      <div v-else-if="aiLoading && activeView === 'ia'" class="space-y-5">
        <div class="grid grid-cols-12 gap-5">
          <div v-for="n in 4" :key="`sk-ai-${n}`" class="dash-card col-span-12 sm:col-span-6 lg:col-span-3 h-28 skeleton-shimmer" />
        </div>
        <div class="grid grid-cols-12 gap-5">
          <div class="dash-card col-span-12 lg:col-span-6 h-48 skeleton-shimmer" />
          <div class="dash-card col-span-12 lg:col-span-6 h-48 skeleton-shimmer" />
        </div>
        <div class="grid grid-cols-12 gap-5">
          <div v-for="n in 3" :key="`sk-qual-${n}`" class="dash-card col-span-12 sm:col-span-4 h-32 skeleton-shimmer" />
        </div>
      </div>

      <!-- LOADING (aba Insights) -->
      <div v-else-if="insightsLoading && activeView === 'insights'" class="space-y-5">
        <div class="grid grid-cols-12 gap-5">
          <div class="dash-card col-span-12 h-80 skeleton-shimmer" />
        </div>
      </div>

      <!-- CONTEÚDO -->
      <div v-else-if="!loading && activeView === 'operacional'" class="space-y-5 motion-safe:animate-slide-up">
        <AdminDashboardPainelOperacional
          :metrics="metrics"
          :counts="counts"
          :top-produtos="topProdutos"
          :top-categorias="topCategorias"
          :top-produtos-click="topProdutosClick"
          :funil-etapas="funilEtapas"
          :all-kanban-columns="allKanbanColumns"
          :revenue-chave="revenueChave"
          :saving-revenue="savingRevenue"
          :valor-visivel="valorVisivel"
          :selected-period="selectedPeriod"
          :is-today="isToday"
          @set-revenue-status="setRevenueStatus"
          @toggle-valor-visivel="toggleValorVisivel"
        />
      </div>

      <!-- ═══ ABA: INVESTIMENTO IA ══════════════════════════════════════════ -->
      <div
        v-else-if="!aiLoading && activeView === 'ia'"
        class="space-y-5 motion-safe:animate-slide-up"
      >
        <AdminDashboardPainelIA
          :ai-metrics="aiMetrics"
          :ai-churn="aiChurn"
          :ai-quality="aiQuality"
          :lab-current-run="labCurrentRun"
          :lab-starting="labStarting"
          :evaluate-now-running="evaluateNowRunning"
          :valor-visivel="valorVisivel"
          :selected-period="selectedPeriod"
          @start-lab-run="startLabRun"
          @evaluate-now="evaluateNow"
        />
      </div>

      <!-- ═══ ABA: INSIGHTS DE NEGÓCIO ══════════════════════════════════════ -->
      <div
        v-else-if="!insightsLoading && activeView === 'insights'"
        class="space-y-5 motion-safe:animate-slide-up"
      >
        <AdminDashboardPainelInsights
          :afinidade-cesta="afinidadeCesta"
          :margem-alta-venda-baixa="margemAltaVendaBaixa"
          :segmentacao-clientes="segmentacaoClientes"
          :estoque-minimo="estoqueMinimo"
        />
      </div>
    </div>
  </div>
</template>


<style scoped>
.dash-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  box-shadow: none;
}

.icon-chip {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  flex-shrink: 0;
}
</style>

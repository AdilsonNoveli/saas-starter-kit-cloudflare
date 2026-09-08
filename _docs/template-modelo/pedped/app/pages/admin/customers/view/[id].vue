<script setup lang="ts">
import { computed, ref, shallowRef, onMounted } from 'vue'
import {
  ArrowLeft,
  User,
  Clipboard,
  AlertTriangle,
  TrendingUp,
  Camera,
  ShoppingBag,
  MessageSquare,
  CalendarDays,
  Brain,
} from '@lucide/vue'
import { navigateTo } from 'nuxt/app'
import type { Tables } from '~/types/database.types'
import { formatOrderNumber } from '~~/shared/utils/orderNumber'
import {
  confidenceOf,
  isPreferenceUsable,
  parsePreferences,
  type PreferenceKey,
} from '~~/shared/utils/customerPreferences'
import { parseTopProducts, type CustomerTopProduct } from '~~/shared/utils/customerFacts'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const supabase = useSupabaseClient()

const id = route.params.id as string

// Derivado do schema para que a lista de colunas do `select` abaixo e os
// tipos não possam divergir silenciosamente do banco.
type ClienteDetalhes = Pick<
  Tables<'clientes'>,
  | 'id'
  | 'nome'
  | 'telefone_whatsapp'
  | 'frequencia_compra'
  | 'status'
  | 'is_visitante'
  | 'total_pedidos'
  | 'valor_gasto_acumulado'
  | 'cliente_desde'
  | 'ultimo_pedido_em'
  | 'possui_pendencias'
  | 'foto_url'
  | 'data_nascimento'
  | 'descricao_pendencia'
  | 'preferencias'
  | 'observacoes_internas'
>


interface PedidoResumo {
  id: string
  short_id?: number | null
  criado_em: string
  status: string
  valor_total: number | null
  forma_pagamento?: string | null
  itens_pedido: {
    quantidade: number
    subtotal: number
    nome_produto_congelado: string
    produtos: { nome: string } | null
  }[]
}

/**
 * Fatos derivados que o agente usa no turno (migration 095). São **calculados**
 * pelo job noturno `recompute_customer_intelligence()` — a tela é leitura pura:
 * qualquer edição manual seria sobrescrita no próximo recálculo, em silêncio.
 * Para corrigir algo, o caminho é Observações Internas ou a conversa.
 */
type CustomerIntelligence = Pick<
  Tables<'customer_intelligence'>,
  | 'median_cycle_days'
  | 'churn_risk'
  | 'delivered_orders'
  | 'avg_ticket'
  | 'top_products'
  | 'payment_method'
  | 'payment_share'
  | 'delivery_mode'
  | 'delivery_share'
  | 'peak_weekday'
  | 'peak_hour'
  | 'peak_share'
  | 'rfm_segment'
  | 'preferences'
  | 'computed_at'
>

const loading = ref<boolean>(true)
const errorMsg = ref<string>('')
const cliente = ref<ClienteDetalhes | null>(null)
const ultimosPedidos = ref<PedidoResumo[]>([])
/**
 * `shallowRef` e não `ref`: as colunas `preferences`/`top_products` são `Json`,
 * um tipo recursivo, e o unwrap profundo do `ref` estoura a profundidade de
 * instanciação do TypeScript (TS2589). Além de resolver isso, é o correto aqui —
 * o objeto é substituído inteiro a cada carga, nunca mutado campo a campo, então
 * reatividade profunda seria só custo.
 */
const inteligencia = shallowRef<CustomerIntelligence | null>(null)

/**
 * Distingue "a leitura falhou" de "não há linha para este cliente" — os dois
 * chegam como `inteligencia === null` e têm significados opostos para quem olha
 * a tela. Sem essa separação o card some em silêncio e o lojista não consegue
 * dizer se o cliente ainda não tem padrão, se é um lead, ou se a feature nem
 * está instalada.
 */
const inteligenciaIndisponivel = ref<boolean>(false)

onMounted(async () => {
  await fetchClienteData()
})

async function fetchClienteData(): Promise<void> {
  loading.value = true
  errorMsg.value = ''

  // Fetch cliente and orders in parallel — independent queries, no need to chain
  const [clienteResult, pedidosResult, inteligenciaResult] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nome, telefone_whatsapp, frequencia_compra, status, is_visitante, total_pedidos, valor_gasto_acumulado, cliente_desde, ultimo_pedido_em, possui_pendencias, foto_url, data_nascimento, descricao_pendencia, preferencias, observacoes_internas')
      .eq('id', id)
      .single(),
    supabase
      .from('pedidos')
      .select('id, short_id, criado_em, status, valor_total, forma_pagamento, itens_pedido(quantidade, subtotal, nome_produto_congelado, produtos(nome))')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false })
      .limit(5),
    supabase
      .from('customer_intelligence')
      .select('median_cycle_days, churn_risk, delivered_orders, avg_ticket, top_products, payment_method, payment_share, delivery_mode, delivery_share, peak_weekday, peak_hour, peak_share, rfm_segment, preferences, computed_at')
      .eq('customer_id', id)
      .maybeSingle(),
  ])

  if (clienteResult.error || !clienteResult.data) {
    errorMsg.value = 'Cliente não encontrado.'
    loading.value = false
    return
  }

  cliente.value = clienteResult.data
  if (pedidosResult.data) {
    ultimosPedidos.value = pedidosResult.data as unknown as PedidoResumo[]
  }

  // Erro aqui NÃO derruba a ficha: se a migration não estiver aplicada o `select`
  // falha com "relation does not exist", e o cadastro do cliente continua sendo o
  // conteúdo principal da página. Nesse caso o card some por inteiro; ausência de
  // LINHA, ao contrário, vira estado vazio explicado (são coisas diferentes).
  inteligenciaIndisponivel.value = Boolean(inteligenciaResult.error)
  inteligencia.value = inteligenciaResult.data ?? null

  loading.value = false
}

const { formatCurrency } = useFormatters()

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

const formatTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatPedidoId = (pedido: PedidoResumo): string =>
  formatOrderNumber(pedido.id, pedido.short_id)

// ─── Inteligência do agente: derivados de APRESENTAÇÃO ────────────────────────
// A matemática (confiança, decaimento, corte) vem de `shared/utils` — a mesma
// que o agente usa. Duplicá-la aqui faria a tela dizer "alta confiança" num dado
// que o prompt já descartou.

const CHURN_UI: Readonly<Record<string, { label: string, dot: string, chip: string }>> = {
  low: { label: 'Em dia', dot: 'bg-green-500', chip: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
  medium: { label: 'Atenção', dot: 'bg-warning-500', chip: 'bg-warning-100 text-warning-800 dark:bg-warning-950/30 dark:text-warning-400' },
  high: { label: 'Risco alto', dot: 'bg-danger-500', chip: 'bg-danger-100 text-danger-700 dark:bg-danger-950/30 dark:text-danger-400' },
  critical: { label: 'Risco crítico', dot: 'bg-danger-600', chip: 'bg-danger-100 text-danger-700 dark:bg-danger-950/30 dark:text-danger-400' },
  no_orders: { label: 'Sem compras', dot: 'bg-text-muted', chip: 'bg-surface text-text-muted' },
}

const RFM_LABEL: Readonly<Record<string, string>> = {
  champion: 'Campeão',
  loyal: 'Fiel',
  at_risk: 'Em risco',
  dormant: 'Inativo',
  new: 'Novo',
}

/**
 * Rótulos de UI, com acento e capitalização — deliberadamente diferentes dos
 * rótulos que vão ao prompt (sem acento, estilo telegráfico). Público diferente,
 * texto diferente; o `Record<PreferenceKey, string>` garante que uma chave nova
 * quebre o build em vez de aparecer crua na tela.
 */
const PREFERENCE_UI_LABEL: Readonly<Record<PreferenceKey, string>> = {
  allergy: 'Alergia',
  dietary_restriction: 'Restrição alimentar',
  ingredient_exclusion: 'Não gosta',
  ingredient_preference: 'Gosta de',
  product_preference: 'Costuma preferir',
  delivery_note: 'Entrega',
  payment_preference: 'Pagamento',
  contact_preference: 'Contato',
}

const churnUi = computed(() => CHURN_UI[inteligencia.value?.churn_risk ?? 'no_orders'] ?? CHURN_UI.no_orders!)

const habitos = computed<{ label: string, valor: string }[]>(() => {
  const info = inteligencia.value
  if (!info) return []

  const linhas: { label: string, valor: string }[] = []

  if (info.median_cycle_days && info.median_cycle_days > 0) {
    linhas.push({ label: 'Ciclo de compra', valor: `a cada ${Math.round(info.median_cycle_days)} dias` })
  }
  if (info.avg_ticket && info.avg_ticket > 0) {
    linhas.push({ label: 'Ticket médio', valor: formatCurrency(info.avg_ticket) })
  }
  if (info.payment_method && info.payment_share !== null) {
    linhas.push({ label: 'Pagamento', valor: `${info.payment_method} (${Math.round(info.payment_share * 100)}%)` })
  }
  if (info.delivery_mode && info.delivery_share !== null) {
    linhas.push({ label: 'Modalidade', valor: `${info.delivery_mode} (${Math.round(info.delivery_share * 100)}%)` })
  }
  if (info.peak_weekday !== null && info.peak_hour !== null && info.peak_share !== null) {
    const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
    linhas.push({
      label: 'Costuma pedir',
      valor: `${dias[info.peak_weekday] ?? '—'} ~${info.peak_hour}h (${Math.round(info.peak_share * 100)}%)`,
    })
  }

  return linhas
})

// Mesmo parser que o agente usa (`shared/utils`): a tela não pode mostrar um
// produto habitual que o prompt descartou, nem o contrário.
const produtosHabituais = computed<CustomerTopProduct[]>(() =>
  parseTopProducts(inteligencia.value?.top_products as unknown),
)

interface PreferenciaExibida {
  chave: PreferenceKey
  label: string
  valor: string
  observacoes: number
  confianca: number
  emUso: boolean
}

/**
 * Mostra **todas** as preferências observadas, marcando quais o agente
 * efetivamente usa. Esconder as que não passaram no corte deixaria o lojista
 * sem entender por que o agente ignora algo que o cliente disse — a coluna "em
 * uso" é o que torna o comportamento auditável.
 */
const preferencias = computed<PreferenciaExibida[]>(() => {
  const mapa = parsePreferences(inteligencia.value?.preferences)
  const agora = new Date()

  return (Object.keys(PREFERENCE_UI_LABEL) as PreferenceKey[]).flatMap((chave) => {
    const entry = mapa[chave]
    if (!entry) return []
    return [{
      chave,
      label: PREFERENCE_UI_LABEL[chave],
      valor: entry.value,
      observacoes: entry.observations,
      confianca: confidenceOf(chave, entry, agora),
      emUso: isPreferenceUsable(chave, entry, agora),
    }]
  })
})

const temInteligencia = computed<boolean>(() =>
  habitos.value.length > 0 || produtosHabituais.value.length > 0 || preferencias.value.length > 0,
)

const calculadoEm = computed<string>(() => {
  const iso = inteligencia.value?.computed_at
  if (!iso) return '—'
  const horas = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (horas < 1) return 'há menos de 1 hora'
  if (horas < 24) return `há ${horas}h`
  return `há ${Math.floor(horas / 24)} dia(s)`
})

const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'CL'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return 'CL'
  if (parts.length === 1) return (parts[0]?.substring(0, 2) ?? 'CL').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface font-sans text-text-primary">
    
    <!-- Header Sticky de Ações (Enterprise Grade) -->
    <header class="h-16 flex items-center justify-between px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20">
      <div class="flex items-center">
        <button
          type="button"
          class="p-2 -ml-2 rounded-full hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors mr-4"
          @click="navigateTo('/admin/customers')"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-text-primary">Ficha do Cliente</h1>
        </div>
      </div>

      <!-- Ações superiores de página (Botão de Edição) -->
      <div class="flex items-center gap-3">
        <button
          v-if="cliente"
          type="button"
          class="px-5 py-2 rounded-md bg-interactive-primary text-text-inverse hover:bg-interactive-primary-hover transition-colors text-sm font-medium flex items-center gap-2"
          @click="navigateTo(`/admin/customers/${String(cliente.id)}`)"
        >
          Editar Cadastro
        </button>
      </div>
    </header>

    <!-- Main Content Area: Grid 2 Colunas -->
    <main class="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 pb-32">
      
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <div v-else-if="errorMsg" class="bg-surface rounded-xl p-10 text-center border border-border">
        <h2 class="text-xl font-bold text-text-primary">{{ errorMsg }}</h2>
        <button
          type="button"
          class="mt-4 text-primary-600 hover:underline text-sm font-semibold"
          @click="navigateTo('/admin/customers')"
        >
          Voltar para listagem
        </button>
      </div>

      <div v-else-if="cliente" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        
        <!-- COLUNA DA ESQUERDA: Dados Cadastrais & Histórico (7/12) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Card 1: Perfil do Cliente -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <User class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Perfil do Cliente</h3>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nome Completo</span>
                  <div class="text-sm font-semibold text-text-primary bg-surface px-3 py-2 rounded border border-border/60">
                    {{ cliente.nome || 'Cliente Anônimo' }}
                  </div>
                </div>

                <div>
                  <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">WhatsApp / Telefone</span>
                  <div class="flex items-center justify-between text-sm font-semibold text-text-primary bg-surface px-3 py-2 rounded border border-border/60">
                    <span class="truncate">{{ cliente.telefone_whatsapp || 'Não informado' }}</span>
                    <a
                      v-if="cliente.telefone_whatsapp"
                      :href="`https://wa.me/${cliente.telefone_whatsapp.replace(/\D/g, '')}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors shrink-0"
                      title="Chamar no WhatsApp"
                    >
                      <MessageSquare class="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Data de Nascimento</span>
                  <div class="text-sm font-semibold text-text-primary bg-surface px-3 py-2 rounded border border-border/60">
                    {{ formatDate(cliente.data_nascimento) }}
                  </div>
                </div>

                <div>
                  <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Cliente Desde</span>
                  <div class="text-sm font-semibold text-text-primary bg-surface px-3 py-2 rounded border border-border/60 flex items-center gap-1.5">
                    <CalendarDays class="w-4 h-4 text-text-muted" />
                    <span>{{ formatDate(cliente.cliente_desde) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Anotações & Preferências -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Clipboard class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Anotações e Preferências</h3>
            </div>

            <div class="space-y-4">
              <div>
                <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Preferências de Consumo</span>
                <p class="text-xs text-text-secondary bg-surface p-3.5 rounded border border-border/60 leading-relaxed whitespace-pre-line min-h-[72px]">
                  {{ cliente.preferencias || 'Nenhuma preferência registrada para este cliente.' }}
                </p>
              </div>

              <div>
                <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Observações Internas (Staff)</span>
                <p class="text-xs text-text-secondary bg-surface p-3.5 rounded border border-border/60 leading-relaxed whitespace-pre-line min-h-[72px]">
                  {{ cliente.observacoes_internas || 'Nenhuma observação interna inserida pela equipe.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Card 3: Inteligência do Agente (migrations 095/096) -->
          <div v-if="!inteligenciaIndisponivel" class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <Brain class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Inteligência do Agente</h3>
              </div>
              <span
                v-if="inteligencia?.rfm_segment"
                class="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400"
              >
                {{ RFM_LABEL[inteligencia.rfm_segment] ?? inteligencia.rfm_segment }}
              </span>
            </div>

            <!-- Sem linha: o cliente ainda não entrou no cálculo. Dizer isso é o
                 ponto — some em silêncio e ninguém sabe se falta dado, se é lead
                 ou se a feature não está instalada. -->
            <div v-if="!inteligencia" class="py-6 text-center border border-dashed border-border rounded-md space-y-1">
              <p class="text-xs text-text-muted italic">
                {{ cliente.is_visitante
                  ? 'Lead sem pedidos: o agente ainda não tem o que aprender sobre este contato.'
                  : 'Perfil ainda não calculado para este cliente.' }}
              </p>
              <p class="text-[10px] text-text-muted">
                O cálculo roda automaticamente às 3h e cobre clientes com pedidos registrados.
              </p>
            </div>

            <template v-else>
              <!-- Retenção: o fato mais acionável, por isso vem primeiro -->
              <div class="flex items-center gap-3 bg-surface px-3.5 py-3 rounded border border-border/60">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="churnUi.dot" />
                <div class="flex-1 min-w-0">
                  <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Retenção</span>
                  <span class="text-sm font-semibold text-text-primary">{{ churnUi.label }}</span>
                </div>
                <span class="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0" :class="churnUi.chip">
                  {{ inteligencia.delivered_orders }} pedidos
                </span>
              </div>

              <div v-if="!temInteligencia" class="py-6 text-center text-xs text-text-muted italic border border-dashed border-border rounded-md">
                Ainda sem padrão suficiente. O agente precisa de pelo menos 2 pedidos para formar um perfil.
              </div>

              <template v-else>
                <!-- Hábitos calculados -->
                <div v-if="habitos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    v-for="linha in habitos"
                    :key="linha.label"
                    class="bg-surface px-3 py-2 rounded border border-border/60"
                  >
                    <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">{{ linha.label }}</span>
                    <span class="text-xs font-semibold text-text-primary">{{ linha.valor }}</span>
                  </div>
                </div>

                <div v-if="produtosHabituais.length > 0">
                  <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Produtos Habituais</span>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="produto in produtosHabituais"
                      :key="produto.name"
                      class="inline-flex items-center gap-1.5 bg-surface border border-border/60 rounded px-2.5 py-1 text-xs text-text-primary"
                    >
                      {{ produto.name }}
                      <span class="text-[10px] font-bold text-text-muted tabular-nums">{{ produto.count }}×</span>
                    </span>
                  </div>
                </div>

                <!-- Preferências estruturadas: TODAS, marcando as que o agente usa -->
                <div v-if="preferencias.length > 0">
                  <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Preferências Observadas
                  </span>
                  <div class="border border-border rounded-md bg-surface divide-y divide-border/60">
                    <div
                      v-for="pref in preferencias"
                      :key="pref.chave"
                      class="flex items-center gap-3 px-3 py-2"
                    >
                      <div class="flex-1 min-w-0">
                        <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider">{{ pref.label }}</span>
                        <span class="text-xs font-semibold text-text-primary break-words">{{ pref.valor }}</span>
                      </div>
                      <div class="text-right shrink-0">
                        <span class="block text-[10px] text-text-muted tabular-nums">
                          {{ pref.observacoes }}× · {{ Math.round(pref.confianca * 100) }}%
                        </span>
                        <span
                          class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-0.5"
                          :class="pref.emUso
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                            : 'bg-surface-raised text-text-muted border border-border/60'"
                        >
                          {{ pref.emUso ? 'em uso' : 'não usada' }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p class="text-[10px] text-text-muted mt-1.5 leading-relaxed">
                    "Não usada" = ainda sem confirmações suficientes, ou observada há muito tempo.
                    Alergia e restrição alimentar nunca expiram.
                  </p>
                </div>
              </template>

              <p class="text-[10px] text-text-muted pt-1 border-t border-border/60">
                Calculado {{ calculadoEm }} · atualiza automaticamente às 3h. Somente leitura —
                correções manuais seriam sobrescritas no próximo recálculo; use Observações Internas.
              </p>
            </template>
          </div>

          <!-- Card 4: Histórico de Pedidos -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <ShoppingBag class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Histórico Recente de Pedidos</h3>
            </div>

            <div v-if="ultimosPedidos.length === 0" class="py-8 text-center text-xs text-text-muted italic border border-dashed border-border rounded-md">
              Nenhum pedido registrado para este cliente ainda.
            </div>

            <div v-else class="overflow-x-auto border border-border rounded-md bg-surface">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-raised border-b border-border">
                    <th class="px-4 py-2.5">ID</th>
                    <th class="px-4 py-2.5">Data/Hora</th>
                    <th class="px-4 py-2.5">Valor</th>
                    <th class="px-4 py-2.5">Forma Pagto.</th>
                    <th class="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr
                    v-for="pedido in ultimosPedidos"
                    :key="String(pedido.id)"
                    class="hover:bg-surface-raised/40 transition-colors"
                  >
                    <td class="px-4 py-3 font-mono text-text-muted">
                      #{{ formatPedidoId(pedido) }}
                    </td>
                    <td class="px-4 py-3 text-text-muted tabular-nums">
                      {{ formatTime(String(pedido.criado_em ?? '')) }}
                    </td>
                    <td class="px-4 py-3 font-semibold text-text-primary tabular-nums">
                      {{ formatCurrency(pedido.valor_total ?? 0) }}
                    </td>
                    <td class="px-4 py-3 text-text-muted uppercase text-[10px] font-medium">
                      {{ pedido.forma_pagamento || '—' }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        :class="{
                          'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400': pedido.status === 'entregue',
                          'bg-danger-100 text-danger-700 dark:bg-danger-950/30 dark:text-danger-400': pedido.status === 'cancelado',
                          'bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400': pedido.status !== 'entregue' && pedido.status !== 'cancelado',
                        }"
                      >
                        {{ pedido.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- COLUNA DA DIREITA: Identidade & Métricas Sticky (5/12) -->
        <div class="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
          
          <!-- Card 1: Identidade Visual -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs flex flex-col items-center">
            <div class="flex items-center gap-2 border-b border-border pb-3 w-full justify-center">
              <Camera class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Identidade Visual</h3>
            </div>

            <!-- Foto Quadrada Enterprise-grade -->
            <div class="relative w-40 h-40 border border-border rounded-lg bg-surface flex items-center justify-center shrink-0 overflow-hidden shadow-xs mt-2">
              <NuxtImg
                v-if="cliente.foto_url"
                :src="String(cliente.foto_url)"
                :alt="String(cliente.nome ?? 'Cliente')"
                loading="lazy"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full bg-primary-50 dark:bg-primary-950/10 flex items-center justify-center text-4xl font-bold text-primary-600 dark:text-primary-400 select-none">
                {{ getInitials(String(cliente.nome ?? '')) }}
              </div>
            </div>

            <!-- Nome & Status Badges -->
            <div class="text-center w-full mt-2">
              <div class="flex flex-wrap items-center justify-center gap-2">
                <span class="inline-flex px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary-200/50">
                  Status: {{ cliente.status || 'Novo' }}
                </span>
                <span v-if="cliente.is_visitante" class="inline-flex px-3 py-1 bg-warning-100 text-warning-800 dark:bg-warning-950/30 dark:text-warning-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-warning-200/50">
                  Lead / Visitante
                </span>
              </div>
            </div>
          </div>

          <!-- Card 2: Situação Cadastral / Alertas -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <AlertTriangle class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Situação Cadastral</h3>
            </div>

            <div
              v-if="cliente.possui_pendencias"
              class="bg-danger-50 dark:bg-danger-950/10 rounded-md border border-danger-200 p-4 flex items-start gap-3 animate-pulse"
            >
              <div class="p-1 bg-danger-100 dark:bg-danger-900/30 rounded-full text-danger-600 dark:text-danger-400 shrink-0 mt-0.5">
                <AlertTriangle class="w-4.5 h-4.5" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-danger-800 dark:text-danger-400 text-xs">Pendência Registrada</h3>
                <p class="text-xs text-danger-700 dark:text-danger-300 mt-1 leading-relaxed whitespace-pre-line">
                  {{ cliente.descricao_pendencia || 'Cliente possui inadimplências ou restrições em aberto.' }}
                </p>
              </div>
            </div>
            
            <div
              v-else
              class="bg-green-50 dark:bg-green-950/10 rounded-md border border-green-200 p-4 flex items-center gap-3"
            >
              <div class="p-1 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 shrink-0">
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="font-bold text-green-800 dark:text-green-400 text-xs leading-none">
                Situação regular. Nenhuma restrição.
              </span>
            </div>
          </div>

          <!-- Card 3: Métricas de Engajamento -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <TrendingUp class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Engajamento & Métricas</h3>
            </div>

            <div class="space-y-4">
              <div class="bg-surface p-4 rounded-md border border-border">
                <h4 class="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">LTV Vitalício</h4>
                <p class="text-2xl font-bold text-primary-600 leading-none">
                  {{ formatCurrency(cliente.valor_gasto_acumulado) }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-surface border border-border rounded-md">
                  <div class="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Pedidos</div>
                  <div class="text-lg font-bold text-text-primary leading-none">
                    {{ cliente.total_pedidos ?? 0 }}
                  </div>
                </div>
                <div class="p-3 bg-surface border border-border rounded-md">
                  <div class="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1 font-sans">Frequência</div>
                  <div class="text-xs font-bold text-text-primary mt-1 leading-none bg-surface-raised border border-border/80 rounded px-1.5 py-0.5 truncate text-center">
                    {{ cliente.frequencia_compra || 'Novo' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>

  </div>
</template>

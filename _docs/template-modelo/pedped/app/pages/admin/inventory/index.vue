<script setup lang="ts">
/**
 * @descricao: Painel de Gestão de Estoque (migration 111).
 * @objetivo: Duas abas — Produtos (com controle de estoque configurado) e
 *   Insumos (matéria-prima) — com ajuste manual, cadastro de insumo e
 *   histórico de movimentações. Esqueleto copiado de
 *   `app/pages/admin/products/index.vue` (header sticky, tabs locais, tabela
 *   desktop + cards mobile, paginação). A CONFIGURAÇÃO de política de estoque
 *   fica na página do produto (`/admin/products/[id]`) — aqui é só operação
 *   do dia a dia (SoC, ver _docs/plano-estoque.md).
 */
import { ref, computed, onMounted } from 'vue'
import { PenLine, Plus, ChevronDown, ChevronUp } from '@lucide/vue'
import { useState } from 'nuxt/app'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: 'admin' })

const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const { notify } = useNotification()

const PAGE_SIZE = 20

interface ProdutoEstoqueRow {
  id: string
  nome: string
  unidade_medida: string | null
  controle_estoque: string
  estoque_atual: number | null
  estoque_minimo: number | null
  producao_diaria_limite: number | null
}

interface InsumoRow {
  id: string
  nome: string
  unidade_medida: string
  estoque_atual: number
  estoque_minimo: number | null
  ativo: boolean
}

interface MovimentacaoRow {
  id: string
  tipo_movimento: string
  quantidade: number
  motivo: string | null
  criado_em: string
}

const activeTab = ref<'produtos' | 'insumos'>('produtos')
const loading = ref(false)

const produtos = ref<ProdutoEstoqueRow[]>([])
const produtosTotal = ref(0)
const produtosPage = ref(1)
const produtosTotalPages = computed(() => Math.max(1, Math.ceil(produtosTotal.value / PAGE_SIZE)))

const insumos = ref<InsumoRow[]>([])

const CONTROLE_LABEL: Record<string, string> = {
  contagem: 'Contagem',
  producao_diaria: 'Produção diária',
}

type StatusEstoque = 'ok' | 'baixo' | 'esgotado' | 'neutro'

/** Verde/amarelo/vermelho comparando atual×mínimo — 'neutro' quando não há um "atual" comparável (produção diária reseta por dia). */
function statusDe(estoqueAtual: number | null, estoqueMinimo: number | null, comparavel: boolean): StatusEstoque {
  if (!comparavel || estoqueAtual === null) return 'neutro'
  if (estoqueAtual <= 0) return 'esgotado'
  if (estoqueMinimo !== null && estoqueAtual <= estoqueMinimo) return 'baixo'
  return 'ok'
}

const STATUS_BADGE: Record<StatusEstoque, string> = {
  ok: 'bg-brand-green/15 text-brand-green',
  baixo: 'bg-warning-100 text-warning-700 dark:bg-warning-950/30 dark:text-warning-400',
  esgotado: 'bg-danger-100 text-danger-700 dark:bg-danger-950/30 dark:text-danger-400',
  neutro: 'bg-surface-raised text-text-muted',
}
const STATUS_LABEL: Record<StatusEstoque, string> = {
  ok: 'OK',
  baixo: 'Baixo',
  esgotado: 'Esgotado',
  neutro: '—',
}

async function fetchProdutos(): Promise<void> {
  loading.value = true
  try {
    const res = await $fetch<{ data: ProdutoEstoqueRow[], total: number }>('/api/admin/inventory/products', {
      query: { limit: PAGE_SIZE, offset: (produtosPage.value - 1) * PAGE_SIZE },
    })
    produtos.value = res.data
    produtosTotal.value = res.total
  } catch (err) {
    const e = err as { data?: { statusMessage?: string } }
    notify.error('Erro ao carregar produtos', e.data?.statusMessage ?? 'Erro desconhecido')
  } finally {
    loading.value = false
  }
}

async function fetchInsumos(): Promise<void> {
  loading.value = true
  try {
    const res = await $fetch<{ data: InsumoRow[] }>('/api/admin/inventory/insumos')
    insumos.value = res.data
  } catch (err) {
    const e = err as { data?: { statusMessage?: string } }
    notify.error('Erro ao carregar insumos', e.data?.statusMessage ?? 'Erro desconhecido')
  } finally {
    loading.value = false
  }
}

const supabase = useSupabaseClient()
const produtosCount = ref<number>(0)
const categoriasCount = ref<number>(0)
const kitsCount = ref<number>(0)

async function fetchCounts(): Promise<void> {
  const [prodRes, catRes, kitRes] = await Promise.all([
    supabase.from('produtos').select('*', { count: 'exact', head: true }),
    supabase.from('categorias').select('*', { count: 'exact', head: true }),
    supabase.from('kits').select('*', { count: 'exact', head: true }),
  ])
  if (prodRes.count !== null) produtosCount.value = prodRes.count
  if (catRes.count !== null) categoriasCount.value = catRes.count
  if (kitRes.count !== null) kitsCount.value = kitRes.count
}

onMounted(() => {
  void fetchProdutos()
  void fetchInsumos()
  void fetchCounts()
})

function goToProdutosPage(page: number): void {
  produtosPage.value = page
  void fetchProdutos()
}

function trocarAba(aba: 'produtos' | 'insumos'): void {
  activeTab.value = aba
  linhaExpandida.value = null
}

// === Ajuste de estoque ===
const adjustOpen = ref(false)
const adjustTipo = ref<'produto' | 'insumo'>('produto')
const adjustId = ref<string | null>(null)
const adjustNome = ref('')
const adjustEstoqueAtual = ref(0)

function abrirAjusteProduto(p: ProdutoEstoqueRow): void {
  adjustTipo.value = 'produto'
  adjustId.value = p.id
  adjustNome.value = p.nome
  adjustEstoqueAtual.value = p.estoque_atual ?? 0
  adjustOpen.value = true
}
function abrirAjusteInsumo(i: InsumoRow): void {
  adjustTipo.value = 'insumo'
  adjustId.value = i.id
  adjustNome.value = i.nome
  adjustEstoqueAtual.value = i.estoque_atual
  adjustOpen.value = true
}
function onAjusteSalvo(novoValor: number): void {
  if (adjustTipo.value === 'produto') {
    const row = produtos.value.find((p) => p.id === adjustId.value)
    if (row) row.estoque_atual = novoValor
  } else {
    const row = insumos.value.find((i) => i.id === adjustId.value)
    if (row) row.estoque_atual = novoValor
  }
}

// === Cadastro de insumo ===
const insumoFormOpen = ref(false)
const insumoEmEdicao = ref<InsumoRow | null>(null)

function abrirNovoInsumo(): void {
  insumoEmEdicao.value = null
  insumoFormOpen.value = true
}
function abrirEditarInsumo(i: InsumoRow): void {
  insumoEmEdicao.value = i
  insumoFormOpen.value = true
}

// === Histórico de movimentações (painel abaixo da tabela, nunca DENTRO dela —
// intercalar <tr> condicional via <template v-for> num <tbody> é um padrão
// arriscado de mismatch de hidratação SSR; o painel fica fora da <table>). ===
const linhaExpandida = ref<string | null>(null)
const linhaExpandidaNome = ref<string>('')
const movimentacoes = ref<MovimentacaoRow[]>([])
const movimentacoesLoading = ref(false)

async function toggleMovimentacoes(tipoEntidade: 'produto' | 'insumo', entidadeId: string, nome: string): Promise<void> {
  if (linhaExpandida.value === entidadeId) {
    linhaExpandida.value = null
    return
  }
  linhaExpandida.value = entidadeId
  linhaExpandidaNome.value = nome
  movimentacoesLoading.value = true
  try {
    const res = await $fetch<{ data: MovimentacaoRow[] }>('/api/admin/inventory/movements', {
      query: { tipo_entidade: tipoEntidade, entidade_id: entidadeId, limit: 10 },
    })
    movimentacoes.value = res.data
  } catch {
    movimentacoes.value = []
  } finally {
    movimentacoesLoading.value = false
  }
}

const MOVIMENTO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste manual',
  venda: 'Venda',
  cancelamento: 'Estorno (cancelamento)',
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans relative">
    <header class="bg-surface sticky top-0 z-20 border-b border-border select-none shrink-0">
      <div class="h-16 flex items-center justify-between px-4 sm:px-6 bg-surface">
        <div class="flex items-center gap-3" :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''">
          <div class="flex items-center gap-1 bg-surface-raised p-1 rounded-lg border border-border">
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer"
              :class="activeTab === 'produtos' ? 'bg-surface text-text-primary shadow-xs font-bold' : 'text-text-muted hover:text-text-primary'"
              @click="trocarAba('produtos')"
            >
              Produtos ({{ produtosTotal }})
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer"
              :class="activeTab === 'insumos' ? 'bg-surface text-text-primary shadow-xs font-bold' : 'text-text-muted hover:text-text-primary'"
              @click="trocarAba('insumos')"
            >
              Insumos ({{ insumos.length }})
            </button>
          </div>
        </div>
        <button
          v-if="activeTab === 'insumos'"
          type="button"
          class="h-9 px-3.5 flex items-center gap-1.5 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
          @click="abrirNovoInsumo"
        >
          <Plus class="w-4 h-4" stroke-width="2.5" />
          Novo insumo
        </button>
      </div>

      <div class="h-10 flex items-center px-4 sm:px-6 bg-surface border-t border-border/50">
        <div class="flex items-center gap-6">
          <NuxtLink
            to="/admin/products"
            class="text-sm font-medium transition-colors whitespace-nowrap text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <span>Produtos</span>
            <span v-if="produtosCount > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ produtosCount }}</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/products?tab=categorias"
            class="text-sm font-medium transition-colors whitespace-nowrap text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <span>Categorias</span>
            <span v-if="categoriasCount > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ categoriasCount }}</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/kits"
            class="text-sm font-medium transition-colors whitespace-nowrap text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <span>Montar Kits</span>
            <span v-if="kitsCount > 0" class="bg-brand-green/20 text-brand-green py-0.5 px-2 rounded-full text-[9px] font-bold leading-none">{{ kitsCount }}</span>
          </NuxtLink>

          <button
            type="button"
            class="text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-brand-green font-bold"
          >
            <span>Estoque</span>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <div v-if="loading" class="flex justify-center items-center h-64 text-text-muted">
        <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <div v-else>
        <!-- PRODUTOS TAB -->
        <div v-if="activeTab === 'produtos'">
          <!-- Mobile cards -->
          <div class="md:hidden flex flex-col gap-3 p-4">
            <div v-for="p in produtos" :key="p.id" class="bg-surface border border-border rounded-xl p-3.5 shadow-xs">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-bold text-sm text-text-primary truncate">{{ p.nome }}</p>
                  <p class="text-xs text-text-muted">{{ CONTROLE_LABEL[p.controle_estoque] ?? p.controle_estoque }}</p>
                </div>
                <span
                  class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  :class="STATUS_BADGE[statusDe(p.estoque_atual, p.estoque_minimo, p.controle_estoque === 'contagem')]"
                >
                  {{ STATUS_LABEL[statusDe(p.estoque_atual, p.estoque_minimo, p.controle_estoque === 'contagem')] }}
                </span>
              </div>
              <div class="flex items-center justify-between mt-2.5">
                <span class="text-xs text-text-muted">
                  Atual: <span class="font-bold text-text-primary tabular-nums">{{ p.controle_estoque === 'contagem' ? (p.estoque_atual ?? 0) : `limite ${p.producao_diaria_limite ?? 0}/dia` }}</span>
                </span>
                <div class="flex items-center gap-2">
                  <button type="button" class="text-xs font-bold uppercase text-brand-green" @click="abrirAjusteProduto(p)">Ajustar</button>
                  <NuxtLink :to="`/admin/products/${p.id}`" class="p-1.5 text-text-muted hover:text-primary-600" title="Editar produto">
                    <PenLine class="w-4 h-4" />
                  </NuxtLink>
                </div>
              </div>
            </div>
            <div v-if="produtos.length === 0" class="py-12 text-center text-text-muted text-xs">
              Nenhum produto com controle de estoque configurado. Configure em <NuxtLink to="/admin/products" class="text-brand-green underline">Catálogo</NuxtLink>.
            </div>
          </div>

          <!-- Desktop table -->
          <div class="hidden md:block">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-raised">
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Produto</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Política</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Estoque atual</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Mínimo</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Status</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="p in produtos" :key="p.id" class="hover:bg-surface-raised/60 transition-colors">
                  <td class="px-6 py-3 font-semibold text-text-primary text-sm">{{ p.nome }}</td>
                  <td class="px-6 py-3 text-xs">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-surface-raised text-text-secondary border border-border/80">
                      {{ CONTROLE_LABEL[p.controle_estoque] ?? p.controle_estoque }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-xs tabular-nums text-text-primary font-bold">
                    {{ p.controle_estoque === 'contagem' ? (p.estoque_atual ?? 0) : `${p.producao_diaria_limite ?? 0}/dia` }}
                  </td>
                  <td class="px-6 py-3 text-xs tabular-nums text-text-muted">{{ p.estoque_minimo ?? '—' }}</td>
                  <td class="px-6 py-3">
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      :class="STATUS_BADGE[statusDe(p.estoque_atual, p.estoque_minimo, p.controle_estoque === 'contagem')]"
                    >
                      {{ STATUS_LABEL[statusDe(p.estoque_atual, p.estoque_minimo, p.controle_estoque === 'contagem')] }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-right">
                    <div class="flex items-center justify-end gap-2.5">
                      <button type="button" class="text-xs font-bold uppercase tracking-wider text-brand-green cursor-pointer" @click="abrirAjusteProduto(p)">Ajustar</button>
                      <button type="button" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer" title="Ver movimentações" @click="toggleMovimentacoes('produto', p.id, p.nome)">
                        <component :is="linhaExpandida === p.id ? ChevronUp : ChevronDown" class="w-4 h-4" />
                      </button>
                      <NuxtLink :to="`/admin/products/${p.id}`" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors" title="Editar produto">
                        <PenLine class="w-4 h-4" />
                      </NuxtLink>
                    </div>
                  </td>
                </tr>
                <tr v-if="produtos.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-text-muted text-xs">
                    Nenhum produto com controle de estoque configurado. Configure em <NuxtLink to="/admin/products" class="text-brand-green underline">Catálogo</NuxtLink>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Painel de movimentações — FORA da <table> de propósito (evita mismatch de hidratação por <tr> intercalado). -->
          <div v-if="linhaExpandida && produtos.some((p) => p.id === linhaExpandida)" class="mx-4 sm:mx-6 my-3 border border-border rounded-lg bg-surface-raised/40 px-4 py-3">
            <p class="text-xs font-semibold text-text-primary mb-2">Movimentações — {{ linhaExpandidaNome }}</p>
            <AdminMovimentacoesHistorico :loading="movimentacoesLoading" :movimentacoes="movimentacoes" :movimento-label="MOVIMENTO_LABEL" :format-data-hora="formatDataHora" />
          </div>

          <div v-if="produtosTotalPages > 1" class="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border bg-surface">
            <span class="text-xs text-text-muted font-medium">{{ produtosTotal }} produtos</span>
            <UiPagination :current-page="produtosPage" :total-pages="produtosTotalPages" size="sm" @change="goToProdutosPage" />
          </div>
        </div>

        <!-- INSUMOS TAB -->
        <div v-if="activeTab === 'insumos'">
          <!-- Mobile cards -->
          <div class="md:hidden flex flex-col gap-3 p-4">
            <div v-for="i in insumos" :key="i.id" class="bg-surface border border-border rounded-xl p-3.5 shadow-xs">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-bold text-sm text-text-primary truncate">{{ i.nome }}</p>
                  <p class="text-xs text-text-muted">{{ i.unidade_medida }}<span v-if="!i.ativo"> · inativo</span></p>
                </div>
                <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" :class="STATUS_BADGE[statusDe(i.estoque_atual, i.estoque_minimo, true)]">
                  {{ STATUS_LABEL[statusDe(i.estoque_atual, i.estoque_minimo, true)] }}
                </span>
              </div>
              <div class="flex items-center justify-between mt-2.5">
                <span class="text-xs text-text-muted">Atual: <span class="font-bold text-text-primary tabular-nums">{{ i.estoque_atual }}</span></span>
                <div class="flex items-center gap-2">
                  <button type="button" class="text-xs font-bold uppercase text-brand-green" @click="abrirAjusteInsumo(i)">Ajustar</button>
                  <button type="button" class="p-1.5 text-text-muted hover:text-primary-600" title="Editar" @click="abrirEditarInsumo(i)">
                    <PenLine class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div v-if="insumos.length === 0" class="py-12 text-center text-text-muted text-xs">Nenhum insumo cadastrado ainda.</div>
          </div>

          <!-- Desktop table -->
          <div class="hidden md:block">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-raised">
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Insumo</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Unidade</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Estoque atual</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Mínimo</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Status</th>
                  <th class="sticky top-[104px] z-10 bg-surface-raised border-b border-border px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="i in insumos" :key="i.id" class="hover:bg-surface-raised/60 transition-colors">
                  <td class="px-6 py-3 font-semibold text-text-primary text-sm">
                    {{ i.nome }}
                    <span v-if="!i.ativo" class="ml-1.5 text-[10px] font-bold uppercase text-text-muted">(inativo)</span>
                  </td>
                  <td class="px-6 py-3 text-xs text-text-muted">{{ i.unidade_medida }}</td>
                  <td class="px-6 py-3 text-xs tabular-nums text-text-primary font-bold">{{ i.estoque_atual }}</td>
                  <td class="px-6 py-3 text-xs tabular-nums text-text-muted">{{ i.estoque_minimo ?? '—' }}</td>
                  <td class="px-6 py-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" :class="STATUS_BADGE[statusDe(i.estoque_atual, i.estoque_minimo, true)]">
                      {{ STATUS_LABEL[statusDe(i.estoque_atual, i.estoque_minimo, true)] }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-right">
                    <div class="flex items-center justify-end gap-2.5">
                      <button type="button" class="text-xs font-bold uppercase tracking-wider text-brand-green cursor-pointer" @click="abrirAjusteInsumo(i)">Ajustar</button>
                      <button type="button" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer" title="Ver movimentações" @click="toggleMovimentacoes('insumo', i.id, i.nome)">
                        <component :is="linhaExpandida === i.id ? ChevronUp : ChevronDown" class="w-4 h-4" />
                      </button>
                      <button type="button" class="p-1.5 text-text-muted hover:text-primary-600 hover:bg-surface-raised rounded transition-colors cursor-pointer" title="Editar" @click="abrirEditarInsumo(i)">
                        <PenLine class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="insumos.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-text-muted text-xs">Nenhum insumo cadastrado ainda.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Painel de movimentações — FORA da <table> de propósito (evita mismatch de hidratação por <tr> intercalado). -->
          <div v-if="linhaExpandida && insumos.some((i) => i.id === linhaExpandida)" class="mx-4 sm:mx-6 my-3 border border-border rounded-lg bg-surface-raised/40 px-4 py-3">
            <p class="text-xs font-semibold text-text-primary mb-2">Movimentações — {{ linhaExpandidaNome }}</p>
            <AdminMovimentacoesHistorico :loading="movimentacoesLoading" :movimentacoes="movimentacoes" :movimento-label="MOVIMENTO_LABEL" :format-data-hora="formatDataHora" />
          </div>
        </div>
      </div>
    </main>

    <AdminInventoryAdjustModal
      :tipo-entidade="adjustTipo"
      :entidade-id="adjustId"
      :entidade-nome="adjustNome"
      :estoque-atual="adjustEstoqueAtual"
      :open="adjustOpen"
      @close="adjustOpen = false"
      @saved="onAjusteSalvo"
    />

    <AdminInsumoFormModal
      :insumo="insumoEmEdicao"
      :open="insumoFormOpen"
      @close="insumoFormOpen = false"
      @saved="fetchInsumos"
    />
  </div>
</template>

<script setup lang="ts">
import { ShoppingBag, Sparkles, CheckCircle2, Wallet, Users, PackageMinus } from '@lucide/vue'

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

interface Props {
  afinidadeCesta: AfinidadeCestaResponse
  margemAltaVendaBaixa: MargemAltaVendaBaixaResponse
  segmentacaoClientes: SegmentacaoClientesResponse
  estoqueMinimo: EstoqueMinimoResponse
}

defineProps<Props>()

const SEGMENTO_LABELS: Record<PerfilSegmento['segmento'], string> = {
  champion: 'Champion',
  loyal: 'Fiel',
  at_risk: 'Em risco',
  dormant: 'Adormecido',
  new: 'Novo',
}

const DIA_SEMANA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const { formatCurrency } = useFormatters()
</script>

<template>
  <!-- Afinidade de cesta — §2.2.1 do PRD de insights de negócio -->
  <section class="grid grid-cols-12 gap-5">
    <article class="dash-card col-span-12 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <ShoppingBag class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">PRODUTOS COMPRADOS JUNTOS</p>
          <p class="text-xs text-text-muted mt-0.5">
            Pares que aparecem no mesmo pedido mais do que o acaso explicaria — candidatos a configurar em Produtos Relacionados
          </p>
        </div>
      </div>

      <div v-if="afinidadeCesta.totalPedidosConsiderados === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <Sparkles class="w-8 h-8 text-text-muted/40" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Ainda sem dado suficiente — nenhum pedido válido no período</p>
      </div>
      <div v-else-if="afinidadeCesta.pares.length === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <CheckCircle2 class="w-8 h-8 text-brand-green/60" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Nenhum par recorrente encontrado nos {{ afinidadeCesta.totalPedidosConsiderados }} pedidos do período</p>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="par in afinidadeCesta.pares"
          :key="`${par.produtoAId}-${par.produtoBId}`"
          class="rounded-lg bg-surface-raised/80 border border-border/60 p-4 flex items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-text-primary truncate">
              {{ afinidadeCesta.produtos[par.produtoAId] ?? par.produtoAId }} + {{ afinidadeCesta.produtos[par.produtoBId] ?? par.produtoBId }}
            </p>
            <p class="text-[11px] text-text-muted mt-0.5">{{ par.coOcorrencias }} pedidos em comum</p>
          </div>
          <span class="tabular-nums text-xs font-bold rounded-full bg-admin-primary/10 dark:bg-admin-accent/20 text-admin-primary dark:text-admin-accent px-2.5 py-1 shrink-0">
            {{ par.lift.toFixed(1) }}×
          </span>
        </div>
      </div>
    </article>
  </section>

  <!-- Margem alta / venda baixa — §2.2.2 do PRD de insights de negócio -->
  <section class="grid grid-cols-12 gap-5">
    <article class="dash-card col-span-12 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Wallet class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">MARGEM ALTA, VENDA BAIXA</p>
          <p class="text-xs text-text-muted mt-0.5">
            Produtos disponíveis com boa margem mas poucas vendas — candidatos a destacar no catálogo
          </p>
        </div>
      </div>

      <div v-if="margemAltaVendaBaixa.candidatos.length === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <Sparkles class="w-8 h-8 text-text-muted/40" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Nenhum produto disponível com margem cadastrada encontrado</p>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="produto in margemAltaVendaBaixa.candidatos"
          :key="produto.produtoId"
          class="rounded-lg bg-surface-raised/80 border border-border/60 p-4 flex items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-text-primary truncate">{{ produto.nome }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">
              {{ formatCurrency(produto.precoVenda) }} · lucro {{ formatCurrency(produto.lucroUnitario) }}/un ·
              {{ produto.quantidadeVendida === 0 ? 'nunca vendido no período' : `${produto.quantidadeVendida} vendido(s)` }}
            </p>
          </div>
          <span class="tabular-nums text-xs font-bold rounded-full bg-admin-primary/10 dark:bg-admin-accent/20 text-admin-primary dark:text-admin-accent px-2.5 py-1 shrink-0">
            {{ produto.margemLucroPct.toFixed(0) }}%
          </span>
        </div>
      </div>
    </article>
  </section>

  <!-- Estoque mínimo — Gestão de Estoque (migration 111) -->
  <section class="grid grid-cols-12 gap-5">
    <article class="dash-card col-span-12 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <PackageMinus class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">ESTOQUE MÍNIMO</p>
          <p class="text-xs text-text-muted mt-0.5">
            Produtos e insumos no ou abaixo do limiar de alerta configurado — mais urgentes primeiro
          </p>
        </div>
      </div>

      <div v-if="estoqueMinimo.candidatos.length === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <CheckCircle2 class="w-8 h-8 text-brand-green/60" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Nenhum produto ou insumo abaixo do estoque mínimo configurado</p>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="item in estoqueMinimo.candidatos"
          :key="`${item.tipo}-${item.id}`"
          class="rounded-lg bg-surface-raised/80 border border-border/60 p-4 flex items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-text-primary truncate">{{ item.nome }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">
              {{ item.tipo === 'produto' ? 'Produto' : 'Insumo' }} · mínimo {{ item.estoqueMinimo }}
            </p>
          </div>
          <span
            class="tabular-nums text-xs font-bold rounded-full px-2.5 py-1 shrink-0"
            :class="item.estoqueAtual <= 0
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'"
          >
            {{ item.estoqueAtual }}
          </span>
        </div>
      </div>
    </article>
  </section>

  <!-- Clientes — §2.2.3 + §2.2.4 + §2.2.5 do PRD de insights de negócio -->
  <section class="grid grid-cols-12 gap-5">
    <article class="dash-card col-span-12 lg:col-span-6 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Users class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">CLIENTES EM RISCO</p>
          <p class="text-xs text-text-muted mt-0.5">Ordenado por ticket médio × peso do risco — quem tem mais a perder primeiro</p>
        </div>
      </div>

      <div v-if="segmentacaoClientes.listaRisco.length === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <CheckCircle2 class="w-8 h-8 text-brand-green/60" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Nenhum cliente em risco crítico/alto ou segmento "em risco" no momento</p>
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="cliente in segmentacaoClientes.listaRisco"
          :key="cliente.customerId"
          class="rounded-lg bg-surface-raised/80 border border-border/60 p-3 flex items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-text-primary truncate">{{ cliente.nome ?? 'Cliente sem nome' }}</p>
            <p class="text-[11px] text-text-muted mt-0.5">
              {{ cliente.whatsapp ?? 'sem WhatsApp' }} · ticket médio {{ formatCurrency(cliente.avgTicket) }}
            </p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span
              v-if="cliente.rfmSegment === 'at_risk'"
              class="text-[10px] font-bold uppercase rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1"
            >
              Em risco (RFM)
            </span>
            <span
              class="text-[10px] font-bold uppercase rounded-full px-2 py-1"
              :class="cliente.churnRisk === 'critical'
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                : cliente.churnRisk === 'high'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  : 'bg-surface border border-border text-text-muted'"
            >
              {{ cliente.churnRisk === 'critical' ? 'Crítico' : cliente.churnRisk === 'high' ? 'Alto' : cliente.churnRisk }}
            </span>
          </div>
        </div>
      </div>
    </article>

    <article class="dash-card col-span-12 lg:col-span-6 p-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-admin-primary/10 dark:bg-admin-accent/20 border border-admin-primary/20 dark:border-admin-accent/30 shrink-0">
          <Users class="w-6 h-6 text-admin-primary dark:text-admin-accent" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">PERFIL POR SEGMENTO (RFM)</p>
          <p class="text-xs text-text-muted mt-0.5">Ticket médio, pagamento/entrega e horário de pico dominantes por segmento</p>
        </div>
      </div>

      <div v-if="segmentacaoClientes.perfilPorSegmento.length === 0" class="flex flex-col items-center justify-center text-center py-10 gap-2">
        <Sparkles class="w-8 h-8 text-text-muted/40" aria-hidden="true" />
        <p class="text-xs text-text-muted italic">Ainda sem clientes segmentados — aguardando o job noturno de inteligência</p>
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="perfil in segmentacaoClientes.perfilPorSegmento"
          :key="perfil.segmento"
          class="rounded-lg bg-surface-raised/80 border border-border/60 p-3 flex flex-col gap-1.5"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-text-primary">{{ SEGMENTO_LABELS[perfil.segmento] }}</p>
            <span class="text-[11px] text-text-muted tabular-nums">{{ perfil.totalClientes }} cliente(s)</span>
          </div>
          <p class="text-[11px] text-text-muted">
            Ticket médio: <span class="font-semibold text-text-primary">{{ perfil.ticketMedio !== null ? formatCurrency(perfil.ticketMedio) : '—' }}</span>
          </p>
          <p class="text-[11px] text-text-muted">
            Pagamento: <span class="font-semibold text-text-primary">{{ perfil.pagamentoDominante ? `${perfil.pagamentoDominante.valor} (${perfil.pagamentoDominante.pct}%)` : '—' }}</span>
            · Entrega: <span class="font-semibold text-text-primary">{{ perfil.entregaDominante ? `${perfil.entregaDominante.valor} (${perfil.entregaDominante.pct}%)` : '—' }}</span>
          </p>
          <p class="text-[11px] text-text-muted">
            Pico: <span class="font-semibold text-text-primary">
              {{ perfil.diaPicoDominante ? DIA_SEMANA_LABELS[Number(perfil.diaPicoDominante.valor)] : '—' }}{{ perfil.horaPicoDominante ? ` às ${perfil.horaPicoDominante.valor}h` : '' }}
            </span>
          </p>
        </div>
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
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pencil } from '@lucide/vue'
import { formatOrderNumber } from '~~/shared/utils/orderNumber'

const emit = defineEmits<{
  (e: 'edit'): void
}>()

interface OrderReceiptData {
  id: string
  short_id?: number | null
  criado_em: string | null
  status: string | null
  tipo_entrega: string
  forma_pagamento: string
  desconto_aplicado?: number | null
  valor_subtotal?: number | null
  valor_entrega?: number | null
  valor_total?: number | null
  frete_gratis_aplicado?: boolean | null
  observacoes?: string | null
  clientes?: {
    nome?: string | null
    telefone_whatsapp?: string | null
  } | null
  enderecos_cliente?: {
    rua?: string | null
    numero?: string | null
    bairro?: string | null
  } | null
  itens_pedido?: ReadonlyArray<{
    id: string
    quantidade: number
    subtotal?: number | null
    nome_produto_congelado?: string | null
    produtos?: {
      nome: string
    } | null
    itens_pedido_opcoes?: ReadonlyArray<{
      nome_congelado: string
      preco_delta_congelado: number
      valor_texto?: string | null
      arquivo_url?: string | null
      arquivo_nome_original?: string | null
    }>
  }>
}

const props = defineProps<{
  pedido: OrderReceiptData
  chavePix?: string | null
}>()

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }).format(date)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const shortOrderId = computed(() =>
  props.pedido?.id ? formatOrderNumber(props.pedido.id, props.pedido.short_id) : '000000',
)

interface AggregatedLine {
  key: string
  nome: string
  qtde: number
  subtotal: number
  /** Só presente quando o item tem personalização (texto_livre/upload_arquivo) — nunca agregado com outra linha. */
  opcoesCustomizadas?: ReadonlyArray<{
    nome_congelado: string
    valor_texto?: string | null
    arquivo_url?: string | null
    arquivo_nome_original?: string | null
    /** Cliente optou por "Enviar depois" (migration 127) — só relevante quando `arquivo_url` ainda é nulo. */
    deferred?: boolean
  }>
}

const aggregatedItems = computed<AggregatedLine[]>(() => {
  if (!props.pedido?.itens_pedido) return []
  const lines: AggregatedLine[] = []
  const map = new Map<string, AggregatedLine>()

  for (const item of props.pedido.itens_pedido) {
    const nome = item.produtos?.nome || item.nome_produto_congelado || 'Produto Indisponível'
    // deferred (migration 127, "Enviar depois"): mostra "Aguardando arte" em
    // vez de omitir a linha silenciosamente — staff precisa saber que falta
    // cobrar essa arte do cliente.
    const opcoesCustomizadas = (item.itens_pedido_opcoes ?? []).filter((o) => o.valor_texto || o.arquivo_url || o.deferred)

    // Personalização (texto/arquivo) é única por item — agregar por nome
    // esconderia qual pedido pediu qual texto/arquivo. Cada item customizado
    // vira a própria linha, nunca somado a outro.
    if (opcoesCustomizadas.length > 0) {
      lines.push({ key: item.id, nome, qtde: item.quantidade, subtotal: item.subtotal || 0, opcoesCustomizadas })
      continue
    }

    const existing = map.get(nome)
    if (existing) {
      existing.qtde += item.quantidade
      if (item.subtotal) existing.subtotal += item.subtotal
    } else {
      const line: AggregatedLine = { key: nome, nome, qtde: item.quantidade, subtotal: item.subtotal || 0 }
      map.set(nome, line)
      lines.push(line)
    }
  }
  return lines
})
const copiado = ref(false)

const copiarPix = () => {
  if (!props.chavePix) return
  navigator.clipboard.writeText(props.chavePix)
  copiado.value = true
  setTimeout(() => {
    copiado.value = false
  }, 2000)
}
</script>

<template>
  <article v-if="pedido" class="w-full max-w-md p-6 sm:p-8 rounded-md relative bg-[#fdfae7] dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 text-xs font-semibold tracking-wide uppercase font-sans mx-auto h-fit">
    <!-- Header -->
    <div class="mb-6 border-b-2 border-dashed border-gray-300 dark:border-neutral-700 pb-4 text-center">
      <div class="text-xl font-bold tracking-tighter">PEDIDO #{{ shortOrderId }}</div>
      <div class="text-[10px] text-text-muted mt-1">Data: {{ formatDate(pedido.criado_em) }}</div>
    </div>

    <!-- Status -->
    <div class="mb-6 border-b border-border pb-4">
      <div class="text-text-muted mb-1">STATUS</div>
      <div class="text-blue-600 font-bold">{{ pedido.status }}</div>
    </div>

    <!-- Client -->
    <div class="mb-6 border-b border-border pb-4">
      <div class="text-text-muted mb-1">CLIENTE</div>
      <div>{{ pedido.clientes?.nome || 'Cliente Anônimo' }}</div>
      <div v-if="pedido.clientes?.telefone_whatsapp" class="mt-1">Tel: {{ pedido.clientes.telefone_whatsapp }}</div>
    </div>

    <!-- Delivery -->
    <div class="mb-6 border-b border-border pb-4">
      <div class="text-text-muted mb-1">ENTREGA</div>
      <div>Tipo: {{ pedido.tipo_entrega }}</div>
      <div v-if="pedido.tipo_entrega === 'entrega' && pedido.enderecos_cliente" class="mt-2 text-text-muted">
        {{ pedido.enderecos_cliente.rua }}, {{ pedido.enderecos_cliente.numero }}<br>
        {{ pedido.enderecos_cliente.bairro }}
      </div>
    </div>

    <!-- Payment -->
    <div class="mb-6 border-b border-border pb-4">
      <div class="text-text-muted mb-1">PAGAMENTO</div>
      <div>Forma: {{ pedido.forma_pagamento }}</div>
      <div v-if="pedido.forma_pagamento?.toLowerCase() === 'pix' && chavePix" class="mt-3 p-3 border border-dashed border-gray-400 dark:border-neutral-600 rounded-lg bg-white/50 dark:bg-black/20 text-center relative group">
        <div class="text-[9px] text-gray-500 dark:text-neutral-400 mb-1 font-bold tracking-wider">CHAVE PIX (TOQUE PARA COPIAR)</div>
        <button
          type="button"
          class="w-full text-xs font-bold tracking-normal normal-case break-all hover:text-brand-green transition-colors focus:outline-none flex items-center justify-center gap-1.5 py-1"
          @click="copiarPix"
        >
          <span>{{ chavePix }}</span>
          <svg class="w-3.5 h-3.5 text-gray-500 dark:text-neutral-400 shrink-0 group-hover:text-brand-green" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"/>
          </svg>
        </button>
        <span v-if="copiado" class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
          Copiado!
        </span>
      </div>
    </div>

    <!-- Items -->
    <div class="mb-6 border-b border-border pb-4">
      <div class="text-text-muted mb-2">ITENS</div>
      <div v-for="item in aggregatedItems" :key="item.key" class="mt-1.5">
        <div class="flex justify-between">
          <span class="pr-4">{{ item.qtde }}x {{ item.nome }}</span>
          <span v-if="item.subtotal">{{ formatCurrency(item.subtotal) }}</span>
        </div>
        <div
          v-for="(opcao, oi) in item.opcoesCustomizadas"
          :key="oi"
          class="text-[10px] text-text-muted normal-case tracking-normal pl-3 mt-0.5"
        >
          <template v-if="opcao.valor_texto">{{ opcao.nome_congelado }}: "{{ opcao.valor_texto }}"</template>
          <template v-else-if="opcao.arquivo_url">
            {{ opcao.nome_congelado }}:
            <a :href="opcao.arquivo_url" target="_blank" rel="noopener noreferrer" class="underline hover:text-brand-green">
              Ver arquivo{{ opcao.arquivo_nome_original ? ` (${opcao.arquivo_nome_original})` : '' }}
            </a>
          </template>
          <template v-else-if="opcao.deferred">
            <span class="text-amber-600 font-bold">{{ opcao.nome_congelado }}: Aguardando arte do cliente</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Totals -->
    <div class="mb-6 border-b-2 border-dashed border-border pb-4">
      <div class="flex justify-between mb-1 text-text-muted">
        <span>Subtotal:</span>
        <span>{{ formatCurrency(pedido.valor_subtotal ?? 0) }}</span>
      </div>
      <div class="flex justify-between mb-2" :class="{'text-green-600 font-bold': pedido.frete_gratis_aplicado, 'text-text-muted': !pedido.frete_gratis_aplicado}">
        <span>Entrega:</span>
        <span v-if="pedido.frete_gratis_aplicado">Grátis! (Promo)</span>
        <span v-else>{{ formatCurrency(pedido.valor_entrega ?? 0) }}</span>
      </div>
      <div v-if="pedido.desconto_aplicado && pedido.desconto_aplicado > 0" class="flex justify-between mb-2 text-green-600 font-bold">
        <span>Desconto:</span>
        <span>- {{ formatCurrency(pedido.desconto_aplicado) }}</span>
      </div>
      
      <div class="flex justify-between text-base font-bold text-black dark:text-white mt-3">
        <span>TOTAL:</span>
        <span>{{ formatCurrency(pedido.valor_total ?? 0) }}</span>
      </div>
    </div>

    <!-- Observations -->
    <div v-if="pedido.observacoes" class="mb-8 border-b border-border pb-4">
      <div class="text-text-muted mb-1">OBSERVAÇÕES</div>
      <div class="text-text-primary">{{ pedido.observacoes }}</div>
    </div>

    <!-- Footer Info -->
    <div class="text-center pt-2 flex flex-col items-center justify-center">
      <!-- Literal intencional: `kanban_column` (onde vive is_entry, migration 125)
           só é legível por staff via RLS — este componente também renderiza na
           página pública pós-checkout (catalog/success.vue), sem sessão staff
           pra consultar o flag. A mesma trigger que trava key/is_system numa
           coluna de sistema também trava is_entry (guard_system_kanban_column),
           então este literal não pode divergir do flag em silêncio. -->
      <div v-if="pedido.status === 'pendente'" class="mb-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-800 hover:text-red-950 transition-colors uppercase tracking-wider bg-transparent border-none cursor-pointer focus:outline-none"
          @click="emit('edit')"
        >
          <Pencil class="w-3.5 h-3.5" />
          <span>EDITAR PEDIDO</span>
        </button>
      </div>
      <div class="text-[10px] text-text-muted">Criado: {{ formatDate(pedido.criado_em) }}</div>
      <div class="text-[10px] text-text-muted">Pedido: #{{ shortOrderId }}</div>
    </div>
  </article>
</template>

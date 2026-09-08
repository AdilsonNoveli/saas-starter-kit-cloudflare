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

const aggregatedItems = computed(() => {
  if (!props.pedido?.itens_pedido) return []
  const map = new Map<string, { nome: string, qtde: number, subtotal: number }>()
  
  for (const item of props.pedido.itens_pedido) {
    const nome = item.produtos?.nome || item.nome_produto_congelado || 'Produto Indisponível'
    if (map.has(nome)) {
      const existing = map.get(nome)!
      existing.qtde += item.quantidade
      if (item.subtotal) existing.subtotal += item.subtotal
    } else {
      map.set(nome, { 
        nome, 
        qtde: item.quantidade, 
        subtotal: item.subtotal || 0 
      })
    }
  }
  return Array.from(map.values())
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
  <article v-if="pedido" class="w-full max-w-md p-6 sm:p-8 rounded-md relative bg-[#fdfae7] text-gray-900 text-xs font-semibold tracking-wide uppercase font-sans mx-auto h-fit">
    <!-- Header -->
    <div class="mb-6 border-b-2 border-dashed border-gray-300 pb-4 text-center">
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
      <div v-if="pedido.forma_pagamento?.toLowerCase() === 'pix' && chavePix" class="mt-3 p-3 border border-dashed border-gray-400 rounded-lg bg-white/50 text-center relative group">
        <div class="text-[9px] text-gray-500 mb-1 font-bold tracking-wider">CHAVE PIX (TOQUE PARA COPIAR)</div>
        <button
          type="button"
          class="w-full text-xs font-bold tracking-normal normal-case break-all hover:text-brand-green transition-colors focus:outline-none flex items-center justify-center gap-1.5 py-1"
          @click="copiarPix"
        >
          <span>{{ chavePix }}</span>
          <svg class="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:text-brand-green" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
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
      <div v-for="(item, idx) in aggregatedItems" :key="idx" class="flex justify-between mt-1.5">
        <span class="pr-4">{{ item.qtde }}x {{ item.nome }}</span>
        <span v-if="item.subtotal">{{ formatCurrency(item.subtotal) }}</span>
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
      
      <div class="flex justify-between text-base font-bold text-black mt-3">
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

<!--
  @descricao: Aba de histórico de pedidos do cliente na 3ª coluna.
  @responsabilidade: Listar pedidos recentes com status Kanban, valor, itens e atalho para ver recibo.
-->

<script setup lang="ts">
import { ref } from 'vue'
import type { ChatCustomerOrderSummary } from '#shared/types/chat'
import type { ReceiptOrder } from '~~/shared/types/order'
import {
  ShoppingBag,
  Clock,
  Receipt,
  Truck,
  Store,
  Loader2,
} from '@lucide/vue'
import { useFormatters } from '~/composables/useFormatters'
import OrderThermalReceiptModal from '~/components/ui/OrderThermalReceiptModal.vue'

defineProps<{
  readonly orders: readonly ChatCustomerOrderSummary[]
  readonly loading?: boolean
}>()

const { formatCurrency } = useFormatters()

// Modal de Recibo Térmico
const receiptOrder = ref<ReceiptOrder | null>(null)
const isReceiptModalOpen = ref<boolean>(false)
const loadingReceipt = ref<boolean>(false)

const openReceipt = async (orderId: string) => {
  loadingReceipt.value = true
  try {
    const res = await $fetch<{ data: ReceiptOrder | null }>(`/api/admin/orders/${orderId}`)
    if (res.data) {
      receiptOrder.value = res.data
      isReceiptModalOpen.value = true
    }
  } finally {
    loadingReceipt.value = false
  }
}

const closeReceipt = () => {
  isReceiptModalOpen.value = false
  receiptOrder.value = null
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <div class="p-4 space-y-3 select-text">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <ShoppingBag class="w-3.5 h-3.5 text-text-muted" />
        <span>Pedidos Recentes ({{ orders.length }})</span>
      </h4>
    </div>

    <!-- Lista de Pedidos -->
    <div v-if="orders.length > 0" class="space-y-2.5">
      <div
        v-for="order in orders"
        :key="order.id"
        class="p-3.5 rounded-xl bg-surface-raised border border-border/80 space-y-2 hover:border-border transition-colors"
      >
        <!-- Topo do Card: Número + Status -->
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-sm text-text-primary">
            #{{ order.numeroSequencial || order.id.slice(0, 6) }}
          </span>

          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            :style="{
              backgroundColor: `${order.statusColor}1A`,
              color: order.statusColor || '#22b573',
            }"
          >
            {{ order.statusLabel || order.status }}
          </span>
        </div>

        <!-- Data e Tipo de Entrega -->
        <div class="flex items-center justify-between text-xs text-text-muted">
          <span class="flex items-center gap-1">
            <Clock class="w-3 h-3" />
            {{ formatDate(order.criadoEm) }}
          </span>

          <span class="flex items-center gap-1 font-medium capitalize">
            <Truck v-if="order.tipoEntrega === 'entrega'" class="w-3 h-3 text-blue-500" />
            <Store v-else class="w-3 h-3 text-amber-500" />
            {{ order.tipoEntrega || 'Entrega' }}
          </span>
        </div>

        <!-- Itens do Pedido -->
        <div class="p-2 rounded-lg bg-surface border border-border/60 text-xs space-y-1">
          <div
            v-for="item in order.itens"
            :key="item.id"
            class="flex items-center justify-between gap-2"
          >
            <span class="text-text-secondary truncate">
              {{ item.quantidade }}x {{ item.produtoNome }}
            </span>
            <span class="text-text-muted shrink-0 font-medium">
              {{ formatCurrency(item.subtotal) }}
            </span>
          </div>
        </div>

        <!-- Rodapé do Card: Valor Total + Botão de Ver Recibo -->
        <div class="flex items-center justify-between pt-1 border-t border-border/40">
          <div>
            <span class="text-[10px] text-text-muted block leading-none">Total</span>
            <span class="font-bold text-sm text-brand">
              {{ formatCurrency(order.valorTotal) }}
            </span>
          </div>

          <button
            type="button"
            class="h-7 px-2.5 rounded-md bg-surface hover:bg-surface-raised border border-border text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            :disabled="loadingReceipt"
            title="Ver recibo do pedido"
            @click="openReceipt(order.id)"
          >
            <Loader2 v-if="loadingReceipt" class="w-3.5 h-3.5 animate-spin" />
            <Receipt v-else class="w-3.5 h-3.5 text-text-muted" />
            <span>Recibo</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Estado Vazio -->
    <div
      v-else
      class="p-6 text-center text-text-muted bg-surface-raised rounded-xl border border-border/80"
    >
      <ShoppingBag class="w-8 h-8 mx-auto mb-2 text-text-muted/60" />
      <p class="text-xs font-medium text-text-primary">
        Nenhum pedido registrado
      </p>
      <p class="text-[11px] text-text-muted mt-0.5">
        Este cliente ainda não realizou compras na loja.
      </p>
    </div>

    <!-- Modal de Recibo Térmico Reutilizado -->
    <OrderThermalReceiptModal
      :is-open="isReceiptModalOpen"
      :pedido="receiptOrder"
      @close="closeReceipt"
    />
  </div>
</template>

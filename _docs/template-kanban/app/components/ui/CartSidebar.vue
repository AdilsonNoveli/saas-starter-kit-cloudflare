<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X, ShoppingBag, TrendingUp, CheckCircle2, Minus, Plus, CalendarDays, Trash2 } from '@lucide/vue'
import { useCartStore } from '~/stores/cart'
import { useRouter, useRoute } from 'vue-router'
import { formatDeliveryDate } from '~~/shared/utils/preorders'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const cartStore = useCartStore()
const router = useRouter()
const route = useRoute()

const close = () => {
  emit('close')
}

// Handle ESC key to close
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

onMounted(() => {
  if (globalThis.window !== undefined) {
    globalThis.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (globalThis.window !== undefined) {
    globalThis.removeEventListener('keydown', handleKeydown)
  }
})

// Block background scroll when modal is open
watch(() => props.isOpen, (newVal) => {
  if (typeof document !== 'undefined') {
    if (newVal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const checkout = () => {
  if (cartStore.totalItems === 0) return
  close()
  const sessaoId = route.query.sessao as string | undefined
  if (sessaoId) {
    router.push(`/catalog/checkout?sessao=${sessaoId}`)
  } else {
    router.push('/catalog/checkout')
  }
}

const handleQtyInputChange = (cartKey: string, value: number) => {
  const targetVal = Number(Math.max(0, Number(value.toFixed(3))))
  const item = cartStore.items.find(i => i.cart_key === cartKey)
  if (!item) return
  
  const delta = Number((targetVal - item.quantidade).toFixed(3))
  cartStore.updateByKeyRaw(cartKey, delta)
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-100 transition-opacity"
        @click="close"
      />

      <!-- Sidebar Drawer -->
      <div
        class="fixed inset-y-0 right-0 w-full md:w-[400px] bg-surface border-l border-border shadow-2xl z-101 flex flex-col transform transition-transform duration-300 ease-in-out"
        :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
      >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div class="flex items-center gap-2">
          <ShoppingBag class="w-6 h-6 text-text-primary" />
          <h2 class="text-xl font-bold text-text-primary uppercase tracking-tight">Seu Carrinho</h2>
        </div>
        <button
          class="p-2 -mr-2 text-text-muted hover:text-text-primary bg-surface hover:bg-surface-raised rounded-lg border border-border transition-colors focus:outline-none"
          @click="close"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto bg-surface p-4">
        <template v-if="cartStore.items.length > 0">
          
          <!-- Upsell Progress Banner -->
          <div v-if="cartStore.upsellMessage" class="bg-surface p-3 rounded-lg border border-border mb-4 shadow-sm relative overflow-hidden">
            <div class="absolute bottom-0 left-0 h-1 bg-surface-raised w-full">
              <div 
                class="h-full transition-all duration-700 ease-out"
                :class="cartStore.upsellMessage.type === 'success' ? 'bg-brand-green' : 'bg-amber-500'"
                :style="{ width: `${cartStore.upsellMessage.progress}%` }"
              />
            </div>
            <div class="flex items-center gap-3">
              <div :class="['p-2 rounded-lg', cartStore.upsellMessage.type === 'success' ? 'bg-brand-green/10 text-brand-green' : 'bg-orange-50 text-orange-500']">
                <CheckCircle2 v-if="cartStore.upsellMessage.type === 'success'" class="w-5 h-5" stroke-width="2" />
                <TrendingUp v-else class="w-5 h-5" stroke-width="2" />
              </div>
              <p class="text-xs md:text-sm font-bold text-text-primary leading-snug pr-2">
                {{ cartStore.upsellMessage.text }}
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div
              v-for="item in cartStore.items"
              :key="item.cart_key"
              class="bg-surface p-4 rounded-lg border border-border flex gap-4 transition-all hover:border-brand-green/30 shadow-xs"
            >
              <!-- Miniatura do Produto -->
              <div class="w-16 h-16 rounded-lg bg-surface-raised flex items-center justify-center overflow-hidden shrink-0 border border-border/50 select-none">
                <NuxtImg
                  v-if="item.foto_url"
                  :src="item.foto_url"
                  :alt="item.nome"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-text-muted opacity-30 text-xl font-bold select-none">?</span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 class="font-bold text-sm text-text-primary leading-tight uppercase line-clamp-2">
                    {{ item.nome }}
                  </h3>
                  <ul v-if="item.opcoes && item.opcoes.length > 0" class="mt-1 space-y-0.5">
                    <li v-for="op in item.opcoes" :key="op.opcao_item_id" class="text-[11px] text-text-muted leading-tight">
                      + {{ op.nome_congelado }}<span v-if="op.preco_delta_congelado > 0" class="text-text-primary/70"> ({{ formatCurrency(op.preco_delta_congelado) }})</span>
                    </li>
                  </ul>
                  <!-- Encomenda: data de entrega escolhida no modal -->
                  <p
                    v-if="item.preorder"
                    class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-green leading-tight"
                  >
                    <CalendarDays class="w-3 h-3 shrink-0" />
                    Encomenda — entrega {{ formatDeliveryDate(item.preorder.delivery_date) }}
                  </p>
                  <!-- Hint de desconto progressivo (QTD → desconto) -->
                  <p v-if="cartStore.getProgressiveHint(item.produto_id)" class="mt-1 text-[11px] font-semibold text-brand-green leading-snug">
                    {{ cartStore.getProgressiveHint(item.produto_id) }}
                  </p>
                </div>

                <div class="mt-3 flex items-end justify-between">
                  <span class="font-semibold text-text-primary text-[15px] leading-none">
                    {{ formatCurrency(item.preco) }}
                    <span v-if="item.unidade_medida" class="text-[10px] font-normal text-text-muted">/ {{ item.unidade_medida }}</span>
                  </span>

                  <!-- Encomenda: quantidade fixa (validada contra min/max no modal
                       e revalidada no backend) — só remover é permitido. -->
                  <div
                    v-if="item.preorder"
                    class="flex items-center gap-2 h-[32px]"
                  >
                    <span class="text-xs font-semibold text-text-primary select-none">
                      {{ item.quantidade }} {{ item.unidade_medida || 'un' }}
                    </span>
                    <button
                      type="button"
                      class="p-1.5 rounded-md border border-border/60 bg-surface-raised text-text-muted hover:text-danger-600 hover:bg-surface transition-colors active:scale-95"
                      aria-label="Remover encomenda"
                      title="Remover encomenda"
                      @click="cartStore.removeByKey(item.cart_key)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <!-- Controles Integrados Retangulares (Shopify Style) -->
                  <div v-else class="flex items-center border border-border/60 rounded-lg h-[32px] bg-surface-raised overflow-hidden">
                    <button
                      type="button"
                      class="px-2.5 h-full hover:bg-surface transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
                      @click="cartStore.updateByKey(item.cart_key, -1)"
                    >
                      <Minus class="w-3.5 h-3.5" />
                    </button>
                    
                    <!-- Input editável para fracionados, ou texto padrão para inteiros -->
                    <input
                      v-if="item.permite_fracionamento"
                      type="number"
                      step="0.1"
                      min="0.001"
                      :value="item.quantidade"
                      class="w-10 text-center font-semibold text-xs bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-text-primary"
                      @change="(e) => handleQtyInputChange(item.cart_key, Number((e.target as HTMLInputElement).value))"
                    >
                    <span v-else class="w-8 text-center font-semibold text-xs text-text-primary select-none">
                      {{ item.quantidade }}
                    </span>
                    
                    <button
                      type="button"
                      class="px-2.5 h-full hover:bg-surface transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
                      @click="cartStore.updateByKey(item.cart_key, 1)"
                    >
                      <Plus class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        
        <!-- Carrinho Vazio -->
        <div v-else class="h-full flex flex-col items-center justify-center text-text-muted gap-4">
          <ShoppingBag class="w-16 h-16 opacity-30" stroke-width="1" />
          <p class="font-bold uppercase tracking-wider">Seu carrinho está vazio</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border bg-surface p-4 shadow-[0_-6px_20px_rgba(0,0,0,0.04)] flex flex-col gap-4">
        <!-- Card único: próxima faixa do desconto no carrinho (acima do CTA) -->
        <div v-if="cartStore.cartDiscountIncentive">
          <CatalogPromotionIncentiveCard :incentive="cartStore.cartDiscountIncentive" />
        </div>

        <!-- Subtotal e Desconto -->
        <div class="space-y-1">
          <div v-if="cartStore.discount > 0" class="flex justify-between items-center">
            <span class="text-xs text-text-muted">Subtotal</span>
            <span class="text-xs text-text-muted tabular-nums">{{ formatCurrency(cartStore.totalPrice) }}</span>
          </div>
          <div v-if="cartStore.discount > 0" class="flex justify-between items-center">
            <span class="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              {{ cartStore.discountName }}
            </span>
            <span class="text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums">- {{ formatCurrency(cartStore.discount) }}</span>
          </div>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-sm font-bold text-text-muted uppercase tracking-wider">Total</span>
          <span class="text-xl font-bold text-text-primary tabular-nums">{{ formatCurrency(cartStore.totalPriceWithDiscount) }}</span>
        </div>
        
        <button 
          :disabled="cartStore.totalItems === 0"
          class="w-full py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all bg-brand-green hover:bg-brand-greenDark text-white shadow-sm active:scale-[0.99] disabled:bg-surface-raised disabled:text-text-muted disabled:shadow-none"
          @click="checkout"
        >
          Finalizar Pedido
        </button>
      </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { CalendarDays, ChevronDown, ChevronUp } from '@lucide/vue'
import PreorderDatePicker from '~/components/catalog/PreorderDatePicker.vue'
import { formatDeliveryDate } from '~~/shared/utils/preorders'
import type { CalendarDay } from '~~/shared/types/preorder'
import type { CartItem } from '~/stores/cart'

/**
 * Agendamentos existentes no carrinho (accordion editar/remover) + seletor
 * de data de entrega da encomenda. Extraído de `ProductDetailsModal.vue`
 * (god component).
 */
defineProps<{
  existingPreordersInCart: readonly CartItem[]
  showExistingPreorders: boolean
  productId: string
  preorderDate: string | null
  preorderQuantityError: string | null
  preorderCapacityError: string | null
}>()

const emit = defineEmits<{
  (e: 'update:showExistingPreorders', value: boolean): void
  (e: 'update:preorderDate', value: string | null): void
  (e: 'edit-existing', item: CartItem): void
  (e: 'remove-existing', cartKey: string, dateStr: string): void
  (e: 'day-selected', day: CalendarDay | null): void
}>()
</script>

<template>
  <div class="px-5 pb-4 space-y-3">
    <!-- Accordion clean: Agendamentos deste produto no carrinho -->
    <div
      v-if="existingPreordersInCart.length > 0"
      class="border border-border/70 rounded-md overflow-hidden bg-surface-raised/40"
    >
      <button
        type="button"
        class="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer select-none"
        @click="emit('update:showExistingPreorders', !showExistingPreorders)"
      >
        <div class="flex items-center gap-1.5 font-normal">
          <CalendarDays class="w-3.5 h-3.5 text-brand-green shrink-0" />
          <span>Agendamentos deste produto no carrinho ({{ existingPreordersInCart.length }})</span>
        </div>
        <component :is="showExistingPreorders ? ChevronUp : ChevronDown" class="w-4 h-4 text-text-muted shrink-0" />
      </button>

      <div v-if="showExistingPreorders" class="px-3.5 pb-3 pt-1 border-t border-border/40 space-y-2">
        <div
          v-for="item in existingPreordersInCart"
          :key="item.cart_key"
          class="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0"
        >
          <div class="min-w-0 flex-1">
            <span class="text-text-primary font-medium">🗓️ {{ formatDeliveryDate(item.preorder!.delivery_date) }}</span>
            <span class="text-text-muted ml-1">({{ item.quantidade }} {{ item.unidade_medida || 'un' }})</span>
            <div v-if="item.opcoes && item.opcoes.length > 0" class="text-[10px] text-text-muted truncate">
              {{ item.opcoes.map(o => o.nome_congelado).join(', ') }}
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0 ml-2">
            <button
              type="button"
              class="text-[10px] font-bold text-brand uppercase tracking-wider hover:underline cursor-pointer"
              @click="emit('edit-existing', item)"
            >
              EDITAR
            </button>
            <button
              type="button"
              class="text-[10px] font-bold text-danger-500 uppercase tracking-wider hover:underline cursor-pointer"
              title="Remover este agendamento"
              @click="emit('remove-existing', item.cart_key, item.preorder!.delivery_date)"
            >
              REMOVER
            </button>
          </div>
        </div>
      </div>
    </div>

    <PreorderDatePicker
      :model-value="preorderDate"
      :product-id="productId"
      @update:model-value="emit('update:preorderDate', $event)"
      @day-selected="(d) => emit('day-selected', d)"
    />
    <p v-if="preorderQuantityError" class="text-xs text-danger-600 font-medium">
      {{ preorderQuantityError }}
    </p>
    <p v-if="preorderCapacityError" class="text-xs text-danger-600 font-medium">
      {{ preorderCapacityError }}
    </p>
  </div>
</template>

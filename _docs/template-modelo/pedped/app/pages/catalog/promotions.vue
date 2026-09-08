<script setup lang="ts">
import { computed, ref } from 'vue'
import { getEffectivePrice } from '~~/shared/types/product'
import type { CatalogProductItem, SelectedOption } from '~~/shared/types/product'
import { formatDeliveryDate } from '~~/shared/utils/preorders'
import { useCartStore } from '~/stores/cart'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: 'catalog' })
useHead({ title: 'Ofertas & Promoções' })

const cartStore = useCartStore()
const { notify } = useNotification()

// High limit: promotional products are a curated subset; 500 covers any realistic catalog.
const { data, pending } = await useFetch<{ produtos: CatalogProductItem[] }>('/api/products', {
  key: 'catalog-products-promotions',
  query: { limit: 500 },
  default: () => ({ produtos: [] }),
})

const promotions = computed<CatalogProductItem[]>(() =>
  (data.value?.produtos ?? []).filter((p) => p.preco_promocional != null),
)

const selectedProduct = ref<CatalogProductItem | null>(null)
const selectedModalMode = ref<'info' | 'pdv'>('info')

const openDetails = (product: CatalogProductItem, mode: 'info' | 'pdv') => {
  selectedProduct.value = product
  selectedModalMode.value = mode
}

// Semeia o modal com a quantidade já no carrinho apenas para produtos normais.
const modalInitialQuantity = computed<number>(() => {
  const p = selectedProduct.value
  if (!p) return 0
  const isPreorder = p.product_type === 'preorder' || p.preorder_config !== null
  if (isPreorder) return 0
  return cartStore.getItemQuantity(p.id)
})

const handleModalConfirm = (
  options: readonly SelectedOption[],
  qty: number,
  deliveryDate: string | null,
) => {
  const p = selectedProduct.value
  if (!p) return
  // Guarda de loja fechada: o modo `info` (clique na foto) abre mesmo com a loja
  // fechada, mas adicionar continua bloqueado.
  if (!cartStore.storeStatus.isOpen) {
    notify.warning('Estamos Fechados 😴', cartStore.storeStatus.message)
    return
  }
  const produtoBase = {
    id: p.id,
    nome: p.nome,
    preco: getEffectivePrice(p),
    foto_url: p.foto_url,
    permite_fracionamento: p.permite_fracionamento,
    unidade_medida: p.unidade_medida,
  }
  if (deliveryDate) {
    cartStore.addPreorderItem(produtoBase, qty, deliveryDate, options)
    notify.success('Encomenda adicionada', `Entrega em ${formatDeliveryDate(deliveryDate)}.`)
  } else {
    cartStore.updateQuantity(produtoBase, qty, options)
  }
  selectedProduct.value = null
}
</script>

<template>
  <div>
    <!-- Grid de promoções -->
    <div class="px-3 md:px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 max-w-7xl mx-auto">
      <div v-if="pending" class="col-span-full flex justify-center p-8 text-text-muted">
        Carregando promoções…
      </div>

      <template v-else-if="promotions.length > 0">
        <!-- Wrapper amber mantém bordas de destaque sem alterar o card -->
        <div
          v-for="product in promotions"
          :key="product.id"
          class="ring-2 ring-warning-400 rounded-2xl"
        >
          <CatalogProductCard
            :produto="product"
            @open-details="openDetails"
          />
        </div>
      </template>

      <div v-else class="col-span-full text-center p-8 text-text-muted text-sm">
        Nenhuma promoção disponível no momento.
      </div>
    </div>

    <UiProductDetailsModal
      :is-open="!!selectedProduct"
      :produto="selectedProduct"
      :mode="selectedModalMode"
      :allow-preorder="true"
      :initial-quantity="modalInitialQuantity"
      @close="selectedProduct = null"
      @confirm="handleModalConfirm"
    />
  </div>
</template>

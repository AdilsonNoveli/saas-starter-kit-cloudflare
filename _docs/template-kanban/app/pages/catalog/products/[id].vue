<script setup lang="ts">
/**
 * @descricao: Página dedicada e completa do produto (/catalog/products/:id).
 * @objetivo: Exibe galeria expandida com zoom, wizard de opções idêntico ao modal
 *   (via OptionGroupsSelector), abas de detalhes e produtos recomendados.
 *   Reutiliza useProductOptionSelection e useProductPreorder (DRY com o modal).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { useCartStore } from '~/stores/cart'
import { useNotification } from '~/composables/useNotification'
import { useTracking } from '~/composables/useTracking'
import { useStore } from '~/composables/useStore'
import { useProductOptionSelection } from '~/composables/useProductOptionSelection'
import { useProductPreorder } from '~/composables/useProductPreorder'
import type { CatalogProductDetailResponse } from '~~/server/api/catalog/products/[id].get'
import type { CatalogProductItem } from '~~/shared/types/product'
import { getEffectivePrice, getProductGallery } from '~~/shared/types/product'
import { formatDeliveryDate } from '~~/shared/utils/preorders'
import { calcularMelhorDesconto, type ItemCalculo } from '~~/shared/utils/promotions'

import ProductPageGallery from '~/components/catalog/product-page/ProductPageGallery.vue'
import ProductPageSummary from '~/components/catalog/product-page/ProductPageSummary.vue'
import ProductPagePromotions from '~/components/catalog/product-page/ProductPagePromotions.vue'
import ProductPageTabs from '~/components/catalog/product-page/ProductPageTabs.vue'
import ProductPageRelated from '~/components/catalog/product-page/ProductPageRelated.vue'
import ProductPageStickyBar from '~/components/catalog/product-page/ProductPageStickyBar.vue'
import UiProductDetailsModal from '~/components/ui/ProductDetailsModal.vue'

definePageMeta({
  layout: 'catalog',
})

const route = useRoute()
const cartStore = useCartStore()
const { notify } = useNotification()
const { track } = useTracking()
const { loja } = useStore()

const produtoId = computed<string>(() => route.params.id as string)

// Carrega os dados detalhados do produto pelo endpoint público
const { data, pending, error } = await useFetch<CatalogProductDetailResponse>(
  () => `/api/catalog/products/${produtoId.value}`,
  {
    key: `product-detail-${produtoId.value}`,
  },
)

const produto = computed(() => data.value?.produto ?? null)
const categoria = computed(() => data.value?.produto.categoria ?? null)
const produtosRelacionados = computed(() => data.value?.produtosRelacionados ?? [])
const relatedOrigin = computed(() => data.value?.relatedOrigin ?? 'category')
const promocoes = computed(() => data.value?.promocoes ?? [])

// Frete grátis — derivado da config pública da loja (zero fetch extra)
const freteGratisMeta = computed(() => loja.value?.config_promocoes?.meta_frete_gratis ?? null)
const freteGratisHabilitado = computed(() => loja.value?.config_promocoes?.habilitar_upsell_frete === true)

// ── Composables de opções e encomendas (idêntico ao modal) ───────────────────
const {
  grupos,
  loadingOpcoes,
  loadGrupos,
  selections,
  resetOptionState,
  toggleItem,
  textValues,
  fileValues,
  fileUploading,
  fileUploadError,
  setTextValue,
  onArteFileSelected,
  removeArteFile,
  validationErrors,
  precoExtraTotal,
  buildSelectedOptions,
} = useProductOptionSelection()

const quantidade = ref<number>(1)

const isPreorder = computed<boolean>(() => {
  const p = produto.value
  if (!p) return false
  return p.product_type === 'preorder' || p.preorder_config !== null
})

const {
  isPreorderMode,
  effectivePreorderConfig,
  loadPreorderConfig,
  preorderDate,
  preorderDay,
  showExistingPreorders,
  existingPreordersInCart,
  isEditingExistingPreorder,
  editExistingPreorder,
  removeExistingPreorder,
  preorderQuantityError,
  preorderCapacityError,
  canConfirmPreorder,
  resetPreorderState,
} = useProductPreorder({
  produto: computed(() => produto.value),
  allowPreorder: computed(() => true),
  grupos,
  selections,
  quantidade,
  cartStore,
})

// ── Gestão de Estoque ────────────────────────────────────────────────────────
const quantidadeJaNoCarrinho = computed<number>(() =>
  produto.value ? cartStore.getItemQuantity(produto.value.id) : 0,
)

const maxAdicionavel = computed<number | null>(() => {
  const disponivel = produto.value?.quantidade_disponivel
  if (disponivel === null || disponivel === undefined) return null
  return Math.max(0, disponivel - quantidadeJaNoCarrinho.value)
})

const stockQuantityError = computed<string | null>(() => {
  if (isPreorderMode.value || maxAdicionavel.value === null) return null
  if (quantidade.value <= maxAdicionavel.value) return null
  return maxAdicionavel.value <= 0
    ? 'Este produto está esgotado no momento.'
    : `Restam apenas ${maxAdicionavel.value} ${produto.value?.unidade_medida || 'unidade(s)'} disponível(is).`
})

// ── Galeria & Preço ──────────────────────────────────────────────────────────
const gallery = computed<string[]>(() => (produto.value ? getProductGallery(produto.value) : []))
const effectivePrice = computed<number>(() => (produto.value ? getEffectivePrice(produto.value) : 0))
const isOnPromotion = computed<boolean>(() => produto.value?.preco_promocional != null)

const discountPercent = computed<number | null>(() => {
  if (!produto.value || produto.value.preco_promocional == null || !produto.value.preco_venda) return null
  const regular = produto.value.preco_venda
  const promo = produto.value.preco_promocional
  if (regular <= promo) return null
  return Math.round(((regular - promo) / regular) * 100)
})

/**
 * Preço final ao vivo — fonte única para CTA (rodapé fixo), resumo do wizard e
 * sticky bar. Antes cada um recalculava `(preço + extras) * quantidade` por
 * conta própria, ignorando promoções (bug: o total exibido não batia com o
 * "Valor Total" prometido na tabela de desconto progressivo).
 *
 * MARGINAL, não isolado: um pedido grande com variações diferentes (ex.: 10
 * unidades com uma arte + 10 com outra) precisa de VÁRIAS adições ao
 * carrinho — cada uma com suas próprias opções — mas a faixa de desconto é
 * pela quantidade TOTAL do produto, carrinho inteiro. Por isso o desconto
 * previsto aqui é a DIFERENÇA entre "desconto do carrinho com esta adição" e
 * "desconto do carrinho sem ela": a primeira unidade que empurra o cliente
 * pra uma faixa melhor mostra o ganho completo; adições seguintes já dentro
 * da mesma faixa não inflam o preview. `calcularMelhorDesconto` é a MESMA
 * função usada em `app/stores/cart.ts` para o desconto real do carrinho —
 * ambas construídas sobre `calcularDescontoPorTipo`, a calculadora pura do
 * checkout (`applyPromotions.ts`) — o preview aqui nunca diverge do cobrado.
 */
const precoUnitarioComOpcoes = computed<number>(() => effectivePrice.value + precoExtraTotal.value)
const subtotalSemDesconto = computed<number>(() => precoUnitarioComOpcoes.value * quantidade.value)

const itensCarrinhoAtual = computed<ItemCalculo[]>(() =>
  cartStore.items.map((i) => ({ produto_id: i.produto_id, preco: i.preco, quantidade: i.quantidade })),
)

const descontoAplicado = computed<number>(() => {
  if (!produto.value || quantidade.value <= 0) return 0

  const itemNovo: ItemCalculo = {
    produto_id: produto.value.id,
    preco: precoUnitarioComOpcoes.value,
    quantidade: quantidade.value,
  }

  const descontoAntes = cartStore.discount
  const subtotalDepois = cartStore.totalPrice + subtotalSemDesconto.value
  const descontoDepois = calcularMelhorDesconto(
    promocoes.value,
    [...itensCarrinhoAtual.value, itemNovo],
    subtotalDepois,
  ).valor

  return Math.max(0, descontoDepois - descontoAntes)
})

const totalComDesconto = computed<number>(() =>
  Math.max(0, subtotalSemDesconto.value - descontoAplicado.value),
)

// ── Inicialização de estado ──────────────────────────────────────────────────
function initProduct() {
  resetOptionState()
  resetPreorderState()
  quantidade.value = isPreorder.value ? (produto.value?.preorder_config?.min_quantity ?? 1) : 1
  if (!isPreorder.value && maxAdicionavel.value !== null) {
    quantidade.value = Math.min(quantidade.value, Math.max(1, maxAdicionavel.value))
  }
  if (produto.value?.id) {
    void loadPreorderConfig()
    if (produto.value.tem_opcoes) {
      void loadGrupos(produto.value.id)
    }
    track('produto_view', { entidade: 'produto', entidade_id: produto.value.id })
  }
}

watch(() => produto.value?.id, () => {
  initProduct()
}, { immediate: true })

// ── Stepper de Quantidade ────────────────────────────────────────────────────
function incrementQty() {
  const step = produto.value?.permite_fracionamento ? 0.1 : 1
  const current = Number(quantidade.value || 0)
  const next = Number((current + step).toFixed(3))
  if (isPreorderMode.value && effectivePreorderConfig.value) {
    const maxVal = effectivePreorderConfig.value.max_quantity
    quantidade.value = Number(Math.min(next, maxVal).toFixed(3))
  } else if (!isPreorderMode.value && maxAdicionavel.value !== null) {
    quantidade.value = Number(Math.min(next, maxAdicionavel.value).toFixed(3))
  } else {
    quantidade.value = next
  }
}

function decrementQty() {
  const step = produto.value?.permite_fracionamento ? 0.1 : 1
  const minVal = isPreorderMode.value
    ? (effectivePreorderConfig.value?.min_quantity ?? 1)
    : (produto.value?.permite_fracionamento ? 0.1 : 1)
  const current = Number(quantidade.value || 0)
  const next = Number((current - step).toFixed(3))
  quantidade.value = Number(Math.max(minVal, next).toFixed(3))
}

/** Linha clicada na tabela de desconto progressivo — mesmo clamp de incrementQty/decrementQty (DRY). */
function selecionarQuantidadeTabela(qtd: number) {
  if (isPreorderMode.value && effectivePreorderConfig.value) {
    const { min_quantity, max_quantity } = effectivePreorderConfig.value
    quantidade.value = Math.min(Math.max(qtd, min_quantity), max_quantity)
  } else if (!isPreorderMode.value && maxAdicionavel.value !== null) {
    quantidade.value = Math.min(qtd, Math.max(1, maxAdicionavel.value))
  } else {
    quantidade.value = qtd
  }
}

const canConfirm = computed<boolean>(() => validationErrors.value.size === 0 && fileUploading.value.size === 0)

// ── Adicionar ao Carrinho ────────────────────────────────────────────────────
function handleConfirm() {
  const p = produto.value
  if (!p) return

  if (!cartStore.storeStatus.isOpen) {
    notify.warning('Estamos Fechados 😴', cartStore.storeStatus.message)
    return
  }

  if (!canConfirm.value) {
    notify.warning('Opções obrigatórias', 'Por favor, selecione as opções obrigatórias antes de continuar.')
    return
  }

  if (isPreorderMode.value && !canConfirmPreorder.value) {
    notify.warning('Data de entrega', 'Por favor, selecione a data desejada para a encomenda.')
    return
  }

  if (!isPreorderMode.value && stockQuantityError.value) {
    notify.warning('Estoque insuficiente', stockQuantityError.value)
    return
  }

  const produtoBase = {
    id: p.id,
    nome: p.nome,
    preco: effectivePrice.value,
    foto_url: p.foto_url,
    permite_fracionamento: p.permite_fracionamento,
    unidade_medida: p.unidade_medida,
  }

  const selectedOptions = buildSelectedOptions()

  if (isPreorderMode.value && preorderDate.value) {
    cartStore.addPreorderItem(produtoBase, quantidade.value, preorderDate.value, selectedOptions)
    notify.success('Encomenda adicionada ao pedido!', `Data de entrega: ${formatDeliveryDate(preorderDate.value)}`)
  } else {
    cartStore.updateQuantity(produtoBase, quantidade.value, selectedOptions)
    notify.success('Item adicionado ao pedido!', `${quantidade.value}x ${p.nome}`)
  }

  // Abre a gaveta do carrinho para feedback imediato e visualização do pedido
  cartStore.toggleCartSidebar(true)

  track('add_to_cart', { entidade: 'produto', entidade_id: p.id })
}

// ── Navegação por Categoria (Breadcrumb) ─────────────────────────────────────
const activeCategoryState = useState<string | null>('catalog:activeCategory', () => null)

function handleSelectCategory(catId: string) {
  activeCategoryState.value = catId
  navigateTo('/catalog')
}

// ── Modal auxiliar para produtos recomendados (modo modal) ───────────────────
const selectedRelatedProduct = ref<CatalogProductItem | null>(null)
const selectedRelatedMode = ref<'info' | 'pdv'>('info')

function handleRelatedClick(p: CatalogProductItem, mode: 'info' | 'pdv') {
  if (loja.value?.config_layout?.product_view_mode === 'page') {
    navigateTo(`/catalog/products/${p.id}`)
  } else {
    selectedRelatedProduct.value = p
    selectedRelatedMode.value = mode
  }
}

// ── Sticky Bar ───────────────────────────────────────────────────────────────
// Desktop: sempre visível (controle por CSS — hidden md:flex / flex md:hidden).
// Mobile: visível apenas quando o wizard sai do viewport.
const showStickyBar = ref<boolean>(false)
const actionsRef = ref<HTMLElement | null>(null)

function handleScroll() {
  if (!actionsRef.value || typeof window === 'undefined') return
  const rect = actionsRef.value.getBoundingClientRect()
  showStickyBar.value = rect.bottom < 0
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', handleScroll, { passive: true })
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll)
  }
})

// ── SEO / Head ───────────────────────────────────────────────────────────────
useHead({
  title: computed(() => produto.value ? `${produto.value.nome} - Catálogo` : 'Produto'),
  meta: [
    {
      name: 'description',
      content: computed(() => produto.value?.descricao || 'Confira os detalhes e opções deste produto.'),
    },
    {
      property: 'og:title',
      content: computed(() => produto.value?.nome || 'Produto'),
    },
    {
      property: 'og:image',
      content: computed(() => produto.value?.foto_url || ''),
    },
  ],
})
</script>

<template>
  <div class="w-full min-h-screen bg-surface">
    <!-- Estado de Carregamento -->
    <div v-if="pending" class="w-full max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-text-muted">
      <div class="w-10 h-10 border-2 border-border border-t-brand rounded-full animate-spin mb-4" />
      <span class="text-sm font-medium">Carregando produto…</span>
    </div>

    <!-- Estado de Erro / Não Encontrado -->
    <div v-else-if="error || !produto" class="w-full max-w-3xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
      <h2 class="text-xl font-bold text-text-primary mb-2">Produto não encontrado</h2>
      <p class="text-sm text-text-muted mb-6">O produto que você procura pode ter sido removido ou está temporariamente indisponível.</p>
      <NuxtLink
        to="/catalog"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold uppercase tracking-wider hover:bg-brand/90 transition-all"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Voltar ao Catálogo</span>
      </NuxtLink>
    </div>

    <!-- Página Completa do Produto -->
    <div v-else class="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 pb-24">
      <!-- Botão Voltar -->
      <div class="mb-4">
        <NuxtLink
          to="/catalog"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Voltar ao catálogo</span>
        </NuxtLink>
      </div>

      <!-- Grade Principal (Galeria na Esquerda + Resumo e Ações na Direita) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <!-- Coluna Esquerda: Galeria Multimídia (7 cols em desktop) -->
        <div class="lg:col-span-7 w-full">
          <ProductPageGallery
            :gallery="gallery"
            :product-name="produto.nome"
            :discount-percent="discountPercent"
            :is-preorder="isPreorder"
            :available="produto.disponivel"
          />
        </div>

        <!-- Coluna Direita: Resumo + Wizard de Opções + CTA (5 cols em desktop) -->
        <div class="lg:col-span-5 w-full flex flex-col gap-5">
          <!-- Resumo: Breadcrumb, Título, Preço -->
          <ProductPageSummary
            :product="produto"
            :category="categoria"
            :effective-price="effectivePrice"
            :is-on-promotion="isOnPromotion"
            :discount-percent="discountPercent"
            @select-category="handleSelectCategory"
          />

          <!-- Promoções ativas do produto (progressivo, leve/pague, desconto carrinho, frete grátis) -->
          <ProductPagePromotions
            v-if="produto"
            :promocoes="promocoes"
            :produto-id="produto.id"
            :effective-price="effectivePrice"
            :quantidade="quantidade"
            :frete-gratis-meta="freteGratisMeta"
            :frete-gratis-habilitado="freteGratisHabilitado"
            @selecionar-quantidade="selecionarQuantidadeTabela"
          />

          <!-- Wizard de Opções + Quantidade + CTA (altura padrão estável alinhada ao design) -->
          <div
            ref="actionsRef"
            class="rounded-lg border border-border overflow-hidden bg-surface flex flex-col h-[440px] sm:h-[460px] transition-all"
          >
            <UiProductDetailsOptionGroupsSelector
              class="w-full h-full flex flex-col min-h-0"
              :grupos="grupos"
              :loading-opcoes="loadingOpcoes"
              :validation-errors="validationErrors"
              :selections="selections"
              :text-values="textValues"
              :file-values="fileValues"
              :file-uploading="fileUploading"
              :file-upload-error="fileUploadError"
              :is-preorder-mode="isPreorderMode"
              :existing-preorders-in-cart="existingPreordersInCart"
              :show-existing-preorders="showExistingPreorders"
              :product-id="produto.id"
              :preorder-date="preorderDate"
              :preorder-quantity-error="preorderQuantityError"
              :preorder-capacity-error="preorderCapacityError"
              :is-editing-existing-preorder="isEditingExistingPreorder"
              :quantidade="quantidade"
              :max-adicionavel="maxAdicionavel"
              :permite-fracionamento="produto.permite_fracionamento"
              :unidade-medida="produto.unidade_medida"
              :effective-price="effectivePrice"
              :preco-extra-total="precoExtraTotal"
              :total-price="totalComDesconto"
              :desconto-aplicado="descontoAplicado"
              :can-confirm="canConfirm"
              :can-confirm-preorder="canConfirmPreorder"
              :stock-quantity-error="stockQuantityError"
              @toggle-item="toggleItem"
              @set-text="setTextValue"
              @file-selected="onArteFileSelected"
              @file-remove="removeArteFile"
              @update:show-existing-preorders="showExistingPreorders = $event"
              @update:preorder-date="preorderDate = $event"
              @edit-existing="editExistingPreorder"
              @remove-existing="removeExistingPreorder"
              @day-selected="preorderDay = $event"
              @decrement-qty="decrementQty"
              @increment-qty="incrementQty"
              @confirm="handleConfirm"
            />
          </div>
        </div>
      </div>

      <!-- Abas Informativas de Detalhes, Especificações e Envio -->
      <ProductPageTabs
        :product="produto"
        :category="categoria"
        :store-name="loja?.nome_fantasia"
        :whatsapp-number="loja?.whatsapp_atendimento"
        :allows-pickup="loja?.permite_retirada"
        :delivery-fee="loja?.taxa_entrega_padrao"
        :feature-image="gallery[1] || null"
      />

      <!-- Produtos Recomendados / Relacionados -->
      <ProductPageRelated
        :produtos="produtosRelacionados"
        :related-origin="relatedOrigin"
        @open-details="handleRelatedClick"
      />

      <!-- Barra Fixa Inferior de Compra no Mobile/Desktop ao rolar -->
      <ProductPageStickyBar
        :product="produto"
        :total-price="totalComDesconto"
        :quantity="quantidade"
        :is-open="cartStore.storeStatus.isOpen"
        :is-esgotado="!isPreorder && produto.quantidade_disponivel === 0"
        :show="showStickyBar && !cartStore.isCartSidebarOpen"
        :quantity-in-cart="quantidadeJaNoCarrinho"
        @confirm="handleConfirm"
        @open-cart="cartStore.toggleCartSidebar(true)"
      />

      <!-- Modal auxiliar para produtos relacionados quando em modo modal -->
      <UiProductDetailsModal
        :is-open="!!selectedRelatedProduct"
        :produto="selectedRelatedProduct"
        :mode="selectedRelatedMode"
        :allow-preorder="true"
        @close="selectedRelatedProduct = null"
      />
    </div>
  </div>
</template>

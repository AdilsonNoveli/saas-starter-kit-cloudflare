<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Truck } from '@lucide/vue'
import { useCartStore } from '~/stores/cart'
import { useNotification } from '~/composables/useNotification'
import { useStore } from '~/composables/useStore'
import { useTheme } from '~/composables/useTheme'
import { useTracking } from '~/composables/useTracking'
import { useFormatters } from '~/composables/useFormatters'
import { useCheckoutForm } from '~/composables/useCheckoutForm'
import { formatDeliveryDate } from '~~/shared/utils/preorders'
import { validateWhatsapp } from '~~/shared/utils/phoneValidator'
import { CARD_RADIUS_MAP, BTN_RADIUS_MAP, DEFAULT_CARD_RADIUS, DEFAULT_BTN_RADIUS } from '~~/shared/types/store'

definePageMeta({
  layout: false, // Vamos usar um layout interno limpo idêntico ao protótipo
  middleware: ['session-auth']
})

useHead({
  title: 'Checkout - Finalizar Pedido'
})

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const { notify } = useNotification()
const { loja, fetch: fetchLoja } = useStore()
const { track } = useTracking()
const { resolvedTheme } = useTheme()

await fetchLoja()

// Mesmo critério de `catalog.vue`/`success.vue`: prioriza o logo do tema
// resolvido, com fallback pro outro quando a loja só cadastrou um dos dois.
const currentLogo = computed(() => {
  if (resolvedTheme.value === 'dark') {
    return loja.value?.logomarca_dark || loja.value?.logomarca || null
  }
  return loja.value?.logomarca || loja.value?.logomarca_dark || null
})

const catalogLayoutStyles = computed(() => {
  const layout = loja.value?.config_layout
  if (!layout) return {}
  const s: Record<string, string> = {}
  if (layout.brand_color) {
    s['--color-brand'] = layout.brand_color
    s['--color-brand-green'] = layout.brand_color
  }
  if (layout.brand_hover_color) {
    s['--color-brand-hover'] = layout.brand_hover_color
    s['--color-brand-greenDark'] = layout.brand_hover_color
  }
  if (layout.border_radius) {
    s['--catalog-radius'] = CARD_RADIUS_MAP[layout.border_radius] ?? DEFAULT_CARD_RADIUS
    s['--catalog-btn-radius'] = BTN_RADIUS_MAP[layout.border_radius] ?? DEFAULT_BTN_RADIUS
  } else {
    s['--catalog-radius'] = DEFAULT_CARD_RADIUS
    s['--catalog-btn-radius'] = DEFAULT_BTN_RADIUS
  }
  return s
})

watch(
  catalogLayoutStyles,
  (styles) => {
    if (import.meta.client && typeof document !== 'undefined' && document.documentElement) {
      const radius = styles['--catalog-radius']
      const btnRadius = styles['--catalog-btn-radius']
      if (radius) {
        document.documentElement.style.setProperty('--catalog-radius', radius)
        if (btnRadius) document.documentElement.style.setProperty('--catalog-btn-radius', btnRadius)
      } else {
        document.documentElement.style.removeProperty('--catalog-radius')
        document.documentElement.style.removeProperty('--catalog-btn-radius')
      }
    }
  },
  { immediate: true },
)

// ── Session & WhatsApp Flow State ──
// O middleware 'session-auth' já valida e limpa a sessão caso esteja inválida.
// Portanto, se route.query.sessao existir na rota, ela é garantidamente ativa e válida.
const isSessionValid = ref(!!route.query.sessao)
// Track session ID independently of route.query: on mobile WebViews (iOS Safari, WhatsApp browser)
// router.replace() may not update the reactive route.query, causing enviarPedido to see null.
const sessaoAtiva = ref<string | null>(
  typeof route.query.sessao === 'string' ? route.query.sessao : null
)
const whatsapp = ref('')
const loadingSession = ref(false)
const sessionErrorMsg = ref('')

// Se o carrinho estiver vazio no lado do cliente, volta pro catálogo (preserva sessao se houver)
if (import.meta.client && cartStore.totalItems === 0) {
  const currentSessao = sessaoAtiva.value ? `?sessao=${sessaoAtiva.value}` : ''
  router.replace(`/catalog${currentSessao}`)
}

const isWhatsappValid = computed(() => {
  return validateWhatsapp(whatsapp.value).isValid
})

const requestAccess = async () => {
  const validation = validateWhatsapp(whatsapp.value)
  if (!validation.isValid) {
    sessionErrorMsg.value = validation.reason || 'Digite um número de Whatsapp válido!'
    return
  }

  loadingSession.value = true
  sessionErrorMsg.value = ''

  try {
    const { success, sessaoId: newSessaoId } = await $fetch<{ success: boolean; sessaoId: string }>('/api/session/create-direct', {
      method: 'POST',
      body: { whatsapp: whatsapp.value }
    })

    if (success && newSessaoId) {
      sessaoAtiva.value = newSessaoId
      await router.replace({
        query: {
          ...route.query,
          sessao: newSessaoId
        }
      })
      isSessionValid.value = true
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string } }
    sessionErrorMsg.value = errorObj.data?.message || 'Digite um número de Whatsapp válido!'
  } finally {
    loadingSession.value = false
  }
}

const { formatCurrency } = useFormatters()

const {
  tipoEntrega, endereco, bairro, numero, lat, freteCalculado, distanciaKm, calculandoFrete,
  formaPagamento, detalhes, isSubmitting, tentouEnviar, addressOutOfRange, addressRangeError,
  couponCode, couponOpen, couponLoading, couponError, couponResult, applyCoupon, removeCoupon,
  relatedProducts, selectedRelated, toggleRelated,
  kitsCheckout, selectedKits, toggleKit,
  totalPedido, isFormValid,
  onPlaceSelected, onAddressInvalidate, enviarPedido,
} = useCheckoutForm({ cartStore, loja, sessaoAtiva, router, notify })

onMounted(() => {
  // BFCache: iOS Safari restores pages from memory without re-running middleware.
  // A stale/expired session in the cache would show the form but fail on submit.
  // Force a reload so middleware re-validates the session on any bfcache restore.
  window.addEventListener('pageshow', (event) => {
    if ((event as PageTransitionEvent).persisted) window.location.reload()
  }, { once: true })

  track('checkout_iniciado')
})

const _explicitCategoryId = useState<string | null>('catalog:activeCategory', () => null)
const goToMainCategory = () => {
  _explicitCategoryId.value = null
  navigateTo('/catalog')
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col font-sans" :style="catalogLayoutStyles">
    <!-- Header global e centralizado (sem seta de voltar e sem passos de breadcrumb) -->
    <header class="w-full border-b border-border bg-surface py-5 px-4 flex justify-center items-center">
      <button
        type="button"
        class="flex items-center justify-center cursor-pointer transition-transform active:scale-95 bg-transparent border-0 p-0"
        aria-label="Ir para categoria principal"
        @click="goToMainCategory"
      >
        <NuxtImg
          v-if="currentLogo"
          :src="currentLogo"
          :alt="loja?.nome_fantasia ?? 'Logo'"
          class="h-[44px] md:h-[60px] object-contain max-w-full shrink"
          loading="eager"
        />
        <span v-else class="font-bold text-base tracking-widest uppercase text-text-primary">
          {{ loja?.nome_fantasia ?? 'Pedido' }}
        </span>
      </button>
    </header>

    <ClientOnly>
      <div class="w-full max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-0 lg:gap-8 p-4 lg:p-8 lg:items-start relative flex-1">

      <!-- ── Coluna esquerda: formulário ── -->
      <div class="lg:col-span-7 xl:col-span-8 flex flex-col w-full pb-28 lg:pb-0">

        <!-- Passo 1: Coleta de WhatsApp -->
        <CheckoutWhatsappGate
          v-if="!isSessionValid"
          v-model="whatsapp"
          :loading="loadingSession"
          :error-msg="sessionErrorMsg"
          @submit="requestAccess"
        />

        <!-- Formulário -->
        <main v-else class="px-4 lg:px-0 pt-4 lg:pt-0 pb-7 space-y-8 flex-1 animate-in fade-in duration-300">

          <CheckoutDeliverySection
            v-model:tipo-entrega="tipoEntrega"
            v-model:endereco="endereco"
            v-model:bairro="bairro"
            v-model:numero="numero"
            :lat="lat"
            :frete-calculado="freteCalculado"
            :tentou-enviar="tentouEnviar"
            :address-out-of-range="addressOutOfRange"
            :address-range-error="addressRangeError"
            :permite-retirada="loja?.permite_retirada !== false"
            @place-selected="onPlaceSelected"
            @address-invalidate="onAddressInvalidate"
          />

          <CheckoutPaymentSection v-model="formaPagamento" :tentou-enviar="tentouEnviar" />

          <!-- 4. Observações do pedido -->
          <section>
            <h2 class="text-base font-bold text-text-primary mb-3">Observações do pedido</h2>
            <textarea
              id="details"
              v-model="detalhes"
              aria-label="Observações do pedido"
              placeholder="Alguma instrução especial para o pedido?"
              rows="3"
              class="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-colors resize-none"
            />
          </section>

          <CheckoutRelatedProducts :products="relatedProducts" :selected="selectedRelated" @toggle="toggleRelated" />

          <!-- 6. Resumo compacto mobile (visível apenas em mobile, acima do sticky CTA) -->
          <section class="lg:hidden bg-surface border border-border rounded-lg p-4">
            <h2 class="text-sm font-bold text-text-primary mb-3">Resumo do pedido</h2>
            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span class="tabular-nums">{{ formatCurrency(cartStore.totalPrice) }}</span>
              </div>
              <div v-if="cartStore.discount > 0" class="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                <span class="truncate mr-2">{{ cartStore.discountName }}</span>
                <span class="tabular-nums shrink-0">- {{ formatCurrency(cartStore.discount) }}</span>
              </div>
              <div
                v-if="tipoEntrega === 'ENTREGA'"
                class="flex justify-between"
                :class="freteCalculado === 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-text-muted'"
              >
                <span class="flex items-center gap-1">
                  <Truck class="w-3 h-3 shrink-0" />
                  Frete
                </span>
                <span class="tabular-nums">
                  <template v-if="calculandoFrete">…</template>
                  <template v-else-if="freteCalculado === null">—</template>
                  <template v-else-if="freteCalculado === 0">Grátis</template>
                  <template v-else>{{ formatCurrency(freteCalculado) }}</template>
                </span>
              </div>
              <div
                v-for="kit in kitsCheckout.filter(k => selectedKits.has(k.id))"
                :key="kit.id"
                class="flex justify-between text-text-muted"
              >
                <span class="truncate mr-2">+ Kit: {{ kit.nome }}</span>
                <span class="tabular-nums shrink-0">{{ formatCurrency(kit.preco_fixo) }}</span>
              </div>
              <div
                v-for="rel in relatedProducts.filter(r => selectedRelated.has(r.id))"
                :key="rel.id"
                class="flex justify-between text-text-muted"
              >
                <span class="truncate mr-2">+ {{ rel.nome }}</span>
                <span class="tabular-nums shrink-0">{{ formatCurrency(rel.preco_venda) }}</span>
              </div>
              <div v-if="couponResult" class="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                <span>Cupom {{ couponResult.codigo }}</span>
                <span class="tabular-nums">- {{ formatCurrency(couponResult.desconto) }}</span>
              </div>
            </div>

            <!-- Progresso de frete grátis (discreto) — apenas para entrega -->
            <div v-if="tipoEntrega === 'ENTREGA' && cartStore.upsellMessage" class="mt-3">
              <CatalogFreeShippingCompact :upsell="cartStore.upsellMessage" />
            </div>

            <!-- Cupom input mobile -->
            <CheckoutCouponSection
              v-model:coupon-open="couponOpen"
              v-model:coupon-code="couponCode"
              :coupon-result="couponResult"
              :coupon-loading="couponLoading"
              :coupon-error="couponError"
              compact
              @apply="applyCoupon"
              @remove="removeCoupon"
            />

            <div class="mt-3 pt-3 border-t border-border flex justify-between items-baseline">
              <span class="text-xs font-bold uppercase tracking-wider text-text-primary">Total</span>
              <span class="text-lg font-bold text-text-primary tabular-nums">{{ formatCurrency(totalPedido) }}</span>
            </div>
          </section>

          <!-- Card único: próxima faixa do desconto no carrinho — mobile -->
          <div v-if="cartStore.cartDiscountIncentive" class="lg:hidden">
            <CatalogPromotionIncentiveCard :incentive="cartStore.cartDiscountIncentive" />
          </div>

          <!-- 7. Upsell kits — mobile (Shopify style green branding) -->
          <section v-if="kitsCheckout.length > 0" class="lg:hidden space-y-3">
            <CheckoutUpsellKits :kits="kitsCheckout" :selected-kits="selectedKits" compact @toggle="toggleKit" />
          </section>

        </main>
      </div>

      <!-- ── Coluna direita: resumo ── -->
      <div class="lg:col-span-5 xl:col-span-4 flex flex-col w-full lg:sticky lg:top-8 z-20">

        <!-- Resumo desktop -->
        <div class="hidden lg:flex flex-col border border-border rounded-lg p-6 mb-4 bg-surface">
          <h2 class="text-base font-bold text-text-primary mb-4">Resumo do pedido</h2>

          <div class="space-y-3 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar">
            <div
              v-for="item in cartStore.items"
              :key="item.cart_key"
              class="flex justify-between items-start py-3 border-b border-border last:border-0"
            >
              <div class="flex items-start gap-2.5 min-w-0">
                <span class="text-xs font-bold text-text-muted tabular-nums shrink-0 mt-0.5">{{ item.quantidade }}×</span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-text-primary leading-snug">{{ item.nome }}</p>
                  <ul v-if="item.opcoes && item.opcoes.length > 0" class="mt-0.5 space-y-0.5">
                    <li v-for="op in item.opcoes" :key="op.opcao_item_id" class="text-xs text-text-muted">
                      + {{ op.nome_congelado }}<span v-if="op.preco_delta_congelado > 0"> ({{ formatCurrency(op.preco_delta_congelado) }})</span>
                    </li>
                  </ul>
                  <!-- Encomenda: data de entrega escolhida no modal -->
                  <p v-if="item.preorder" class="mt-0.5 text-[11px] font-semibold text-brand-green leading-snug">
                    Encomenda — entrega {{ formatDeliveryDate(item.preorder.delivery_date) }}
                  </p>
                  <!-- Hint de desconto progressivo (QTD → desconto) -->
                  <p v-if="cartStore.getProgressiveHint(item.produto_id)" class="mt-0.5 text-[11px] font-semibold text-brand-green leading-snug">
                    {{ cartStore.getProgressiveHint(item.produto_id) }}
                  </p>
                </div>
              </div>
              <span class="text-sm font-semibold text-text-primary whitespace-nowrap pl-3 shrink-0">{{ formatCurrency(item.preco * item.quantidade) }}</span>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-border space-y-1.5">
            <div class="flex justify-between items-baseline text-xs text-text-muted">
              <span>Subtotal itens</span>
              <span class="tabular-nums">{{ formatCurrency(cartStore.totalPrice) }}</span>
            </div>
            <!-- Desconto promocional -->
            <div
              v-if="cartStore.discount > 0"
              class="flex justify-between items-baseline text-xs text-green-600 dark:text-green-400 font-semibold"
            >
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                {{ cartStore.discountName }}
              </span>
              <span class="tabular-nums">- {{ formatCurrency(cartStore.discount) }}</span>
            </div>
            <!-- Frete por distância -->
            <div
              v-if="tipoEntrega === 'ENTREGA'"
              class="flex justify-between items-baseline text-xs"
              :class="calculandoFrete ? 'text-text-muted' : freteCalculado === 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-text-muted'"
            >
              <span class="flex items-center gap-1">
                <Truck class="w-3 h-3 shrink-0" />
                Frete
                <span v-if="distanciaKm !== null" class="opacity-60">({{ distanciaKm }} km)</span>
              </span>
              <span v-if="calculandoFrete" class="tabular-nums">Calculando…</span>
              <span v-else-if="freteCalculado === null" class="tabular-nums text-text-muted">—</span>
              <span v-else-if="freteCalculado === 0" class="tabular-nums uppercase tracking-wide text-[10px]">Grátis</span>
              <span v-else class="tabular-nums">{{ formatCurrency(freteCalculado) }}</span>
            </div>
            <div
              v-for="kit in kitsCheckout.filter(k => selectedKits.has(k.id))"
              :key="kit.id"
              class="flex justify-between items-baseline text-xs text-text-muted"
            >
              <span class="truncate mr-2">+ Kit: {{ kit.nome }}</span>
              <span class="tabular-nums shrink-0">{{ formatCurrency(kit.preco_fixo) }}</span>
            </div>
          </div>

          <!-- Progresso de frete grátis (discreto) — apenas para entrega -->
          <div v-if="tipoEntrega === 'ENTREGA' && cartStore.upsellMessage" class="mt-3">
            <CatalogFreeShippingCompact :upsell="cartStore.upsellMessage" />
          </div>

          <!-- Produtos relacionados selecionados (desktop) -->
          <div
            v-for="rel in relatedProducts.filter(r => selectedRelated.has(r.id))"
            :key="rel.id"
            class="flex justify-between items-baseline text-xs text-text-muted"
          >
            <span class="truncate mr-2">+ {{ rel.nome }}</span>
            <span class="tabular-nums shrink-0">{{ formatCurrency(rel.preco_venda) }}</span>
          </div>

          <!-- Cupom de desconto (desktop) -->
          <CheckoutCouponSection
            v-model:coupon-open="couponOpen"
            v-model:coupon-code="couponCode"
            :coupon-result="couponResult"
            :coupon-loading="couponLoading"
            :coupon-error="couponError"
            @apply="applyCoupon"
            @remove="removeCoupon"
          />

          <div class="border-t border-border mt-3 pt-4 flex justify-between items-baseline">
            <span class="text-xs font-bold text-text-primary uppercase tracking-wider">Total</span>
            <span class="text-xl font-bold text-text-primary">{{ formatCurrency(totalPedido) }}</span>
          </div>
        </div>

        <!-- Card único: próxima faixa do desconto no carrinho — desktop (acima do CTA) -->
        <div v-if="cartStore.cartDiscountIncentive" class="hidden lg:block mb-4">
          <CatalogPromotionIncentiveCard :incentive="cartStore.cartDiscountIncentive" />
        </div>

        <!-- CTA: mobile flutuante, desktop inline -->
        <div class="fixed bottom-0 inset-x-0 p-0 lg:p-0 lg:relative lg:inset-auto bg-surface border-t border-border lg:border-0 z-50">
          <button
            type="button"
            :disabled="isSessionValid ? (!isFormValid || isSubmitting) : (!isWhatsappValid || loadingSession)"
            :class="[
              'w-full flex items-center px-6 py-5 lg:py-4 rounded-none lg:rounded-lg font-bold text-sm tracking-widest uppercase transition-all',
              isSessionValid ? 'justify-between' : 'justify-center',
              (isSessionValid ? isFormValid : isWhatsappValid)
                ? 'bg-brand-green hover:bg-brand-greenDark text-white cursor-pointer active:scale-[0.99]'
                : 'bg-[oklch(92.5%_0.084_155.995)] text-brand-greenDark/60 cursor-not-allowed'
            ]"
            @click="isSessionValid ? enviarPedido() : requestAccess()"
          >
            <template v-if="isSessionValid">
              <span v-if="isSubmitting">Enviando…</span>
              <span v-else>Confirmar pedido</span>
              <span
                v-if="!isSubmitting"
                class="text-base font-bold"
                :class="isFormValid ? 'text-white/90' : 'text-brand-greenDark/60'"
              >
                {{ formatCurrency(totalPedido) }}
              </span>
            </template>
            <template v-else>
              <span v-if="loadingSession" class="flex items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                Avançando…
              </span>
              <span v-else>AVANÇAR</span>
            </template>
          </button>
        </div>

        <!-- Upsell kits — desktop (below CTA) -->
        <div v-if="kitsCheckout.length > 0" class="hidden lg:block mt-4 space-y-3">
          <CheckoutUpsellKits :kits="kitsCheckout" :selected-kits="selectedKits" @toggle="toggleKit" />
        </div>

      </div>
    </div>
  </ClientOnly>

    <UiNotificationStack />
  </div>
</template>

<style scoped>
/* Reset inputs default appearance on iOS/Safari */
input[type="text"], textarea {
  appearance: none;
}
</style>

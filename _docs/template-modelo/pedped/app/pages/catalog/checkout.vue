<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Store, Truck, Shield, ChevronDown } from '@lucide/vue'
import { useCartStore } from '~/stores/cart'
import AddressAutocomplete from '~/components/checkout/AddressAutocomplete.vue'
import type { AddressDetails } from '#shared/types/maps'
import { useNotification } from '~/composables/useNotification'
import { useStore } from '~/composables/useStore'
import { useTracking } from '~/composables/useTracking'
import { useFormatters } from '~/composables/useFormatters'
import { formatDeliveryDate } from '~~/shared/utils/preorders'
import { validateWhatsapp } from '~~/shared/utils/phoneValidator'

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

await fetchLoja()

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
    const cardRadiusMap: Record<string, string> = {
      none: '0px',
      sm: '6px',
      md: '12px',
      lg: '20px',
      full: '20px', // Cartões e contêineres limitados ao máximo de 20px
    }
    const btnRadiusMap: Record<string, string> = {
      none: '0px',
      sm: '4px',
      md: '8px', // Botões CTA em 8px no modo Padrão
      lg: '12px',
      full: '9999px', // Pílula perfeita para botões CTA
    }
    s['--catalog-radius'] = cardRadiusMap[layout.border_radius] || '12px'
    s['--catalog-btn-radius'] = btnRadiusMap[layout.border_radius] || '8px'
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

// Máscara simples para UX (remove letras, formata DDD e Número)
const applyMask = (event: Event) => {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\D/g, '')
  
  if (value.length > 11) value = value.slice(0, 11)

  if (value.length > 2) {
    value = `(${value.slice(0, 2)}) ${value.slice(2)}`
  }
  if (value.length > 10) {
    value = `${value.slice(0, 10)}-${value.slice(10)}`
  }
  
  whatsapp.value = value
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

// Form State
const tipoEntrega = ref<'RETIRADA' | 'ENTREGA'>('ENTREGA')
const endereco = ref('')
const bairro = ref('')
const numero = ref('')
const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const formaPagamento = ref<'PIX' | 'DINHEIRO' | 'CARTAO' | null>(null)
const detalhes = ref('')
const isSubmitting = ref(false)
const tentouEnviar = ref(false)
const addressOutOfRange = ref(false)
const addressRangeError = ref('')

// ── Cupom de desconto ──
const couponCode = ref('')
const couponOpen = ref(false)
const couponLoading = ref(false)
const couponError = ref('')

interface CouponResult {
  readonly codigo: string
  readonly desconto: number
  readonly descricao: string
}
const couponResult = ref<CouponResult | null>(null)

async function applyCoupon(): Promise<void> {
  const code = couponCode.value.trim().toUpperCase()
  if (!code) {
    couponError.value = 'Digite o código do cupom.'
    return
  }
  couponLoading.value = true
  couponError.value = ''
  try {
    const res = await $fetch<CouponResult>('/api/catalog/coupon/validate', {
      method: 'POST',
      body: { codigo: code, totalCarrinho: cartStore.totalPriceWithDiscount },
    })
    couponResult.value = res
    couponCode.value = ''
    couponOpen.value = false
    notify.success('Cupom aplicado!', `Desconto de ${formatCurrency(res.desconto)} aplicado.`)
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Cupom inválido ou expirado.'
    couponError.value = msg
    couponResult.value = null
  } finally {
    couponLoading.value = false
  }
}

function removeCoupon(): void {
  couponResult.value = null
  couponCode.value = ''
  couponError.value = ''
}

// ── Produtos Relacionados ──
interface RelatedProduct {
  readonly id: string
  readonly nome: string
  readonly foto_url: string | null
  readonly preco_venda: number
  readonly descricao: string | null
  /** Gestão de Estoque (migration 111). `null` = sem controle, sem limite. */
  readonly quantidade_disponivel: number | null
}

const relatedProducts = ref<RelatedProduct[]>([])
const selectedRelated = reactive<Set<string>>(new Set())

function toggleRelated(id: string): void {
  if (selectedRelated.has(id)) {
    selectedRelated.delete(id)
    return
  }
  const rel = relatedProducts.value.find((r) => r.id === id)
  if (rel && rel.quantidade_disponivel !== null && rel.quantidade_disponivel <= 0) return
  selectedRelated.add(id)
}

const totalRelated = computed<number>(() =>
  relatedProducts.value
    .filter((r) => selectedRelated.has(r.id))
    .reduce((acc, r) => acc + r.preco_venda, 0),
)

// ── Upsell kits ──
interface CheckoutKitItem {
  produto_id: string
  quantidade: number
  produtos: { nome: string; preco_venda: number } | null
}
interface CheckoutKit {
  id: string
  nome: string
  descricao: string | null
  foto_url: string | null
  preco_fixo: number
  etiqueta: string
  kit_itens: CheckoutKitItem[]
}

const kitsCheckout = ref<CheckoutKit[]>([])
const selectedKits = reactive<Set<string>>(new Set())

function somaOriginalKit(kit: CheckoutKit): number {
  return kit.kit_itens.reduce(
    (acc, i) => acc + (i.produtos?.preco_venda ?? 0) * i.quantidade,
    0,
  )
}

function toggleKit(id: string): void {
  if (selectedKits.has(id)) selectedKits.delete(id)
  else selectedKits.add(id)
}

const totalKits = computed<number>(() =>
  kitsCheckout.value
    .filter((k) => selectedKits.has(k.id))
    .reduce((acc, k) => acc + k.preco_fixo, 0),
)

// ── Freight preview ──
const freteCalculado = ref<number | null>(null)
const distanciaKm = ref<number | null>(null)
const calculandoFrete = ref(false)

watch([lat, lng, tipoEntrega, () => cartStore.totalPrice], async ([newLat, newLng, tipo]) => {
  if (!newLat || !newLng || tipo !== 'ENTREGA') {
    freteCalculado.value = null
    distanciaKm.value = null
    return
  }
  calculandoFrete.value = true
  try {
    const res = await $fetch<{ valor_frete: number; distancia_km: number | null }>('/api/calculate-shipping', {
      method: 'POST',
      // subtotal = base do frete grátis (igual à barra de upsell); backend é a
      // fonte autoritativa no fechamento do pedido.
      body: { lat: newLat, lng: newLng, subtotal: cartStore.totalPrice },
    })
    freteCalculado.value = res.valor_frete
    distanciaKm.value = res.distancia_km
  } catch {
    freteCalculado.value = loja.value?.taxa_entrega_padrao ?? 0
    distanciaKm.value = null
  } finally {
    calculandoFrete.value = false
  }
})

const totalPedido = computed<number>(() =>
  Math.max(
    0,
    cartStore.totalPriceWithDiscount +
      totalKits.value +
      totalRelated.value +
      (freteCalculado.value ?? 0) -
      (couponResult.value?.desconto ?? 0),
  ),
)

onMounted(async () => {
  // BFCache: iOS Safari restores pages from memory without re-running middleware.
  // A stale/expired session in the cache would show the form but fail on submit.
  // Force a reload so middleware re-validates the session on any bfcache restore.
  window.addEventListener('pageshow', (event) => {
    if ((event as PageTransitionEvent).persisted) window.location.reload()
  }, { once: true })

  track('checkout_iniciado')
  const cartIds = cartStore.items.map((i) => i.produto_id)

  const [kitsRes, relRes] = await Promise.allSettled([
    $fetch<{ kits: CheckoutKit[] }>('/api/kits/checkout'),
    cartIds.length > 0
      ? $fetch<{ produtos: RelatedProduct[] }>('/api/catalog/related-products', {
          method: 'POST',
          body: { produtoIds: cartIds },
        })
      : Promise.resolve({ produtos: [] }),
  ])

  // upsell é best-effort — falhas não bloqueiam o checkout
  if (kitsRes.status === 'fulfilled') kitsCheckout.value = kitsRes.value.kits ?? []
  if (relRes.status === 'fulfilled') relatedProducts.value = relRes.value.produtos ?? []
})

// Endereço selecionado no autocomplete (resolvido pelo BFF /api/maps/place).
async function onPlaceSelected(details: AddressDetails): Promise<void> {
  lat.value = details.lat
  lng.value = details.lng
  endereco.value = details.formattedAddress
  if (details.bairro) bairro.value = details.bairro
  if (details.numero) numero.value = details.numero

  // Validação proativa de raio — feedback imediato ao selecionar o endereço.
  addressOutOfRange.value = false
  addressRangeError.value = ''
  try {
    await $fetch('/api/validate-address', {
      method: 'POST',
      body: { lat: lat.value, lng: lng.value },
    })
  } catch (err) {
    const msg = (err as { data?: { message?: string } })?.data?.message
      ?? 'Endereço fora do raio de entrega.'
    addressOutOfRange.value = true
    addressRangeError.value = msg
  }
}

// Texto editado após uma seleção → coordenadas antigas ficam inválidas (bloqueia envio).
function onAddressInvalidate(): void {
  lat.value = null
  lng.value = null
  addressOutOfRange.value = false
  addressRangeError.value = ''
}


const isFormValid = computed(() => {
  if (!formaPagamento.value) return false

  if (tipoEntrega.value === 'ENTREGA') {
    if (!endereco.value || !bairro.value || !numero.value || !lat.value || !lng.value) return false
    if (addressOutOfRange.value) return false
  }

  return true
})

const enviarPedido = async () => {
  tentouEnviar.value = true
  if (!isFormValid.value || isSubmitting.value) return

  // Guard: carrinho pode esvaziar no mobile se o browser restaurar a aba do cache
  if (cartStore.items.length === 0) {
    notify.error('Carrinho vazio', 'Seu carrinho foi esvaziado. Adicione itens e tente novamente.')
    return
  }

  // Use sessaoAtiva (not route.query) — mobile WebViews may not reflect route.query after router.replace
  const sessaoIdStr = sessaoAtiva.value
  if (!sessaoIdStr) {
    notify.error('Sessão expirada', 'Sua sessão expirou. Recarregue a página e tente novamente.')
    return
  }

  // Segurança Extra: Motor de Horários (caso a loja feche enquanto o usuário digitava o endereço)
  if (!cartStore.storeStatus.isOpen) {
    notify.error('Loja fechada', cartStore.storeStatus.message)
    return
  }

  // Captura SNAPSHOT dos valores reativos ANTES de qualquer await.
  // No mobile, o autocorrect do iOS pode disparar @invalidate durante a espera
  // do validate-address, zerando lat/lng e causando 400 no servidor.
  const snapTipoEntrega = tipoEntrega.value
  const snapFormaPagamento = formaPagamento.value
  const snapEndereco = endereco.value
  const snapNumero = numero.value
  const snapBairro = bairro.value
  const snapLat = lat.value
  const snapLng = lng.value
  const snapDetalhes = detalhes.value
  const snapItens = cartStore.items.map(item => ({
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    opcoes: item.opcoes ?? [],
    // Encomenda: a data escolhida no modal viaja com o item e é revalidada +
    // reservada atomicamente no backend (RPC reserve_preorders).
    ...(item.preorder ? { delivery_date: item.preorder.delivery_date } : {}),
  }))

  isSubmitting.value = true

  try {
    // Defesa em profundidade: revalida raio no backend (Haversine) mesmo com a validação proativa ao selecionar.
    if (snapTipoEntrega === 'ENTREGA' && snapLat && snapLng) {
      await $fetch('/api/validate-address', {
        method: 'POST',
        body: { lat: snapLat, lng: snapLng }
      })
    }

    // 1. Prepara payload — expande itens dos kits e produtos relacionados selecionados
    const snapSelectedRelated = new Set(selectedRelated)
    const kitItens = kitsCheckout.value
      .filter((k) => selectedKits.has(k.id))
      .flatMap((k) =>
        k.kit_itens.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          opcoes: [],
        })),
      )
    const relatedItens = relatedProducts.value
      .filter((r) => snapSelectedRelated.has(r.id))
      .map((r) => ({ produto_id: r.id, quantidade: 1, opcoes: [] }))
    const kitNota = kitsCheckout.value
      .filter((k) => selectedKits.has(k.id))
      .map((k) => `+ Kit: ${k.nome}`)
      .join(', ')
    const relNota = relatedProducts.value
      .filter((r) => snapSelectedRelated.has(r.id))
      .map((r) => `+ ${r.nome}`)
      .join(', ')
    const observacoesFinal = [snapDetalhes, kitNota, relNota].filter(Boolean).join('\n')

    const payload = {
      sessaoId: sessaoIdStr,
      tipoEntrega: snapTipoEntrega,
      formaPagamento: snapFormaPagamento,
      observacoes: observacoesFinal,
      itens: [...snapItens, ...kitItens, ...relatedItens],
      endereco: snapTipoEntrega === 'ENTREGA' ? {
        rua: snapEndereco,
        numero: snapNumero,
        bairro: snapBairro,
        lat: snapLat,
        lng: snapLng,
      } : null,
      ...(couponResult.value ? { cupomCodigo: couponResult.value.codigo } : {}),
    }

    // 2. Dispara pra API de checkout final
    const endpoint = cartStore.editingPedidoId ? '/api/orders/update' : '/api/orders/create'
    const method = cartStore.editingPedidoId ? 'PUT' : 'POST'
    const body = cartStore.editingPedidoId 
      ? { ...payload, pedidoId: cartStore.editingPedidoId }
      : payload

    const response = await $fetch<{ success: boolean; pedidoId: string }>(endpoint, {
      method,
      body
    })

    // 3. Sucesso! Limpa o carrinho e vai pra tela de sucesso (Recibo)
    cartStore.clearCart()
    router.push(`/catalog/success?pedidoId=${response.pedidoId}&sessao=${sessaoAtiva.value}`)
    
  } catch (error: unknown) {
    const msg = (error as { data?: { message?: string }; message?: string })?.data?.message
      ?? (error as { message?: string })?.message
      ?? 'Erro ao processar pedido. Tente novamente.'
    notify.error('Falha no pedido', msg)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col font-sans" :style="catalogLayoutStyles">
    <!-- Header global e centralizado (sem seta de voltar e sem passos de breadcrumb) -->
    <header class="w-full border-b border-border bg-surface py-5 px-4 flex justify-center items-center">
      <div class="flex items-center justify-center">
        <NuxtImg
          v-if="loja?.logomarca"
          :src="loja.logomarca"
          :alt="loja?.nome_fantasia ?? 'Logo'"
          class="h-[44px] md:h-[60px] object-contain max-w-full shrink"
          loading="eager"
        />
        <span v-else class="font-bold text-base tracking-widest uppercase text-text-primary">
          {{ loja?.nome_fantasia ?? 'Pedido' }}
        </span>
      </div>
    </header>

    <ClientOnly>
      <div class="w-full max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-0 lg:gap-8 p-4 lg:p-8 lg:items-start relative flex-1">

      <!-- ── Coluna esquerda: formulário ── -->
      <div class="lg:col-span-7 xl:col-span-8 flex flex-col w-full pb-28 lg:pb-0">

        <!-- Passo 1: Coleta de WhatsApp -->
        <main v-if="!isSessionValid" class="px-4 lg:px-0 pt-4 lg:pt-0 pb-7 space-y-8 flex-1 animate-in fade-in duration-300 w-full">
          <section>
            <div class="bg-surface p-6 md:p-8 rounded-xl border border-border">
              <p class="text-text-muted mb-6 text-center text-sm leading-relaxed px-1">
                Informe seu <span style="font-family: 'Inter', system-ui, sans-serif;">WhatsApp</span> para concluir seu pedido e receber todas as atualizações.
              </p>
              
              <form class="space-y-4" @submit.prevent="requestAccess">
                <div>
                  <label for="whatsapp-input" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">Seu Número com DDD</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted font-medium">
                      +55
                    </div>
                    <input 
                      id="whatsapp-input"
                      v-model="whatsapp"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      class="w-full pl-12 pr-4 py-3.5 rounded-lg border border-border focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-surface-raised focus:bg-surface text-lg font-medium text-text-primary placeholder-text-muted"
                      :disabled="loadingSession"
                      autofocus
                      @input="applyMask"
                    >
                  </div>
                  <p v-if="sessionErrorMsg" class="mt-2 text-sm text-red-500 font-medium flex items-center gap-1 animate-pulse">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ sessionErrorMsg }}
                  </p>
                </div>
              </form>

              <!-- Security Notice Footer (Shopify Style) -->
              <div class="mt-8 pt-6 border-t border-border flex items-start gap-3 text-left">
                <Shield class="w-5 h-5 text-brand-green shrink-0 mt-0.5" stroke-width="2" />
                <p class="text-xs text-text-secondary leading-relaxed">
                  Seu <span style="font-family: 'Inter', system-ui, sans-serif;">WhatsApp</span> será utilizado apenas para confirmar o pedido e enviar informações sobre a entrega.
                </p>
              </div>
            </div>
          </section>
        </main>

        <!-- Formulário -->
        <main v-else class="px-4 lg:px-0 pt-4 lg:pt-0 pb-7 space-y-8 flex-1 animate-in fade-in duration-300">

          <!-- 1. Método de entrega (Grid de Cards Interativos) -->
          <section v-if="loja?.permite_retirada !== false">
            <h2 class="text-base font-bold text-text-primary mb-3">Método de entrega</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Opção: Entrega -->
              <label
                class="relative flex flex-col justify-between p-5 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
                :class="tipoEntrega === 'ENTREGA' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="tipoEntrega"
                      value="ENTREGA"
                      :checked="tipoEntrega === 'ENTREGA'"
                      class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
                      @click="tipoEntrega = 'ENTREGA'"
                    >
                    <span class="text-sm font-bold text-text-primary">Receber em casa</span>
                  </div>
                  <Truck class="w-5 h-5" :class="tipoEntrega === 'ENTREGA' ? 'text-brand-green' : 'text-text-muted'" />
                </div>
                <div class="flex items-baseline justify-between mt-auto">
                  <span class="text-xs text-text-secondary">Entrega domiciliar</span>
                  <span class="text-sm font-bold" :class="tipoEntrega === 'ENTREGA' ? 'text-brand-green' : 'text-text-primary'">
                    {{ freteCalculado === 0 ? 'Grátis' : (freteCalculado ? formatCurrency(freteCalculado) : 'A calcular') }}
                  </span>
                </div>
              </label>

              <!-- Opção: Retirada -->
              <label
                class="relative flex flex-col justify-between p-5 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
                :class="tipoEntrega === 'RETIRADA' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="tipoEntrega"
                      value="RETIRADA"
                      :checked="tipoEntrega === 'RETIRADA'"
                      class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
                      @click="tipoEntrega = 'RETIRADA'"
                    >
                    <span class="text-sm font-bold text-text-primary">Retirar na loja</span>
                  </div>
                  <Store class="w-5 h-5" :class="tipoEntrega === 'RETIRADA' ? 'text-brand-green' : 'text-text-muted'" />
                </div>
                <div class="flex items-baseline justify-between mt-auto">
                  <span class="text-xs text-text-secondary">Pegar no balcão</span>
                  <span class="text-sm font-bold text-brand-green uppercase tracking-wider">Grátis</span>
                </div>
              </label>
            </div>
          </section>

          <!-- 2. Endereço (só se entrega) -->
          <section v-show="tipoEntrega === 'ENTREGA'" class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <h2 class="text-base font-bold text-text-primary mb-3">Endereço de entrega</h2>
            
            <div>
              <AddressAutocomplete
                v-model="endereco"
                placeholder="Rua, número, cidade…"
                @select="onPlaceSelected"
                @invalidate="onAddressInvalidate"
              />
              <!-- Erro: endereço fora do raio de entrega -->
              <p
                v-if="addressOutOfRange"
                class="text-[12px] font-medium text-danger-600 mt-1.5 flex items-start gap-1"
              >
                <svg class="w-3.5 h-3.5 shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                {{ addressRangeError }}
              </p>
              <!-- Alerta: Digitou endereço mas não selecionou sugestão -->
              <div
                v-else-if="endereco && !lat"
                class="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 animate-in fade-in duration-200"
              >
                <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>
                  <strong>Atenção:</strong> Você digitou o endereço, mas precisa clicar na opção correta que aparece na lista de sugestões para validarmos a localização e calcularmos o frete.
                </span>
              </div>
              <!-- Hint padrão quando não digitou nada -->
              <p
                v-else
                class="text-[10px] text-text-muted mt-1"
              >
                Selecione o endereço na lista de sugestões para confirmar a localização.
              </p>
            </div>
            
            <div class="grid grid-cols-[2fr_1fr] gap-4">
              <div>
                <input
                  id="neighborhood"
                  v-model="bairro"
                  aria-label="Bairro"
                  placeholder="Bairro"
                  type="text"
                  class="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-colors"
                >
              </div>
              <div>
                <input
                  id="number"
                  v-model="numero"
                  aria-label="Número"
                  placeholder="Nº"
                  type="text"
                  class="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-colors"
                >
              </div>
            </div>

            <!-- Validação inline de endereço (aparece após tentar confirmar) -->
            <p
              v-if="tentouEnviar && !endereco"
              class="text-xs text-red-500 mt-2 flex items-center gap-1"
            >
              <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              Informe o endereço de entrega
            </p>
            <p
              v-else-if="tentouEnviar && endereco && !bairro"
              class="text-xs text-red-500 mt-2 flex items-center gap-1"
            >
              <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              Informe o bairro
            </p>
            <p
              v-else-if="tentouEnviar && endereco && !numero"
              class="text-xs text-red-500 mt-2 flex items-center gap-1"
            >
              <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              Informe o número da residência
            </p>
          </section>

          <!-- 3. Forma de pagamento (Grid de Cards Interativos) -->
          <section>
            <h2 class="text-base font-bold text-text-primary mb-3">Forma de pagamento</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <!-- PIX -->
              <label
                class="relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
                :class="formaPagamento === 'PIX' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="formaPagamento"
                      value="PIX"
                      :checked="formaPagamento === 'PIX'"
                      class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
                      @click="formaPagamento = 'PIX'"
                    >
                    <span class="text-sm font-bold text-text-primary">Pix</span>
                  </div>
                  <img src="/icons/pix.svg" alt="Pix" class="w-5 h-5 shrink-0">
                </div>
                <div class="mt-auto">
                  <p class="text-xs text-text-secondary">Aprovação imediata e segura</p>
                </div>
              </label>

              <!-- Dinheiro -->
              <label
                class="relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
                :class="formaPagamento === 'DINHEIRO' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="formaPagamento"
                      value="DINHEIRO"
                      :checked="formaPagamento === 'DINHEIRO'"
                      class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
                      @click="formaPagamento = 'DINHEIRO'"
                    >
                    <span class="text-sm font-bold text-text-primary">Dinheiro</span>
                  </div>
                  <img src="/icons/cash.svg" alt="Dinheiro" class="w-5 h-5 shrink-0">
                </div>
                <div class="mt-auto">
                  <p class="text-xs text-text-secondary">Pague em mãos no ato da entrega</p>
                </div>
              </label>

              <!-- Cartão -->
              <label
                class="relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-surface-raised select-none"
                :class="formaPagamento === 'CARTAO' ? 'border-brand-green bg-brand-green/[0.02] shadow-sm ring-1 ring-brand-green' : 'border-border bg-surface'"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="formaPagamento"
                      value="CARTAO"
                      :checked="formaPagamento === 'CARTAO'"
                      class="w-4 h-4 text-brand-green focus:ring-brand-green border-border"
                      @click="formaPagamento = 'CARTAO'"
                    >
                    <span class="text-sm font-bold text-text-primary">Cartão</span>
                  </div>
                  <img src="/icons/card.svg" alt="Cartão" class="w-5 h-5 shrink-0">
                </div>
                <div class="mt-auto">
                  <p class="text-xs text-text-secondary">Máquina de crédito/débito na entrega</p>
                </div>
              </label>
            </div>

            <!-- Validação inline de pagamento (aparece após tentar confirmar) -->
            <p
              v-if="tentouEnviar && !formaPagamento"
              class="text-xs text-red-500 mt-2 flex items-center gap-1"
            >
              <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              Escolha a forma de pagamento
            </p>
          </section>

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

          <!-- 5. Produtos Relacionados (sugestões com base no carrinho) -->
          <section v-if="relatedProducts.length > 0" class="space-y-3">
            <h2 class="text-base font-bold text-text-primary">Você também pode gostar</h2>
            <div class="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
              <div
                v-for="rel in relatedProducts"
                :key="rel.id"
                class="p-4 flex items-center justify-between gap-4 bg-surface hover:bg-surface-raised/30 transition-colors"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <!-- Imagem -->
                  <NuxtImg
                    v-if="rel.foto_url"
                    :src="rel.foto_url"
                    :alt="rel.nome"
                    class="w-12 h-12 md:w-14 md:h-14 object-cover rounded-lg shrink-0 border border-border/60"
                  />
                  <div v-else class="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-surface-raised shrink-0 flex items-center justify-center border border-border/60">
                    <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  
                  <!-- Info do Produto -->
                  <div class="min-w-0 flex-1">
                    <h3 class="text-sm font-bold text-text-primary leading-tight uppercase truncate" :title="rel.nome">
                      {{ rel.nome }}
                    </h3>
                    <p v-if="rel.descricao" class="text-[11px] text-text-muted leading-tight mt-0.5 line-clamp-1">
                      {{ rel.descricao }}
                    </p>
                    <span class="text-sm font-bold text-text-primary mt-1 inline-block tabular-nums">
                      {{ formatCurrency(rel.preco_venda) }}
                    </span>
                  </div>
                </div>

                <!-- Botão de Ação (CTA Vigoroso com Herança de Raio de Borda) -->
                <button
                  type="button"
                  :disabled="rel.quantidade_disponivel !== null && rel.quantidade_disponivel <= 0 && !selectedRelated.has(rel.id)"
                  :class="[
                    'px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 active:scale-95 select-none shrink-0 flex items-center gap-1 shadow-xs',
                    rel.quantidade_disponivel !== null && rel.quantidade_disponivel <= 0 && !selectedRelated.has(rel.id)
                      ? 'bg-surface-raised text-text-muted border border-border cursor-not-allowed opacity-60'
                      : selectedRelated.has(rel.id)
                        ? 'bg-surface-raised text-brand-green border border-brand-green/30 hover:bg-surface cursor-pointer'
                        : 'bg-brand-green text-white hover:bg-brand-greenDark shadow-sm cursor-pointer'
                  ]"
                  @click="toggleRelated(rel.id)"
                >
                  <span v-if="selectedRelated.has(rel.id)" class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    ADICIONADO
                  </span>
                  <span v-else-if="rel.quantidade_disponivel !== null && rel.quantidade_disponivel <= 0" class="flex items-center gap-1">
                    ESGOTADO
                  </span>
                  <span v-else class="flex items-center gap-1">
                    + ADICIONAR AGORA
                  </span>
                </button>
              </div>
            </div>
          </section>

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
            <div class="mt-3 pt-3 border-t border-border">
              <div v-if="couponResult" class="flex items-center justify-between text-xs">
                <span class="text-green-600 dark:text-green-400 font-semibold">Cupom aplicado!</span>
                <button
                  type="button"
                  class="text-text-muted hover:text-red-500 transition-colors"
                  @click="removeCoupon"
                >
                  Remover
                </button>
              </div>
              <template v-else>
                <button
                  type="button"
                  class="w-full flex items-center justify-between text-xs text-text-muted hover:text-text-primary transition-colors py-0.5"
                  @click="couponOpen = !couponOpen"
                >
                  <span class="font-semibold uppercase tracking-wider">Aplicar cupom de desconto</span>
                  <ChevronDown class="w-3.5 h-3.5 transition-transform shrink-0" :class="{ 'rotate-180': couponOpen }" />
                </button>
                <div v-if="couponOpen" class="mt-2 flex gap-2">
                  <input
                    v-model="couponCode"
                    type="text"
                    aria-label="Código do cupom"
                    placeholder="Código do cupom"
                    class="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-green"
                    @keyup.enter="applyCoupon"
                  >
                  <button
                    type="button"
                    :disabled="couponLoading"
                    class="px-3 py-1.5 text-xs font-semibold bg-brand-green text-white rounded hover:bg-brand-greenDark transition-colors disabled:opacity-50"
                    @click="applyCoupon"
                  >
                    {{ couponLoading ? '…' : 'Aplicar' }}
                  </button>
                </div>
                <p v-if="couponError" class="text-[11px] text-red-500 mt-1">{{ couponError }}</p>
              </template>
            </div>

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
            <h2 class="text-base font-bold text-text-primary mb-3">Adicionar ao pedido</h2>
            <div
              v-for="kit in kitsCheckout"
              :key="kit.id"
              class="border rounded-lg overflow-hidden transition-all bg-surface"
              :class="selectedKits.has(kit.id) ? 'border-brand-green bg-brand-green/[0.01]' : 'border-border'"
            >
              <!-- Kit header band -->
              <div class="bg-black px-4 py-2.5 flex items-center justify-between" :class="{ 'bg-brand-green': selectedKits.has(kit.id) }">
                <span class="text-white text-xs font-bold tracking-wide uppercase">{{ kit.nome }}</span>
                <span class="text-white/70 text-xs">{{ kit.etiqueta }}</span>
              </div>
              <!-- Kit body -->
              <div class="p-3.5 flex gap-3 items-start">
                <NuxtImg
                  v-if="kit.foto_url"
                  :src="kit.foto_url"
                  :alt="kit.nome"
                  class="w-16 h-16 object-cover rounded-md shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <p v-if="kit.descricao" class="text-xs text-text-muted leading-snug mb-2 line-clamp-2">{{ kit.descricao }}</p>
                  <div class="flex items-baseline gap-2">
                    <span class="text-xs text-text-muted line-through tabular-nums">{{ formatCurrency(somaOriginalKit(kit)) }}</span>
                    <span class="text-sm font-bold text-text-primary tabular-nums">{{ formatCurrency(kit.preco_fixo) }}</span>
                  </div>
                </div>
              </div>
              <!-- Toggle checkbox row -->
              <label
                class="flex items-center gap-3 px-3.5 py-3 border-t cursor-pointer select-none"
                :class="selectedKits.has(kit.id) ? 'bg-brand-green text-white border-brand-green' : 'bg-surface-raised border-border text-text-primary'"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 accent-white shrink-0"
                  :checked="selectedKits.has(kit.id)"
                  @change="toggleKit(kit.id)"
                >
                <span class="text-sm font-semibold">
                  Sim, desejo adicionar {{ kit.nome }}
                </span>
              </label>
            </div>
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
          <div class="mt-3 pt-3 border-t border-border">
            <!-- Cupom aplicado -->
            <div
              v-if="couponResult"
              class="flex justify-between items-baseline text-xs text-green-600 dark:text-green-400 font-semibold"
            >
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Cupom {{ couponResult.codigo }}
              </span>
              <span class="tabular-nums flex items-center gap-1.5">
                - {{ formatCurrency(couponResult.desconto) }}
                <button
                  type="button"
                  class="text-text-muted hover:text-red-500 transition-colors"
                  title="Remover cupom"
                  @click="removeCoupon"
                >
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </span>
            </div>

            <!-- Toggle de input do cupom -->
            <button
              v-if="!couponResult"
              type="button"
              class="w-full flex items-center justify-between text-xs text-text-muted hover:text-text-primary transition-colors py-0.5"
              @click="couponOpen = !couponOpen"
            >
              <span class="font-semibold tracking-wider uppercase">Aplicar cupom de desconto</span>
              <ChevronDown class="w-3.5 h-3.5 transition-transform shrink-0" :class="{ 'rotate-180': couponOpen }" />
            </button>
            <div v-if="couponOpen && !couponResult" class="mt-2 flex gap-2">
              <input
                v-model="couponCode"
                type="text"
                placeholder="Código do cupom"
                class="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-green"
                @keyup.enter="applyCoupon"
              >
              <button
                type="button"
                :disabled="couponLoading"
                class="px-3 py-1.5 text-xs font-semibold bg-brand-green text-white rounded hover:bg-brand-greenDark transition-colors disabled:opacity-50"
                @click="applyCoupon"
              >
                {{ couponLoading ? '…' : 'Aplicar' }}
              </button>
            </div>
            <p v-if="couponError" class="text-[11px] text-red-500 mt-1">{{ couponError }}</p>
          </div>

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
          <h2 class="text-xs font-bold text-text-muted uppercase tracking-wider">Adicionar ao pedido</h2>
          <div
            v-for="kit in kitsCheckout"
            :key="kit.id"
            class="border rounded-lg overflow-hidden transition-all bg-surface"
            :class="selectedKits.has(kit.id) ? 'border-brand-green bg-brand-green/[0.01]' : 'border-border'"
          >
            <div class="bg-black px-4 py-2.5 flex items-center justify-between" :class="{ 'bg-brand-green': selectedKits.has(kit.id) }">
              <span class="text-white text-xs font-bold tracking-wide uppercase">{{ kit.nome }}</span>
              <span class="text-white/70 text-xs">{{ kit.etiqueta }}</span>
            </div>
            <div class="p-3.5 flex gap-3 items-start">
              <NuxtImg
                v-if="kit.foto_url"
                :src="kit.foto_url"
                :alt="kit.nome"
                class="w-14 h-14 object-cover rounded-md shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p v-if="kit.descricao" class="text-xs text-text-muted leading-snug mb-2 line-clamp-2">{{ kit.descricao }}</p>
                <div class="flex items-baseline gap-2">
                  <span class="text-xs text-text-muted line-through tabular-nums">{{ formatCurrency(somaOriginalKit(kit)) }}</span>
                  <span class="text-sm font-bold text-text-primary tabular-nums">{{ formatCurrency(kit.preco_fixo) }}</span>
                </div>
              </div>
            </div>
            <label
              class="flex items-center gap-3 px-3.5 py-3 border-t cursor-pointer select-none"
              :class="selectedKits.has(kit.id) ? 'bg-brand-green text-white border-brand-green' : 'bg-surface-raised border-border text-text-primary'"
            >
              <input
                type="checkbox"
                class="w-4 h-4 accent-white shrink-0"
                :checked="selectedKits.has(kit.id)"
                @change="toggleKit(kit.id)"
              >
              <span class="text-sm font-semibold">
                Sim, desejo adicionar {{ kit.nome }}
              </span>
            </label>
          </div>
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


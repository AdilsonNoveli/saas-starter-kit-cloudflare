import { ref, reactive, computed, onMounted, watch, type Ref } from 'vue'
import type { useRouter } from 'vue-router'
import type { AddressDetails } from '#shared/types/maps'
import type { StorePublic } from '~~/shared/types/store'
import type { useCartStore } from '~/stores/cart'
import type { useNotification } from '~/composables/useNotification'
import { useFormatters } from '~/composables/useFormatters'

interface RelatedProduct {
  readonly id: string
  readonly nome: string
  readonly foto_url: string | null
  readonly preco_venda: number
  readonly descricao: string | null
  /** Gestão de Estoque (migration 111). `null` = sem controle, sem limite. */
  readonly quantidade_disponivel: number | null
}

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

interface CouponResult {
  readonly codigo: string
  readonly desconto: number
  readonly descricao: string
}

interface UseCheckoutFormParams {
  cartStore: ReturnType<typeof useCartStore>
  loja: Ref<StorePublic | null>
  sessaoAtiva: Ref<string | null>
  router: ReturnType<typeof useRouter>
  notify: ReturnType<typeof useNotification>['notify']
}

/**
 * Estado e lógica do FORMULÁRIO DE PEDIDO do checkout — entrega/endereço,
 * pagamento, cupom, kits, produtos relacionados, cálculo de frete e o
 * submit final. Extraído de `checkout.vue` (god component, 1.314 linhas).
 *
 * NÃO inclui o gate de sessão por WhatsApp (preocupação diferente, pequena
 * o bastante pra ficar na página) nem `catalogLayoutStyles` (tema, não
 * formulário de pedido).
 */
export function useCheckoutForm({ cartStore, loja, sessaoAtiva, router, notify }: UseCheckoutFormParams) {
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
  const kitsCheckout = ref<CheckoutKit[]>([])
  const selectedKits = reactive<Set<string>>(new Set())

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

  return {
    tipoEntrega,
    endereco,
    bairro,
    numero,
    lat,
    lng,
    formaPagamento,
    detalhes,
    isSubmitting,
    tentouEnviar,
    addressOutOfRange,
    addressRangeError,
    couponCode,
    couponOpen,
    couponLoading,
    couponError,
    couponResult,
    applyCoupon,
    removeCoupon,
    relatedProducts,
    selectedRelated,
    totalRelated,
    toggleRelated,
    kitsCheckout,
    selectedKits,
    totalKits,
    toggleKit,
    freteCalculado,
    distanciaKm,
    calculandoFrete,
    totalPedido,
    isFormValid,
    onPlaceSelected,
    onAddressInvalidate,
    enviarPedido,
  }
}

<script setup lang="ts">
import { computed } from 'vue'
import { X, CameraOff, Minus, Plus, ShoppingBag, Tag, Info, TrendingDown, Percent } from '@lucide/vue'
import { useCartStore } from '~/stores/cart'
import { useNotification } from '~/composables/useNotification'
import { useTracking } from '~/composables/useTracking'
import type { CatalogPromocao, DestaqueConfig } from '#shared/types/promotion'
import type { CatalogProductItem } from '#shared/types/product'
import { getEffectivePrice } from '#shared/types/product'

interface CatalogKitItem {
  id: string
  nome: string
  descricao: string | null
  foto_url: string | null
  preco_fixo: number
  etiqueta: string
}

const props = defineProps<{
  promocao: CatalogPromocao | null
  produtos: CatalogProductItem[]
  kits?: CatalogKitItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-product-options', produto: CatalogProductItem): void
}>()

const cartStore = useCartStore()
const { notify } = useNotification()
const { track } = useTracking()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

/** Produtos que participam desta promoção, cruzando os IDs associados com o catálogo. */
const produtosParticipantes = computed<CatalogProductItem[]>(() => {
  if (!props.promocao) return []
  const assocIds = props.promocao.promocao_produtos.map((p) => p.produto_id)
  // Promoção sem produtos vinculados = aplica ao carrinho inteiro (não filtramos)
  if (assocIds.length === 0) return []
  return props.produtos.filter((p) => assocIds.includes(p.id))
})

const quantidadeNoCarrinho = (produtoId: string): number =>
  cartStore.getItemQuantity(produtoId)

/** Descrição legível da mecânica da promoção. */
const mecanicaLabel = computed<string>(() => {
  if (!props.promocao) return ''
  const cfg = props.promocao.configuracao
  const tipo = props.promocao.tipo
  if (tipo === 'leve_pague') {
    const c = cfg as { compre: number; leve: number }
    return `Leve ${c.leve} e pague apenas ${c.compre}`
  }
  if (tipo === 'progressivo') {
    const c = cfg as { faixas: { quantidade: number; desconto_percentual: number }[] }
    const sorted = [...c.faixas].sort((a, b) => b.desconto_percentual - a.desconto_percentual)
    const best = sorted[0]
    return best ? `Até ${best.desconto_percentual}% de desconto por quantidade` : 'Desconto progressivo'
  }
  if (tipo === 'desconto_carrinho') {
    const c = cfg as { valor_minimo: number; desconto_percentual: number }
    return `${c.desconto_percentual}% de desconto acima de ${formatCurrency(c.valor_minimo)} em compras`
  }
  if (tipo === 'destaque') {
    return 'Oferta Especial'
  }
  return ''
})

const mecanicaIcon = computed(() => {
  const tipo = props.promocao?.tipo
  if (tipo === 'leve_pague') return ShoppingBag
  if (tipo === 'progressivo') return TrendingDown
  if (tipo === 'destaque') return Tag
  return Percent
})

const handleAdd = (produto: CatalogProductItem) => {
  if (!cartStore.storeStatus.isOpen) {
    notify.warning('Estamos Fechados 😴', cartStore.storeStatus.message)
    return
  }
  if (produto.tem_opcoes || (produto.permite_fracionamento && quantidadeNoCarrinho(produto.id) === 0)) {
    emit('open-product-options', produto)
    return
  }
  const delta = produto.permite_fracionamento ? 0.1 : 1
  cartStore.updateQuantity(
    {
      id: produto.id,
      nome: produto.nome,
      preco: getEffectivePrice(produto),
      foto_url: produto.foto_url,
      permite_fracionamento: produto.permite_fracionamento,
      unidade_medida: produto.unidade_medida,
    },
    delta,
  )
  track('add_to_cart', { entidade: 'produto', entidade_id: produto.id })
}

const handleRemove = (produto: CatalogProductItem) => {
  const delta = produto.permite_fracionamento ? -0.1 : -1
  cartStore.updateQuantity(
    {
      id: produto.id,
      nome: produto.nome,
      preco: getEffectivePrice(produto),
      permite_fracionamento: produto.permite_fracionamento,
      unidade_medida: produto.unidade_medida,
    },
    delta,
  )
}

const isDescontoCarrinhoGeral = computed(
  () => props.promocao?.tipo === 'desconto_carrinho' && produtosParticipantes.value.length === 0,
)

const isDestaque = computed(
  () => props.promocao?.tipo === 'destaque',
)

const linkedProduct = computed(() => {
  if (!props.promocao || props.promocao.tipo !== 'destaque') return null
  const cfg = props.promocao.configuracao as DestaqueConfig
  if (cfg?.link_tipo !== 'produto' || !cfg?.produto_id) return null
  return props.produtos.find((p) => p.id === cfg.produto_id) || null
})

const linkedKit = computed(() => {
  if (!props.promocao || props.promocao.tipo !== 'destaque') return null
  const cfg = props.promocao.configuracao as DestaqueConfig
  if (cfg?.link_tipo !== 'kit' || !cfg?.kit_id) return null
  return props.kits?.find((k) => k.id === cfg.kit_id) || null
})

const hasActionLink = computed(() => !!linkedProduct.value || !!linkedKit.value)

const linkedProductQty = computed(() => {
  if (!linkedProduct.value) return 0
  return cartStore.getItemQuantity(linkedProduct.value.id)
})

const linkedKitQty = computed(() => {
  if (!linkedKit.value) return 0
  return cartStore.getItemQuantity(`kit::${linkedKit.value.id}`)
})

const handleAddLinkedProduct = () => {
  if (linkedProduct.value) {
    handleAdd(linkedProduct.value)
  }
}

const handleRemoveLinkedProduct = () => {
  if (linkedProduct.value) {
    handleRemove(linkedProduct.value)
  }
}

const handleAddLinkedKit = () => {
  if (!cartStore.storeStatus.isOpen) {
    notify.warning('Estamos Fechados 😴', cartStore.storeStatus.message)
    return
  }
  if (linkedKit.value) {
    cartStore.updateQuantity(
      {
        id: `kit::${linkedKit.value.id}`,
        nome: linkedKit.value.nome,
        preco: linkedKit.value.preco_fixo,
        foto_url: linkedKit.value.foto_url,
      },
      1,
      [],
    )
    notify.success(`${linkedKit.value.etiqueta || 'Kit'} adicionado!`, linkedKit.value.nome)
    track('add_to_cart', { entidade: 'kit', entidade_id: linkedKit.value.id })
  }
}

const handleRemoveLinkedKit = () => {
  if (linkedKit.value) {
    cartStore.updateQuantity(
      {
        id: `kit::${linkedKit.value.id}`,
        nome: linkedKit.value.nome,
        preco: linkedKit.value.preco_fixo,
        foto_url: linkedKit.value.foto_url,
      },
      -1,
      [],
    )
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="promocao"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="duration-150 ease-in"
          leave-to-class="opacity-0 translate-y-4 sm:scale-95"
        >
          <div
            v-if="promocao"
            class="bg-surface w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <!-- Header da promoção -->
            <div class="relative bg-gradient-to-br from-orange-500 to-orange-600 p-5 shrink-0">
              <button
                class="modal-close-btn preserve-circle absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label="Fechar"
                @click="emit('close')"
              >
                <X class="w-4 h-4" stroke-width="2.5" />
              </button>

              <!-- Foto + info -->
              <div class="flex gap-4 items-start pr-10">
                <div class="w-20 h-20 rounded-xl overflow-hidden bg-white/10 shrink-0 flex items-center justify-center border border-white/20">
                  <NuxtImg
                    v-if="promocao.foto_url"
                    :src="promocao.foto_url"
                    :alt="promocao.nome"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <Tag v-else class="w-8 h-8 text-white/60" stroke-width="1.5" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[10px] font-bold text-orange-200 uppercase tracking-widest mb-1">Promoção Especial</p>
                  <h2 class="text-base font-bold text-white leading-snug">{{ promocao.nome }}</h2>
                  <p v-if="promocao.descricao" class="text-xs text-orange-100 mt-1 leading-relaxed line-clamp-2">
                    {{ promocao.descricao }}
                  </p>
                </div>
              </div>

              <!-- Badge de mecânica -->
              <div class="mt-4 flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                <component :is="mecanicaIcon" class="w-4 h-4 text-white shrink-0" stroke-width="2" />
                <p class="text-xs font-semibold text-white">{{ mecanicaLabel }}</p>
              </div>
            </div>

            <!-- Corpo: Destaque/Banner Informativo -->
            <div
              v-if="isDestaque"
              class="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center overflow-y-auto"
            >
              <!-- Se tem link de produto ou kit -->
              <template v-if="hasActionLink">
                <div class="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                  <component :is="mecanicaIcon" class="w-8 h-8 text-orange-500" stroke-width="1.5" />
                </div>
                
                <div class="space-y-1 shrink-0">
                  <p class="font-bold text-text-primary text-lg">{{ promocao.nome }}</p>
                  <p v-if="promocao.descricao" class="text-sm text-text-muted leading-relaxed max-w-md mx-auto">
                    {{ promocao.descricao }}
                  </p>
                </div>

                <!-- Card do Produto Vinculado -->
                <div v-if="linkedProduct" class="w-full flex items-center gap-3 p-4 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50/10 hover:bg-orange-50/20 dark:hover:bg-orange-950/5 transition-colors">
                  <!-- Imagem -->
                  <div class="w-16 h-16 rounded-lg bg-surface-raised overflow-hidden shrink-0 border border-border/60 flex items-center justify-center">
                    <NuxtImg
                      v-if="linkedProduct.foto_url"
                      :src="linkedProduct.foto_url"
                      :alt="linkedProduct.nome"
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                    <CameraOff v-else class="w-6 h-6 text-text-muted stroke-1" />
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0 text-left">
                    <p class="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-0.5">Produto da Oferta</p>
                    <p class="text-sm font-bold text-text-primary leading-tight uppercase line-clamp-1">{{ linkedProduct.nome }}</p>
                    <div class="flex items-baseline gap-1.5 mt-1">
                      <span
                        v-if="linkedProduct.preco_promocional != null"
                        class="text-[11px] text-text-muted line-through tabular-nums"
                      >
                        {{ formatCurrency(linkedProduct.preco_venda) }}
                      </span>
                      <span class="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                        {{ formatCurrency(getEffectivePrice(linkedProduct)) }}
                      </span>
                      <span v-if="linkedProduct.unidade_medida" class="text-[10px] text-text-muted">
                        / {{ linkedProduct.unidade_medida }}
                      </span>
                    </div>
                  </div>

                  <!-- Controle de quantidade -->
                  <div class="shrink-0">
                    <div
                      v-if="linkedProductQty > 0"
                      class="flex items-center border border-orange-300 dark:border-orange-850 rounded-lg h-[36px] overflow-hidden bg-orange-50 dark:bg-orange-950/40"
                    >
                      <button
                        type="button"
                        class="px-2 h-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors focus:outline-none flex items-center justify-center text-orange-600 dark:text-orange-400 active:scale-95"
                        aria-label="Diminuir quantidade"
                        @click="handleRemoveLinkedProduct"
                      >
                        <Minus class="w-3.5 h-3.5" />
                      </button>
                      <span class="w-7 text-center font-bold text-xs text-orange-700 dark:text-orange-300 select-none">
                        {{ linkedProductQty }}
                      </span>
                      <button
                        type="button"
                        class="px-2 h-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors focus:outline-none flex items-center justify-center text-orange-600 dark:text-orange-400 active:scale-95"
                        aria-label="Aumentar quantidade"
                        @click="handleAddLinkedProduct"
                      >
                        <Plus class="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      v-else
                      type="button"
                      class="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-lg transition-colors active:scale-95 whitespace-nowrap shadow-sm"
                      :disabled="!cartStore.storeStatus.isOpen"
                      @click="handleAddLinkedProduct"
                    >
                      {{ linkedProduct.tem_opcoes ? 'Escolher Opções' : 'Adicionar ao pedido' }}
                    </button>
                  </div>
                </div>

                <!-- Card do Kit Vinculado -->
                <div v-if="linkedKit" class="w-full flex items-center gap-3 p-4 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50/10 hover:bg-orange-50/20 dark:hover:bg-orange-950/5 transition-colors">
                  <!-- Imagem -->
                  <div class="w-16 h-16 rounded-lg bg-surface-raised overflow-hidden shrink-0 border border-border/60 flex items-center justify-center">
                    <NuxtImg
                      v-if="linkedKit.foto_url"
                      :src="linkedKit.foto_url"
                      :alt="linkedKit.nome"
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                    <CameraOff v-else class="w-6 h-6 text-text-muted stroke-1" />
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0 text-left">
                    <p class="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-0.5">{{ linkedKit.etiqueta || 'Combo da Oferta' }}</p>
                    <p class="text-sm font-bold text-text-primary leading-tight uppercase line-clamp-1">{{ linkedKit.nome }}</p>
                    <div class="flex items-baseline gap-1.5 mt-1">
                      <span class="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                        {{ formatCurrency(linkedKit.preco_fixo) }}
                      </span>
                    </div>
                  </div>

                  <!-- Controle de quantidade -->
                  <div class="shrink-0">
                    <div
                      v-if="linkedKitQty > 0"
                      class="flex items-center border border-orange-300 dark:border-orange-850 rounded-lg h-[36px] overflow-hidden bg-orange-50 dark:bg-orange-950/40"
                    >
                      <button
                        type="button"
                        class="px-2 h-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors focus:outline-none flex items-center justify-center text-orange-600 dark:text-orange-400 active:scale-95"
                        aria-label="Diminuir quantidade"
                        @click="handleRemoveLinkedKit"
                      >
                        <Minus class="w-3.5 h-3.5" />
                      </button>
                      <span class="w-7 text-center font-bold text-xs text-orange-700 dark:text-orange-300 select-none">
                        {{ linkedKitQty }}
                      </span>
                      <button
                        type="button"
                        class="px-2 h-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors focus:outline-none flex items-center justify-center text-orange-600 dark:text-orange-400 active:scale-95"
                        aria-label="Aumentar quantidade"
                        @click="handleAddLinkedKit"
                      >
                        <Plus class="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      v-else
                      type="button"
                      class="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-lg transition-colors active:scale-95 whitespace-nowrap shadow-sm"
                      :disabled="!cartStore.storeStatus.isOpen"
                      @click="handleAddLinkedKit"
                    >
                      Adicionar ao pedido
                    </button>
                  </div>
                </div>
              </template>

              <!-- Se NÃO tem link (apenas banner informativo) -->
              <template v-else>
                <div class="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                  <Tag class="w-8 h-8 text-orange-500" stroke-width="1.5" />
                </div>
                <div>
                  <p class="font-bold text-text-primary text-lg">{{ promocao.nome }}</p>
                  <p v-if="promocao.descricao" class="text-sm text-text-muted mt-2 leading-relaxed max-w-md mx-auto">
                    {{ promocao.descricao }}
                  </p>
                </div>
                <div class="w-full bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-xl p-4 flex items-center gap-3 shrink-0">
                  <Info class="w-5 h-5 text-orange-500 shrink-0" />
                  <p class="text-xs text-orange-700 dark:text-orange-300 font-medium text-left">
                    Esta é uma oferta especial! Consulte os detalhes acima ou entre em contato para mais informações.
                  </p>
                </div>
              </template>
            </div>

            <!-- Corpo: Desconto de Carrinho Geral -->
            <div
              v-else-if="isDescontoCarrinhoGeral"
              class="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
            >
              <div class="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                <Percent class="w-8 h-8 text-orange-500" stroke-width="1.5" />
              </div>
              <div>
                <p class="font-bold text-text-primary text-lg">Desconto Automático no Carrinho</p>
                <p class="text-sm text-text-muted mt-1 leading-relaxed max-w-xs mx-auto">
                  Este desconto é aplicado automaticamente quando o valor total do seu pedido atinge o mínimo exigido. Continue comprando!
                </p>
              </div>
              <div class="w-full bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-xl p-4 flex items-center gap-3">
                <Info class="w-5 h-5 text-orange-500 shrink-0" />
                <p class="text-xs text-orange-700 dark:text-orange-300 font-medium">
                  {{ mecanicaLabel }}
                </p>
              </div>
            </div>

            <!-- Corpo: Lista de Produtos Participantes -->
            <div v-else class="flex-1 overflow-y-auto p-4 space-y-3">
              <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                Produtos Participantes ({{ produtosParticipantes.length }})
              </p>

              <div
                v-for="produto in produtosParticipantes"
                :key="produto.id"
                class="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface hover:border-orange-300 transition-colors"
              >
                <!-- Imagem -->
                <div class="w-14 h-14 rounded-lg bg-surface-raised overflow-hidden shrink-0 border border-border/60 flex items-center justify-center">
                  <NuxtImg
                    v-if="produto.foto_url"
                    :src="produto.foto_url"
                    :alt="produto.nome"
                    loading="lazy"
                    class="w-full h-full object-cover"
                  />
                  <CameraOff v-else class="w-6 h-6 text-text-muted stroke-1" />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-text-primary leading-tight uppercase line-clamp-1">{{ produto.nome }}</p>
                  <div class="flex items-baseline gap-1.5 mt-0.5">
                    <span
                      v-if="produto.preco_promocional != null"
                      class="text-[11px] text-text-muted line-through tabular-nums"
                    >
                      {{ formatCurrency(produto.preco_venda) }}
                    </span>
                    <span class="text-sm font-bold text-orange-600 tabular-nums">
                      {{ formatCurrency(getEffectivePrice(produto)) }}
                    </span>
                    <span v-if="produto.unidade_medida" class="text-[10px] text-text-muted">
                      / {{ produto.unidade_medida }}
                    </span>
                  </div>
                </div>

                <!-- Controle de quantidade -->
                <div class="shrink-0">
                  <div
                    v-if="quantidadeNoCarrinho(produto.id) > 0"
                    class="flex items-center border border-orange-300 rounded-lg h-[34px] overflow-hidden bg-orange-50 dark:bg-orange-950/20"
                  >
                    <button
                      type="button"
                      class="px-2 h-full hover:bg-orange-100 transition-colors focus:outline-none flex items-center justify-center text-orange-600 active:scale-95"
                      aria-label="Diminuir quantidade"
                      @click="handleRemove(produto)"
                    >
                      <Minus class="w-3.5 h-3.5" />
                    </button>
                    <span class="w-7 text-center font-bold text-xs text-orange-700 select-none">
                      {{ quantidadeNoCarrinho(produto.id) }}
                    </span>
                    <button
                      type="button"
                      class="px-2 h-full hover:bg-orange-100 transition-colors focus:outline-none flex items-center justify-center text-orange-600 active:scale-95"
                      aria-label="Aumentar quantidade"
                      @click="handleAdd(produto)"
                    >
                      <Plus class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-lg transition-colors active:scale-95 whitespace-nowrap"
                    :disabled="!cartStore.storeStatus.isOpen"
                    @click="handleAdd(produto)"
                  >
                    {{ produto.tem_opcoes ? 'Opções' : 'Adicionar' }}
                  </button>
                </div>
              </div>

              <!-- Sem produtos vinculados mas não é desconto geral: aviso -->
              <div
                v-if="produtosParticipantes.length === 0"
                class="flex flex-col items-center gap-3 py-8 text-center"
              >
                <Info class="w-10 h-10 text-text-muted stroke-1" />
                <p class="text-sm text-text-muted">Nenhum produto listado para esta promoção.</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="border-t border-border p-4 shrink-0">
              <button
                type="button"
                class="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-orange-600 border-2 border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors active:scale-[0.99]"
                @click="emit('close')"
              >
                Fechar
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

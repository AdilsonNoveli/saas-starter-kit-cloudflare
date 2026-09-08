<script setup lang="ts">
/**
 * @descricao: Modal de detalhes / seleção de opções do produto (Fase 5.3).
 * @objetivo: Dois modos:
 *   - `info` (default): exibe descrição. Usado no catálogo.
 *   - `pdv`: carrega grupos de opções (`produto_opcao_grupo`), permite
 *     seleção e emite `confirm` com as opções escolhidas. Usado no PDV.
 *
 * A carga de grupos é feita sob demanda (ao abrir o modal) para manter
 * o endpoint de listagem enxuto (só retorna `tem_opcoes: boolean`).
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { X, Minus, Plus, CalendarDays, ChevronDown, ChevronUp } from '@lucide/vue'
import type { ProductRow, OptionGroup, SelectedOption } from '~~/shared/types/product'
import { getProductGallery, getEffectivePrice } from '~~/shared/types/product'
import type { CalendarDay, PreorderConfig } from '~~/shared/types/preorder'
import { validateQuantity, formatDeliveryDate } from '~~/shared/utils/preorders'
import PreorderDatePicker from '~/components/catalog/PreorderDatePicker.vue'
import { useCartStore } from '~/stores/cart'

/**
 * Minimal product shape required by the modal.
 * `tem_opcoes` (derivado no server, presente em CatalogProductItem/AdminProductListItem)
 * habilita a carga das opções — inclusive no modo `info`, para resolver tudo numa tela.
 */
type ModalProduct = Pick<ProductRow, 'id' | 'nome' | 'preco_venda' | 'preco_promocional' | 'descricao' | 'disponivel' | 'foto_url' | 'imagens' | 'permite_fracionamento' | 'unidade_medida' | 'product_type' | 'preorder_config' | 'quantidade_disponivel'>
  & { tem_opcoes?: boolean }

const props = defineProps<{
  isOpen: boolean
  produto: ModalProduct | null
  /** `pdv`: carrega opções e emite confirm. `info`: só exibe descrição. */
  mode?: 'info' | 'pdv'
  /**
   * Desativa o fluxo de encomenda (usado pelo PDV admin, que não coleta data
   * de entrega — o backend também rejeita produto de encomenda no PDV).
   */
  allowPreorder?: boolean
  /**
   * Quantidade inicial ao abrir (encomenda já no carrinho): permite reeditar a
   * mesma encomenda em vez de somar. 0/undefined → semeia com o mínimo da config.
   */
  initialQuantity?: number
}>()

/**
 * Encomenda: quando o produto é `preorder`, o modal coleta quantidade
 * (min/max), opções E a DATA de entrega (obrigatória — não avança sem ela). O
 * confirm emite a `deliveryDate` escolhida (string ISO) ou `null` para venda
 * imediata.
 */
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', opcoes: readonly SelectedOption[], quantidade: number, deliveryDate: string | null): void
}>()

const supabase = useSupabaseClient()

// Galeria (capa + extras). activeImageIndex é resetado a cada abertura.
const activeImageIndex = ref<number>(0)
const gallery = computed<string[]>(() => (props.produto ? getProductGallery(props.produto) : []))
const galleryHasMultiple = computed<boolean>(() => gallery.value.length > 1)
const activeImageSrc = computed<string | null>(
  () => gallery.value[activeImageIndex.value] ?? props.produto?.foto_url ?? null,
)

// Controle de touch/swipe para galeria no mobile
const touchStartX = ref<number>(0)
const touchEndX = ref<number>(0)

function handleTouchStart(e: TouchEvent): void {
  touchStartX.value = e.changedTouches[0]?.clientX ?? 0
}

function handleTouchEnd(e: TouchEvent): void {
  touchEndX.value = e.changedTouches[0]?.clientX ?? 0
  handleSwipe()
}

function handleSwipe(): void {
  if (!galleryHasMultiple.value) return
  const diffX = touchEndX.value - touchStartX.value
  if (Math.abs(diffX) > 50) {
    if (diffX > 0) {
      if (activeImageIndex.value > 0) {
        activeImageIndex.value--
      } else {
        activeImageIndex.value = gallery.value.length - 1
      }
    } else {
      if (activeImageIndex.value < gallery.value.length - 1) {
        activeImageIndex.value++
      } else {
        activeImageIndex.value = 0
      }
    }
  }
}

// Preço vigente (promocional quando houver) — fonte única compartilhada com o
// catálogo e com o trigger freeze_product_info: o exibido é o efetivamente cobrado.
const effectivePrice = computed<number>(() => (props.produto ? getEffectivePrice(props.produto) : 0))
const isOnPromotion = computed<boolean>(() => props.produto?.preco_promocional != null)

// Descrição expansível: clamp em 2 linhas com toggle "ver mais/ver menos".
// descOverflows é medido no estado recolhido (scrollHeight > clientHeight).
const descEl = ref<HTMLElement | null>(null)
const descExpanded = ref<boolean>(false)
const descOverflows = ref<boolean>(false)

function checkDescOverflow(): void {
  const el = descEl.value
  descOverflows.value = !!el && el.scrollHeight > el.clientHeight + 1
}

const grupos = ref<readonly OptionGroup[]>([])
const loadingOpcoes = ref<boolean>(false)

// === Pre-Order System ===
// O modal coleta a DATA de entrega (obrigatória), quantidade (min/max) e opções.
// Detecção alinhada ao ProductCard (product_type / preorder_config) com fallback
// autoritativo ao banco para garantir que gaps de payload/cache nunca desativem os limites.

/** Tipo de produto resolvido (prop ou consulta autoritativa ao banco). */
const resolvedProductType = ref<ProductType | null>(null)

/** Config autoritativa da encomenda (min/max/capacidade). */
const preorderConfig = ref<PreorderConfig | null>(null)

/** Produto é encomenda e o contexto permite encomendar. */
const isPreorderMode = computed<boolean>(() => {
  if (props.allowPreorder === false || !props.produto) return false
  return (
    props.produto.product_type === 'preorder' ||
    resolvedProductType.value === 'preorder' ||
    props.produto.preorder_config !== null ||
    preorderConfig.value !== null
  )
})

/** Configuração autoritativa com fallback robusto contra registros parciais/ausentes. */
const effectivePreorderConfig = computed<PreorderConfig | null>(() => {
  if (!isPreorderMode.value) return null
  const cfg = preorderConfig.value ?? props.produto?.preorder_config ?? null
  if (!cfg) return DEFAULT_PREORDER_CONFIG
  return {
    scheduling_type: cfg.scheduling_type ?? DEFAULT_PREORDER_CONFIG.scheduling_type,
    min_quantity: Number(cfg.min_quantity ?? DEFAULT_PREORDER_CONFIG.min_quantity),
    max_quantity: Number(cfg.max_quantity ?? DEFAULT_PREORDER_CONFIG.max_quantity),
    // daily_capacity removido: migration 113 — fonte única em produtos.producao_diaria_limite
    min_lead_days: Number(cfg.min_lead_days ?? DEFAULT_PREORDER_CONFIG.min_lead_days),
    max_lead_days: Number(cfg.max_lead_days ?? DEFAULT_PREORDER_CONFIG.max_lead_days),
  }
})

async function loadPreorderConfig(): Promise<void> {
  const p = props.produto
  if (!p) {
    preorderConfig.value = null
    resolvedProductType.value = null
    return
  }

  // 1. Prioriza a config entregue no payload do produto
  if (p.preorder_config) {
    preorderConfig.value = p.preorder_config
    resolvedProductType.value = p.product_type ?? 'preorder'
  }

  // 2. Se a config não veio inline, busca no banco como autoridade final
  if (!preorderConfig.value) {
    try {
      const { data } = await supabase
        .from('produtos')
        .select('product_type, preorder_config')
        .eq('id', p.id)
        .maybeSingle()

      if (data) {
        if (data.product_type) resolvedProductType.value = data.product_type as ProductType
        if (data.preorder_config) preorderConfig.value = data.preorder_config as unknown as PreorderConfig
      }
    } catch (e) {
      console.error('[Preorder] Erro ao carregar config:', e)
    }
  }

  // 3. Aplica o clamp estrito da quantidade em [min_quantity, max_quantity]
  if (isPreorderMode.value && effectivePreorderConfig.value) {
    const min = effectivePreorderConfig.value.min_quantity
    const max = effectivePreorderConfig.value.max_quantity
    let current = Number(quantidade.value || min)
    if (current < min) current = min
    if (current > max) current = max
    quantidade.value = Number(current.toFixed(3))
  }
}

/** Data de entrega escolhida (obrigatória para encomenda). */
const preorderDate = ref<string | null>(null)
/** Dia selecionado no calendário (vagas restantes) — feedback de capacidade. */
const preorderDay = ref<CalendarDay | null>(null)

const cartStore = useCartStore()

/** Controle de colapso/expansão do accordion de agendamentos existentes no carrinho. */
const showExistingPreorders = ref<boolean>(false)

/** Encomendas deste mesmo produto já adicionadas ao carrinho pelo cliente. */
const existingPreordersInCart = computed(() => {
  if (!props.produto?.id) return []
  return cartStore.items.filter((i) => i.produto_id === props.produto?.id && i.preorder)
})

/** Verifica se a data selecionada atualmente já é um agendamento existente no carrinho. */
const isEditingExistingPreorder = computed<boolean>(() => {
  if (!isPreorderMode.value || !preorderDate.value || !props.produto?.id) return false
  return existingPreordersInCart.value.some((i) => i.preorder?.delivery_date === preorderDate.value)
})

/** Carrega uma encomenda já no carrinho para edição de quantidade/data. */
function editExistingPreorder(item: typeof existingPreordersInCart.value[number]): void {
  if (!item.preorder) return
  preorderDate.value = item.preorder.delivery_date
  quantidade.value = item.quantidade
  showExistingPreorders.value = true
}

/** Remove uma encomenda específica do carrinho. */
function removeExistingPreorder(cartKey: string, dateStr: string): void {
  cartStore.removeByKey(cartKey)
  if (preorderDate.value === dateStr) {
    preorderDate.value = null
    preorderDay.value = null
    quantidade.value = effectivePreorderConfig.value?.min_quantity ?? 1
  }
}

// Watch em preorderDate para sincronizar a quantidade quando o usuário clica numa data no calendário
watch(preorderDate, (newDate) => {
  if (!isPreorderMode.value || !newDate || !props.produto?.id) return
  const currentOpcoes: SelectedOption[] = []
  for (const grupo of grupos.value) {
    const selectedIds = selections.value.get(grupo.id) ?? new Set<string>()
    for (const item of grupo.produto_opcao_item) {
      if (selectedIds.has(item.id)) {
        currentOpcoes.push({
          opcao_item_id: item.id,
          nome_congelado: item.nome,
          preco_delta_congelado: Number(item.preco_delta ?? 0),
        })
      }
    }
  }
  const existingQty = cartStore.getPreorderQuantity(props.produto.id, newDate, currentOpcoes)
  if (existingQty !== null && existingQty > 0) {
    quantidade.value = existingQty
  }
})

/**
 * Mapa grupo_id → Set de opcao_item_id selecionados.
 * Reiniciado a cada abertura do modal para não preservar seleções antigas.
 */
const selections = ref<Map<string, Set<string>>>(new Map())
const quantidade = ref<number>(1)

/**
 * Gestão de Estoque (migration 111). Encomenda usa sua própria capacidade
 * diária — mutuamente exclusivo com este campo por design. `quantidade` aqui
 * é o DELTA a somar ao carrinho (updateQuantity é aditivo), então o teto real
 * é `quantidade_disponivel - o que já está no carrinho para este produto`
 * (soma de TODAS as variações de opção — mesmo estoque físico).
 */
const quantidadeJaNoCarrinho = computed<number>(() =>
  props.produto ? cartStore.getItemQuantity(props.produto.id) : 0,
)
const maxAdicionavel = computed<number | null>(() => {
  const disponivel = props.produto?.quantidade_disponivel
  if (disponivel === null || disponivel === undefined) return null
  return Math.max(0, disponivel - quantidadeJaNoCarrinho.value)
})

function decrementQty() {
  const step = props.produto?.permite_fracionamento ? 0.1 : 1
  const minVal = isPreorderMode.value
    ? (effectivePreorderConfig.value?.min_quantity ?? 1)
    : (props.produto?.permite_fracionamento ? 0.1 : 1)
  const current = Number(quantidade.value || 0)
  const next = Number((current - step).toFixed(3))
  quantidade.value = Number(Math.max(minVal, next).toFixed(3))
}

function incrementQty() {
  const step = props.produto?.permite_fracionamento ? 0.1 : 1
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

/** Erro de quantidade da encomenda (min/max da config) — feedback imediato. */
const preorderQuantityError = computed<string | null>(() => {
  if (!isPreorderMode.value || !effectivePreorderConfig.value) return null
  return validateQuantity(effectivePreorderConfig.value, quantidade.value)
})

/** Vagas do dia selecionado não comportam a quantidade pedida. */
const preorderCapacityError = computed<string | null>(() => {
  if (!isPreorderMode.value || !preorderDay.value) return null
  return preorderDay.value.remaining_capacity < quantidade.value
    ? `Restam ${preorderDay.value.remaining_capacity} vaga(s) para esta data.`
    : null
})

/** Estoque não comporta a quantidade pedida (soma com o que já está no carrinho). */
const stockQuantityError = computed<string | null>(() => {
  if (isPreorderMode.value || maxAdicionavel.value === null) return null
  if (quantidade.value <= maxAdicionavel.value) return null
  return maxAdicionavel.value <= 0
    ? 'Este produto está esgotado no momento.'
    : `Restam apenas ${maxAdicionavel.value} ${props.produto?.unidade_medida || 'unidade(s)'} disponível(is).`
})

/** Encomenda só avança com data escolhida, quantidade e capacidade válidas. */
const canConfirmPreorder = computed<boolean>(() =>
  preorderDate.value !== null &&
  preorderQuantityError.value === null &&
  preorderCapacityError.value === null,
)

async function loadGrupos(produtoId: string): Promise<void> {
  loadingOpcoes.value = true
  const { data, error } = await supabase
    .from('produto_opcao_grupo')
    .select('*, produto_opcao_item(id, nome, preco_delta, selecionado_padrao, ativo, ordem, grupo_id, foto_url)')
    .eq('produto_id', produtoId)
    .order('ordem', { ascending: true })
    .order('ordem', { ascending: true, referencedTable: 'produto_opcao_item' })

  loadingOpcoes.value = false
  if (error || !data) {
    grupos.value = []
    return
  }

  // Filtra em JS para incluir ativo=true e ativo=null (NULL = ativo por padrão — strict .eq exclui NULL no Supabase)
  grupos.value = (data as unknown as OptionGroup[]).map((g) => ({
    ...g,
    produto_opcao_item: g.produto_opcao_item.filter((i) => i.ativo !== false),
  }))

  // Seed defaults — reseta selections para os itens marcados como padrão.
  const map = new Map<string, Set<string>>()
  for (const grupo of grupos.value) {
    const def = new Set<string>()
    for (const item of grupo.produto_opcao_item) {
      if (item.selecionado_padrao) def.add(item.id)
    }
    map.set(grupo.id, def)
  }
  selections.value = map
}

/**
 * Quantidade inicial ao abrir: encomenda já no carrinho reabre com a quantidade
 * atual (reeditar em vez de somar); senão, o mínimo da config (encomenda) ou 1.
 */
function seedQuantity(): number {
  if (isPreorderMode.value) {
    if (props.initialQuantity && props.initialQuantity > 0) {
      return props.initialQuantity
    }
    return preorderConfig.value?.min_quantity ?? props.produto?.preorder_config?.min_quantity ?? 1
  }
  return 1
}

/** Reinicializa o estado do modal ao abrir/trocar de produto (DRY entre watch e onMounted). */
function initModal(): void {
  activeImageIndex.value = 0
  descExpanded.value = false
  grupos.value = []
  selections.value = new Map()
  preorderDate.value = null
  preorderDay.value = null
  showExistingPreorders.value = false
  resolvedProductType.value = props.produto?.product_type ?? null
  preorderConfig.value = props.produto?.preorder_config ?? null
  quantidade.value = seedQuantity()
  // Gestão de Estoque: não abre já pedindo mais do que cabe.
  if (!isPreorderMode.value && maxAdicionavel.value !== null) {
    quantidade.value = Math.min(quantidade.value, maxAdicionavel.value)
  }
  void loadPreorderConfig()
  if (props.produto?.id && props.produto?.tem_opcoes) {
    void loadGrupos(props.produto.id)
  }
  void nextTick(checkDescOverflow)
}

watch(
  () => [props.isOpen, props.produto?.id] as const,
  ([isOpen]) => {
    if (isOpen) initModal()
  },
)

onMounted(() => {
  if (props.isOpen) initModal()
})

// ESC key handler
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.isOpen) emit('close')
}

onMounted(() => globalThis.addEventListener('keydown', handleKeydown))
onUnmounted(() => globalThis.removeEventListener('keydown', handleKeydown))

// Scroll lock
watch(
  () => props.isOpen,
  (v) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = v ? 'hidden' : ''
    }
  },
)

// === Seleção de opções ===

function isSelected(grupoId: string, itemId: string): boolean {
  return selections.value.get(grupoId)?.has(itemId) ?? false
}

/** Para UiRadio (single): retorna o único item selecionado no grupo, ou undefined. */
function getSingleSelected(grupoId: string): string | undefined {
  const set = selections.value.get(grupoId)
  if (!set || set.size === 0) return undefined
  return [...set][0]
}

function toggleItem(grupoId: string, itemId: string, tipo: OptionGroup['tipo']): void {
  const map = new Map(selections.value)
  const set = new Set(map.get(grupoId) ?? [])

  if (tipo === 'single') {
    set.clear()
    set.add(itemId)
  } else {
    if (set.has(itemId)) {
      set.delete(itemId)
    } else {
      if (tipo === 'multiple') {
        const grupo = grupos.value.find((g) => g.id === grupoId)
        if (grupo && grupo.max_selecoes > 0 && set.size >= grupo.max_selecoes) return
      }
      set.add(itemId)
    }
  }

  map.set(grupoId, set)
  selections.value = map
}

// Validação: grupos obrigatórios precisam de seleção suficiente.
const validationErrors = computed<Map<string, string>>(() => {
  const errors = new Map<string, string>()
  for (const grupo of grupos.value) {
    if (!grupo.obrigatorio) continue
    const count = selections.value.get(grupo.id)?.size ?? 0
    if (count < grupo.min_selecoes) {
      errors.set(grupo.id, `Selecione ao menos ${grupo.min_selecoes} opção(ões) em "${grupo.nome}".`)
    }
  }
  return errors
})

const canConfirm = computed<boolean>(() => validationErrors.value.size === 0)

function confirm(): void {
  if (!canConfirm.value) return
  if (isPreorderMode.value && !canConfirmPreorder.value) return
  if (!isPreorderMode.value && stockQuantityError.value) return

  const opcoes: SelectedOption[] = []
  for (const grupo of grupos.value) {
    const selectedIds = selections.value.get(grupo.id) ?? new Set<string>()
    for (const item of grupo.produto_opcao_item) {
      if (selectedIds.has(item.id)) {
        opcoes.push({
          opcao_item_id: item.id,
          nome_congelado: item.nome,
          preco_delta_congelado: Number(item.preco_delta ?? 0),
        })
      }
    }
  }
  emit(
    'confirm',
    opcoes,
    quantidade.value,
    isPreorderMode.value ? preorderDate.value : null,
  )
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

function grupoHint(grupo: OptionGroup): string {
  if (grupo.tipo === 'single') return 'Escolha 1'
  if (grupo.tipo === 'toggle') return 'Opcional'
  if (grupo.min_selecoes > 0 && grupo.max_selecoes > grupo.min_selecoes) {
    return `Escolha de ${grupo.min_selecoes} a ${grupo.max_selecoes}`
  }
  if (grupo.max_selecoes > 0) return `Escolha até ${grupo.max_selecoes}`
  return 'Múltipla escolha'
}

/** Delta total das opções selecionadas (preview de preço). */
const precoExtraTotal = computed<number>(() => {
  let total = 0
  for (const grupo of grupos.value) {
    const selectedIds = selections.value.get(grupo.id) ?? new Set<string>()
    for (const item of grupo.produto_opcao_item) {
      if (selectedIds.has(item.id) && Number(item.preco_delta) > 0) {
        total += Number(item.preco_delta)
      }
    }
  }
  return total
})
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isOpen && produto"
          class="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
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
              v-if="isOpen && produto"
              class="bg-surface w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl overflow-hidden shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
            >
              <!-- Foto (galeria) -->
              <div
                class="relative w-full aspect-4/3 sm:aspect-video max-h-[25vh] sm:max-h-[30vh] bg-surface-raised flex items-center justify-center shrink-0 overflow-hidden select-none touch-pan-y"
                @touchstart="handleTouchStart"
                @touchend="handleTouchEnd"
              >
                <NuxtImg
                  v-if="activeImageSrc"
                  :src="activeImageSrc"
                  :alt="produto.nome"
                  class="w-full h-full object-cover pointer-events-none"
                  loading="eager"
                />
                <div v-else class="w-full h-full flex items-center justify-center bg-surface-raised">
                  <span class="text-text-muted opacity-20 text-6xl font-black select-none">?</span>
                </div>

                <!-- Fechar sobreposto -->
                <button
                  class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
                  @click="emit('close')"
                >
                  <X class="w-4 h-4" stroke-width="2.5" />
                </button>

                <!-- Badge indisponível -->
                <span
                  v-if="!produto.disponivel"
                  class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-sm leading-none z-10"
                >
                  Indisponível
                </span>

                <!-- Indicador de paginação overlay (dots) -->
                <div v-if="galleryHasMultiple" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2.5 py-1 rounded-full shrink-0 z-10">
                  <span
                    v-for="(_, i) in gallery"
                    :key="i"
                    class="w-1.5 h-1.5 rounded-full transition-all"
                    :class="i === activeImageIndex ? 'bg-white scale-125' : 'bg-white/50'"
                  />
                </div>
              </div>

              <!-- Miniaturas da galeria -->
              <div
                v-if="galleryHasMultiple"
                class="flex gap-2 px-5 pt-3 overflow-x-auto shrink-0"
              >
                <button
                  v-for="(img, i) in gallery"
                  :key="img"
                  type="button"
                  class="w-14 h-14 rounded-md overflow-hidden border shrink-0 transition-all"
                  :class="i === activeImageIndex ? 'border-brand ring-1 ring-brand/40' : 'border-border opacity-70 hover:opacity-100'"
                  :aria-label="`Ver imagem ${i + 1} de ${gallery.length}`"
                  @click="activeImageIndex = i"
                >
                  <NuxtImg :src="img" :alt="`${produto.nome} — imagem ${i + 1}`" loading="lazy" class="w-full h-full object-cover" />
                </button>
              </div>

              <!-- Conteúdo scrollável -->
              <div class="flex-1 overflow-y-auto">
                <div class="px-5 py-4">
                  <!-- Nome + preço -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h2 class="text-lg font-bold text-text-primary uppercase leading-snug">
                        {{ produto.nome }}
                      </h2>

                      <!-- Descrição colada ao nome, expansível (oculta no modo pdv) -->
                      <div v-if="produto.descricao && mode !== 'pdv'" class="mt-1 text-left">
                        <p
                          ref="descEl"
                          class="text-xs text-text-muted leading-relaxed whitespace-pre-line"
                          :class="{ 'line-clamp-2': !descExpanded }"
                        >
                          {{ produto.descricao }}
                        </p>
                        <div v-if="descOverflows && !descExpanded" class="text-xs text-text-muted mt-0.5 leading-none">...</div>
                        <button
                          v-if="descOverflows || descExpanded"
                          type="button"
                          class="mt-1 text-xs font-bold text-brand hover:text-brand-hover transition-colors focus:outline-none"
                          @click="descExpanded = !descExpanded"
                        >
                          {{ descExpanded ? 'ver menos' : 'ver mais' }}
                        </button>
                      </div>
                    </div>

                    <div class="text-right shrink-0">
                      <p v-if="isOnPromotion" class="text-xs text-text-muted line-through leading-none tabular-nums">
                        {{ formatCurrency(produto.preco_venda) }}
                      </p>
                      <p
                        class="text-2xl font-bold tabular-nums leading-none"
                        :class="isOnPromotion ? 'text-warning-600' : 'text-text-primary'"
                      >
                        {{ formatCurrency(effectivePrice) }}
                      </p>
                      <p v-if="precoExtraTotal > 0" class="text-xs text-text-muted mt-0.5">
                        + {{ formatCurrency(precoExtraTotal) }} extras
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Encomenda: escolha OBRIGATÓRIA da data de entrega via PreorderDatePicker -->
                <div v-if="isPreorderMode" class="px-5 pb-4 space-y-3">
                  <!-- Accordion clean: Agendamentos deste produto no carrinho -->
                  <div
                    v-if="existingPreordersInCart.length > 0"
                    class="border border-border/70 rounded-lg overflow-hidden bg-surface-raised/40"
                  >
                    <button
                      type="button"
                      class="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer select-none"
                      @click="showExistingPreorders = !showExistingPreorders"
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
                            @click="editExistingPreorder(item)"
                          >
                            EDITAR
                          </button>
                          <button
                            type="button"
                            class="text-[10px] font-bold text-danger-500 uppercase tracking-wider hover:underline cursor-pointer"
                            title="Remover este agendamento"
                            @click="removeExistingPreorder(item.cart_key, item.preorder!.delivery_date)"
                          >
                            REMOVER
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <PreorderDatePicker
                    v-model="preorderDate"
                    :product-id="produto.id"
                    @day-selected="(d) => (preorderDay = d)"
                  />
                  <p v-if="preorderQuantityError" class="text-xs text-danger-600 font-medium">
                    {{ preorderQuantityError }}
                  </p>
                  <p v-if="preorderCapacityError" class="text-xs text-danger-600 font-medium">
                    {{ preorderCapacityError }}
                  </p>
                </div>

                <!-- Grupos de opções: exibidos sempre que o produto tiver opções
                     (inclusive no modo `info`, para resolver tudo numa tela). -->
                <template v-if="produto.tem_opcoes">
                  <div v-if="loadingOpcoes" class="py-6 text-center text-text-muted text-sm px-5">
                    Carregando opções…
                  </div>
                  <div v-else-if="grupos.length > 0" class="space-y-4 px-5 pb-4">
                    <section
                      v-for="grupo in grupos"
                      :key="grupo.id"
                      class="border border-border rounded-lg overflow-hidden"
                    >
                      <div class="bg-surface-raised px-4 py-2.5 flex items-center justify-between">
                        <span class="text-sm font-semibold text-text-primary">
                          {{ grupo.nome }}
                          <span v-if="grupo.obrigatorio" class="ml-1 text-danger-600 text-xs">*</span>
                        </span>
                        <span class="text-xs text-text-muted">{{ grupoHint(grupo) }}</span>
                      </div>

                      <div v-if="validationErrors.has(grupo.id)" class="px-4 py-1 text-xs text-danger-600 bg-danger-50">
                        {{ validationErrors.get(grupo.id) }}
                      </div>

                      <div v-if="grupo.produto_opcao_item.length === 0" class="px-4 py-3 text-xs text-text-muted italic">
                        Nenhuma opção disponível neste grupo.
                      </div>

                      <ul v-else class="divide-y divide-border">
                        <li
                          v-for="item in grupo.produto_opcao_item"
                          :key="item.id"
                          class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-raised transition-colors select-none"
                          @click="toggleItem(grupo.id, item.id, grupo.tipo)"
                        >
                          <span v-if="grupo.tipo === 'single'" class="pointer-events-none shrink-0">
                            <UiRadio :model-value="getSingleSelected(grupo.id)" :value="item.id" :name="`grupo-${grupo.id}`" />
                          </span>
                          <span v-else-if="grupo.tipo === 'multiple'" class="pointer-events-none shrink-0 flex items-center">
                            <UiCheckbox :model-value="isSelected(grupo.id, item.id)" />
                          </span>
                          
                          <!-- Miniatura da Foto da Opção -->
                          <NuxtImg
                            v-if="item.foto_url"
                            :src="item.foto_url"
                            :alt="item.nome"
                            loading="lazy"
                            class="w-8 h-8 object-cover rounded border border-border shrink-0 bg-surface-raised"
                          />

                          <span class="flex-1 text-sm text-text-primary">{{ item.nome }}</span>
                          <span v-if="Number(item.preco_delta) !== 0" class="text-xs text-text-muted tabular-nums shrink-0">
                            {{ Number(item.preco_delta) > 0 ? '+' : '' }}{{ formatCurrency(Number(item.preco_delta)) }}
                          </span>
                          <span v-if="grupo.tipo === 'toggle'" class="pointer-events-none shrink-0">
                            <UiToggle :model-value="isSelected(grupo.id, item.id)" size="sm" />
                          </span>
                        </li>
                      </ul>
                    </section>
                  </div>
                </template>
              </div>

              <!-- Footer: adicionar ao pedido (ambos os modos) -->
              <div class="border-t border-border px-5 py-4 bg-surface shrink-0">
                <!-- Seletor de Quantidade (UI Premium) -->
                <div class="flex items-center justify-between mb-4 bg-surface-raised p-3 rounded-lg border border-border">
                  <span class="text-sm font-semibold text-text-primary">Quantidade</span>
                  
                  <div class="flex items-center gap-3">
                    <!-- Controles Integrados Retangulares (Shopify Style) -->
                    <div class="flex items-center border border-border rounded-lg h-[36px] bg-surface overflow-hidden">
                      <button
                        type="button"
                        class="px-3 h-full hover:bg-surface-raised transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
                        @click="decrementQty"
                      >
                        <Minus class="w-4 h-4" />
                      </button>
                      
                      <!-- Input editável para fracionados, ou estático para inteiros -->
                      <input
                        v-if="produto.permite_fracionamento"
                        v-model.number="quantidade"
                        type="number"
                        step="0.1"
                        min="0.001"
                        class="w-12 text-center font-semibold text-sm bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-text-primary"
                      >
                      <span v-else class="w-10 text-center font-semibold text-sm text-text-primary select-none">
                        {{ quantidade }}
                      </span>
                      
                      <button
                        type="button"
                        class="px-3 h-full hover:bg-surface-raised transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        :disabled="!isPreorderMode && maxAdicionavel !== null && quantidade >= maxAdicionavel"
                        @click="incrementQty"
                      >
                        <Plus class="w-4 h-4" />
                      </button>
                    </div>
                    <span class="text-xs font-semibold text-text-muted bg-surface-raised px-2.5 py-1.5 rounded border border-border uppercase">
                      {{ produto.unidade_medida || 'un' }}
                    </span>
                  </div>
                </div>

                <p v-if="stockQuantityError" class="text-xs text-danger-600 font-medium mb-3 -mt-1">
                  {{ stockQuantityError }}
                </p>

                <button
                  type="button"
                  class="w-full py-3.5 rounded-lg bg-interactive-primary text-text-inverse font-bold text-sm uppercase tracking-wide hover:bg-interactive-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canConfirm || quantidade <= 0 || (isPreorderMode && !canConfirmPreorder) || !!stockQuantityError"
                  @click="confirm"
                >
                  <template v-if="isPreorderMode">
                    <template v-if="!preorderDate">SELECIONE UMA DATA DE ENTREGA</template>
                    <template v-else-if="preorderQuantityError">{{ preorderQuantityError }}</template>
                    <template v-else-if="isEditingExistingPreorder">
                      Atualizar Encomenda ({{ formatDeliveryDate(preorderDate) }}) · {{ formatCurrency((effectivePrice + precoExtraTotal) * quantidade) }}
                    </template>
                    <template v-else>
                      Adicionar Encomenda ({{ formatDeliveryDate(preorderDate) }}) · {{ formatCurrency((effectivePrice + precoExtraTotal) * quantidade) }}
                    </template>
                  </template>
                  <template v-else>
                    Adicionar ao pedido · {{ formatCurrency((effectivePrice + precoExtraTotal) * quantidade) }}
                  </template>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

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
 *
 * Composto por duas composables (`useProductOptionSelection`,
 * `useProductPreorder`) e três componentes de apresentação em
 * `ui/product-details/` — este arquivo cuida só do ciclo de vida do modal
 * (abrir/fechar, galeria, quantidade/estoque, confirmação final).
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Minus, Plus } from '@lucide/vue'
import type { ProductRow, SelectedOption } from '~~/shared/types/product'
import { getProductGallery, getEffectivePrice } from '~~/shared/types/product'
import { formatDeliveryDate } from '~~/shared/utils/preorders'
import { useCartStore } from '~/stores/cart'
import { useProductOptionSelection } from '~/composables/useProductOptionSelection'
import { useProductPreorder } from '~/composables/useProductPreorder'

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

const cartStore = useCartStore()

// Galeria (capa + extras). activeImageIndex é resetado a cada abertura (dentro de ProductDetailsGallery).
const gallery = computed<string[]>(() => (props.produto ? getProductGallery(props.produto) : []))

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

const {
  grupos, loadingOpcoes, loadGrupos, selections, resetOptionState,
  toggleItem,
  textValues, fileValues, fileUploading, fileUploadError, setTextValue, onArteFileSelected, removeArteFile,
  validationErrors, precoExtraTotal, buildSelectedOptions,
} = useProductOptionSelection()

/**
 * Gestão de Estoque (migration 111). Encomenda usa sua própria capacidade
 * diária — mutuamente exclusivo com este campo por design. `quantidade` aqui
 * é o DELTA a somar ao carrinho (updateQuantity é aditivo), então o teto real
 * é `quantidade_disponivel - o que já está no carrinho para este produto`
 * (soma de TODAS as variações de opção — mesmo estoque físico).
 */
const quantidade = ref<number>(1)
const quantidadeJaNoCarrinho = computed<number>(() =>
  props.produto ? cartStore.getItemQuantity(props.produto.id) : 0,
)
const maxAdicionavel = computed<number | null>(() => {
  const disponivel = props.produto?.quantidade_disponivel
  if (disponivel === null || disponivel === undefined) return null
  return Math.max(0, disponivel - quantidadeJaNoCarrinho.value)
})

const {
  isPreorderMode, effectivePreorderConfig, loadPreorderConfig,
  preorderDate, preorderDay, showExistingPreorders, existingPreordersInCart,
  isEditingExistingPreorder, editExistingPreorder, removeExistingPreorder,
  preorderQuantityError, preorderCapacityError, canConfirmPreorder, resetPreorderState,
} = useProductPreorder({
  produto: computed(() => props.produto),
  allowPreorder: computed(() => props.allowPreorder),
  grupos, selections, quantidade, cartStore,
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

/** Estoque não comporta a quantidade pedida (soma com o que já está no carrinho). */
const stockQuantityError = computed<string | null>(() => {
  if (isPreorderMode.value || maxAdicionavel.value === null) return null
  if (quantidade.value <= maxAdicionavel.value) return null
  return maxAdicionavel.value <= 0
    ? 'Este produto está esgotado no momento.'
    : `Restam apenas ${maxAdicionavel.value} ${props.produto?.unidade_medida || 'unidade(s)'} disponível(is).`
})

/**
 * Quantidade inicial ao abrir: encomenda já no carrinho reabre com a quantidade
 * atual (reeditar em vez de somar); senão, o mínimo da config (encomenda) ou 1.
 */
function seedQuantity(): number {
  if (isPreorderMode.value) {
    if (props.initialQuantity && props.initialQuantity > 0) {
      return props.initialQuantity
    }
    return props.produto?.preorder_config?.min_quantity ?? 1
  }
  return 1
}

/** Reinicializa o estado do modal ao abrir/trocar de produto (DRY entre watch e onMounted). */
function initModal(): void {
  descExpanded.value = false
  resetOptionState()
  resetPreorderState()
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

const canConfirm = computed<boolean>(() => validationErrors.value.size === 0 && fileUploading.value.size === 0)

function confirm(): void {
  if (!canConfirm.value) return
  if (isPreorderMode.value && !canConfirmPreorder.value) return
  if (!isPreorderMode.value && stockQuantityError.value) return

  emit('confirm', buildSelectedOptions(), quantidade.value, isPreorderMode.value ? preorderDate.value : null)
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
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
              <!-- Galeria — presente em ambos os modos -->
              <UiProductDetailsGallery
                :gallery="gallery"
                :product-name="produto.nome"
                :disponivel="produto.disponivel"
                @close="emit('close')"
              />

              <!-- ── MODO WIZARD (produto com opções) ─────────────────────── -->
              <template v-if="produto.tem_opcoes">
                <!-- Nome + preço fixo abaixo da galeria -->
                <div class="px-5 py-3 border-b border-border shrink-0 flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <h2 class="text-lg font-bold text-text-primary uppercase leading-snug">
                      {{ produto.nome }}
                    </h2>
                    <p v-if="produto.descricao && mode !== 'pdv'" class="text-xs text-text-muted mt-0.5 leading-relaxed line-clamp-2">
                      {{ produto.descricao }}
                    </p>
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

                <!-- Orquestrador do wizard (flex-1 = ocupa todo o espaço restante) -->
                <UiProductDetailsOptionGroupsSelector
                  class="flex-1 min-h-0"
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
                  :total-price="(effectivePrice + precoExtraTotal) * quantidade"
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
                  @confirm="confirm"
                />
              </template>

              <!-- ── MODO CLÁSSICO (produto sem opções) ────────────────────── -->
              <template v-else>
                <!-- Conteúdo scrollável -->
                <div class="flex-1 overflow-y-auto">
                  <div class="px-5 py-4">
                    <!-- Nome + preço -->
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <h2 class="text-lg font-bold text-text-primary uppercase leading-snug">
                          {{ produto.nome }}
                        </h2>

                        <!-- Descrição expansível (oculta no modo pdv) -->
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

                  <!-- Preorder: data de entrega (somente quando sem opções de produto) -->
                  <UiProductDetailsPreorderSchedule
                    v-if="isPreorderMode"
                    :existing-preorders-in-cart="existingPreordersInCart"
                    :show-existing-preorders="showExistingPreorders"
                    :product-id="produto.id"
                    :preorder-date="preorderDate"
                    :preorder-quantity-error="preorderQuantityError"
                    :preorder-capacity-error="preorderCapacityError"
                    @update:show-existing-preorders="showExistingPreorders = $event"
                    @update:preorder-date="preorderDate = $event"
                    @edit-existing="editExistingPreorder"
                    @remove-existing="removeExistingPreorder"
                    @day-selected="(d) => (preorderDay = d)"
                  />
                </div>

                <!-- Footer: quantidade + CTA (modo clássico preservado) -->
                <div class="border-t border-border px-5 py-4 bg-surface shrink-0">
                  <div class="flex items-center justify-between mb-4 bg-surface-raised p-3 rounded-lg border border-border">
                    <span class="text-sm font-semibold text-text-primary">Quantidade</span>

                    <div class="flex items-center gap-3">
                      <div class="flex items-center border border-border rounded-lg h-[36px] bg-surface overflow-hidden">
                        <button
                          type="button"
                          class="stepper-btn px-3 h-full hover:bg-surface-raised transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95"
                          @click="decrementQty"
                        >
                          <Minus class="w-4 h-4" />
                        </button>

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
                          class="stepper-btn px-3 h-full hover:bg-surface-raised transition-colors focus:outline-none flex items-center justify-center text-text-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                          :disabled="!isPreorderMode && maxAdicionavel !== null && quantidade >= maxAdicionavel"
                          @click="incrementQty"
                        >
                          <Plus class="w-4 h-4" />
                        </button>
                      </div>
                      <span class="h-[36px] inline-flex items-center justify-center text-xs font-semibold text-text-muted bg-surface-raised px-3 rounded border border-border uppercase select-none">
                        {{ produto.unidade_medida || 'un' }}
                      </span>
                    </div>
                  </div>

                  <p v-if="stockQuantityError" class="text-xs text-danger-600 font-medium mb-3 -mt-1">
                    {{ stockQuantityError }}
                  </p>

                  <!-- CTA -->
                  <div class="flex items-stretch rounded-lg overflow-hidden bg-interactive-primary">
                    <button
                      type="button"
                      class="flex-1 min-w-0 py-3.5 px-3 text-text-inverse font-bold text-sm uppercase tracking-wide hover:bg-interactive-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap truncate text-center cursor-pointer select-none"
                      :disabled="!canConfirm || quantidade <= 0 || (isPreorderMode && !canConfirmPreorder) || !!stockQuantityError"
                      @click="confirm"
                    >
                      <template v-if="isPreorderMode">
                        <template v-if="!preorderDate">SELECIONE A DATA</template>
                        <template v-else-if="preorderQuantityError">{{ preorderQuantityError }}</template>
                        <template v-else-if="isEditingExistingPreorder">
                          <span class="hidden sm:inline">Atualizar Encomenda ({{ formatDeliveryDate(preorderDate) }})</span>
                          <span class="sm:hidden">Atualizar</span> · {{ formatCurrency((effectivePrice + precoExtraTotal) * quantidade) }}
                        </template>
                        <template v-else>
                          <span class="hidden sm:inline">Adicionar Encomenda ({{ formatDeliveryDate(preorderDate) }})</span>
                          <span class="sm:hidden">Encomendar</span> · {{ formatCurrency((effectivePrice + precoExtraTotal) * quantidade) }}
                        </template>
                      </template>
                      <template v-else>
                        <span class="hidden sm:inline">Adicionar ao pedido</span>
                        <span class="sm:hidden">Adicionar</span> · {{ formatCurrency((effectivePrice + precoExtraTotal) * quantidade) }}
                      </template>
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

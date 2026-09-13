<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { OptionGroup } from '~~/shared/types/product'
import type { CartItem } from '~/stores/cart'
import type { CalendarDay } from '~~/shared/types/preorder'
import { useProductWizard } from '~/composables/useProductWizard'
import type { WizardStep } from '~/composables/useProductWizard'
import { formatDeliveryDate } from '~~/shared/utils/preorders'

/**
 * Orquestrador do wizard de opções de produto.
 * Responsabilidade: instanciar useProductWizard, renderizar o step correto
 * e expor a barra de navegação (Anterior / Próximo / Pular / CTA).
 * Toda lógica de seleção e validação permanece no componente pai
 * (ProductDetailsModal) via props/emits — este arquivo não possui estado
 * de negócio próprio.
 */

interface FileValue { url: string; key: string; nomeOriginal: string }

const props = defineProps<{
  // ── Grupos de opção ──────────────────────────────────────────────────────
  grupos: readonly OptionGroup[]
  loadingOpcoes: boolean
  validationErrors: Map<string, string>
  selections: Map<string, Set<string>>
  textValues: Map<string, string>
  fileValues: Map<string, FileValue>
  fileUploading: Set<string>
  fileUploadError: Map<string, string>

  // ── Preorder ─────────────────────────────────────────────────────────────
  isPreorderMode: boolean
  existingPreordersInCart: readonly CartItem[]
  showExistingPreorders: boolean
  productId: string
  preorderDate: string | null
  preorderQuantityError: string | null
  preorderCapacityError: string | null
  isEditingExistingPreorder: boolean

  // ── Quantidade ───────────────────────────────────────────────────────────
  quantidade: number
  maxAdicionavel: number | null
  permiteFracionamento: boolean
  unidadeMedida: string | null

  // ── CTA / confirmação ────────────────────────────────────────────────────
  effectivePrice: number
  precoExtraTotal: number
  /** Total já pronto (preço + extras − desconto elegível) — fonte única em [id].vue/ProductDetailsModal. */
  totalPrice: number
  /** Desconto (R$) já embutido em `totalPrice` — só para exibir a linha de transparência no resumo. */
  descontoAplicado?: number
  canConfirm: boolean
  canConfirmPreorder: boolean
  stockQuantityError: string | null
  /**
   * Quando true, oculta o botão CTA no rodapé interno do wizard.
   * Usado na página dedicada onde o CTA vive na sticky bar universal.
   */
  hideCta?: boolean
}>()

const emit = defineEmits<{
  // Seleção de opções
  'toggle-item': [grupoId: string, itemId: string, tipo: OptionGroup['tipo']]
  'set-text': [grupoId: string, value: string]
  'file-selected': [grupo: OptionGroup, file: File | undefined]
  'file-remove': [grupo: OptionGroup]
  // Preorder
  'update:showExistingPreorders': [value: boolean]
  'update:preorderDate': [value: string | null]
  'edit-existing': [item: CartItem]
  'remove-existing': [cartKey: string, dateStr: string]
  'day-selected': [day: CalendarDay | null]
  // Quantidade & CTA
  'decrement-qty': []
  'increment-qty': []
  confirm: []
}>()

// ── Wizard navigation ────────────────────────────────────────────────────────

const {
  steps, currentStep, currentStepData, isOnLastStep,
  canAdvance, canGoBack, direction, visitedSteps,
  goNext, goPrev, jumpTo, reset,
} = useProductWizard({
  grupos: computed(() => props.grupos),
  loadingOpcoes: computed(() => props.loadingOpcoes),
  isPreorderMode: computed(() => props.isPreorderMode),
  validationErrors: computed(() => props.validationErrors),
  preorderDate: computed(() => props.preorderDate),
})

// Reinicia o wizard quando um novo produto é carregado (loadingOpcoes false → true → false)
watch(
  () => props.loadingOpcoes,
  (loading) => { if (!loading) reset() },
)

// ── Helpers de dados ────────────────────────────────────────────────────────

function getSelectedIds(grupoId: string): Set<string> {
  return props.selections.get(grupoId) ?? new Set()
}

function getSingleSelected(grupoId: string): string | undefined {
  return [...(props.selections.get(grupoId) ?? [])][0]
}

function getFileValue(grupoId: string): FileValue | undefined {
  return props.fileValues.get(grupoId)
}

function getFileError(grupoId: string): string {
  return props.fileUploadError.get(grupoId) ?? ''
}

// ── Cabeçalho do step ───────────────────────────────────────────────────────

const stepHeader = computed<{ title: string; subtitle: string } | null>(() => {
  const step = currentStepData.value
  if (!step) return null

  if (step.kind === 'loading') return { title: 'Carregando opções…', subtitle: '' }

  if (step.kind === 'grupo') {
    const { tipo, obrigatorio, min_selecoes, max_selecoes, nome } = step.grupo
    let subtitle = ''
    if (tipo === 'single') subtitle = 'Escolha 1'
    else if (tipo === 'toggle') subtitle = obrigatorio ? 'Selecione ao menos 1' : 'Opcional'
    else if (tipo === 'multiple') {
      if (min_selecoes > 0 && max_selecoes > min_selecoes)
        subtitle = `Escolha de ${min_selecoes} a ${max_selecoes}`
      else if (max_selecoes > 0) subtitle = `Escolha até ${max_selecoes}`
      else subtitle = 'Múltipla escolha'
    }
    return { title: nome, subtitle }
  }
  if (step.kind === 'preorder') return { title: 'Data de Entrega', subtitle: 'Selecione a data desejada' }
  return { title: 'Confirmar Pedido', subtitle: 'Revise e finalize' }
})

// O step atual é opcional e não é o último → exibe link "Pular"
const canSkip = computed<boolean>(() => {
  const step = currentStepData.value
  return step?.kind === 'grupo' && !step.grupo.obrigatorio && !isOnLastStep.value
})

// Erro de validação do step atual (exibido inline abaixo do header)
const currentStepError = computed<string | null>(() => {
  const step = currentStepData.value
  if (step?.kind !== 'grupo') return null
  return props.validationErrors.get(step.grupo.id) ?? null
})

// ── CTA (step resumo) ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const ctaPrefixDesktop = computed<string>(() => {
  if (props.isPreorderMode) {
    if (!props.preorderDate) return 'SELECIONE UMA DATA'
    if (props.preorderQuantityError) return props.preorderQuantityError
    const date = formatDeliveryDate(props.preorderDate)
    return props.isEditingExistingPreorder
      ? `Atualizar Encomenda (${date})`
      : `Adicionar Encomenda (${date})`
  }
  return 'Adicionar ao pedido'
})

const ctaPrefixMobile = computed<string>(() => {
  if (props.isPreorderMode) {
    if (!props.preorderDate) return 'SELECIONE A DATA'
    if (props.preorderQuantityError) return props.preorderQuantityError
    return props.isEditingExistingPreorder ? 'Atualizar' : 'Encomendar'
  }
  return 'Adicionar'
})

const ctaPriceFormatted = computed<string>(() => formatCurrency(props.totalPrice))

const ctaDisabled = computed<boolean>(
  () =>
    !props.canConfirm
    || props.quantidade <= 0
    || (props.isPreorderMode && !props.canConfirmPreorder)
    || !!props.stockQuantityError,
)

// ── Handlers de auto-advance e jump ────────────────────────────────────────

function handleAutoAdvance(): void {
  if (canAdvance.value && !isOnLastStep.value) goNext()
}

function handleJumpTo(stepIndex: number): void {
  jumpTo(stepIndex)
}

// Narrows step to guarantee typed access in template
function asGrupoStep(step: WizardStep): Extract<WizardStep, { kind: 'grupo' }> {
  return step as Extract<WizardStep, { kind: 'grupo' }>
}
</script>

<template>
  <div class="flex flex-col w-full h-full min-h-0">
    <!-- ── Barra de progresso ──────────────────────────────────────────────── -->
    <UiProductDetailsWizardProgressBar
      v-if="!loadingOpcoes && steps.length > 1"
      :steps="steps"
      :current-step="currentStep"
      :visited-steps="visitedSteps"
      @jump-to="handleJumpTo"
    />

    <!-- ── Cabeçalho do step (título + subtítulo) ─────────────────────────── -->
    <div v-if="stepHeader" class="px-5 pt-4 pb-1 shrink-0">
      <h3 class="text-base font-bold text-text-primary leading-snug">
        {{ stepHeader.title }}
      </h3>
      <p v-if="stepHeader.subtitle" class="text-xs text-text-muted mt-0.5">
        {{ stepHeader.subtitle }}
      </p>
    </div>

    <!-- Erro de validação inline (grupo atual) -->
    <p
      v-if="currentStepError"
      class="px-5 py-1 text-xs text-danger-600 font-medium shrink-0"
      role="alert"
    >
      {{ currentStepError }}
    </p>

    <!-- ── Conteúdo do step (área central flex-1 scrollável, mantém rodapé fixo) ─────────── -->
    <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <Transition
        :name="direction === 'forward' ? 'wizard-slide-left' : 'wizard-slide-right'"
        mode="out-in"
      >
        <div :key="currentStep">
          <!-- Loading: skeleton de chips -->
          <template v-if="currentStepData?.kind === 'loading'">
            <div class="p-5 grid grid-cols-2 gap-3" aria-busy="true">
              <UiSkeleton
                v-for="n in 4"
                :key="n"
                variant="rectangular"
                height="96px"
              />
            </div>
          </template>

          <!-- Single -->
          <UiProductDetailsWizardStepSingle
            v-else-if="currentStepData?.kind === 'grupo' && currentStepData.grupo.tipo === 'single'"
            :grupo="asGrupoStep(currentStepData).grupo"
            :selected-id="getSingleSelected(currentStepData.grupo.id)"
            @select="emit('toggle-item', currentStepData.grupo.id, $event, 'single')"
            @auto-advance="handleAutoAdvance"
          />

          <!-- Multiple -->
          <UiProductDetailsWizardStepMultiple
            v-else-if="currentStepData?.kind === 'grupo' && currentStepData.grupo.tipo === 'multiple'"
            :grupo="asGrupoStep(currentStepData).grupo"
            :selected-ids="getSelectedIds(currentStepData.grupo.id)"
            @toggle="emit('toggle-item', currentStepData.grupo.id, $event, 'multiple')"
          />

          <!-- Toggle -->
          <UiProductDetailsWizardStepToggle
            v-else-if="currentStepData?.kind === 'grupo' && currentStepData.grupo.tipo === 'toggle'"
            :grupo="asGrupoStep(currentStepData).grupo"
            :selected-ids="getSelectedIds(currentStepData.grupo.id)"
            @toggle="emit('toggle-item', currentStepData.grupo.id, $event, 'toggle')"
          />

          <!-- Texto livre -->
          <UiProductDetailsWizardStepTexto
            v-else-if="currentStepData?.kind === 'grupo' && currentStepData.grupo.tipo === 'texto_livre'"
            :grupo="asGrupoStep(currentStepData).grupo"
            :value="textValues.get(currentStepData.grupo.id) ?? ''"
            @update:value="emit('set-text', currentStepData.grupo.id, $event)"
          />

          <!-- Upload de arquivo -->
          <UiProductDetailsWizardStepUpload
            v-else-if="currentStepData?.kind === 'grupo' && currentStepData.grupo.tipo === 'upload_arquivo'"
            :grupo="asGrupoStep(currentStepData).grupo"
            :file-value="getFileValue(currentStepData.grupo.id)"
            :uploading="fileUploading.has(currentStepData.grupo.id)"
            :error="getFileError(currentStepData.grupo.id)"
            @file-selected="emit('file-selected', asGrupoStep(currentStepData).grupo, $event)"
            @file-remove="emit('file-remove', asGrupoStep(currentStepData).grupo)"
          />

          <!-- Preorder: reutiliza o componente existente sem modificação -->
          <UiProductDetailsPreorderSchedule
            v-else-if="currentStepData?.kind === 'preorder'"
            :existing-preorders-in-cart="existingPreordersInCart"
            :show-existing-preorders="showExistingPreorders"
            :product-id="productId"
            :preorder-date="preorderDate"
            :preorder-quantity-error="preorderQuantityError"
            :preorder-capacity-error="preorderCapacityError"
            @update:show-existing-preorders="emit('update:showExistingPreorders', $event)"
            @update:preorder-date="emit('update:preorderDate', $event)"
            @edit-existing="emit('edit-existing', $event)"
            @remove-existing="(cartKey, dateStr) => emit('remove-existing', cartKey, dateStr)"
            @day-selected="emit('day-selected', $event)"
          />

          <!-- Resumo + seletor de quantidade -->
          <UiProductDetailsWizardStepResumo
            v-else-if="currentStepData?.kind === 'resumo'"
            :grupos="grupos"
            :selections="selections"
            :text-values="textValues"
            :file-values="fileValues"
            :quantidade="quantidade"
            :max-adicionavel="maxAdicionavel"
            :permite-fracionamento="permiteFracionamento"
            :unidade-medida="unidadeMedida"
            @decrement="emit('decrement-qty')"
            @increment="emit('increment-qty')"
            @jump-to="handleJumpTo"
          />
        </div>
      </Transition>
    </div>

    <!-- ── Rodapé de navegação ─────────────────────────────────────────────── -->
    <div class="shrink-0 border-t border-border px-5 py-4 bg-surface space-y-3 mt-auto">
      <!-- Erro de estoque (step resumo) -->
      <p
        v-if="stockQuantityError && isOnLastStep"
        class="text-xs text-danger-600 font-medium"
        role="alert"
      >
        {{ stockQuantityError }}
      </p>

      <!-- CTA (step resumo) — oculto quando hideCta=true (sticky bar assume) -->
      <div
        v-if="isOnLastStep && !hideCta"
        class="space-y-1.5"
      >
        <div class="flex items-stretch rounded-md overflow-hidden bg-interactive-primary">
          <button
            type="button"
            class="flex-1 min-w-0 py-3.5 px-3 text-text-inverse font-bold text-sm uppercase tracking-wide hover:bg-interactive-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap truncate text-center"
            :disabled="ctaDisabled"
            @click="emit('confirm')"
          >
            <span class="hidden sm:inline">{{ ctaPrefixDesktop }}</span>
            <span class="sm:hidden">{{ ctaPrefixMobile }}</span>
            <span> · {{ ctaPriceFormatted }}</span>
          </button>
        </div>
        <p
          v-if="descontoAplicado && descontoAplicado > 0"
          class="text-center text-xs font-semibold text-brand-green dark:text-emerald-400 tabular-nums"
        >
          −{{ formatCurrency(descontoAplicado) }} desconto aplicado
        </p>
      </div>

      <!-- Anterior + Próximo / Pular (steps intermediários) -->
      <div v-else class="flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <button
            v-if="canGoBack"
            type="button"
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-border text-sm font-semibold text-text-secondary hover:bg-surface-raised transition-colors focus:outline-none shrink-0"
            @click="goPrev"
          >
            <ChevronLeft class="w-4 h-4" />
            Anterior
          </button>

          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md bg-interactive-primary text-text-inverse text-sm font-bold uppercase tracking-wide hover:bg-interactive-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
            :disabled="!canAdvance"
            @click="goNext"
          >
            <span>{{ currentStepData?.kind === 'loading' ? 'Aguarde…' : 'Próximo' }}</span>
            <ChevronRight v-if="currentStepData?.kind !== 'loading'" class="w-4 h-4" />
          </button>
        </div>

        <!-- Link "Pular" para grupos opcionais -->
        <button
          v-if="canSkip"
          type="button"
          class="text-xs text-text-muted hover:text-text-secondary transition-colors focus:outline-none text-center py-0.5"
          @click="goNext"
        >
          Pular este passo
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Transição slide entre steps — CSS puro, sem dependência de biblioteca */
.wizard-slide-left-enter-active,
.wizard-slide-left-leave-active,
.wizard-slide-right-enter-active,
.wizard-slide-right-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.wizard-slide-left-enter-from  { transform: translateX(28px); opacity: 0; }
.wizard-slide-left-leave-to    { transform: translateX(-28px); opacity: 0; }

.wizard-slide-right-enter-from { transform: translateX(-28px); opacity: 0; }
.wizard-slide-right-leave-to   { transform: translateX(28px); opacity: 0; }
</style>

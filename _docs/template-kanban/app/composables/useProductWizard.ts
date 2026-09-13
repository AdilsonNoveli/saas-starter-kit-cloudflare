import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { OptionGroup } from '~~/shared/types/product'

export type WizardStep =
  | { kind: 'loading' }
  | { kind: 'grupo'; grupo: OptionGroup }
  | { kind: 'preorder' }
  | { kind: 'resumo' }

interface Args {
  grupos: Ref<readonly OptionGroup[]>
  loadingOpcoes: Ref<boolean>
  isPreorderMode: Ref<boolean>
  validationErrors: Ref<Map<string, string>>
  preorderDate: Ref<string | null>
}

/**
 * Gerencia a navegação do wizard de seleção de opções de produto.
 * Responsabilidade única: steps[], posição atual, regras de avanço/recuo.
 * Nenhuma lógica de seleção de opções — isso fica em useProductOptionSelection.
 */
export function useProductWizard({
  grupos,
  loadingOpcoes,
  isPreorderMode,
  validationErrors,
  preorderDate,
}: Args) {
  const currentStep = ref(0)
  const direction = ref<'forward' | 'backward'>('forward')
  const visitedSteps = ref<Set<number>>(new Set([0]))

  /** Lista dinâmica de steps calculada após o load das opções. */
  const steps = computed<WizardStep[]>(() => {
    if (loadingOpcoes.value) return [{ kind: 'loading' }]
    const result: WizardStep[] = grupos.value.map((grupo) => ({
      kind: 'grupo' as const,
      grupo,
    }))
    if (isPreorderMode.value) result.push({ kind: 'preorder' })
    result.push({ kind: 'resumo' })
    return result
  })

  const currentStepData = computed<WizardStep | null>(
    () => steps.value[currentStep.value] ?? null,
  )

  const isOnLastStep = computed(
    () => steps.value.length > 0 && currentStep.value === steps.value.length - 1,
  )

  /**
   * Regra de avanço por tipo de step:
   *  loading   → nunca avança
   *  grupo     → avança se não for obrigatório OU não tiver erro de validação
   *  preorder  → avança somente com data selecionada
   *  resumo    → sempre (CTA faz validação global final)
   */
  const canAdvance = computed<boolean>(() => {
    const step = currentStepData.value
    if (!step) return false
    switch (step.kind) {
      case 'loading':
        return false
      case 'grupo':
        return !step.grupo.obrigatorio || !validationErrors.value.has(step.grupo.id)
      case 'preorder':
        return preorderDate.value !== null
      case 'resumo':
        return true
    }
  })

  const canGoBack = computed<boolean>(
    () => currentStep.value > 0 && steps.value[0]?.kind !== 'loading',
  )

  function goNext(): void {
    if (!canAdvance.value || isOnLastStep.value) return
    direction.value = 'forward'
    const next = currentStep.value + 1
    currentStep.value = next
    visitedSteps.value = new Set(visitedSteps.value).add(next)
  }

  function goPrev(): void {
    if (!canGoBack.value) return
    direction.value = 'backward'
    currentStep.value -= 1
  }

  /** Salta para step visitado anteriormente (ex.: editar seleção a partir do resumo). */
  function jumpTo(index: number): void {
    if (index < 0 || index >= steps.value.length) return
    if (index > currentStep.value && !visitedSteps.value.has(index)) return
    direction.value = index > currentStep.value ? 'forward' : 'backward'
    currentStep.value = index
  }

  /** Reinicia ao abrir um novo produto. */
  function reset(): void {
    currentStep.value = 0
    direction.value = 'forward'
    visitedSteps.value = new Set([0])
  }

  // Quando o loading resolve, os steps mudam — garante que o índice está no range
  // e re-marca o step 0 como visitado para a pill ser clicável.
  watch(steps, (newSteps) => {
    if (currentStep.value >= newSteps.length) currentStep.value = 0
    visitedSteps.value = new Set([...visitedSteps.value, 0])
  })

  return {
    steps,
    currentStep,
    currentStepData,
    isOnLastStep,
    canAdvance,
    canGoBack,
    direction,
    visitedSteps,
    goNext,
    goPrev,
    jumpTo,
    reset,
  }
}

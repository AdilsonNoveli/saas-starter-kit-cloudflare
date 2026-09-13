import { ref } from 'vue'
import { z } from 'zod'
import { useNotification } from '~/composables/useNotification'
import type { PreorderConfig } from '~~/shared/types/preorder'

export interface PreorderFormState {
  min_quantity: number
  max_quantity: number
  min_lead_days: number
  max_lead_days: number
}

/**
 * Regras de encomenda editáveis (alimentam produtos.preorder_config).
 * daily_capacity removido: migration 113 — gerenciado via
 * useProductEstoque (estoqueForm.producao_diaria_limite).
 */
export const DEFAULT_PREORDER_FORM: PreorderFormState = {
  min_quantity: 1,
  max_quantity: 10,
  min_lead_days: 1,
  max_lead_days: 30,
}

/** Validadas apenas quando product_type !== 'stock'. */
const preorderConfigSchema = z
  .object({
    min_quantity: z.number().positive('Quantidade mínima deve ser > 0'),
    max_quantity: z.number().positive('Quantidade máxima deve ser > 0'),
    min_lead_days: z.number().int().nonnegative('Antecedência mínima deve ser ≥ 0'),
    max_lead_days: z.number().int().positive('Antecedência máxima deve ser > 0'),
  })
  .refine((v) => v.min_quantity <= v.max_quantity, {
    message: 'Quantidade mínima não pode exceder a máxima',
  })
  .refine((v) => v.min_lead_days <= v.max_lead_days, {
    message: 'Antecedência mínima não pode exceder a máxima',
  })

/** Configuração de encomenda (Pre-Order System) — extraída de `[id].vue` (SoC). */
export function useProductPreorderConfig() {
  const { notify } = useNotification()

  const preorderForm = ref<PreorderFormState>({ ...DEFAULT_PREORDER_FORM })

  function reset(): void {
    preorderForm.value = { ...DEFAULT_PREORDER_FORM }
  }

  function loadFromConfig(config: PreorderConfig | null): void {
    preorderForm.value = config
      ? {
          min_quantity: Number(config.min_quantity),
          max_quantity: Number(config.max_quantity),
          min_lead_days: Number(config.min_lead_days),
          max_lead_days: Number(config.max_lead_days),
        }
      : { ...DEFAULT_PREORDER_FORM }
  }

  /** Valida o formulário e retorna a config pronta para o payload, ou `null` se inválido (já notifica o erro). */
  function validate(): PreorderConfig | null {
    const parsed = preorderConfigSchema.safeParse(preorderForm.value)
    if (!parsed.success) {
      notify.error('Configuração de encomenda inválida', parsed.error.issues[0]?.message)
      return null
    }
    return { scheduling_type: 'made_to_order', ...parsed.data }
  }

  return { preorderForm, reset, loadFromConfig, validate }
}

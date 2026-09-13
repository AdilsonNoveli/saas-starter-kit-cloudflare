import { ref, computed, watch, type Ref } from 'vue'
import type { CalendarDay, PreorderConfig, ProductType } from '~~/shared/types/preorder'
import { DEFAULT_PREORDER_CONFIG } from '~~/shared/types/preorder'
import { validateQuantity } from '~~/shared/utils/preorders'
import type { OptionGroup, SelectedOption } from '~~/shared/types/product'
import type { useCartStore } from '~/stores/cart'
import { useNotification } from '~/composables/useNotification'

interface PreorderableProduct {
  readonly id: string
  readonly product_type: ProductType
  readonly preorder_config: PreorderConfig | null
}

interface UseProductPreorderParams {
  produto: Ref<PreorderableProduct | null>
  allowPreorder: Ref<boolean | undefined>
  grupos: Ref<readonly OptionGroup[]>
  selections: Ref<Map<string, Set<string>>>
  quantidade: Ref<number>
  cartStore: ReturnType<typeof useCartStore>
}

/**
 * Sistema de encomenda (preorder) do `ProductDetailsModal` — detecção de
 * modo, config autoritativa (min/max quantidade, prazo), data de entrega
 * obrigatória, agendamentos já existentes no carrinho (editar/remover) e
 * validação de quantidade/capacidade.
 */
export function useProductPreorder({ produto, allowPreorder, grupos, selections, quantidade, cartStore }: UseProductPreorderParams) {
  const { notify } = useNotification()

  /** Tipo de produto resolvido (prop ou consulta autoritativa ao banco). */
  const resolvedProductType = ref<ProductType | null>(null)

  /** Config autoritativa da encomenda (min/max/capacidade). */
  const preorderConfig = ref<PreorderConfig | null>(null)

  /** Produto é encomenda e o contexto permite encomendar. */
  const isPreorderMode = computed<boolean>(() => {
    if (allowPreorder.value === false || !produto.value) return false
    return (
      produto.value.product_type === 'preorder' ||
      resolvedProductType.value === 'preorder' ||
      produto.value.preorder_config !== null ||
      preorderConfig.value !== null
    )
  })

  /** Configuração autoritativa com fallback robusto contra registros parciais/ausentes. */
  const effectivePreorderConfig = computed<PreorderConfig | null>(() => {
    if (!isPreorderMode.value) return null
    const cfg = preorderConfig.value ?? produto.value?.preorder_config ?? null
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
    const p = produto.value
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

    // 2. Se a config não veio inline, busca no servidor como autoridade final
    if (!preorderConfig.value) {
      try {
        const data = await $fetch<{ productType: ProductType | null; preorderConfig: PreorderConfig | null }>(
          `/api/catalog/products/${p.id}/preorder-config`,
        )
        if (data.productType) resolvedProductType.value = data.productType
        if (data.preorderConfig) preorderConfig.value = data.preorderConfig
      } catch (e) {
        console.error('[Preorder] Erro ao carregar config:', e)
        notify.error('Erro ao carregar encomenda', 'Não foi possível carregar os limites de quantidade e prazo. Tente novamente.')
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

  /** Controle de colapso/expansão do accordion de agendamentos existentes no carrinho. */
  const showExistingPreorders = ref<boolean>(false)

  /** Encomendas deste mesmo produto já adicionadas ao carrinho pelo cliente. */
  const existingPreordersInCart = computed(() => {
    if (!produto.value?.id) return []
    return cartStore.items.filter((i) => i.produto_id === produto.value?.id && i.preorder)
  })

  /** Verifica se a data selecionada atualmente já é um agendamento existente no carrinho. */
  const isEditingExistingPreorder = computed<boolean>(() => {
    if (!isPreorderMode.value || !preorderDate.value || !produto.value?.id) return false
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
    if (!isPreorderMode.value || !newDate || !produto.value?.id) return
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
    const existingQty = cartStore.getPreorderQuantity(produto.value.id, newDate, currentOpcoes)
    if (existingQty !== null && existingQty > 0) {
      quantidade.value = existingQty
    }
  })

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

  /** Encomenda só avança com data escolhida, quantidade e capacidade válidas. */
  const canConfirmPreorder = computed<boolean>(() =>
    preorderDate.value !== null &&
    preorderQuantityError.value === null &&
    preorderCapacityError.value === null,
  )

  /** Reinicializa o estado de encomenda ao abrir/trocar de produto. */
  function resetPreorderState(): void {
    preorderDate.value = null
    preorderDay.value = null
    showExistingPreorders.value = false
    resolvedProductType.value = produto.value?.product_type ?? null
    preorderConfig.value = produto.value?.preorder_config ?? null
  }

  return {
    resolvedProductType,
    preorderConfig,
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
  }
}

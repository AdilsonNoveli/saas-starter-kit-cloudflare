import { computed, ref, watch, type Ref } from 'vue'
import { useNotification } from '~/composables/useNotification'

export interface EstoqueFormState {
  controle_estoque: 'nenhum' | 'contagem' | 'producao_diaria'
  estoque_atual: number
  estoque_minimo: number | null
  producao_diaria_limite: number | null
}

export const DEFAULT_ESTOQUE_FORM: EstoqueFormState = {
  controle_estoque: 'nenhum',
  estoque_atual: 0,
  estoque_minimo: null,
  producao_diaria_limite: null,
}

const ALL_CONTROLE_ESTOQUE_OPTIONS = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'contagem', label: 'Contagem' },
  { value: 'producao_diaria', label: 'Produção diária' },
]

/**
 * Gestão de Estoque (migration 111): política é atributo do PRODUTO;
 * OPERAÇÃO do dia a dia (ajustes de saldo, histórico) vive em
 * /admin/inventory — não misturar as duas responsabilidades (SoC, ver
 * _docs/plano-estoque.md).
 *
 * `isPreorderEnabled`: 'producao_diaria' e encomenda são mutuamente
 * exclusivos (migration 112) — encomenda já tem sua PRÓPRIA capacidade
 * diária (mesmo campo `producao_diaria_limite`, ver
 * `useProductPreorderConfig`). Escondemos a opção da lista (em vez de só
 * validar) e resetamos automaticamente se o produto virar encomenda com
 * 'producao_diaria' já selecionado.
 */
export function useProductEstoque(isPreorderEnabled: Ref<boolean>) {
  const { notify } = useNotification()

  const estoqueForm = ref<EstoqueFormState>({ ...DEFAULT_ESTOQUE_FORM })
  const ajusteDelta = ref<number>(0)
  const aplicandoAjuste = ref(false)

  const controleEstoqueOptions = computed(() =>
    isPreorderEnabled.value
      ? ALL_CONTROLE_ESTOQUE_OPTIONS.filter((o) => o.value !== 'producao_diaria')
      : ALL_CONTROLE_ESTOQUE_OPTIONS,
  )

  watch(isPreorderEnabled, (enabled) => {
    if (enabled && estoqueForm.value.controle_estoque === 'producao_diaria') {
      estoqueForm.value.controle_estoque = 'nenhum'
      estoqueForm.value.producao_diaria_limite = null
    }
  })

  /**
   * Ajuste inline (issue real de UX: sem isto, "Contagem" num produto já
   * existente — ex.: refrigerante pronto — não tinha como receber estoque
   * nenhum sem sair da página). `ajusteDelta` é o delta (+/-) digitado,
   * NUNCA o saldo absoluto — aplicar chama a mesma API de ajuste manual
   * (POST /api/admin/inventory/movements) direto, sem modal, mantendo a
   * trilha de auditoria (estoque_movimentacoes) intacta.
   */
  async function aplicarAjusteInline(produtoId: string): Promise<void> {
    if (!ajusteDelta.value) return

    aplicandoAjuste.value = true
    try {
      const result = await $fetch<{ success: true, estoque_atual: number }>('/api/admin/inventory/movements', {
        method: 'POST',
        body: {
          tipo_entidade: 'produto',
          entidade_id: produtoId,
          quantidade: ajusteDelta.value,
          motivo: null,
        },
      })
      estoqueForm.value.estoque_atual = result.estoque_atual
      ajusteDelta.value = 0
      notify.success('Estoque ajustado', `Novo saldo: ${result.estoque_atual}`)
    } catch (err) {
      const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      notify.error('Erro ao ajustar estoque', message)
    } finally {
      aplicandoAjuste.value = false
    }
  }

  function reset(): void {
    estoqueForm.value = { ...DEFAULT_ESTOQUE_FORM }
  }

  function loadFromRow(p: {
    controle_estoque?: string | null
    estoque_atual?: number | null
    estoque_minimo?: number | null
    producao_diaria_limite?: number | null
  }): void {
    estoqueForm.value = {
      controle_estoque: (p.controle_estoque as EstoqueFormState['controle_estoque'] | undefined) ?? 'nenhum',
      estoque_atual: p.estoque_atual != null ? Number(p.estoque_atual) : 0,
      estoque_minimo: p.estoque_minimo != null ? Number(p.estoque_minimo) : null,
      producao_diaria_limite: p.producao_diaria_limite != null ? Number(p.producao_diaria_limite) : null,
    }
  }

  return {
    estoqueForm,
    ajusteDelta,
    aplicandoAjuste,
    controleEstoqueOptions,
    aplicarAjusteInline,
    reset,
    loadFromRow,
  }
}

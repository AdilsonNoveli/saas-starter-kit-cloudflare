import { computed, ref, watch } from 'vue'

const _fmtDecimalBR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formata um número para exibição em pt-BR sem símbolo (ex: 6.5 → "6,50"). */
export function formatDecimalBR(val: number): string {
  return _fmtDecimalBR.format(val)
}

/**
 * Precificação do produto: preço final = custo × margem, com override
 * manual do lojista (campo "Preço Final" editável que recalcula a margem
 * de trás pra frente). Fonte única usada pelo card de Precificação —
 * extraída de `[id].vue` para isolar a matemática de preço do resto do
 * formulário (SoC).
 *
 * `precoCusto`/`margemLucro` são getters (não refs) para não acoplar esta
 * composable ao shape inteiro do `form` da página.
 */
export function useProductPricing(params: {
  precoCusto: () => number
  margemLucro: () => number
  setMargemLucro: (v: number) => void
}) {
  /** Preço final derivado do custo × margem (preview síncrono do que o banco calcularia). */
  const sellingPricePreview = computed<number>(() =>
    Math.round(Number(params.precoCusto()) * (1 + Number(params.margemLucro()) / 100) * 100) / 100,
  )

  /**
   * Preço final customizado pelo comerciante.
   * null = usar derivado (custo × margem); number = valor digitado diretamente.
   */
  const precoFinalCustomizado = ref<number | null>(null)

  /** Preço final efetivo: usa o customizado se definido, senão o derivado custo×margem. */
  const precoFinalEfetivo = computed<number>(() =>
    precoFinalCustomizado.value !== null ? precoFinalCustomizado.value : sellingPricePreview.value,
  )

  /**
   * Valor de exibição formatado em pt-BR (ex: "6,00") para o campo de texto do Preço Final.
   * Sincronizado com precoFinalEfetivo; atualizado por onPrecoFinalBlur.
   */
  const precoFinalDisplay = ref<string>('')

  /**
   * Handler chamado ao digitar no campo Preço Final.
   * Apenas atualiza o texto de exibição — não parseamos até o blur para não
   * interromper a digitação (ex: "1," ainda não é número completo).
   */
  function onPrecoFinalInput(event: Event): void {
    precoFinalDisplay.value = (event.target as HTMLInputElement).value
  }

  /**
   * Handler chamado ao sair do campo (blur).
   * Parseia o valor pt-BR, atualiza precoFinalCustomizado e recalcula margem.
   * Fórmula inversa: margem = ((precoFinal / precoCusto) - 1) × 100
   */
  function onPrecoFinalBlur(event: Event): void {
    const raw = (event.target as HTMLInputElement).value
    // Normaliza: troca vírgula por ponto para parseFloat
    const normalized = raw.replace(/\./g, '').replace(',', '.')
    const val = parseFloat(normalized)
    if (isNaN(val) || val <= 0) {
      // Valor inválido: reverte para o preço efetivo anterior
      precoFinalDisplay.value = formatDecimalBR(precoFinalEfetivo.value)
      return
    }
    const rounded = Math.round(val * 100) / 100
    precoFinalCustomizado.value = rounded
    precoFinalDisplay.value = formatDecimalBR(rounded)
    const custo = Number(params.precoCusto())
    if (custo > 0) {
      params.setMargemLucro(Math.round(((rounded / custo) - 1) * 10000) / 100)
    }
  }

  // Sincroniza o display sempre que precoFinalEfetivo muda de fora (custo/margem alterados)
  watch(precoFinalEfetivo, (val) => {
    // Só sincroniza se o campo não estiver sendo digitado (precoFinalDisplay está formatado)
    const normalized = precoFinalDisplay.value.replace(/\./g, '').replace(',', '.')
    const current = parseFloat(normalized)
    if (isNaN(current) || Math.abs(current - val) > 0.001) {
      precoFinalDisplay.value = formatDecimalBR(val)
    }
  }, { immediate: true })

  /**
   * Se o banco já tem preco_venda gravado, inicializa o campo customizado com ele.
   * Garante que edições subsequentes partem do valor real — não do derivado.
   */
  function setFromServerPreco(precoVenda: number | null | undefined): void {
    precoFinalCustomizado.value = precoVenda != null ? Number(precoVenda) : null
    // Força atualização do display imediatamente após carregar os dados do banco.
    precoFinalDisplay.value = formatDecimalBR(precoFinalEfetivo.value)
  }

  function reset(): void {
    precoFinalCustomizado.value = null
  }

  return {
    sellingPricePreview,
    precoFinalCustomizado,
    precoFinalEfetivo,
    precoFinalDisplay,
    onPrecoFinalInput,
    onPrecoFinalBlur,
    setFromServerPreco,
    reset,
  }
}

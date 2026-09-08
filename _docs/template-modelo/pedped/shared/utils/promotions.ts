/**
 * Calculadoras puras de promoção — sem dependência Vue.
 * Consumidas tanto pelo server (applyPromotions) quanto pelo cliente (preview).
 *
 * Regras de negócio fixadas:
 *  - leve_pague: item mais barato do grupo elegível fica grátis por pacote
 *  - progressivo: maior faixa aplicável vence (por quantidade total elegível)
 *  - desconto_carrinho: percentual sobre o subtotal se atingiu valor mínimo
 */

import type {
  LevePagueConfig,
  ProgressivoConfig,
  DescontoCarrinhoConfig,
} from '#shared/types/promotion'

export interface ItemCalculo {
  produto_id: string
  preco: number
  quantidade: number
}

/**
 * Leve X pelo preço de Y.
 * A cada `leve` unidades, `leve - compre` saem de graça (o mais barato do grupo elegível).
 * Como todos os itens passados já são do mesmo produto (ou grupo elegível),
 * o preço por unidade é uniforme — simplificamos para o padrão corrente.
 *
 * Retorna desconto total em R$.
 */
export function calcularLevePague(config: LevePagueConfig, itens: ItemCalculo[]): number {
  const { compre, leve } = config
  if (leve <= compre || compre <= 0 || leve <= 0 || itens.length === 0) return 0

  // Expande para lista de unidades com seus preços (item mais barato = menor preco)
  const unidades = itens
    .flatMap((i) => Array.from({ length: Math.max(0, i.quantidade) }, () => i.preco))
    .sort((a, b) => a - b) // crescente: os mais baratos primeiro

  const totalQty = unidades.length
  if (totalQty < leve) return 0

  const pacotes = Math.floor(totalQty / leve)
  const itensGratisPorPacote = leve - compre
  // Pega os (pacotes * itensGratisPorPacote) mais baratos
  const gratis = unidades.slice(0, pacotes * itensGratisPorPacote)
  return gratis.reduce((sum, p) => sum + p, 0)
}

/**
 * Desconto progressivo por faixas de quantidade.
 * Aplica o maior `desconto_percentual` cuja `quantidade` mínima já foi atingida.
 * Incide sobre o subtotal dos itens elegíveis.
 *
 * Retorna desconto total em R$.
 */
export function calcularProgressivo(config: ProgressivoConfig, itens: ItemCalculo[]): number {
  if (itens.length === 0) return 0

  const qtdTotal = itens.reduce((sum, i) => sum + i.quantidade, 0)
  const subtotal = itens.reduce((sum, i) => sum + i.preco * i.quantidade, 0)

  const faixaAplicavel = [...config.faixas]
    .filter((f) => qtdTotal >= f.quantidade)
    .sort((a, b) => b.quantidade - a.quantidade)[0]

  if (!faixaAplicavel) return 0
  return subtotal * (faixaAplicavel.desconto_percentual / 100)
}

/**
 * Desconto percentual sobre o total do carrinho quando o valor mínimo é atingido.
 *
 * Retorna desconto total em R$.
 */
export function calcularDescontoCarrinho(
  config: DescontoCarrinhoConfig,
  totalCarrinho: number,
): number {
  if (totalCarrinho < config.valor_minimo) return 0
  return totalCarrinho * (config.desconto_percentual / 100)
}

// ---------------------------------------------------------------------------
// Incentivo (upsell): "quanto falta para o próximo nível de desconto"
// Funções puras espelhando a MESMA elegibilidade das calculadoras acima —
// consumidas pelo cliente (cart store) para exibir o card de incentivo.
// ---------------------------------------------------------------------------

export interface ProximoNivelIncentivo {
  /** Quanto falta para desbloquear o próximo nível (unidades ou R$, conforme o tipo). */
  readonly faltam: number
  /** Percentual de desconto do próximo nível. */
  readonly descontoPercentual: number
  /** Progresso até o próximo nível, 0–100 (para a barra visual). */
  readonly progresso: number
}

/**
 * Próxima faixa de desconto progressivo ainda não atingida.
 * Baseia-se na quantidade total de itens elegíveis (mesma base de `calcularProgressivo`).
 * Retorna `null` quando não há itens elegíveis (nada a incentivar) ou quando o
 * cliente já está na maior faixa configurada.
 *
 * Ex.: faixas 2→10%, 3→15%. Com 1 und → { faltam: 1, desconto: 10 }.
 *      Com 2 und (já em 10%) → { faltam: 1, desconto: 15 } (upgrade de nível).
 */
export function calcularProximaFaixaProgressivo(
  config: ProgressivoConfig,
  itens: ItemCalculo[],
): ProximoNivelIncentivo | null {
  const qtdTotal = itens.reduce((sum, i) => sum + i.quantidade, 0)
  if (qtdTotal <= 0) return null

  // Apenas faixas com benefício real (> 0%), ordenadas por quantidade ASC.
  const faixas = config.faixas
    .filter((f) => f.desconto_percentual > 0)
    .sort((a, b) => a.quantidade - b.quantidade)

  const proxima = faixas.find((f) => qtdTotal < f.quantidade)
  if (!proxima) return null

  return {
    faltam: Number((proxima.quantidade - qtdTotal).toFixed(3)),
    descontoPercentual: proxima.desconto_percentual,
    progresso: Math.min(100, (qtdTotal / proxima.quantidade) * 100),
  }
}

/**
 * Quanto falta em R$ para atingir o valor mínimo do desconto no carrinho.
 * Baseia-se no total do carrinho (mesma base de `calcularDescontoCarrinho`).
 * Retorna `null` se o mínimo já foi atingido, se o carrinho está vazio ou se
 * a configuração não oferece benefício.
 */
export function calcularProximoDescontoCarrinho(
  config: DescontoCarrinhoConfig,
  totalCarrinho: number,
): ProximoNivelIncentivo | null {
  if (totalCarrinho <= 0 || config.valor_minimo <= 0 || config.desconto_percentual <= 0) return null
  if (totalCarrinho >= config.valor_minimo) return null

  return {
    faltam: Number((config.valor_minimo - totalCarrinho).toFixed(2)),
    descontoPercentual: config.desconto_percentual,
    progresso: Math.min(100, (totalCarrinho / config.valor_minimo) * 100),
  }
}

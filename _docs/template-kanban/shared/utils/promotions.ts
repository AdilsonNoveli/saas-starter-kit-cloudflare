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
  TipoPromocao,
  CatalogPromocao,
} from '#shared/types/promotion'

export interface ItemCalculo {
  produto_id: string
  preco: number
  quantidade: number
}

/**
 * Itens que participam de uma promoção — vínculo vazio (`produtoIds.size
 * === 0`) aplica a todos os itens passados. Antes reimplementado
 * separadamente em `server/utils/promotions/applyPromotions.ts` e
 * `app/stores/cart.ts` (mesmo filtro, cliente e servidor podiam divergir).
 */
export function resolverItensElegiveis(
  itens: readonly ItemCalculo[],
  produtoIds: ReadonlySet<string>,
): ItemCalculo[] {
  return produtoIds.size === 0
    ? [...itens]
    : itens.filter((i) => produtoIds.has(i.produto_id))
}

/**
 * Despacha para a calculadora certa conforme `tipo` — mesmo `if/else if`
 * antes duplicado em `applyPromotions.ts` (server) e `cart.ts` (client).
 * `destaque` não tem mecânica de desconto (banner informativo): sempre 0.
 */
export function calcularDescontoPorTipo(
  tipo: TipoPromocao,
  configuracao: unknown,
  itensElegiveis: ItemCalculo[],
  subtotalCarrinho: number,
): number {
  if (tipo === 'leve_pague') {
    return calcularLevePague(configuracao as LevePagueConfig, itensElegiveis)
  }
  if (tipo === 'progressivo') {
    return calcularProgressivo(configuracao as ProgressivoConfig, itensElegiveis)
  }
  if (tipo === 'desconto_carrinho') {
    return calcularDescontoCarrinho(configuracao as DescontoCarrinhoConfig, subtotalCarrinho)
  }
  return 0
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

// ---------------------------------------------------------------------------
// Melhor desconto entre promoções elegíveis (regra "vence o maior, não acumula")
// ---------------------------------------------------------------------------

export interface MelhorDesconto {
  readonly valor: number
  readonly nome: string
}

/**
 * Escolhe a promoção de MAIOR desconto entre as `promocoes` elegíveis para
 * `itens` — mesma regra usada em `applyPromotions.ts` (checkout). Fonte
 * única para os dois lugares do CLIENTE que precisavam desse cálculo
 * (carrinho em `app/stores/cart.ts` e preview na página de produto) — antes
 * cada um reimplementava o mesmo loop separadamente.
 */
export function calcularMelhorDesconto(
  promocoes: readonly CatalogPromocao[],
  itens: readonly ItemCalculo[],
  subtotalCarrinho: number,
): MelhorDesconto {
  let melhorDesconto = 0
  let melhorNome = ''

  for (const promo of promocoes) {
    if (promo.tipo === 'destaque') continue

    const produtoIds = new Set<string>(promo.promocao_produtos.map((p) => p.produto_id))
    const itensElegiveis = resolverItensElegiveis(itens, produtoIds)
    if (itensElegiveis.length === 0) continue

    const desconto = calcularDescontoPorTipo(promo.tipo, promo.configuracao, itensElegiveis, subtotalCarrinho)
    if (desconto > melhorDesconto) {
      melhorDesconto = desconto
      melhorNome = promo.nome
    }
  }

  const descontoFinal = Math.min(Math.max(0, melhorDesconto), subtotalCarrinho)
  return {
    valor: Math.round(descontoFinal * 100) / 100,
    nome: descontoFinal > 0 ? melhorNome : '',
  }
}

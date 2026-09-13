/**
 * Aplica promoções ativas a um pedido e retorna o maior desconto encontrado.
 *
 * Regras:
 *  - Apenas promoções ativas no momento da chamada (data_inicio/data_fim respeitados).
 *  - Cada promoção é calculada independentemente sobre os itens elegíveis.
 *  - Vence a promoção que gerar o MAIOR desconto (não acumula).
 *  - Desconto nunca é negativo nem superior ao subtotal do pedido.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { TipoPromocao, ProgressivoConfig, DescontoCarrinhoConfig, PromotionIncentive } from '#shared/types/promotion'
import {
  calcularDescontoPorTipo,
  calcularProximaFaixaProgressivo,
  calcularProximoDescontoCarrinho,
  resolverItensElegiveis,
  type ItemCalculo,
  type ProximoNivelIncentivo,
} from '#shared/utils/promotions'

export interface PedidoItem {
  produto_id: string
  quantidade: number
  preco_unitario: number
}

export interface ApplyPromotionsResult {
  descontoTotal: number
  descricao: string[]
  /** Próximo nível de desconto ainda não atingido (o mais perto de desbloquear). */
  incentive: PromotionIncentive | null
}

interface PromocaoProdutoRow {
  product_id: string
}

interface PromocaoRow {
  id: string
  name: string
  type: TipoPromocao
  config: unknown
  /** Produtos participantes embutidos via JOIN (evita N+1). */
  promotion_products: PromocaoProdutoRow[] | null
}

export async function applyPromotions(
  supabase: SupabaseClient<Database>,
  itens: PedidoItem[],
): Promise<ApplyPromotionsResult> {
  if (itens.length === 0) return { descontoTotal: 0, descricao: [], incentive: null }

  const now = new Date().toISOString()

  // 1. Promoções ativas agora — produtos participantes embutidos via JOIN
  //    (uma única query; elimina o N+1 que consultava promocao_produtos por promoção).
  const { data: promocoes, error } = await supabase
    .from('promotions')
    .select('id, name, type, config, promotion_products(product_id)')
    .eq('active', true)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)

  if (error || !promocoes || promocoes.length === 0) {
    return { descontoTotal: 0, descricao: [], incentive: null }
  }

  const subtotalPedido = itens.reduce((sum, i) => sum + i.preco_unitario * i.quantidade, 0)
  // Promo-independente — calculado uma vez e reaproveitado por `resolverItensElegiveis` a cada iteração.
  const itensCalculo: ItemCalculo[] = itens.map((i) => ({
    produto_id: i.produto_id,
    preco: i.preco_unitario,
    quantidade: i.quantidade,
  }))

  let melhorDesconto = 0
  let melhorNome = ''
  // Incentivo mostrado = o mais perto de desbloquear (maior progresso), qualquer que seja o tipo.
  let melhorIncentivo: PromotionIncentive | null = null
  let melhorProgresso = -1

  for (const promo of promocoes as PromocaoRow[]) {
    // 2. Produtos participantes desta promoção (já embutidos via JOIN)
    const produtosIds = new Set<string>(
      (promo.promotion_products ?? []).map((p) => p.product_id),
    )

    // Itens elegíveis (participam desta promoção)
    // Se a promoção não tem produtos vinculados → aplica sobre todos os itens
    const itensElegiveis = resolverItensElegiveis(itensCalculo, produtosIds)

    if (itensElegiveis.length === 0) continue

    // 3. Calcular desconto conforme tipo
    const desconto = calcularDescontoPorTipo(promo.type, promo.config, itensElegiveis, subtotalPedido)

    // 3b. Incentivo (próximo nível) — só progressivo e desconto_carrinho têm faixas.
    let proximo: ProximoNivelIncentivo | null = null
    let unidade: PromotionIncentive['unidade'] = 'itens'
    if (promo.type === 'progressivo') {
      proximo = calcularProximaFaixaProgressivo(promo.config as ProgressivoConfig, itensElegiveis)
      unidade = 'itens'
    } else if (promo.type === 'desconto_carrinho') {
      proximo = calcularProximoDescontoCarrinho(promo.config as DescontoCarrinhoConfig, subtotalPedido)
      unidade = 'reais'
    }

    // 4. Vence o maior desconto
    if (desconto > melhorDesconto) {
      melhorDesconto = desconto
      melhorNome = promo.name
    }

    // 4b. Vence o incentivo mais perto de desbloquear (maior progresso).
    if (proximo && proximo.progresso > melhorProgresso && (promo.type === 'progressivo' || promo.type === 'desconto_carrinho')) {
      melhorProgresso = proximo.progresso
      melhorIncentivo = {
        tipo: promo.type,
        faltam: proximo.faltam,
        unidade,
        desconto_percentual: proximo.descontoPercentual,
      }
    }
  }

  // Garante que o desconto não excede o subtotal
  const descontoFinal = Math.min(Math.max(0, melhorDesconto), subtotalPedido)

  return {
    descontoTotal: Math.round(descontoFinal * 100) / 100,
    descricao: descontoFinal > 0 ? [melhorNome] : [],
    incentive: melhorIncentivo,
  }
}

import type { PromotionConfig } from '#shared/types/store'

/**
 * Frete grátis por valor de carrinho (fulfillment da campanha configurada em
 * /admin/promotions → aba "Frete Grátis").
 *
 * Regra: quando a campanha está ativa (`habilitar_upsell_frete`) e o subtotal
 * de MERCADORIA atinge a meta (`meta_frete_gratis`), o frete é zerado. Caso
 * contrário, mantém o frete calculado (por distância / taxa padrão).
 *
 * O subtotal-base é o de mercadoria ANTES do desconto promocional de carrinho —
 * idêntico ao `totalPrice` exibido no carrinho/checkout —, para que a promessa
 * ("Faltam R$ X para o frete grátis") seja cumprida exatamente como anunciada.
 *
 * Fonte única desta regra: consumida por calculate-shipping (preview) e por todos
 * os endpoints de criação/edição de pedido.
 */
export function resolveDeliveryFee(params: {
  readonly distanceFee: number
  readonly merchandiseSubtotal: number
  readonly config: Partial<Pick<PromotionConfig, 'habilitar_upsell_frete' | 'meta_frete_gratis'>> | null | undefined
}): number {
  const cfg = params.config
  const meta = Number(cfg?.meta_frete_gratis ?? 0)

  if (cfg?.habilitar_upsell_frete && meta > 0 && params.merchandiseSubtotal >= meta) {
    return 0
  }
  return params.distanceFee
}

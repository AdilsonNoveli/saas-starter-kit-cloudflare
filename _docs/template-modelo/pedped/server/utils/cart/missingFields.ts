/**
 * Motor de pendências do checkout (Feature 2.2 — EPIC 2 PRD-REFATORACAO).
 *
 * Função pura: cruza os itens do carrinho (com os `requirements` do produto)
 * e o estado de checkout persistido para calcular, de forma determinística,
 * o que ainda falta coletar. `resolveNextAction` consome esta lista — o
 * modelo nunca decide isso sozinho.
 *
 * Ordem canônica do funil: item (dados por-produto) → modalidade → endereço
 * (se entrega) → pagamento. A primeira pendência da lista é a mais urgente.
 *
 * Resolução de nível (Feature 4.1 — EPIC 4): quando um item declara o próprio
 * `delivery_mode` (diverge do carrinho — ex.: pizza-retirada + bolo-entrega),
 * o endereço dele é resolvido e cobrado NO ITEM, não no pedido. Itens sem
 * override continuam herdando as pendências de nível pedido, como antes.
 */

import type {
  IntegrationCartItem,
  IntegrationCheckoutState,
  IntegrationMissingField,
} from '#shared/types/integration'
import type { ProductRequirements } from '#shared/types/preorder'

export function resolveMissingFields(
  items: readonly IntegrationCartItem[],
  requirementsByProduct: ReadonlyMap<string, ProductRequirements>,
  checkout: IntegrationCheckoutState,
): IntegrationMissingField[] {
  const missing: IntegrationMissingField[] = []

  for (const item of items) {
    const req = requirementsByProduct.get(item.produto_id)
    if (req?.requires_date && !item.target_date) {
      missing.push({
        scope: 'item',
        field: 'target_date',
        item_id: item.produto_id,
        prompt: `Data de entrega/retirada para ${item.nome}`,
      })
    }

    // Item com modalidade própria (diverge do pedido): resolve o endereço no
    // próprio item, sem esperar/duplicar a pendência de nível pedido.
    if (item.delivery_mode === 'entrega' && !(item.address_id ?? checkout.address_id)) {
      missing.push({
        scope: 'item',
        field: 'address_id',
        item_id: item.produto_id,
        prompt: `Endereço de entrega para ${item.nome}`,
      })
    }
  }

  if (!checkout.delivery_mode) {
    missing.push({ scope: 'order', field: 'delivery_mode', prompt: 'Modalidade de entrega (entrega ou retirada)' })
  }

  if (checkout.delivery_mode === 'entrega' && !checkout.address_id) {
    missing.push({ scope: 'order', field: 'address_id', prompt: 'Endereço de entrega' })
  }

  if (!checkout.payment_method) {
    missing.push({ scope: 'order', field: 'payment_method', prompt: 'Forma de pagamento' })
  }

  return missing
}

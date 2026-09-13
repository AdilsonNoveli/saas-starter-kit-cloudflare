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
import type { UploadArquivoRequirement } from '../products/uploadArquivoRequirements'
import type { TextoLivreRequirement } from '../products/textoLivreRequirements'

export function resolveMissingFields(
  items: readonly IntegrationCartItem[],
  requirementsByProduct: ReadonlyMap<string, ProductRequirements>,
  checkout: IntegrationCheckoutState,
  uploadRequirementsByProduct: ReadonlyMap<string, readonly UploadArquivoRequirement[]> = new Map(),
  textoLivreRequirementsByProduct: ReadonlyMap<string, readonly TextoLivreRequirement[]> = new Map(),
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

    // Grupo upload_arquivo (migration 127: SEMPRE exigido pelo TIPO do
    // grupo, nunca pelo flag `required` — texto_livre/upload_arquivo existem
    // para coletar dado de produção/personalização; silenciar isso por um
    // checkbox esquecido no cadastro é exatamente o bug de produção que gerou
    // esta migration. Funciona para QUALQUER produto, mesmo um cadastrado
    // depois desta migration, sem precisar de fix de dado nenhum.
    //
    // A arte chega numa mensagem SEPARADA do WhatsApp (imagem), processada de
    // forma assíncrona por `attachPendingArt.ts` — nunca dá para exigir no
    // mesmo tool call que adiciona o item ao carrinho, ao contrário de
    // texto_livre (que o modelo já tem em mãos na mesma mensagem). Por isso
    // essa exigência não bloqueia aqui, só entra como pendência (bloqueio
    // real é em `finalizeCheckout.ts`, que já rejeita qualquer `missing_fields`
    // scope='item' — mesmo padrão de `target_date`).
    for (const upload of uploadRequirementsByProduct.get(item.produto_id) ?? []) {
      const opcao = item.opcoes.find((o) => o.opcao_item_id === upload.opcaoItemId)
      // `deferred` (migration 127) = cliente já disse explicitamente "envio
      // depois" (botão "Enviar depois" no chat online, ou diferir:true no
      // WhatsApp) — para de cobrar aqui; o pedido pode fechar sem a arte
      // agora, e ela anexa depois via server/utils/orders/pendingOrderArt.ts.
      const satisfeito = !!opcao?.arquivo_url || opcao?.deferred === true
      if (!satisfeito) {
        missing.push({
          scope: 'item',
          field: 'arquivo_arte',
          item_id: item.produto_id,
          prompt: `Arquivo de arte ("${upload.grupoNome}") para ${item.nome} — peça ao cliente para enviar como imagem pelo WhatsApp`,
        })
      }
    }

    // Grupo texto_livre (migration 127 — mesmo raciocínio "sempre pelo TIPO"
    // do upload_arquivo acima, ver docblock): não bloqueia DefinirItemCarrinho
    // (setCartItem.ts deixa o item entrar sem o texto), só vira pendência
    // aqui; o bloqueio real também é em finalizeCheckout.ts, mesmo padrão de
    // arquivo_arte.
    for (const texto of textoLivreRequirementsByProduct.get(item.produto_id) ?? []) {
      const satisfeito = item.opcoes.some((o) => o.opcao_item_id === texto.opcaoItemId && !!o.valor_texto)
      if (!satisfeito) {
        missing.push({
          scope: 'item',
          field: 'texto_personalizacao',
          item_id: item.produto_id,
          prompt: `"${texto.grupoNome}" para ${item.nome} — pergunte ao cliente o texto (ou registre "Sem nome" se ele não quiser personalizar)`,
        })
      }
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

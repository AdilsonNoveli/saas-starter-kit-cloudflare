/**
 * `ConsultarEnderecoEntrega` — porte literal do node n8n `httpRequestTool`
 * de mesmo nome. Chama `geocodeAddress` diretamente em vez de
 * `GET /api/maps/geocode` (seção 6). A taxa cotada usa o subtotal REAL do
 * carrinho da sessão (mesmo comportamento de `maps/geocode.get.ts` quando
 * recebe `sessao_id`) — sem isso, a promoção de frete grátis por valor nunca
 * seria considerada nesta cotação.
 */
import { z } from 'zod'
import { geocodeAddress } from '../../maps/geocodeAddress'
import { getCartState } from '../../cart/state'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  address: z.string().min(1).describe('endereco como o cliente escreveu: rua, numero, bairro, cidade'),
})

/** Subtotal real do carrinho da sessão, ou 0 se indisponível (fail-safe — mesma regra de `maps/geocode.get.ts`). */
async function resolveMerchandiseSubtotal(ctx: { supabase: Parameters<typeof getCartState>[0]; sessaoId: string }): Promise<number> {
  try {
    const cart = await getCartState(ctx.supabase, ctx.sessaoId)
    return cart.subtotal
  } catch {
    return 0
  }
}

export const consultarEnderecoEntregaTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'ConsultarEnderecoEntrega',
  description: 'Valida um endereco E a cobertura de entrega da loja, com a taxa JA considerando o carrinho atual (frete gratis por valor, se a promocao estiver ativa). OBRIGATORIA sempre que o cliente escrever um endereco NOVO, mesmo incompleto (ex: \'Rua Chile 79 Itapecerica\'). Chame IMEDIATAMENTE, sem pedir CEP, bairro ou UF antes — a tool descobre isso. NAO chame se o cliente aceitou um endereco ja salvo (nesse caso use o endereco_id do briefing). PARAMETRO: address = o endereco exatamente como o cliente escreveu. RETORNA: rua, numero, bairro, cidade, uf, cep, latitude, longitude, dentro_do_raio (boolean), distancia_km, taxa_entrega e mensagem_raio. REGRAS OBRIGATORIAS DE LEITURA DO RETORNO: (a) se dentro_do_raio = false, a loja NAO entrega nesse endereco — diga isso ao cliente e ofereca RETIRADA; nunca finalize com delivery_mode=entrega; (b) se dentro_do_raio = true, informe a taxa_entrega ao cliente ANTES de pedir a confirmacao final, usando exatamente o valor retornado (nunca estime frete); (c) IMEDIATAMENTE em seguida, NO MESMO TURNO, chame AtualizarPedido com rua, numero, bairro, cidade, latitude e longitude retornados aqui (o parametro estado de AtualizarPedido recebe o uf retornado aqui) para SALVAR o endereco — nunca deixe para o proximo turno, voce nao vai lembrar destes valores depois; so apos AtualizarPedido confirmar e que o endereco conta para o pedido. Se nao encontrar o endereco, peca a rua completa com numero ou um ponto de referencia e tente mais uma vez.',
  schema,
  async run(args, ctx) {
    const merchandiseSubtotal = await resolveMerchandiseSubtotal(ctx)
    return geocodeAddress(ctx.googleMapsServerKey, ctx.supabase, args.address, merchandiseSubtotal)
  },
}

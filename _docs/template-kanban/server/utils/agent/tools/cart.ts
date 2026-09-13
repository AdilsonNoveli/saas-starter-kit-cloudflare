/**
 * `DefinirItemCarrinho` — porte literal do node n8n `httpRequestTool` de
 * mesmo nome. Chama `setCartItem` diretamente em vez de
 * `PUT /api/integration/v1/cart/items` (seção 6). `sessao_id` nunca vem do
 * modelo — é o `sessaoId` do turno, resolvido pelo consumer.
 */
import { z } from 'zod'
import { setCartItem } from '../../cart/setCartItem'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  produto_id: z.string().uuid().describe('UUID do produto retornado por BuscarProdutos'),
  quantidade: z.number().int().min(0).describe('quantidade exata do item; 0 remove o item'),
  target_date: z.string().optional()
    .describe('data de entrega/retirada YYYY-MM-DD para produto de encomenda, validada em ConsultarDatasEncomenda (vazio para pronta entrega)'),
  observacao: z.string().optional()
    .describe('observacao do cliente para este item, ex: sem cebola (vazio se nenhuma)'),
  delivery_mode: z.enum(['entrega', 'retirada']).optional()
    .describe('entrega ou retirada SÓ deste item, se diferente do resto do pedido (vazio na maioria dos casos)'),
  address_id: z.string().uuid().optional()
    .describe('UUID de endereco ja salvo, SÓ deste item, se diferente do resto do pedido (vazio na maioria dos casos)'),
  opcoes: z.array(z.object({
    opcao_item_id: z.string().uuid(),
    valor_texto: z.string().max(2000).optional()
      .describe('SÓ para opcao_item_id de grupo tipo texto_livre: o texto exato que o cliente pediu (ex: nome para gravar), ou "Sem nome" se o cliente disser que não quer personalizar. Vazio para os demais tipos.'),
    diferir: z.boolean().optional()
      .describe('SÓ para opcao_item_id de grupo tipo upload_arquivo: true quando o cliente disser que vai mandar a arte depois (ex: "manda depois", "não tenho agora") — grava a intenção sem exigir o arquivo agora, o pedido pode fechar mesmo assim. NUNCA invente nem informe arquivo_url. Vazio nos demais casos.'),
  })).optional()
    .describe('opcoes escolhidas (borda, sabor, tamanho, cor, texto livre...), vindas de ConsultarOpcoesProduto — nome/preco nunca vêm daqui (o servidor releva). Inclua so os opcao_item_id dos grupos "orientacao.modo=ask_customer" ja respondidos pelo cliente, MAIS qualquer texto_livre/upload_arquivo que o cliente já tenha resolvido (valor_texto ou diferir — ver ConsultarOpcoesProduto, esses dois tipos não aparecem em "orientacao" mas seguem em "grupos"); NUNCA inclua grupo "automatic" (o servidor resolve sozinho, mesmo sem nada aqui); vazio para produto sem opcao ou quando todos os grupos forem automatic.'),
  cart_item_id: z.string().uuid().optional()
    .describe('UUID de uma linha JA existente do carrinho (do retorno desta tool ou do BRIEFING) — use para reduzir quantidade ou remover (quantidade=0) um item COM opcoes sem precisar informar as opcoes de novo. Vazio na maioria dos casos.'),
})

export const definirItemCarrinhoTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'DefinirItemCarrinho',
  description: 'Define a quantidade EXATA de um produto no carrinho — pronta entrega e encomenda igual, sem distincao: cria o item se ainda nao existir, atualiza se ja existir, remove usando quantidade=0. PRE-REQUISITO: o produto_id deve ter vindo de BuscarProdutos nesta conversa. PARAMETROS: produto_id (UUID), quantidade (inteiro >= 0); target_date (YYYY-MM-DD, obrigatorio para produto de encomenda — vem de ConsultarDatasEncomenda, status \'available\'); observacao opcional (texto livre do cliente para este item, ex: sem cebola, quando o produto NAO tem grupo de opcao pra isso); delivery_mode/address_id OPCIONAIS — preencha SÓ quando este item especifico tiver entrega/retirada DIFERENTE do resto do pedido (ex: pizza retirada + bolo entrega no mesmo carrinho); na maioria dos casos deixe os dois vazios, o item herda a modalidade do pedido (AtualizarPedido). opcoes: se BuscarProdutos retornou tem_opcoes=true para este produto, chame ConsultarOpcoesProduto ANTES e passe aqui os opcao_item_id escolhidos — grupo obrigatorio tipo single/multiple/toggle SEMPRE precisa de uma escolha, senao a tool devolve erro 422 explicando o que falta. Grupo texto_livre (ex: "Nome/Número na Camisa") e upload_arquivo (ex: arte) NUNCA bloqueiam esta chamada (o campo obrigatorio nao se aplica a esses dois tipos) — chame esta tool assim que souber produto e quantidade, sem esperar personalizacao/arte; o item entra no carrinho igual, e a pendencia aparece em missing_fields (bloqueia so no FinalizarPedido). Voce NAO decide quando perguntar sobre isso ao cliente — o >>> PROXIMO PASSO OBRIGATORIO do briefing traz a pergunta pronta (codigo ASK_ITEM_TEXT/ASK_ITEM_ART) no momento certo; quando ele mandar, resolva com um DefinirItemCarrinho seguinte informando valor_texto (ou "Sem nome" se o cliente recusar personalizar) — NUNCA invente nem informe arquivo_url para upload_arquivo; se o cliente disser que vai mandar a arte depois, use diferir:true nesse opcao_item_id em vez de insistir; senao peca pra mandar a arte como IMAGEM pelo proprio WhatsApp, o sistema anexa sozinho quando a imagem chegar (inclusive depois do pedido ja fechado, se diferir:true foi usado). Duas combinacoes de opcao do MESMO produto viram DUAS linhas do carrinho (ex: uma pizza sem cebola e outra com borda). cart_item_id: para reduzir/remover um item com opcoes ja no carrinho, use o id da linha (retornado por esta tool) em vez de repetir as opcoes de memoria. RETORNA o carrinho completo com totais, incluindo missing_fields — confira ali se ainda falta nome/arte antes de considerar o pedido pronto para FinalizarPedido.',
  schema,
  async run(args, ctx) {
    return setCartItem(ctx.supabase, {
      sessao_id: ctx.sessaoId,
      produto_id: args.produto_id,
      quantidade: args.quantidade,
      target_date: args.target_date,
      observacao: args.observacao,
      delivery_mode: args.delivery_mode,
      address_id: args.address_id,
      opcoes: args.opcoes,
      cart_item_id: args.cart_item_id,
    })
  },
}

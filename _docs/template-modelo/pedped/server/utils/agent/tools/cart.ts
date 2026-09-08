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
  opcoes: z.array(z.object({ opcao_item_id: z.string().uuid() })).optional()
    .describe('opcoes escolhidas (borda, sabor, tamanho, cor...), vindas de ConsultarOpcoesProduto — SÓ opcao_item_id, nunca nome/preco (o servidor releva). Obrigatorio quando o produto tem grupo obrigatorio; vazio para produto sem opcao.'),
  cart_item_id: z.string().uuid().optional()
    .describe('UUID de uma linha JA existente do carrinho (do retorno desta tool ou do BRIEFING) — use para reduzir quantidade ou remover (quantidade=0) um item COM opcoes sem precisar informar as opcoes de novo. Vazio na maioria dos casos.'),
})

export const definirItemCarrinhoTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'DefinirItemCarrinho',
  description: 'Define a quantidade EXATA de um produto no carrinho — pronta entrega e encomenda igual, sem distincao: cria o item se ainda nao existir, atualiza se ja existir, remove usando quantidade=0. PRE-REQUISITO: o produto_id deve ter vindo de BuscarProdutos nesta conversa. PARAMETROS: produto_id (UUID), quantidade (inteiro >= 0); target_date (YYYY-MM-DD, obrigatorio para produto de encomenda — vem de ConsultarDatasEncomenda, status \'available\'); observacao opcional (texto livre do cliente para este item, ex: sem cebola, quando o produto NAO tem grupo de opcao pra isso); delivery_mode/address_id OPCIONAIS — preencha SÓ quando este item especifico tiver entrega/retirada DIFERENTE do resto do pedido (ex: pizza retirada + bolo entrega no mesmo carrinho); na maioria dos casos deixe os dois vazios, o item herda a modalidade do pedido (AtualizarPedido). opcoes: se BuscarProdutos retornou tem_opcoes=true para este produto, chame ConsultarOpcoesProduto ANTES e passe aqui os opcao_item_id escolhidos — grupo obrigatorio SEMPRE precisa de uma escolha, senao a tool devolve erro 422 explicando qual grupo falta. Duas combinacoes de opcao do MESMO produto viram DUAS linhas do carrinho (ex: uma pizza sem cebola e outra com borda). cart_item_id: para reduzir/remover um item com opcoes ja no carrinho, use o id da linha (retornado por esta tool) em vez de repetir as opcoes de memoria. RETORNA o carrinho completo com totais.',
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

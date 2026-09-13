/**
 * `BuscarProdutos` — porte literal do node n8n `httpRequestTool` de mesmo
 * nome (`_docs/implementar/Pedped whatsapp v3.json`). Chama `searchProducts` diretamente
 * em vez do endpoint HTTP `/api/integration/v1/products` (seção 6).
 */
import { z } from 'zod'
import { searchProducts } from '../../products/searchProducts'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  q: z.string().min(1).describe('termo curto do produto, 1 a 3 palavras (ex: calabresa, esfiha nutella)'),
  product_type: z.enum(['stock', 'preorder']).optional()
    .describe('stock para pronta entrega, preorder para encomenda, ou deixe vazio se o cliente nao especificou'),
})

export const buscarProdutosTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'BuscarProdutos',
  description: 'USE SEMPRE que o cliente citar um item, sabor ou categoria ESPECIFICA, ou perguntar o preco de algo pontual. E a UNICA fonte de nomes, precos e ids de produto — voce nao conhece o cardapio. Para pedido GENERICO/navegacao livre (cliente nao citou item nenhum, so quer ver o que tem) prefira EnviarBotaoCatalogo em vez desta tool. PARAMETROS: q = termo curto do produto (ex: \'calabresa\', \'esfiha\', \'bolo\'), nunca a frase inteira do cliente; product_type e OPCIONAL — deixe vazio na duvida (busca todos os tipos); so preencha \'stock\' ou \'preorder\' quando o cliente EXPLICITAMENTE disser pronta entrega ou encomenda/agendar/data futura. RETORNA: id (use este UUID nas outras tools NESTE MESMO TURNO — id de um turno anterior nao e confiavel, busque de novo), nome, preco, product_type, tipo_venda_label, tem_opcoes. min_quantity/max_quantity/min_lead_days SO existem dentro de um campo "preorder", e SO para product_type=\'preorder\' (encomenda) — produto de pronta entrega (stock) NAO tem esse campo, ou seja NAO TEM limite de quantidade nenhum: nunca informe um maximo/minimo pra um produto que nao trouxe "preorder" no retorno, isso e inventar dado (proibido pela REGRA 1). quantidade_disponivel: numero de unidades restantes AGORA, ou null quando o produto nao tem controle de estoque (a maioria). So cite um limite/indisponibilidade quando este campo vier como numero — null significa NENHUM limite, nunca invente um (proibido pela REGRA 1). Se vier vazio, diga que nao encontrou e pergunte outro termo — nao invente substitutos. Se um produto vier com \'relacionados\', ofereca esses itens como sugestao (venda casada) so depois de confirmar o principal; se nao vier, nao ofereca nada.',
  schema,
  async run(args, ctx) {
    return searchProducts(ctx.supabase, {
      q: args.q,
      limit: 10,
      offset: 0,
      product_type: args.product_type,
    })
  },
}

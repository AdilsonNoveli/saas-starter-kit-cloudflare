/**
 * `ConsultarOpcoesProduto` — nova tool (migration 110). Sem correspondente no
 * n8n: o carrinho do agente nunca teve suporte a grupos de opção/variação de
 * produto (borda recheada, "sem cebola", tamanho, cor...) até aqui, embora o
 * catálogo web e o PDV admin já usassem `produto_opcao_grupo`/
 * `produto_opcao_item` havia muito tempo. Ver `getProductOptions.ts`.
 */
import { z } from 'zod'
import { getProductOptions } from '../../products/getProductOptions'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  produto_id: z.string().uuid().describe('UUID do produto retornado por BuscarProdutos, com tem_opcoes=true'),
})

export const consultarOpcoesProdutoTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'ConsultarOpcoesProduto',
  description: 'Consulta os grupos de opcao/variacao de um produto — ex: borda recheada de pizza, remover ingrediente ("sem cebola"), tamanho, cor. USE sempre que o cliente escolher um produto que BuscarProdutos retornou com tem_opcoes=true, ANTES de chamar DefinirItemCarrinho — nunca adivinhe opcao obrigatoria nem assuma que o cliente nao quer nenhuma. PARAMETROS: produto_id (UUID de BuscarProdutos). RETORNA uma lista de grupos, cada um com nome, tipo (single=escolha 1, multiple=varias, toggle=liga/desliga), obrigatorio, min_selecoes, max_selecoes, e os itens (nome, preco_delta, id). Grupo obrigatorio=true SEMPRE precisa de uma escolha do cliente antes de adicionar ao carrinho; grupo opcional pode ser oferecido e seguir sem resposta se o cliente nao quiser. Passe os opcao_item_id escolhidos para DefinirItemCarrinho no parametro opcoes. Produto sem nenhum grupo (lista vazia) nao tem nada a perguntar.',
  schema,
  async run(args, ctx) {
    const grupos = await getProductOptions(ctx.supabase, args.produto_id)
    return { produto_id: args.produto_id, grupos }
  },
}

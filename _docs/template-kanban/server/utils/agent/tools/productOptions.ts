/**
 * `ConsultarOpcoesProduto` — nova tool (migration 110). Sem correspondente no
 * n8n: o carrinho do agente nunca teve suporte a grupos de opção/variação de
 * produto (borda recheada, "sem cebola", tamanho, cor...) até aqui, embora o
 * catálogo web e o PDV admin já usassem `produto_opcao_grupo`/
 * `produto_opcao_item` havia muito tempo. Ver `getProductOptions.ts`.
 */
import { z } from 'zod'
import { getProductOptions } from '../../products/getProductOptions'
import { resolveOptionGroupChoice, type OptionGroupResolution } from '../../products/resolveOptionGroupChoice'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  produto_id: z.string().uuid().describe('UUID do produto retornado por BuscarProdutos, com tem_opcoes=true'),
})

export const consultarOpcoesProdutoTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'ConsultarOpcoesProduto',
  description: 'Consulta os grupos de opcao/variacao de um produto — ex: borda recheada de pizza, remover ingrediente ("sem cebola"), tamanho, cor, texto personalizado, upload de arte. USE sempre que o cliente escolher um produto que BuscarProdutos retornou com tem_opcoes=true, ANTES de chamar DefinirItemCarrinho — nunca adivinhe opcao obrigatoria nem assuma que o cliente nao quer nenhuma. PARAMETROS: produto_id (UUID de BuscarProdutos). RETORNA "grupos" (detalhe completo, nome/tipo/itens/precos) e "orientacao" (o que FAZER com cada grupo tipo single/multiple/toggle — CALCULADO PELO SISTEMA, siga sem recalcular): campo "modo" e "automatic" = grupo ja resolvido sozinho, NAO pergunte nada sobre ele nem inclua no parametro opcoes de DefinirItemCarrinho; "ask_customer" = pergunte exatamente entre os itens de "askableItems" (no maximo 3 por vez) e so chame DefinirItemCarrinho depois que TODOS os grupos "ask_customer" tiverem resposta; "invalid_catalog" = nao pergunte nada ao cliente sobre esse grupo, e um problema de cadastro do produto (erro tecnico, nao de negocio). Passe em DefinirItemCarrinho, no parametro opcoes, so os opcao_item_id dos grupos "ask_customer" respondidos — nunca nome nem preco (o sistema releva os valores reais), e nunca de grupos "automatic" (o sistema ja resolve sozinho). Grupos tipo texto_livre/upload_arquivo NAO aparecem em "orientacao" — CONFIRA SEMPRE em "grupos" mesmo assim, passam batido se voce olhar so "orientacao". DIFERENTE de "ask_customer", os dois NUNCA bloqueiam DefinirItemCarrinho: chame a tool assim que souber produto e quantidade, sem esperar personalizacao/arte. Voce NAO decide quando perguntar sobre eles — o >>> PROXIMO PASSO OBRIGATORIO do briefing traz isso pronto (codigo ASK_ITEM_TEXT ou ASK_ITEM_ART) no momento certo, numa mensagem propria; so execute a pergunta exata que ele trouxer. Quando for a vez de perguntar: texto_livre = pergunte ao cliente o texto (respeite texto_max_caracteres se vier preenchido; use texto_placeholder como exemplo do que perguntar) e passe opcao_item_id + valor_texto para DefinirItemCarrinho — se o cliente disser que nao quer personalizar, use valor_texto="Sem nome". upload_arquivo = peca ao cliente para mandar a arte/logo como IMAGEM (foto) pelo proprio WhatsApp — NUNCA invente nem informe arquivo_url para DefinirItemCarrinho; se o cliente disser que vai mandar depois, passe opcao_item_id + diferir:true em vez de insistir. Produto sem nenhum grupo (lista vazia) nao tem nada a perguntar.',
  schema,
  async run(args, ctx) {
    const grupos = await getProductOptions(ctx.supabase, args.produto_id)
    const orientacao = grupos
      .map((grupo) => resolveOptionGroupChoice(grupo))
      .filter((resolucao): resolucao is OptionGroupResolution => resolucao !== null)
    return { produto_id: args.produto_id, grupos, orientacao }
  },
}

/**
 * `EnviarBotaoCatalogo` — porte literal do node n8n `httpRequestTool` de
 * mesmo nome, estendido para oferecer DOIS caminhos (Catálogo + Compra
 * Expressa) numa mensagem só, com botões de resposta rápida (feature nova
 * — antes eram duas mensagens `cta_url` separadas, uma por botão, porque a
 * Cloud API não aceita dois links na mesma mensagem). O envio passa por
 * `ctx.sendChoiceButtons`, injetado por quem monta o `AgentToolContext`
 * (consumer da fila, passo 6 da seção 12) — `agent/*` nunca importa
 * `whatsapp/*` (separação de camadas, seção 7/11). Quando o cliente toca um
 * dos botões, `handleButtonReply.ts` resolve o link de verdade — fora desta
 * tool, sem passar pelo agente/IA.
 */
import { z } from 'zod'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  body: z.string().optional()
    .describe('texto curto acima do botao (ex: Toque para ver tudo que a gente tem)'),
})

export const enviarBotaoCatalogoTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'EnviarBotaoCatalogo',
  description: 'Envia UMA mensagem no WhatsApp com dois botoes lado a lado: "Ver os Itens" (catalogo digital) e "Compra Rapida" (fechar o pedido conversando com voce mesmo, sem sair do WhatsApp para navegar) — as duas opcoes ficam disponiveis, o cliente escolhe tocando. USE de preferencia — antes de tentar adivinhar por chat — sempre que o cliente pedir o cardapio/menu/portfolio completo, quiser navegar sozinho, ou tiver intencao GENERICA sem citar item/sabor especifico (ex: "quero ver os produtos", "o que voces tem"): navegar pela lista completa converte muito mais que um Q&A em texto. Nao use para responder duvida sobre um item JA citado pelo nome (use BuscarProdutos). Depois de chamar esta tool, responda normalmente com uma frase curta (ex: \'Segue tudo que a gente tem, e se preferir e so tocar em Compra Rapida que eu mesmo fecho seu pedido!\') — nao repita o link nem a palavra "catalogo", os botoes ja foram enviados por esta tool.',
  schema,
  async run(args, ctx) {
    // Agnostico de segmento: nunca "catalogo" no texto que o cliente ve — o
    // nome da tool e interno. Uma mensagem so, com os dois botoes lado a lado
    // (sem migration de schema) — nenhuma opcao substitui a outra, o cliente escolhe.
    const body = args.body || 'Toque para ver tudo que a gente tem, ou pra fechar o pedido comigo agora mesmo:'
    await ctx.sendChoiceButtons({ body })
    return { success: true }
  },
}

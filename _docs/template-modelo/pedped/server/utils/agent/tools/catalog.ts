/**
 * `EnviarBotaoCatalogo` — porte literal do node n8n `httpRequestTool` de
 * mesmo nome. O n8n chamava `POST <provedor>/messages/send/cta`
 * direto; aqui o envio passa por `ctx.sendCatalogButton`, injetado por quem
 * monta o `AgentToolContext` (consumer da fila, passo 6 da seção 12) —
 * `agent/*` nunca importa `whatsapp/*` (separação de camadas, seção 7/11).
 */
import { z } from 'zod'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  body: z.string().optional()
    .describe('texto curto acima do botao (ex: Toque para ver tudo que a gente tem)'),
})

export const enviarBotaoCatalogoTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'EnviarBotaoCatalogo',
  description: 'Envia uma mensagem no WhatsApp com o botao para o cliente ver todos os itens da loja (catalogo digital). USE de preferencia — antes de tentar adivinhar por chat — sempre que o cliente pedir o cardapio/menu/portfolio completo, quiser navegar sozinho, ou tiver intencao GENERICA sem citar item/sabor especifico (ex: "quero ver os produtos", "o que voces tem"): navegar pela lista completa converte muito mais que um Q&A em texto. Nao use para responder duvida sobre um item JA citado pelo nome (use BuscarProdutos). Depois de chamar esta tool, responda normalmente com uma frase curta (ex: \'Segue tudo que a gente tem, e so tocar no botao!\') — nao repita o link nem a palavra "catalogo", o botao ja foi enviado por esta tool.',
  schema,
  async run(args, ctx) {
    // Agnostico de segmento: nunca "catalogo" no texto que o cliente ve — o
    // nome da tool e interno, o botao (cloudApiClient.ts) ja diz "Ver todos os itens".
    await ctx.sendCatalogButton({ body: args.body || 'Toque para ver tudo que a gente tem:' })
    return { success: true }
  },
}

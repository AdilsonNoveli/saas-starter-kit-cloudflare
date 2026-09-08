/**
 * `AtualizarContexto` — porte literal do node n8n `httpRequestTool` de mesmo
 * nome. Chama `updateCustomerContext` diretamente em vez de
 * `PATCH /api/integration/v1/customers/context` (seção 6).
 */
import { z } from 'zod'
import { createError } from 'h3'
import { updateCustomerContext } from '../../customers/updateCustomerContext'
import { recordPreferenceObservations } from '../customerIntelligence'
import { PREFERENCE_KEYS, PREFERENCE_VALUE_MAX } from '#shared/utils/customerPreferences'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  preferencias: z.string().optional()
    .describe('texto completo atualizado das preferencias duraveis (preserve o atual + a novidade; vazio se nao mudou)'),
  // Vocabulário FECHADO (§8 de `_docs/REVENUE/study.md`): a chave vem de um enum
  // conhecido, nunca do modelo. É o que impede texto do cliente de virar linha
  // do system prompt — a SKILL é renderizada por template nosso, e este campo é
  // só o valor dentro de uma linha que nós escrevemos.
  observacoes: z.array(z.object({
    chave: z.enum(PREFERENCE_KEYS)
      .describe('allergy (ALERGIA, so quando o cliente declarar), dietary_restriction, ingredient_exclusion (nao gosta/tirar), ingredient_preference (gosta), product_preference, delivery_note, payment_preference, contact_preference'),
    valor: z.string().max(PREFERENCE_VALUE_MAX)
      .describe('fato curto e literal, ex: "sem cebola", "massa fina", "deixar na portaria"'),
  })).max(5).optional()
    .describe('preferencias DURAVEIS observadas nesta conversa, uma por chave. So inclua o que o cliente afirmou de verdade; nunca deduza.'),
  contexto_resumo: z.string().optional()
    .describe('resumo curto de quem e o cliente (vazio se nao mudou)'),
  canal_preferido: z.enum(['catalogo', 'chat', 'misto']).optional()
    .describe('catalogo, chat ou misto (vazio se nao mudou)'),
  nota_interna: z.string().optional()
    .describe('nota interna para o lojista, ex: motivo da desistencia de compra (vazio se nao ha)'),
})

export const atualizarContextoTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'AtualizarContexto',
  description: 'Salva memoria DURAVEL do cliente (restricao alimentar, sabor favorito, observacao fixa de entrega, canal preferido). Use no maximo uma vez por conversa e apenas quando houver novidade clara. NUNCA use para dados do pedido atual (produto, data, endereco, pagamento). Voce PODE anexar nota_interna: uma nota curta para o LOJISTA (ex: cliente desistiu de X por Y). Nunca sobrescreve, so acrescenta.',
  schema,
  async run(args, ctx) {
    if (!ctx.clienteId) {
      throw createError({ statusCode: 422, statusMessage: 'Cliente não identificado — não é possível salvar contexto.' })
    }

    // Preferência estruturada é best-effort e NÃO derruba a tool: o texto livre
    // continua sendo o retorno que o modelo lê, e falhar em gravar um fato
    // derivado não pode custar o turno ao cliente.
    if (args.observacoes?.length) {
      await recordPreferenceObservations(
        ctx.supabase,
        ctx.clienteId,
        args.observacoes.map((o) => ({ key: o.chave, value: o.valor })),
        new Date(),
      )
    }

    return updateCustomerContext(ctx.supabase, {
      cliente_id: ctx.clienteId,
      preferencias: args.preferencias,
      contexto_resumo: args.contexto_resumo,
      canal_preferido: args.canal_preferido,
      nota_interna: args.nota_interna,
    })
  },
}

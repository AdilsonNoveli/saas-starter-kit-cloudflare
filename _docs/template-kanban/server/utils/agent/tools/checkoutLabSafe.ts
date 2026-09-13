/**
 * `FinalizarPedido` lab-safe — exclusiva do laboratório de avaliação
 * (`_docs/implementar/prd-laboratorio-avaliacao-agente.md` §2.3/§5.4/§6).
 * MESMO `name`/`description`/`schema` da tool real (`checkout.ts`) — só o
 * `run` muda, chamando `finalizeCheckoutLabSafe` em vez de `finalizeCheckout`.
 * O runner do laboratório substitui `finalizarPedidoTool` por esta entrada na
 * lista de tools ativas (`buildLabAgentTools`, `toolRegistry.ts`).
 */
import { finalizeCheckoutLabSafe } from '../../integration/finalizeCheckoutLabSafe'
import type { AgentToolDefinition } from '../toolContext'
import { finalizarPedidoSchema, FINALIZAR_PEDIDO_DESCRIPTION } from './checkout'

export const finalizarPedidoToolLabSafe: AgentToolDefinition<Record<string, never>> = {
  name: 'FinalizarPedido',
  description: FINALIZAR_PEDIDO_DESCRIPTION,
  schema: finalizarPedidoSchema,
  async run(_args, ctx) {
    const { response } = await finalizeCheckoutLabSafe(ctx.supabase, {
      sessao_id: ctx.sessaoId,
      idempotencyKey: `lab-${ctx.sessaoId}`,
    })
    return response
  },
}

/**
 * Decodifica `agente_uso_tokens.tool_trace` (jsonb, migration 106 —
 * `[{name, args, result}]`, gravado por `whatsapp-queue.ts` para o juiz de
 * produção auditar retorno tool-grounded). O Chat reaproveita o MESMO dado
 * só para exibir ao staff quais tools o agente chamou num turno (ícone
 * `ToolCase` abaixo do balão, `ChatMessageBubble.vue`) — nunca `args`/`result`
 * (informação de auditoria interna, não de UI).
 *
 * `tool_trace` é jsonb sem schema garantido pelo Postgres: validado com Zod,
 * nunca lança em dado malformado ou de turno anterior à migration 106
 * (`NULL`) — devolve lista vazia nesses casos.
 */
import { z } from 'zod'

const toolTraceEntrySchema = z.object({ name: z.string() }).passthrough()
const toolTraceSchema = z.array(toolTraceEntrySchema)

export function extractToolNames(toolTrace: unknown): readonly string[] {
  const parsed = toolTraceSchema.safeParse(toolTrace)
  if (!parsed.success) return []
  return [...new Set(parsed.data.map((entry) => entry.name))]
}

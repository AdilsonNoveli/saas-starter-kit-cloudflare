/**
 * `dispatchWebhook` — adaptador fino de `dispatchWebhookCore` para rotas
 * HTTP: deriva `supabase` do `event` e garante que o drain
 * em background sobrevive ao fim da resposta em runtimes serverless.
 *
 * Separado de `dispatch.ts` (seção 5 da arquitetura do agente WhatsApp): só
 * este arquivo importa `#supabase/server`/`H3Event`, para que chamadores do
 * núcleo (`dispatchWebhookCore`) fora de rota HTTP — como `finalizeCheckout`,
 * usado por uma tool do agente sem `H3Event` — não arrastem esse alias para
 * o grafo de módulos.
 *
 * Uso:
 *   await dispatchWebhook(event, 'pedido.criado', payload)
 */
import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { WebhookEvent } from '#shared/types/webhook'
import { dispatchWebhookCore, type DispatchResult } from './dispatch'

export async function dispatchWebhook(
  event: H3Event,
  evento: WebhookEvent | string,
  payload: Record<string, unknown>,
): Promise<DispatchResult> {
  const supabase = serverSupabaseServiceRole(event)

  const { drain, ...result } = await dispatchWebhookCore(supabase, evento, payload)

  // CRÍTICO p/ Cloudflare Workers: ao enviar a resposta, o runtime encerra o
  // contexto e CANCELA promises pendentes — fire-and-forget puro morre e o
  // webhook nunca sai (por isso funcionava no localhost/Node, onde o processo
  // fica vivo, mas não no Worker). `event.context.waitUntil` (injetado pelo
  // preset cloudflare do Nitro) mantém o Worker vivo até o drain terminar
  // (até ~30s após a resposta). No Node/Docker é `undefined` e o drain roda
  // normalmente porque o processo permanece ativo.
  // Docs: https://developers.cloudflare.com/workers/runtime-apis/context/
  if (drain) {
    const waitUntil = (event.context as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil
    if (typeof waitUntil === 'function') {
      waitUntil(drain)
    } else {
      void drain
    }
  }

  return result
}

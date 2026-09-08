/**
 * `dispatchWebhookCore` — caminho ÚNICO de disparo de webhook (DRY).
 *
 * Em vez de fazer `fire-and-forget $fetch`, persiste o evento em
 * `webhook_outbox` (Transactional Outbox). Um worker drena a fila com
 * retry/backoff/idempotência (3.6). Garante zero perda mesmo se o destino
 * estiver fora do ar quando o pedido for criado.
 *
 * Núcleo sem `H3Event`/`#supabase/server` de propósito (agente WhatsApp —
 * seção 5 da arquitetura do agente): o adaptador HTTP fino que deriva
 * `supabase`/credenciais de um `event` vive em `dispatchHttp.ts`. Manter
 * os dois no mesmo módulo faria qualquer import de `dispatchWebhookCore`
 * (ex.: `finalizeCheckout`, chamado por uma tool do agente sem `H3Event`)
 * arrastar `#supabase/server` para o grafo de módulos, o que quebra fora de
 * uma rota HTTP real (o alias só resolve dentro do runtime Nuxt/Nitro).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { WebhookEvent } from '#shared/types/webhook'
import type { Json } from '~/types/database.types'
import { getCachedWebhookContext } from './cache'
import { drainWebhookOutbox } from './worker'

export interface DispatchResult {
  ok: boolean
  eventId?: string
  /** `inativo`: configurado, mas desligado pela loja (migration 103). */
  reason?: 'no_url' | 'inativo' | 'db_error'
  error?: string
}

interface CoreDispatchResult extends DispatchResult {
  /**
   * Promise do drain imediato disparado em background (só populada quando
   * `ok: true`). Quem chama decide como aguardá-la/isolá-la: o adaptador HTTP
   * usa `event.context.waitUntil`, um consumer de fila (sem H3Event) pode
   * simplesmente `await` — o núcleo não conhece nenhum dos dois contextos.
   */
  drain?: Promise<void>
}

/**
 * Núcleo de `dispatchWebhook` (DRY): enfileira o evento no outbox e dispara
 * o drain imediato em background. **Não** dispara o HTTP diretamente — quem
 * dispara é o worker (`drainWebhookOutbox`). Não depende de `H3Event` —
 * reutilizável fora de rotas HTTP (ex.: consumer de fila do agente).
 *
 * - Sem `webhook_url`, retorna `ok:false, reason:'no_url'`; com o envio
 *   desligado, `reason:'inativo'`. Nenhum dos dois é erro fatal.
 * - `supabase` deve ser service role (a tabela tem RLS restritivo).
 * - O `event_id` (UUID gerado no banco) vira a chave de idempotência.
 */
export async function dispatchWebhookCore(
  supabase: SupabaseClient,
  evento: WebhookEvent | string,
  payload: Record<string, unknown>,
): Promise<CoreDispatchResult> {
  const { url, ativo, loja } = await getCachedWebhookContext(supabase)
  if (!url) {
    logger.warn('Webhook não disparado: destino não configurado', { evento })
    return { ok: false, reason: 'no_url' }
  }
  // Desligado não enfileira: guardar eventos que ninguém vai entregar só
  // encheria o outbox e, quando religasse, despejaria um histórico inteiro de
  // uma vez no destino.
  if (!ativo) {
    logger.info('Webhook não disparado: envio desligado nas configurações', { evento })
    return { ok: false, reason: 'inativo' }
  }

  // Bloco `loja` injetado centralmente em todo evento (v1.1): evita que o
  // consumidor externo faça uma chamada extra só para nome/chave PIX.
  const enrichedPayload: Record<string, unknown> = { ...payload, loja }

  // event_id é gerado AQUI, na aplicação (`crypto.randomUUID`), e não pelo
  // `gen_random_uuid()` do banco — o comentário anterior dizia o contrário e
  // mentia sobre a linha logo abaixo (§8.16, defeito 8). É a Idempotency-Key
  // usada pelo worker; o UNIQUE garante que reentregas repitam a mesma chave.
  const { data, error } = await supabase
    .from('webhook_outbox')
    .insert({
      event_id: crypto.randomUUID(),
      evento,
      payload: enrichedPayload as Json,
      destino_url: url,
      // Relógio do app, não o DEFAULT now() do banco: o claim do worker compara
      // este campo com o relógio do app. Com clock skew app↔Supabase maior que a
      // latência, o evento ficava invisível ao disparo imediato e só era entregue
      // quando a próxima ação chegava. -2s garante elegibilidade imediata.
      proxima_tentativa_em: new Date(Date.now() - 2000).toISOString(),
    })
    .select('id, event_id')
    .single()

  if (error) {
    logger.error('Falha ao enfileirar webhook no outbox', {
      evento,
      error: error.message,
    })
    return { ok: false, reason: 'db_error', error: error.message }
  }

  logger.info('Webhook enfileirado', { evento, event_id: data.event_id })

  // Disparo imediato em background — elimina o delay do pg_cron (~1 min).
  // Não bloqueia a resposta da rota. O drain repete lotes até esvaziar a fila
  // elegível, então o evento recém-inserido é entregue mesmo com backlog na
  // frente. O pg_cron segue como fallback para os retries.
  const drain = (async () => {
    try {
      const result = await drainWebhookOutbox(supabase)
      if (result.falhas > 0 || result.mortos > 0 || result.recusado) {
        logger.warn('Webhook: entrega imediata com falhas (pg_cron reprocessa as retentáveis)', {
          event_id: data.event_id,
          ...result,
        })
      }
    } catch (err) {
      logger.error('Webhook: disparo imediato abortou de forma inesperada', {
        event_id: data.event_id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })()

  return { ok: true, eventId: data.event_id, drain }
}

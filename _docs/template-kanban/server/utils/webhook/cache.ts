/**
 * Cache curto do contexto de webhook da loja (decisão técnica de 3.6).
 *
 * Uma única query cacheada resolve `webhook_url` (destino) e o bloco `loja`
 * injetado no envelope de todo evento (contexto para o consumidor externo —
 * nome, chave PIX, WhatsApp de atendimento). TTL de 60s: o admin altera a
 * config e vê efeito rápido sem martelar o Postgres em rajadas de eventos.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

const TTL_MS = 60_000

export interface WebhookStoreContext {
  readonly url: string | null
  /**
   * Liga/desliga o envio sem perder a configuração (migration 103). Separado de
   * `url === null`, que significa "nunca foi configurado": antes, a única forma
   * de pausar era apagar a URL, e quem pausasse por um dia perdia o destino.
   */
  readonly ativo: boolean
  readonly loja: {
    readonly nome_fantasia: string | null
    readonly chave_pix: string | null
    readonly whatsapp_atendimento: string | null
  }
}

interface CacheEntry {
  context: WebhookStoreContext
  expiresAt: number
}

let entry: CacheEntry | null = null

export async function getCachedWebhookContext(
  supabase: SupabaseClient<Database>,
): Promise<WebhookStoreContext> {
  const now = Date.now()
  if (entry && entry.expiresAt > now) {
    return entry.context
  }

  const { data } = await supabase
    .from('store')
    .select('webhook_url, webhook_active, trade_name, pix_key, support_whatsapp_number')
    .limit(1)
    .maybeSingle()

  const context: WebhookStoreContext = {
    url: (data?.webhook_url as string | null) ?? null,
    ativo: (data?.webhook_active as boolean | null) ?? false,
    loja: {
      nome_fantasia: (data?.trade_name as string | null) ?? null,
      chave_pix: (data?.pix_key as string | null) ?? null,
      whatsapp_atendimento: (data?.support_whatsapp_number as string | null) ?? null,
    },
  }

  entry = { context, expiresAt: now + TTL_MS }
  return context
}

/**
 * Limpa o cache. Útil para testes e quando o admin atualiza a URL e quer
 * efeito imediato (a página de configurações pode invalidar via endpoint).
 */
export function invalidateWebhookUrlCache(): void {
  entry = null
}

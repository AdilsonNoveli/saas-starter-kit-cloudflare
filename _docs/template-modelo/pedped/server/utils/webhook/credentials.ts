/**
 * Credenciais de saída do webhook, lidas do Supabase Vault (migration 103).
 *
 * **Por que saíram do ambiente.** Enquanto viviam em `NUXT_WEBHOOK_TOKEN` e
 * `NUXT_WEBHOOK_SIGNING_SECRET`, configurar o webhook exigia acesso ao deploy
 * (`wrangler secret put`) — o lojista não conseguia apontar a notificação para
 * o sistema dele sozinho. Como cada loja é uma instalação separada, isso era
 * uma trava operacional, não uma proteção.
 *
 * **Por que Vault e não coluna.** Um Bearer e uma chave de HMAC em coluna
 * legível vazam em qualquer dump, backup ou `SELECT *` distraído. O Vault
 * grava cifrado, e `webhook_secret_get` é `SECURITY DEFINER` — a leitura em
 * claro existe só aqui, no runtime do worker.
 *
 * **Fonte única.** Não há fallback para variável de ambiente de propósito:
 * dois lugares para o mesmo segredo é como se erra em silêncio (o deploy tem
 * um valor, o banco tem outro, e ninguém sabe qual foi usado).
 *
 * O cache existe porque o drain processa lotes: sem ele, seriam duas chamadas
 * RPC por evento. TTL curto — trocar o segredo na tela precisa valer rápido.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { WebhookOutboundCredentials } from '#shared/types/webhook'

/** Mesmo TTL do contexto da loja (`cache.ts`), pela mesma razão. */
const TTL_MS = 60_000

interface CacheEntry {
  credentials: WebhookOutboundCredentials
  expiresAt: number
}

let entry: CacheEntry | null = null

/**
 * Lê os dois segredos do Vault. Devolve string vazia no que faltar — quem
 * decide o que fazer com segredo ausente é o worker, num lugar só, e ele já
 * falha fechado (recusa a rodada em vez de entregar sem credencial).
 */
export async function getWebhookCredentials(
  supabase: SupabaseClient,
): Promise<WebhookOutboundCredentials> {
  const now = Date.now()
  if (entry && entry.expiresAt > now) {
    return entry.credentials
  }

  const [token, signing] = await Promise.all([
    supabase.rpc('webhook_secret_get', { p_tipo: 'token' }),
    supabase.rpc('webhook_secret_get', { p_tipo: 'signing' }),
  ])

  if (token.error || signing.error) {
    // Não cacheia falha: um erro transitório de rede não pode desligar o
    // webhook pelos próximos 60 segundos.
    logger.error('Webhook: falha ao ler credenciais do Vault', {
      erroToken: token.error?.message ?? null,
      erroAssinatura: signing.error?.message ?? null,
    })
    return { token: '', signingSecret: '' }
  }

  const credentials: WebhookOutboundCredentials = {
    token: (token.data as string | null) ?? '',
    signingSecret: (signing.data as string | null) ?? '',
  }

  entry = { credentials, expiresAt: now + TTL_MS }
  return credentials
}

/**
 * Descarta o cache. Chamado pelas rotas que gravam ou revogam um segredo, para
 * que a troca valha na entrega seguinte em vez de esperar o TTL.
 */
export function invalidateWebhookCredentialsCache(): void {
  entry = null
}

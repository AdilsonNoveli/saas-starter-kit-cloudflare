import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'

/**
 * Resolve o IP real do cliente de forma consistente em Cloudflare Workers e
 * em dev local atrás de proxy.
 *
 * Prioridade:
 *   1. `CF-Connecting-IP` — setado pela borda da Cloudflare e NÃO falsificável
 *      pelo cliente (a borda sobrescreve). É a fonte confiável no deploy CF.
 *   2. `X-Real-IP` — setado por proxies reversos confiáveis (ex.: Nginx).
 *   3. Primeiro hop de `X-Forwarded-For` — header livre; último recurso.
 *   4. `socket.remoteAddress`.
 *
 * Usado tanto pelo rate limiter global quanto pelo limiter do BFF de mapas
 * (fonte única para evitar divergência de chaveamento).
 */
export function resolveClientIp(event: H3Event): string {
  const cfIp = getRequestHeader(event, 'cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  const realIp = getRequestHeader(event, 'x-real-ip')
  if (realIp) return realIp.trim()

  const xff = getRequestHeader(event, 'x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  return event.node.req.socket.remoteAddress || 'unknown'
}

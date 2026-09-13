import { createError } from 'h3'
import type { H3Event } from 'h3'
import { resolveClientIp } from '../net/clientIp'
import { cloudflareEnv } from '../whatsapp/queueBindings'

/**
 * Rate limiting dedicado do BFF de endereços (Google Maps Platform),
 * migrado pro Rate Limiting binding nativo do Cloudflare Workers — mesma
 * decisão e mesmas ressalvas de `server/middleware/1.rate-limit.ts` (exato
 * por PoP, não globalmente entre PoPs distantes; fail-open fora do runtime
 * Cloudflare).
 *
 * O limiter global (`server/middleware/1.rate-limit.ts`) opera em ordens de
 * grandeza altas (catálogo/checkout). As rotas de mapas custam dinheiro por
 * chamada à Google, então recebem um teto MUITO mais baixo, por IP, na própria
 * rota (edge/server), retornando 429 a bursts suspeitos.
 *
 * Nota de UX: o autocomplete dispara por tecla (com debounce), então UMA busca
 * de endereço = várias requisições. Por isso o teto de autocomplete acomoda o
 * padrão de digitação (~keystrokes), enquanto details/geocode — que resolvem 1
 * endereço por vez — usam tetos mais estritos.
 */

export interface MapsRateLimitConfig {
  /** Identificador do balde (log/depuração). */
  readonly bucket: 'autocomplete' | 'place' | 'geocode'
  /** Nome do binding declarado em `wrangler.toml`. */
  readonly binding: string
}

/** Tetos por rota (por IP) — os valores em si vivem em `wrangler.toml`, `[[ratelimits]]`. */
export const MAPS_LIMITS = {
  // ~10 buscas de endereço/min: 4 chars mín. + debounce ⇒ poucos hits por busca.
  autocomplete: { bucket: 'autocomplete', binding: 'RATE_LIMITER_MAPS_AUTOCOMPLETE' },
  // Resolução final do endereço selecionado — 1 por busca.
  place: { bucket: 'place', binding: 'RATE_LIMITER_MAPS_PLACE' },
  // Geocoding direto (fallback/admin) — 1 por endereço.
  geocode: { bucket: 'geocode', binding: 'RATE_LIMITER_MAPS_GEOCODE' },
} as const satisfies Record<string, MapsRateLimitConfig>

interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

function rateLimiterFrom(env: Record<string, unknown> | undefined, binding: string): RateLimiterBinding | undefined {
  return env?.[binding] as RateLimiterBinding | undefined
}

/**
 * Aplica o rate limit da rota de mapas. Lança 429 quando o IP excede o teto.
 * Deve ser a PRIMEIRA linha do handler (antes de tocar na Google).
 */
export async function enforceMapsRateLimit(event: H3Event, cfg: MapsRateLimitConfig): Promise<void> {
  const limiter = rateLimiterFrom(cloudflareEnv(event), cfg.binding)
  if (!limiter) return // fora do runtime Cloudflare (dev local, testes) — fail-open

  const ip = resolveClientIp(event)
  const { success } = await limiter.limit({ key: ip })

  if (!success) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Muitas buscas de endereço em pouco tempo. Aguarde alguns instantes e tente novamente.',
    })
  }
}

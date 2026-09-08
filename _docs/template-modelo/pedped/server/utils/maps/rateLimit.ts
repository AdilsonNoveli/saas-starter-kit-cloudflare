import { LRUCache } from 'lru-cache'
import { createError } from 'h3'
import type { H3Event } from 'h3'
import { resolveClientIp } from '../net/clientIp'

/**
 * Rate limiting dedicado do BFF de endereços (Google Maps Platform).
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
  /** Identificador do balde (isola contagens entre rotas). */
  readonly bucket: 'autocomplete' | 'place' | 'geocode'
  /** Máximo de requisições por janela, por IP. */
  readonly max: number
  /** Janela em segundos. */
  readonly windowSec: number
}

/** Tetos por rota (por IP). Ajustáveis; documentados acima. */
export const MAPS_LIMITS = {
  // ~10 buscas de endereço/min: 4 chars mín. + debounce ⇒ poucos hits por busca.
  autocomplete: { bucket: 'autocomplete', max: 40, windowSec: 60 },
  // Resolução final do endereço selecionado — 1 por busca.
  place: { bucket: 'place', max: 15, windowSec: 60 },
  // Geocoding direto (fallback/admin) — 1 por endereço.
  geocode: { bucket: 'geocode', max: 15, windowSec: 60 },
} as const satisfies Record<string, MapsRateLimitConfig>

/** Um cache LRU por balde (cardinalidade limitada = defesa contra explosão de memória). */
const stores = new Map<string, LRUCache<string, number>>()

function storeFor(cfg: MapsRateLimitConfig): LRUCache<string, number> {
  let store = stores.get(cfg.bucket)
  if (!store) {
    store = new LRUCache<string, number>({ max: 10_000, ttl: cfg.windowSec * 1000 })
    stores.set(cfg.bucket, store)
  }
  return store
}

/**
 * Aplica o rate limit da rota de mapas. Lança 429 quando o IP excede o teto.
 * Deve ser a PRIMEIRA linha do handler (antes de tocar na Google).
 */
export function enforceMapsRateLimit(event: H3Event, cfg: MapsRateLimitConfig): void {
  const ip = resolveClientIp(event)
  const store = storeFor(cfg)
  const key = `${cfg.bucket}:${ip}`
  const current = store.get(key) ?? 0

  if (current >= cfg.max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Muitas buscas de endereço em pouco tempo. Aguarde alguns instantes e tente novamente.',
    })
  }

  store.set(key, current + 1)
}

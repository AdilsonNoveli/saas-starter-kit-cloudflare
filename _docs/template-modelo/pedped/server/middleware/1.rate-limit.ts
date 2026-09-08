import { LRUCache } from 'lru-cache'
import { createError } from 'h3'
import { resolveClientIp } from '../utils/net/clientIp'

/**
 * Rate limiter — Fase 3.7
 *
 * Correções sobre o anterior (que disparava 429 falso em produção):
 *  1. **IP real via `X-Forwarded-For`** (primeiro hop), com fallback para
 *     `socket.remoteAddress`. Atrás de Vercel/CDN, `socket.remoteAddress`
 *     era o IP do proxy → todos caíam no mesmo balde global.
 *  2. **Baldes separados por classe de rota** (público, admin, integração)
 *     com limites realistas: 500 pedidos/h + polling do admin não dispara
 *     mais 429.
 *  3. **Rotas internas/webhook isentas** — `pg_cron`/`n8n` não devem ser
 *     limitados pelo limiter de tráfego de usuário.
 *
 * Limitação assumida: store em memória (single-node). Em multi-instância,
 * trocar por store compartilhado (ex.: Postgres/Redis). Documentado no doc.
 */

interface BucketConfig {
  /** Máximo de requisições por janela. */
  max: number
  /** Janela em segundos. */
  windowSec: number
  /** Cardinalidade máxima de IPs (defesa contra explosão de memória). */
  maxKeys: number
}

const BUCKETS = {
  // Catálogo, checkout, carrinho — picos de horário de almoço/jantar.
  public: { max: 600, windowSec: 60, maxKeys: 5_000 },
  // Admin autenticado — kanban faz polling/realtime; não pode disparar 429.
  admin: { max: 1_200, windowSec: 60, maxKeys: 1_000 },
} as const satisfies Record<string, BucketConfig>

type BucketKey = keyof typeof BUCKETS

/** Caches por classe de rota (cardinalidades diferentes). */
const stores: Record<BucketKey, LRUCache<string, number>> = {
  public: new LRUCache({ max: BUCKETS.public.maxKeys, ttl: BUCKETS.public.windowSec * 1000 }),
  admin: new LRUCache({ max: BUCKETS.admin.maxKeys, ttl: BUCKETS.admin.windowSec * 1000 }),
}

/**
 * Decide qual balde aplicar à URL. Retorna `null` para isenção
 * (rotas internas / webhook inbound — segurança própria via Bearer).
 */
function resolveBucket(url: string): BucketKey | null {
  if (!url.startsWith('/api/')) return null
  // Trigger interno do worker do outbox (pg_cron). Já validado por
  // `NUXT_WORKER_TOKEN`; rate-limit apenas adicionaria 429 falso.
  if (url.startsWith('/api/internal/')) return null
  // Cron jobs server-to-server (pg_cron) — também protegidos por
  // `NUXT_WORKER_TOKEN`. Mesmo princípio de isenção do `/api/internal/`.
  if (url.startsWith('/api/cron/')) return null
  // Endpoint público de tracking — alto volume, escalado pelo composable.
  if (url.startsWith('/api/track')) return 'public'
  if (url.startsWith('/api/admin/')) return 'admin'
  return 'public'
}

export default defineEventHandler((event) => {
  const url = event.node.req.url ?? ''
  const bucketKey = resolveBucket(url)
  if (!bucketKey) return

  const ip = resolveClientIp(event)
  const cfg = BUCKETS[bucketKey]
  const store = stores[bucketKey]

  // Chave inclui o balde para isolar contagens entre classes.
  const key = `${bucketKey}:${ip}`
  const current = store.get(key) ?? 0

  if (current >= cfg.max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Você excedeu o limite de requisições. Tente novamente em instantes.',
    })
  }

  store.set(key, current + 1)
})

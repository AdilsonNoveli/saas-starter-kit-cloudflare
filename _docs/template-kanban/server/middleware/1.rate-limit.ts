import { createError } from 'h3'
import { resolveClientIp } from '../utils/net/clientIp'
import { cloudflareEnv } from '../utils/whatsapp/queueBindings'

/**
 * Rate limiter — Fase 3.7, migrado pro Rate Limiting binding nativo do
 * Cloudflare Workers (§6 do AUDITORIA.md).
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
 * Antes usava `LRUCache` em memória — cada isolado do Worker (inclusive
 * vários dentro do MESMO PoP sob carga concorrente) mantinha contador
 * próprio, deixando o teto configurado sem valor real. O binding nativo
 * (`wrangler.toml`, `[[ratelimits]]`) resolve isso — mas é exato por
 * **localização de borda**, não globalmente entre PoPs distantes (doc da
 * Cloudflare: "Rate limits... are local to the Cloudflare location that
 * your Worker runs in"). Aceito conscientemente: fecha o buraco real de
 * hoje (que exigia zero esforço do atacante) sem exigir infra nova pra
 * provisionar (KV) nem uma Durable Object customizada pra escrever e
 * manter (única forma de contagem exata globalmente, mas nenhuma classe
 * DO deste tipo existe hoje no repo — a única DO daqui é autogerada pelo
 * Nitro só pra WebSocket).
 */

interface BucketConfig {
  /** Nome do binding declarado em `wrangler.toml`. */
  binding: string
}

const BUCKETS = {
  // Catálogo, checkout, carrinho — picos de horário de almoço/jantar.
  public: { binding: 'RATE_LIMITER_PUBLIC' },
  // Admin autenticado — kanban faz polling/realtime; não pode disparar 429.
  admin: { binding: 'RATE_LIMITER_ADMIN' },
} as const satisfies Record<string, BucketConfig>

type BucketKey = keyof typeof BUCKETS

interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

/**
 * Bindings de Rate Limiting só existem no runtime Cloudflare Workers —
 * mesmo cast via `unknown` (nunca `any`) já usado por `queueBindingFrom`
 * para bindings de fila, pelo mesmo motivo: sem augmentation de tipo
 * carregada sob o preset `node-server` usado por `vue-tsc`.
 */
function rateLimiterFrom(env: Record<string, unknown> | undefined, binding: string): RateLimiterBinding | undefined {
  return env?.[binding] as RateLimiterBinding | undefined
}

/**
 * Decide qual balde aplicar à URL. Retorna `null` para isenção (webhook
 * inbound — segurança própria via token no path/Bearer).
 */
function resolveBucket(url: string): BucketKey | null {
  if (!url.startsWith('/api/')) return null
  // Endpoint público de tracking — alto volume, escalado pelo composable.
  if (url.startsWith('/api/track')) return 'public'
  if (url.startsWith('/api/admin/')) return 'admin'
  return 'public'
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url ?? ''
  const bucketKey = resolveBucket(url)
  if (!bucketKey) return

  const limiter = rateLimiterFrom(cloudflareEnv(event), BUCKETS[bucketKey].binding)
  // Fora do runtime Cloudflare (dev local, testes): fail-open sem log —
  // diferente de `sendToQueue` (evento raro), este middleware roda em toda
  // chamada de API, e logar aqui inundaria o dev local sem nenhum valor.
  if (!limiter) return

  const ip = resolveClientIp(event)
  const { success } = await limiter.limit({ key: ip })

  if (!success) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Você excedeu o limite de requisições. Tente novamente em instantes.',
    })
  }
})

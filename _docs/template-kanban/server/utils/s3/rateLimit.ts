import { LRUCache } from 'lru-cache'
import { createError } from 'h3'
import type { H3Event } from 'h3'
import { resolveClientIp } from '../net/clientIp'

/**
 * Rate limiting dedicado do upload de arte do cliente (`/api/catalog/upload-arte`).
 *
 * Mesmo padrão de `server/utils/maps/rateLimit.ts`: o limiter global
 * (`server/middleware/1.rate-limit.ts`) opera em ordens de grandeza altas
 * demais para um endpoint público, sem staff role, que grava no bucket. Não
 * dá pra usar rate-limit por sessão (`requireActiveSession`) porque a sessão
 * só nasce no checkout — o modal de opções, onde o upload acontece, abre
 * antes disso — então o limite é por IP.
 *
 * **Continua em `LRUCache`, não migrado pro Rate Limiting binding nativo**
 * (diferente de `1.rate-limit.ts`/`maps/rateLimit.ts`, §6 do AUDITORIA.md):
 * o binding só aceita `period` de 10 ou 60 segundos, e esta janela é de 600s
 * (10 uploads em 10min, tolerando um pedido real com várias artes de uma
 * vez). Forçar pra 60s trocaria a tolerância a rajada por ~1 upload/min
 * fixo — pior UX pra quem sobe arte de 2-3 produtos na mesma compra, sem
 * ganho real de proteção (mesmo teto médio). Sofre a mesma limitação de
 * isolado-por-processo que motivou a migração dos outros dois, mas o
 * volume/custo por requisição aqui é bem menor (upload de arquivo, não
 * chamada paga à Google) — risco aceito, não uma omissão.
 */

const BUCKET = 'arte-cliente'
/** ~10 uploads em 10min por IP — generoso pra um pedido real (1-2 uploads), blunt contra abuso. */
const MAX_UPLOADS = 10
const WINDOW_SEC = 600

const store = new LRUCache<string, number>({ max: 5_000, ttl: WINDOW_SEC * 1000 })

/** Lança 429 quando o IP excede o teto. Deve ser a PRIMEIRA linha do handler. */
export function enforceCustomerArtRateLimit(event: H3Event): void {
  const ip = resolveClientIp(event)
  const key = `${BUCKET}:${ip}`
  const current = store.get(key) ?? 0

  if (current >= MAX_UPLOADS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Muitos envios de arquivo em pouco tempo. Aguarde alguns instantes e tente novamente.',
    })
  }

  store.set(key, current + 1)
}

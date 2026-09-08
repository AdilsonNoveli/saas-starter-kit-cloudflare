import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { logger } from '~/core/services/logger.service'
import { trackPayloadSchema, type TrackEvent } from '#shared/types/tracking'
import type { Json } from '~/types/database.types'

/**
 * Limite de tamanho serializado de `metadata` por evento (bytes).
 * Evita que clientes abusem do JSON livre como porão de log.
 */
const MAX_METADATA_BYTES = 4 * 1024

/**
 * POST /api/track — ingestão de eventos de observabilidade interna.
 *
 * - Aceita lote de 1–50 eventos.
 * - Sessão é opcional (visitantes anônimos também são rastreados).
 * - Usa service role (a tabela tem RLS restritivo; inserts vêm da API).
 * - Idempotência não é exigida: estamos contabilizando, não somando saldo.
 *
 * Rate limit: aplicado pelo middleware global. O client agrega via
 * `useTracking()` (debounce + batch) para reduzir o n.º de chamadas.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = trackPayloadSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payload inválido',
      data: parsed.error.issues,
    })
  }

  // Validação adicional de tamanho de metadata (zod sozinho não cobre)
  for (const ev of parsed.data.events) {
    if (ev.metadata) {
      const size = Buffer.byteLength(JSON.stringify(ev.metadata), 'utf8')
      if (size > MAX_METADATA_BYTES) {
        throw createError({
          statusCode: 413,
          statusMessage: `metadata excede ${MAX_METADATA_BYTES} bytes`,
        })
      }
    }
  }

  // Service role por decisão de projeto: `evento_rastreamento` não tem policy
  // de INSERT para `anon` e não deve ter. Criar uma permitiria gravar eventos
  // direto no PostgREST, driblando a validação e o rate limit desta rota —
  // pior postura que manter a tabela fechada e escrever pelo BFF.
  const supabase = serverSupabaseServiceRole(event)

  // Mapeamento explícito (evita cair colunas desconhecidas no insert).
  const rows = parsed.data.events.map((ev: TrackEvent) => ({
    sessao_id: ev.sessao_id ?? null,
    tipo: ev.tipo,
    entidade: ev.entidade ?? null,
    entidade_id: ev.entidade_id ?? null,
    metadata: (ev.metadata ?? {}) as unknown as Json,
  }))

  const { error } = await supabase.from('evento_rastreamento').insert(rows)

  if (error) {
    logger.error('Falha ao gravar eventos de rastreamento', {
      error: error.message,
      count: rows.length,
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao registrar eventos',
    })
  }

  return { ok: true, count: rows.length }
})

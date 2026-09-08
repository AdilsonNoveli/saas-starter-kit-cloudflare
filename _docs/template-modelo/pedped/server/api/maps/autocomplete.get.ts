/**
 * GET /api/maps/autocomplete?search=<texto>&sessionToken=<uuid>
 *
 * BFF de Places Autocomplete (New). O frontend NUNCA fala com a Google:
 * consome esta rota, que anexa a chave privada server-side e devolve apenas
 * o payload mínimo (placeId + textos).
 *
 * Proteções: rate limit por IP (429), sanitização de input, FieldMask/payload
 * enxuto, tratamento de erro amigável com log detalhado no servidor.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { enforceMapsRateLimit, MAPS_LIMITS } from '../../utils/maps/rateLimit'
import { fetchAutocomplete, sanitizeSearchInput } from '../../utils/maps/google'
import type { AutocompleteResponse } from '#shared/types/maps'

export default defineEventHandler(async (event): Promise<AutocompleteResponse> => {
  enforceMapsRateLimit(event, MAPS_LIMITS.autocomplete)

  const query = getQuery(event)
  const search = sanitizeSearchInput(query.search, { min: 3, max: 200 })
  const sessionToken = typeof query.sessionToken === 'string' ? query.sessionToken : undefined

  try {
    const suggestions = await fetchAutocomplete(event, search, sessionToken)
    return { suggestions }
  } catch (err) {
    // Erros já tratados (createError com statusCode) sobem como estão.
    if ((err as { statusCode?: number }).statusCode) throw err
    logger.error('[maps/autocomplete] erro inesperado', { error: (err as Error).message })
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível buscar endereços agora.' })
  }
})

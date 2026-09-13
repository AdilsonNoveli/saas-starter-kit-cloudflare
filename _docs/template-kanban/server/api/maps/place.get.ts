/**
 * GET /api/maps/place?placeId=<id>&sessionToken=<uuid>
 *
 * BFF de Place Details (New). Resolve o endereço selecionado no autocomplete
 * em coordenadas + componentes (rua/bairro/cidade/uf/cep), devolvendo só o
 * necessário ao checkout. O sessionToken (mesmo do autocomplete) fecha a
 * sessão de billing da Google.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { enforceMapsRateLimit, MAPS_LIMITS } from '../../utils/maps/rateLimit'
import { fetchPlaceDetails, sanitizePlaceId } from '../../utils/maps/google'
import type { AddressDetails } from '#shared/types/maps'

export default defineEventHandler(async (event): Promise<AddressDetails> => {
  await enforceMapsRateLimit(event, MAPS_LIMITS.place)

  const query = getQuery(event)
  const placeId = sanitizePlaceId(query.placeId)
  const sessionToken = typeof query.sessionToken === 'string' ? query.sessionToken : undefined

  try {
    return await fetchPlaceDetails(event, placeId, sessionToken)
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode) throw err
    logger.error('[maps/place] erro inesperado', { error: (err as Error).message })
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar o endereço.' })
  }
})

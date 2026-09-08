/**
 * GET /api/maps/geocode?address=<texto>&sessao_id=<uuid opcional>
 *
 * BFF de Geocoding. Resolve um endereço em texto livre para coordenadas +
 * componentes e calcula cobertura de entrega (distância, raio de atendimento e frete).
 * Usado pelo agente de IA (n8n), checkout fallback e painel admin.
 *
 * `sessao_id` (agente, `ConsultarEnderecoEntrega`): quando presente, a taxa
 * cotada aqui usa o subtotal REAL do carrinho da sessão — sem isso, a
 * promoção de frete grátis por valor nunca era considerada nesta cotação
 * (sempre assumia subtotal=0), então o valor dito ao cliente durante a
 * conversa podia divergir do frete realmente cobrado no checkout. Sem
 * `sessao_id` (admin/checkout web), mantém o fallback conservador (subtotal=0
 * → nunca aplica frete grátis aqui; a fonte de verdade fica no checkout deles).
 *
 * Lógica de geocoding/frete vive em `utils/maps/geocodeAddress.ts` (DRY) —
 * esta rota só cuida do que é específico de HTTP: rate limit por IP e
 * sanitização de query string.
 */
import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { enforceMapsRateLimit, MAPS_LIMITS } from '../../utils/maps/rateLimit'
import { sanitizeSearchInput, requireServerKey } from '../../utils/maps/google'
import { geocodeAddress } from '../../utils/maps/geocodeAddress'
import { getCartState } from '../../utils/cart/state'
import type { GeocodeResponse } from '#shared/types/maps'

/** Subtotal real do carrinho da sessão, ou 0 se ausente/indisponível (fail-safe). */
async function resolveMerchandiseSubtotal(supabase: SupabaseClient<Database>, sessaoId: unknown): Promise<number> {
  if (typeof sessaoId !== 'string' || !sessaoId) return 0
  try {
    const cart = await getCartState(supabase, sessaoId)
    return cart.subtotal
  } catch {
    // Cotação não pode falhar por causa do carrinho — pior caso, ignora a promo.
    return 0
  }
}

export default defineEventHandler(async (event): Promise<GeocodeResponse> => {
  enforceMapsRateLimit(event, MAPS_LIMITS.geocode)

  const query = getQuery(event)
  const address = sanitizeSearchInput(query.address, { min: 3, max: 300 })
  const supabase = serverSupabaseServiceRole(event)
  const merchandiseSubtotal = await resolveMerchandiseSubtotal(supabase, query.sessao_id)
  const googleMapsServerKey = requireServerKey((useRuntimeConfig(event).googleMapsServerKey as string) || '')

  return geocodeAddress(googleMapsServerKey, supabase, address, merchandiseSubtotal)
})

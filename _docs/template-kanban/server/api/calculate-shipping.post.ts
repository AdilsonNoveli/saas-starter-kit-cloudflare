import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'
import { haversineDistanceKm } from '../utils/geo/haversine'
import { resolveDeliveryFee } from '../utils/delivery/freeShipping'
import type { PromotionConfig } from '#shared/types/store'

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  // Subtotal de mercadoria (opcional) — permite ao preview refletir o frete
  // grátis por valor de carrinho, igual ao pedido final.
  subtotal: z.number().min(0).optional(),
})

export interface FretePreviewResponse {
  valor_frete: number
  distancia_km: number | null
}

export default defineEventHandler(async (event): Promise<FretePreviewResponse> => {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Coordenadas inválidas' })
  }

  const { lat, lng, subtotal } = parsed.data
  const supabase = await serverSupabaseClient(event)

  const { data: loja } = await supabase
    .from('store')
    .select('origin_latitude, origin_longitude, default_delivery_fee, promotions_config')
    .limit(1)
    .maybeSingle()

  const config = loja?.promotions_config as Partial<PromotionConfig> | null
  const merchandiseSubtotal = subtotal ?? 0

  if (!loja?.origin_latitude || !loja?.origin_longitude) {
    const flat = Number(loja?.default_delivery_fee ?? 0)
    return {
      valor_frete: resolveDeliveryFee({ distanceFee: flat, merchandiseSubtotal, config }),
      distancia_km: null,
    }
  }

  const distanciaKm = haversineDistanceKm(
    Number(loja.origin_latitude),
    Number(loja.origin_longitude),
    lat,
    lng,
  )

  const { data: valorRpc } = await supabase
    .rpc('calculate_shipping_by_distance', { p_distance_km: distanciaKm })

  const distanceFee = Number(valorRpc ?? loja.default_delivery_fee ?? 0)

  return {
    valor_frete: resolveDeliveryFee({ distanceFee, merchandiseSubtotal, config }),
    distancia_km: Number(distanciaKm.toFixed(1)),
  }
})

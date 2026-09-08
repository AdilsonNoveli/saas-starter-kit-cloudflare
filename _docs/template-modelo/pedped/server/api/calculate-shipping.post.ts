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
    .from('loja')
    .select('latitude_origem, longitude_origem, taxa_entrega_padrao, config_promocoes')
    .limit(1)
    .maybeSingle()

  const config = loja?.config_promocoes as Partial<PromotionConfig> | null
  const merchandiseSubtotal = subtotal ?? 0

  if (!loja?.latitude_origem || !loja?.longitude_origem) {
    const flat = Number(loja?.taxa_entrega_padrao ?? 0)
    return {
      valor_frete: resolveDeliveryFee({ distanceFee: flat, merchandiseSubtotal, config }),
      distancia_km: null,
    }
  }

  const distanciaKm = haversineDistanceKm(
    Number(loja.latitude_origem),
    Number(loja.longitude_origem),
    lat,
    lng,
  )

  const { data: valorRpc } = await supabase
    .rpc('calcular_frete_por_distancia', { p_distancia_km: distanciaKm })

  const distanceFee = Number(valorRpc ?? loja.taxa_entrega_padrao ?? 0)

  return {
    valor_frete: resolveDeliveryFee({ distanceFee, merchandiseSubtotal, config }),
    distancia_km: Number(distanciaKm.toFixed(1)),
  }
})

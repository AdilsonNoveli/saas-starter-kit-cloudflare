import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'
import { haversineDistanceKm } from '../utils/geo/haversine'

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Coordenadas inválidas' })
  }

  const { lat, lng } = parsed.data

  // A tabela loja tem política pública de leitura — funciona com anon role.
  const supabase = await serverSupabaseClient(event)
  const { data: loja, error } = await supabase
    .from('loja')
    .select('latitude_origem, longitude_origem, raio_atendimento_km')
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 503, message: 'Não foi possível verificar a configuração da loja.' })
  }

  // Se o admin ainda não geocodificou o endereço da loja, permite a entrega.
  // Isso evita bloquear pedidos em uma instalação recém-configurada.
  if (!loja?.latitude_origem || !loja?.longitude_origem || !loja?.raio_atendimento_km) {
    return { valid: true }
  }

  const distanceKm = haversineDistanceKm(
    Number(loja.latitude_origem),
    Number(loja.longitude_origem),
    lat,
    lng,
  )

  if (distanceKm > Number(loja.raio_atendimento_km)) {
    throw createError({
      statusCode: 400,
      message: `Infelizmente seu endereço está fora do nosso raio de entrega. Você está a ${distanceKm.toFixed(1)} km e atendemos até ${loja.raio_atendimento_km} km.`,
    })
  }

  return { valid: true, distanceKm }
})

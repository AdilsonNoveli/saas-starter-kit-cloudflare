/**
 * Núcleo do BFF de Geocoding — extraído de `api/maps/geocode.get.ts` (DRY)
 * para reutilização fora de rota HTTP (agente de IA, chamada servidor-servidor).
 *
 * Diferenças deliberadas em relação à rota pública:
 *   - recebe `supabase` de service role em vez de montar um client anônimo a
 *     partir de `event` — uma chamada servidor-servidor não tem usuário
 *     autenticado nem precisa do rate limit por IP da rota pública (isso
 *     continua só na rota);
 *   - recebe a chave da Google (`googleMapsServerKey`) já resolvida em vez de
 *     um `H3Event` — o consumer de fila do agente WhatsApp (hook nativo
 *     `cloudflare:queue` do Nitro) não recebe `H3Event`, só `{ batch, env,
 *     context }` (seção 2 da arquitetura do agente WhatsApp), então não há
 *     como chamar `useRuntimeConfig(event)` lá. Cada chamador resolve a
 *     chave a partir do contexto que tiver disponível.
 */
import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { logger } from '~/core/services/logger.service'
import { fetchGeocode } from './google'
import { haversineDistanceKm } from '../geo/haversine'
import { resolveDeliveryFee } from '../delivery/freeShipping'
import type { GeocodeResponse } from '#shared/types/maps'
import type { PromotionConfig } from '#shared/types/store'

export async function geocodeAddress(
  googleMapsServerKey: string,
  supabase: SupabaseClient<Database>,
  address: string,
  merchandiseSubtotal: number,
): Promise<GeocodeResponse> {
  try {
    // Consulta configuração de localização e entregas da loja ANTES do
    // geocode: as coordenadas da loja enviesam a busca (`bias`) para
    // desambiguar nomes de rua repetidos entre cidades.
    const { data: loja } = await supabase
      .from('store')
      .select('origin_latitude, origin_longitude, service_radius_km, default_delivery_fee, promotions_config')
      .limit(1)
      .maybeSingle()

    const bias = loja?.origin_latitude != null && loja?.origin_longitude != null
      ? {
          lat: Number(loja.origin_latitude),
          lng: Number(loja.origin_longitude),
          radiusKm: loja.service_radius_km != null ? Number(loja.service_radius_km) * 2 : undefined,
        }
      : undefined

    const d = await fetchGeocode(googleMapsServerKey, address, bias)

    let dentroDoRaio = true
    let distanciaKm: number | null = null
    let taxaEntrega: number | null = null
    let mensagemRaio: string | null = null

    if (d.lat != null && d.lng != null && loja?.origin_latitude != null && loja?.origin_longitude != null) {
      const rawDistance = haversineDistanceKm(
        Number(loja.origin_latitude),
        Number(loja.origin_longitude),
        d.lat,
        d.lng,
      )
      distanciaKm = Number(rawDistance.toFixed(2))

      const raioMax = loja.service_radius_km != null ? Number(loja.service_radius_km) : null
      if (raioMax != null && distanciaKm > raioMax) {
        dentroDoRaio = false
        mensagemRaio = `Endereço fora do raio de entrega (distância ${distanciaKm} km, máximo permitido ${raioMax} km).`
      } else {
        dentroDoRaio = true
        mensagemRaio = `Endereço dentro do raio de entrega (${distanciaKm} km).`
      }

      if (dentroDoRaio) {
        const distanceFeeRes = await supabase.rpc('calculate_shipping_by_distance', { p_distance_km: distanciaKm })
        const distanceFee = Number(distanceFeeRes.data ?? loja.default_delivery_fee ?? 0)
        taxaEntrega = resolveDeliveryFee({
          distanceFee,
          merchandiseSubtotal,
          config: loja.promotions_config as Partial<PromotionConfig> | null,
        })
      }
    } else {
      dentroDoRaio = true
      taxaEntrega = Number(loja?.default_delivery_fee ?? 0)
      mensagemRaio = 'Endereço localizado (raio de entrega não configurado na loja).'
    }

    return {
      formattedAddress: d.formattedAddress,
      lat: d.lat,
      lng: d.lng,
      // `fetchGeocode` já extrai rua/numero (`mapComponents`, google.ts) —
      // faltava repassar aqui. Sem isso a tool ConsultarEnderecoEntrega
      // prometia devolver rua/numero (ver tools/address.ts) mas nunca
      // devolvia de verdade, e o modelo não tinha como chamar AtualizarPedido
      // com um endereço válido — ficava pedindo o mesmo endereço em loop.
      rua: d.rua,
      numero: d.numero,
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf,
      cep: d.cep,
      dentro_do_raio: dentroDoRaio,
      distancia_km: distanciaKm,
      taxa_entrega: taxaEntrega,
      mensagem_raio: mensagemRaio,
    }
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode) {
      // 404 (não encontrado) já loga em `fetchGeocode`; demais status
      // (502/503 da Google, etc.) ainda não tinham log nenhum neste caminho.
      if (statusCode !== 404) {
        logger.warn('[maps/geocode] falha ao consultar endereço', { address, statusCode, message: (err as { statusMessage?: string }).statusMessage })
      }
      throw err
    }
    logger.error('[maps/geocode] erro inesperado', { error: (err as Error).message })
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível localizar o endereço.' })
  }
}

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
      .from('loja')
      .select('latitude_origem, longitude_origem, raio_atendimento_km, taxa_entrega_padrao, config_promocoes')
      .limit(1)
      .maybeSingle()

    const bias = loja?.latitude_origem != null && loja?.longitude_origem != null
      ? {
          lat: Number(loja.latitude_origem),
          lng: Number(loja.longitude_origem),
          radiusKm: loja.raio_atendimento_km != null ? Number(loja.raio_atendimento_km) * 2 : undefined,
        }
      : undefined

    const d = await fetchGeocode(googleMapsServerKey, address, bias)

    let dentroDoRaio = true
    let distanciaKm: number | null = null
    let taxaEntrega: number | null = null
    let mensagemRaio: string | null = null

    if (d.lat != null && d.lng != null && loja?.latitude_origem != null && loja?.longitude_origem != null) {
      const rawDistance = haversineDistanceKm(
        Number(loja.latitude_origem),
        Number(loja.longitude_origem),
        d.lat,
        d.lng,
      )
      distanciaKm = Number(rawDistance.toFixed(2))

      const raioMax = loja.raio_atendimento_km != null ? Number(loja.raio_atendimento_km) : null
      if (raioMax != null && distanciaKm > raioMax) {
        dentroDoRaio = false
        mensagemRaio = `Endereço fora do raio de entrega (distância ${distanciaKm} km, máximo permitido ${raioMax} km).`
      } else {
        dentroDoRaio = true
        mensagemRaio = `Endereço dentro do raio de entrega (${distanciaKm} km).`
      }

      if (dentroDoRaio) {
        const distanceFeeRes = await supabase.rpc('calcular_frete_por_distancia', { p_distancia_km: distanciaKm })
        const distanceFee = Number(distanceFeeRes.data ?? loja.taxa_entrega_padrao ?? 0)
        taxaEntrega = resolveDeliveryFee({
          distanceFee,
          merchandiseSubtotal,
          config: loja.config_promocoes as Partial<PromotionConfig> | null,
        })
      }
    } else {
      dentroDoRaio = true
      taxaEntrega = Number(loja?.taxa_entrega_padrao ?? 0)
      mensagemRaio = 'Endereço localizado (raio de entrega não configurado na loja).'
    }

    return {
      formattedAddress: d.formattedAddress,
      lat: d.lat,
      lng: d.lng,
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

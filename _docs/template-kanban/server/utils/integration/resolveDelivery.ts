import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'
import type { PromotionConfig } from '#shared/types/store'
import { haversineDistanceKm } from '../geo/haversine'
import { resolveDeliveryFee } from '../delivery/freeShipping'
import type { InlineAddress } from './createIntegrationOrder'

/**
 * Resolução de ENTREGA da integração (endereço + distância + raio + frete),
 * compartilhada pelo checkout do carrinho e pela encomenda do agente. Centraliza
 * a regra única para os dois fluxos (DRY): não pode divergir entre pedido
 * imediato e encomenda.
 *
 * Para `retirada`, retorna tudo zerado (sem frete/endereço). Para `entrega`:
 *   1. Resolve o endereço (salvo por `enderecoId` OU novo inline).
 *   2. Calcula a distância loja→cliente (Haversine) quando há coordenadas.
 *   3. Valida o raio de atendimento (lança 422 se exceder).
 *   4. Deriva o frete por faixa de km (RPC) e aplica frete grátis por valor.
 */

/** Subconjunto de `loja` necessário para a resolução de entrega. */
export interface LojaDeliveryContext {
  readonly origin_latitude: number | null
  readonly origin_longitude: number | null
  readonly service_radius_km: number | null
  readonly default_delivery_fee: number | null
  readonly promotions_config: unknown
}

/** Endereço novo (inline) no formato do payload de integração. */
export interface DeliveryAddressInput {
  readonly rua: string
  readonly numero: string
  readonly bairro: string
  readonly complemento?: string | null
  readonly cidade?: string | null
  readonly estado?: string | null
  readonly cep?: string | null
  readonly latitude?: number | null
  readonly longitude?: number | null
}

export interface DeliveryResolutionInput {
  readonly tipoEntrega: 'entrega' | 'retirada'
  readonly clienteId: string
  /** Endereço salvo do cliente (mutuamente exclusivo com `endereco`). */
  readonly enderecoId?: string | null
  /** Endereço novo inline (mutuamente exclusivo com `enderecoId`). */
  readonly endereco?: DeliveryAddressInput | null
  /** Subtotal das mercadorias — base do frete grátis por valor. */
  readonly merchandiseSubtotal: number
}

export interface DeliveryResolution {
  readonly enderecoId: string | null
  readonly enderecoNovo: InlineAddress | null
  readonly valorEntrega: number
  readonly freteGratis: boolean
}

const NO_DELIVERY: DeliveryResolution = {
  enderecoId: null,
  enderecoNovo: null,
  valorEntrega: 0,
  freteGratis: false,
}

/** Endereço resolvido + coordenadas (para distância/raio). */
interface ResolvedAddress {
  readonly enderecoId: string | null
  readonly enderecoNovo: InlineAddress | null
  readonly lat: number | null
  readonly lng: number | null
}

/**
 * Resolve o endereço de entrega: salvo (valida posse do cliente) ou novo inline.
 * O endereço novo NÃO é inserido aqui — a RPC o insere na mesma transação do
 * pedido (evita endereço órfão).
 */
async function resolveAddress(
  supabase: SupabaseClient<Database>,
  input: DeliveryResolutionInput,
): Promise<ResolvedAddress> {
  if (input.enderecoId) {
    const { data: saved } = await supabase
      .from('customer_addresses')
      .select('id, customer_id, latitude, longitude')
      .eq('id', input.enderecoId)
      .maybeSingle()

    if (!saved || saved.customer_id !== input.clienteId) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Endereço não encontrado para este cliente.',
      })
    }
    return {
      enderecoId: saved.id,
      enderecoNovo: null,
      lat: saved.latitude != null ? Number(saved.latitude) : null,
      lng: saved.longitude != null ? Number(saved.longitude) : null,
    }
  }

  if (input.endereco) {
    return {
      enderecoId: null,
      enderecoNovo: {
        rua: input.endereco.rua,
        numero: input.endereco.numero,
        bairro: input.endereco.bairro,
        complemento: input.endereco.complemento ?? null,
        cidade: input.endereco.cidade ?? null,
        estado: input.endereco.estado ?? null,
        cep: input.endereco.cep ?? null,
        latitude: input.endereco.latitude ?? null,
        longitude: input.endereco.longitude ?? null,
      },
      lat: input.endereco.latitude ?? null,
      lng: input.endereco.longitude ?? null,
    }
  }

  throw createError({ statusCode: 400, statusMessage: 'Entrega exige endereco ou endereco_id.' })
}

export async function resolveIntegrationDelivery(
  supabase: SupabaseClient<Database>,
  loja: LojaDeliveryContext | null,
  input: DeliveryResolutionInput,
): Promise<DeliveryResolution> {
  if (input.tipoEntrega !== 'entrega') return NO_DELIVERY

  const { enderecoId, enderecoNovo, lat, lng } = await resolveAddress(supabase, input)

  // Distância loja→cliente: valida raio e alimenta o frete por faixa de km.
  // null quando faltam coordenadas — cai no fallback de taxa padrão abaixo.
  let deliveryDistanceKm: number | null = null
  if (lat != null && lng != null && loja?.origin_latitude && loja?.origin_longitude) {
    deliveryDistanceKm = haversineDistanceKm(
      Number(loja.origin_latitude),
      Number(loja.origin_longitude),
      lat,
      lng,
    )
    if (loja.service_radius_km && deliveryDistanceKm > Number(loja.service_radius_km)) {
      throw createError({
        statusCode: 422,
        statusMessage: `Endereço fora do raio de entrega (máximo ${loja.service_radius_km} km, distância ${deliveryDistanceKm.toFixed(1)} km).`,
      })
    }
  }

  // Frete por distância (fallback taxa padrão) + frete grátis por valor.
  const distanceFee = deliveryDistanceKm !== null
    ? Number(
        (await supabase.rpc('calculate_shipping_by_distance', { p_distance_km: deliveryDistanceKm }))
          .data ?? loja?.default_delivery_fee ?? 0,
      )
    : Number(loja?.default_delivery_fee ?? 0)

  const valorEntrega = resolveDeliveryFee({
    distanceFee,
    merchandiseSubtotal: input.merchandiseSubtotal,
    config: loja?.promotions_config as Partial<PromotionConfig> | null,
  })

  return {
    enderecoId,
    enderecoNovo,
    valorEntrega,
    freteGratis: valorEntrega === 0,
  }
}

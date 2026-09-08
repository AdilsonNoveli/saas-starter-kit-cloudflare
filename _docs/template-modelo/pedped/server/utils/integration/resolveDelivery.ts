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
 *   5. Sinaliza `enderecoNaoValidado` (entrega sem coordenadas) para o pedido
 *      nascer pendente (endereço a conferir).
 */

/** Subconjunto de `loja` necessário para a resolução de entrega. */
export interface LojaDeliveryContext {
  readonly latitude_origem: number | null
  readonly longitude_origem: number | null
  readonly raio_atendimento_km: number | null
  readonly taxa_entrega_padrao: number | null
  readonly config_promocoes: unknown
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
  /** true quando entrega sem coordenadas (endereço a conferir → pedido pendente). */
  readonly enderecoNaoValidado: boolean
}

const NO_DELIVERY: DeliveryResolution = {
  enderecoId: null,
  enderecoNovo: null,
  valorEntrega: 0,
  freteGratis: false,
  enderecoNaoValidado: false,
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
      .from('enderecos_cliente')
      .select('id, cliente_id, latitude, longitude')
      .eq('id', input.enderecoId)
      .maybeSingle()

    if (!saved || saved.cliente_id !== input.clienteId) {
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
  // null quando faltam coordenadas → endereço a conferir (pedido pendente).
  let deliveryDistanceKm: number | null = null
  if (lat != null && lng != null && loja?.latitude_origem && loja?.longitude_origem) {
    deliveryDistanceKm = haversineDistanceKm(
      Number(loja.latitude_origem),
      Number(loja.longitude_origem),
      lat,
      lng,
    )
    if (loja.raio_atendimento_km && deliveryDistanceKm > Number(loja.raio_atendimento_km)) {
      throw createError({
        statusCode: 422,
        statusMessage: `Endereço fora do raio de entrega (máximo ${loja.raio_atendimento_km} km, distância ${deliveryDistanceKm.toFixed(1)} km).`,
      })
    }
  }

  // Frete por distância (fallback taxa padrão) + frete grátis por valor.
  const distanceFee = deliveryDistanceKm !== null
    ? Number(
        (await supabase.rpc('calcular_frete_por_distancia', { p_distancia_km: deliveryDistanceKm }))
          .data ?? loja?.taxa_entrega_padrao ?? 0,
      )
    : Number(loja?.taxa_entrega_padrao ?? 0)

  const valorEntrega = resolveDeliveryFee({
    distanceFee,
    merchandiseSubtotal: input.merchandiseSubtotal,
    config: loja?.config_promocoes as Partial<PromotionConfig> | null,
  })

  return {
    enderecoId,
    enderecoNovo,
    valorEntrega,
    freteGratis: valorEntrega === 0,
    enderecoNaoValidado: deliveryDistanceKm === null,
  }
}

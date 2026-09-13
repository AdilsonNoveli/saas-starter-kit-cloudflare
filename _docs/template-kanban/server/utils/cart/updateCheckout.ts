import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import type { IntegrationCartState } from '#shared/types/integration'
import { haversineDistanceKm } from '../geo/haversine'
import { fetchGeocode, type GeocodeBias } from '../maps/google'
import { findOrCreateCustomer } from '../customers/findOrCreateCustomer'
import { requireActiveSession, getCartState } from './state'

interface LojaOrigem {
  origin_latitude: number | string | null
  origin_longitude: number | string | null
  service_radius_km: number | string | null
}

/**
 * `AtualizarPedido` — extraída de `cart/index.patch.ts` (seção 6 da
 * arquitetura do agente WhatsApp). Grava incrementalmente o estado de
 * checkout da sessão (modalidade/pagamento/endereço). Só persiste os campos
 * enviados; o agente chama isto a cada dado coletado, nunca reenvia tudo.
 * Sempre devolve o estado completo do carrinho (Feature 1.2 — EPIC 1).
 *
 * Endereço: `address_id` referencia um endereço já salvo do cliente. Um
 * endereço NOVO (retornado por `ConsultarEnderecoEntrega`) é enviado em
 * `endereco` — esta função o salva no cadastro do cliente e grava o
 * `address_id` resultante, para que o checkout só precise ler um FK
 * (Feature 1.4: finalização vira commit puro, sem dados de negócio no body).
 */
export interface UpdateCheckoutAddressInput {
  rua: string
  numero: string
  bairro: string
  complemento?: string
  cidade?: string
  estado?: string
  cep?: string
  latitude?: number
  longitude?: number
}

export interface UpdateCheckoutParams {
  sessao_id: string
  delivery_mode?: 'entrega' | 'retirada'
  payment_method?: 'pix' | 'dinheiro' | 'cartao'
  /** Mutuamente exclusivo com `endereco` — validado no schema do chamador. */
  address_id?: string
  /** Mutuamente exclusivo com `address_id` — validado no schema do chamador. */
  endereco?: UpdateCheckoutAddressInput
  /**
   * Necessária quando `endereco` é enviado: usada para regeocodificar o
   * endereço no servidor em vez de confiar em `latitude`/`longitude`
   * informadas pelo agente (ver nota em `resolveGeocodedEndereco`).
   */
  googleMapsServerKey?: string
  /**
   * Telefone informado pelo cliente para IDENTIFICAR uma sessão anônima (canal
   * COMPRA EXPRESSA, migration 122). Só tem efeito quando a sessão ainda não
   * tem cliente: aí `findOrCreateCustomer` resolve/cria o cadastro e a sessão
   * passa a apontar para ele.
   *
   * Mora aqui, e não numa 10ª tool, porque `AtualizarPedido` já é a tool que
   * grava estado de checkout incrementalmente — o telefone é só mais um dado
   * que o cliente informa no meio do fechamento. (`AtualizarContexto` seria o
   * lugar errado: aquela tool é memória durável e proíbe explicitamente dado
   * do pedido atual.)
   */
  whatsapp?: string
}

/**
 * Regeocodifica `endereco` no servidor a partir do texto (rua/numero/bairro/
 * cidade/estado) em vez de confiar em `latitude`/`longitude` vindas do
 * agente de IA.
 *
 * `AtualizarPedido` aceita lat/lng como parâmetros soltos porque o fluxo
 * normal é o agente repassar o que `ConsultarEnderecoEntrega` acabou de
 * retornar. Mas nada amarra essas coordenadas ao texto do endereço sendo
 * gravado nesta chamada: se o agente reaproveitar da memória da conversa as
 * coordenadas de um endereço ANTERIOR (ex.: cliente manda um segundo
 * endereço e o agente esquece de chamar `ConsultarEnderecoEntrega` de novo),
 * `assertDeliverableAddress` valida o raio contra o endereço errado e o
 * pedido sai com o texto de um endereço e as coordenadas de outro — bug
 * observado em produção em 04/08 (endereço a ~7 km cotado como dentro do
 * raio com frete grátis). Regeocodificar aqui, a partir do texto que está
 * de fato sendo salvo, elimina essa classe de erro independente do que o
 * agente mandou.
 */
async function resolveGeocodedEndereco(
  googleMapsServerKey: string | undefined,
  endereco: UpdateCheckoutAddressInput,
  loja: LojaOrigem | null | undefined,
): Promise<UpdateCheckoutAddressInput> {
  if (!googleMapsServerKey) {
    logger.warn('[checkout] endereço novo sem googleMapsServerKey — coordenadas não regeocodificadas no servidor')
    return endereco
  }

  const partes = [
    [endereco.rua, endereco.numero].filter(Boolean).join(', '),
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
  ].filter(Boolean)
  const enderecoTexto = partes.join(' - ')

  // Enviesa o geocode para perto da loja — mesmo motivo de `geocodeAddress.ts`:
  // desambiguar nomes de rua repetidos entre cidades.
  const bias: GeocodeBias | undefined = loja?.origin_latitude != null && loja?.origin_longitude != null
    ? {
        lat: Number(loja.origin_latitude),
        lng: Number(loja.origin_longitude),
        radiusKm: loja.service_radius_km != null ? Number(loja.service_radius_km) * 2 : undefined,
      }
    : undefined

  const geo = await fetchGeocode(googleMapsServerKey, enderecoTexto, bias)

  return {
    ...endereco,
    bairro: geo.bairro || endereco.bairro,
    cidade: geo.cidade || endereco.cidade,
    estado: geo.uf || endereco.estado,
    cep: geo.cep || endereco.cep,
    latitude: geo.lat,
    longitude: geo.lng,
  }
}

/**
 * Recusa endereço novo fora do raio quando a modalidade é ENTREGA.
 *
 * Deliberadamente **permissiva nas ausências**, igual a
 * `resolveIntegrationDelivery` (`resolveDelivery.ts:145`) e a `geocodeAddress`:
 * sem coordenadas do endereço, sem origem da loja ou sem raio configurado, não
 * há distância para comparar e **nada é bloqueado** — endereço a conferir é
 * caso previsto do fluxo (vira pedido pendente), e transformá-lo em erro aqui
 * quebraria pedido que hoje fecha. Bloquear exige as três informações.
 *
 * A leitura de `loja` usa `LIMIT 1` sem `ORDER BY` como o resto do sistema, e
 * isso agora é exato: a migration 102 tornou a tabela singleton.
 */
function assertDeliverableAddress(
  input: {
    endereco: UpdateCheckoutAddressInput
    deliveryMode: string | null | undefined
    sessaoId: string
    loja: LojaOrigem | null | undefined
  },
): void {
  if (input.deliveryMode !== 'entrega') return

  const { latitude, longitude } = input.endereco
  if (latitude == null || longitude == null) {
    // Sem coordenadas não há o que comparar. Registrado porque significa que o
    // agente gravou endereço sem passar por `ConsultarEnderecoEntrega` — o raio
    // só será conferido no fechamento, que é justamente o que se quer evitar.
    logger.warn('[checkout] endereço novo para entrega sem coordenadas — raio não verificado', {
      sessao_id: input.sessaoId,
    })
    return
  }

  const loja = input.loja
  const raioMax = loja?.service_radius_km != null ? Number(loja.service_radius_km) : null
  if (loja?.origin_latitude == null || loja?.origin_longitude == null || raioMax == null) return

  const distanciaKm = Number(haversineDistanceKm(
    Number(loja.origin_latitude),
    Number(loja.origin_longitude),
    latitude,
    longitude,
  ).toFixed(2))

  if (distanciaKm <= raioMax) return

  logger.warn('[checkout] endereço novo recusado — fora do raio de entrega', {
    sessao_id: input.sessaoId,
    distancia_km: distanciaKm,
    raio_km: raioMax,
  })

  throw createError({
    statusCode: 422,
    statusMessage: `Endereço fora do raio de entrega (distância ${distanciaKm} km, máximo permitido ${raioMax} km). Ofereça RETIRADA ou peça outro endereço.`,
  })
}

/**
 * Vincula uma sessão anônima ao cliente do telefone informado (COMPRA EXPRESSA).
 *
 * `findOrCreateCustomer` é reaproveitado tal como está: ele já normaliza o
 * número, valida o formato (400 em número inválido — o agente lê a mensagem e
 * pede de novo, REGRA 4) e faz find-or-create. `isVisitante: true` porque este
 * cadastro nasce de uma compra no site, exatamente como o de
 * `session/create-direct.post.ts`.
 */
async function promoteAnonymousSession(
  supabase: SupabaseClient<Database>,
  sessaoId: string,
  whatsapp: string,
): Promise<string> {
  const cliente = await findOrCreateCustomer(supabase, { whatsapp, isVisitante: true })

  const { error } = await supabase
    .from('sessions')
    .update({ customer_id: cliente.id })
    .eq('id', sessaoId)

  if (error) {
    // Falhar alto aqui é o certo: seguir com o `customer_id` só em memória
    // gravaria endereço para um cliente que a sessão nunca vai reconhecer, e o
    // 422 de `finalizeCheckout` voltaria no turno seguinte sem explicação.
    logger.error('[checkout] falha ao vincular cliente à sessão anônima', {
      sessao_id: sessaoId,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao identificar o cliente na sessão.' })
  }

  return cliente.id
}

export async function updateCheckout(
  supabase: SupabaseClient<Database>,
  params: UpdateCheckoutParams,
): Promise<IntegrationCartState> {
  const { sessao_id, delivery_mode, payment_method, googleMapsServerKey, whatsapp } = params
  let { address_id, endereco } = params
  const sessao = await requireActiveSession(supabase, sessao_id)

  // Promoção da sessão anônima (COMPRA EXPRESSA): o visitante navegou e montou
  // o carrinho sem se identificar, e agora informou o número porque o
  // fechamento exige. Acontece ANTES de qualquer checagem de propriedade de
  // endereço de propósito — o mesmo turno costuma trazer telefone e endereço
  // juntos, e usar o `customer_id` nulo do objeto `sessao` (já lido acima)
  // recusaria o endereço de um cliente que acabou de existir.
  //
  // Nunca sobrescreve um vínculo existente: sessão já identificada ignora o
  // parâmetro, senão um número digitado errado num turno tardio sequestraria o
  // carrinho de outro cadastro.
  const clienteId = whatsapp && !sessao.customer_id
    ? await promoteAnonymousSession(supabase, sessao_id, whatsapp)
    : sessao.customer_id

  if (address_id) {
    const { data: existing } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('id', address_id)
      .eq('customer_id', clienteId ?? '')
      .maybeSingle()

    if (!existing) {
      throw createError({ statusCode: 422, statusMessage: 'Endereço não encontrado para este cliente.' })
    }
  }

  if (endereco) {
    if (!clienteId) {
      throw createError({ statusCode: 422, statusMessage: 'Sessão sem cliente vinculado.' })
    }

    // Lida uma vez só: usada tanto para enviesar o geocode (`resolveGeocodedEndereco`)
    // quanto para conferir o raio (`assertDeliverableAddress`) — mesma leitura,
    // `LIMIT 1` sem `ORDER BY` como o resto do sistema (migration 102 tornou a
    // tabela singleton).
    const { data: loja } = await supabase
      .from('store')
      .select('origin_latitude, origin_longitude, service_radius_km')
      .limit(1)
      .maybeSingle()

    endereco = await resolveGeocodedEndereco(googleMapsServerKey, endereco, loja)

    // Cobertura de entrega é conferida AQUI, ao gravar o endereço — não só no
    // fechamento. Antes, a única barreira dura era `resolveIntegrationDelivery`
    // (`finalizeCheckout`); a checagem do endereço novo existia apenas como
    // instrução de prompt em `ConsultarEnderecoEntrega`. Em 02/08 o agente
    // anunciou "sem taxa de entrega" para um endereço a 16 km (raio 15 km) e o
    // cliente só descobriu ao confirmar o pedido. Regra do produto: endereço
    // novo se valida na hora; checkout é fechamento.
    //
    // Fica no ponto que GRAVA, não no que consulta: assim a regra não depende
    // de o modelo lembrar de chamar a tool certa nem de ler o `dentro_do_raio`
    // do retorno.
    assertDeliverableAddress({
      endereco,
      // `delivery_mode` pode não vir nesta chamada (a tool grava incrementalmente):
      // vale o que está sendo definido agora, senão o que já está na sessão.
      deliveryMode: delivery_mode ?? sessao.delivery_mode,
      sessaoId: sessao_id,
      loja,
    })

    const { data: novo, error: insertErr } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: clienteId,
        street: endereco.rua,
        number: endereco.numero,
        neighborhood: endereco.bairro,
        complement: endereco.complemento ?? null,
        city: endereco.cidade ?? null,
        state: endereco.estado ?? null,
        zip_code: endereco.cep ?? null,
        latitude: endereco.latitude ?? null,
        longitude: endereco.longitude ?? null,
      })
      .select('id')
      .single()

    if (insertErr || !novo) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao salvar o endereço.' })
    }
    address_id = novo.id
  }

  const { error } = await supabase
    .from('sessions')
    .update({
      ...(delivery_mode !== undefined && { delivery_mode }),
      ...(payment_method !== undefined && { payment_method }),
      ...(address_id !== undefined && { address_id }),
    })
    .eq('id', sessao_id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao gravar o estado de checkout.' })
  }

  return getCartState(supabase, sessao_id)
}

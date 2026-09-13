/**
 * Cliente server-side da Google Maps Platform (BFF).
 *
 * A CHAVE PRIVADA (`NUXT_GOOGLE_MAPS_SERVER_KEY`) vive só aqui — restrita por
 * IP e às APIs Places/Geocoding/Routes no console. Nunca chega ao cliente.
 *
 * Responsabilidades:
 *   • Ler a chave do runtimeConfig (falha clara 503 se ausente).
 *   • Sanitizar o input do usuário antes de repassar à Google.
 *   • Chamar os endpoints REST oficiais com FieldMask (custo + payload mínimos).
 *   • Traduzir erros/cotas da Google em erros amigáveis, logando detalhe seguro.
 *   • Devolver apenas o payload estritamente necessário ao checkout.
 *
 * Docs oficiais:
 *   Places Autocomplete (New): https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 *   Place Details (New):       https://developers.google.com/maps/documentation/places/web-service/place-details
 *   Geocoding:                 https://developers.google.com/maps/documentation/geocoding/requests-geocoding
 */

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { AddressDetails, AddressSuggestion } from '#shared/types/maps'

const PLACES_BASE = 'https://places.googleapis.com/v1'
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const REGION = 'br'
const LANGUAGE = 'pt-BR'

/** Lê a chave privada do servidor; 503 claro se não configurada. */
function getServerKey(event: H3Event): string {
  return requireServerKey((useRuntimeConfig(event).googleMapsServerKey as string) || '')
}

/**
 * Mesma validação de {@link getServerKey}, mas para chamadores sem `H3Event`
 * (agente WhatsApp — consumer de fila do Cloudflare Workers não recebe
 * `H3Event`, só `{ batch, env, context }`). O chamador resolve a chave a
 * partir do contexto que tiver disponível (`useRuntimeConfig(event)` em rota
 * HTTP, `env.NUXT_GOOGLE_MAPS_SERVER_KEY` no consumer) e repassa aqui.
 */
export function requireServerKey(key: string): string {
  if (!key) {
    logger.error('[maps] NUXT_GOOGLE_MAPS_SERVER_KEY ausente — BFF de endereços indisponível')
    throw createError({ statusCode: 503, statusMessage: 'Serviço de endereços indisponível.' })
  }
  return key
}

/**
 * Sanitiza texto livre antes de repassar à Google:
 *   • remove caracteres de controle (inclui quebras de linha e NUL);
 *   • colapsa espaços repetidos e apara as bordas;
 *   • aplica limite de tamanho.
 * Lança 400 se o resultado for curto demais para ser uma busca útil.
 */
export function sanitizeSearchInput(raw: unknown, opts: { min?: number; max?: number } = {}): string {
  const min = opts.min ?? 3
  const max = opts.max ?? 200
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetro de busca inválido.' })
  }
  // Remove caracteres de controle (code point < 0x20 ou 0x7F) sem regex de controle,
  // colapsa espacos repetidos e apara as bordas.
  let filtered = ''
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0
    filtered += code < 0x20 || code === 0x7f ? ' ' : ch
  }
  const cleaned = filtered.replace(/\s+/g, ' ').trim().slice(0, max)
  if (cleaned.length < min) {
    throw createError({ statusCode: 400, statusMessage: `Busca deve ter ao menos ${min} caracteres.` })
  }
  return cleaned
}

/** place_id da Google: alfanumérico + `-` e `_`. Valida formato para evitar SSRF de path. */
export function sanitizePlaceId(raw: unknown): string {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{5,512}$/.test(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'place_id inválido.' })
  }
  return raw
}

// ── Normalização de componentes de endereço ──────────────────────────────────
interface NormalizedComponent {
  readonly long: string
  readonly short: string
  readonly types: readonly string[]
}

function pick(components: readonly NormalizedComponent[], types: readonly string[], useShort = false): string | null {
  for (const t of types) {
    const hit = components.find((c) => c.types.includes(t))
    if (hit) return (useShort ? hit.short : hit.long) || null
  }
  return null
}

function mapComponents(components: readonly NormalizedComponent[]): Omit<AddressDetails, 'placeId' | 'formattedAddress' | 'lat' | 'lng'> {
  return {
    rua: pick(components, ['route']),
    numero: pick(components, ['street_number']),
    bairro: pick(components, ['sublocality_level_1', 'sublocality', 'neighborhood']),
    cidade: pick(components, ['administrative_area_level_2', 'locality']),
    uf: pick(components, ['administrative_area_level_1'], true),
    cep: pick(components, ['postal_code']),
  }
}

/** Traduz falhas de rede/HTTP da Google em erro amigável, logando o detalhe. */
function failGoogle(context: string, detail: Record<string, unknown>): never {
  logger.error(`[maps] falha Google (${context})`, detail)
  throw createError({
    statusCode: 502,
    statusMessage: 'Serviço de endereços temporariamente indisponível. Tente novamente.',
    // Em DEV, devolve o detalhe da Google ao cliente para diagnóstico rápido.
    // Em produção fica oculto (só no log) para não expor a estrutura interna.
    ...(import.meta.dev ? { data: { context, ...detail } } : {}),
  })
}

// ── Places Autocomplete (New) ────────────────────────────────────────────────
interface GooglePlacePrediction {
  placePrediction?: {
    placeId?: string
    text?: { text?: string }
    structuredFormat?: {
      mainText?: { text?: string }
      secondaryText?: { text?: string }
    }
  }
}
interface GoogleAutocompleteResponse {
  suggestions?: GooglePlacePrediction[]
}

export async function fetchAutocomplete(
  event: H3Event,
  input: string,
  sessionToken?: string,
): Promise<AddressSuggestion[]> {
  const key = getServerKey(event)
  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: [REGION],
      languageCode: LANGUAGE,
      ...(sessionToken ? { sessionToken } : {}),
    }),
  }).catch((e: unknown) => failGoogle('autocomplete:network', { error: (e as Error).message }))

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    failGoogle('autocomplete:http', { status: res.status, body: body.slice(0, 500) })
  }

  const data = (await res.json().catch(() => ({}))) as GoogleAutocompleteResponse
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<GooglePlacePrediction['placePrediction']> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId as string,
      description: p.text?.text ?? '',
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
    }))
}

// ── Place Details (New) ──────────────────────────────────────────────────────
interface GooglePlaceDetails {
  id?: string
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>
}

export async function fetchPlaceDetails(
  event: H3Event,
  placeId: string,
  sessionToken?: string,
): Promise<AddressDetails> {
  const key = getServerKey(event)
  const url = new URL(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`)
  url.searchParams.set('languageCode', LANGUAGE)
  url.searchParams.set('regionCode', REGION)
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken)

  const res = await fetch(url.toString(), {
    headers: {
      'X-Goog-Api-Key': key,
      // FieldMask: cobra e devolve apenas estes campos.
      'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents',
    },
  }).catch((e: unknown) => failGoogle('place:network', { error: (e as Error).message }))

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    failGoogle('place:http', { status: res.status, placeId, body: body.slice(0, 500) })
  }

  const data = (await res.json().catch(() => ({}))) as GooglePlaceDetails
  const lat = data.location?.latitude
  const lng = data.location?.longitude
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    failGoogle('place:no-location', { placeId })
  }

  const components: NormalizedComponent[] = (data.addressComponents ?? []).map((c) => ({
    long: c.longText ?? '',
    short: c.shortText ?? '',
    types: c.types ?? [],
  }))

  return {
    placeId: data.id ?? placeId,
    formattedAddress: data.formattedAddress ?? '',
    lat: lat as number,
    lng: lng as number,
    ...mapComponents(components),
  }
}

// ── Geocoding ────────────────────────────────────────────────────────────────
interface GoogleGeocodeResponse {
  status: string
  error_message?: string
  results?: Array<{
    formatted_address?: string
    geometry?: { location?: { lat?: number; lng?: number } }
    address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>
  }>
}

/** Centro + raio (km) usados para enviesar o geocoding para perto da loja (`fetchGeocode`'s `bounds`). */
export interface GeocodeBias {
  lat: number
  lng: number
  radiusKm?: number
}

/**
 * `bounds` da Geocoding API é um viewport de VIÉS, não uma restrição rígida —
 * a Google pode retornar um resultado fora dele se não achar nada dentro.
 * Por isso é seguro passar sempre que a loja tiver coordenadas: só ajuda a
 * desambiguar nomes de rua repetidos entre cidades (o `region=br` sozinho
 * cobre o país inteiro e não resolve isso), sem bloquear endereço legítimo
 * perto da borda do raio de entrega.
 */
function boundsParam(bias: GeocodeBias): string {
  // Raio generoso (padrão 30 km, nunca menor que 20 km) para não excluir
  // endereços válidos perto da borda do raio de entrega da loja.
  const radiusKm = Math.max(bias.radiusKm ?? 30, 20)
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((bias.lat * Math.PI) / 180))
  const south = bias.lat - latDelta
  const north = bias.lat + latDelta
  const west = bias.lng - lngDelta
  const east = bias.lng + lngDelta
  return `${south},${west}|${north},${east}`
}

export async function fetchGeocode(serverKey: string, address: string, bias?: GeocodeBias): Promise<AddressDetails> {
  const key = requireServerKey(serverKey)
  const url = new URL(GEOCODE_URL)
  url.searchParams.set('address', address)
  url.searchParams.set('region', REGION)
  url.searchParams.set('language', LANGUAGE)
  if (bias) url.searchParams.set('bounds', boundsParam(bias))
  url.searchParams.set('key', key)

  const res = await fetch(url.toString())
    .catch((e: unknown) => failGoogle('geocode:network', { error: (e as Error).message }))

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    failGoogle('geocode:http', { status: res.status, body: body.slice(0, 500) })
  }

  const data = (await res.json().catch(() => ({ status: 'PARSE_ERROR' }))) as GoogleGeocodeResponse

  if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
    logger.warn('[maps/geocode] endereço não encontrado', { address, status: data.status, biased: Boolean(bias) })
    throw createError({ statusCode: 404, statusMessage: 'Endereço não encontrado.' })
  }
  if (data.status !== 'OK') {
    // OVER_QUERY_LIMIT / REQUEST_DENIED / INVALID_REQUEST etc. — detalhe fica no log.
    failGoogle('geocode:status', { status: data.status, error_message: data.error_message })
  }

  const top = data.results[0]
  const lat = top?.geometry?.location?.lat
  const lng = top?.geometry?.location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    failGoogle('geocode:no-location', { status: data.status })
  }

  const components: NormalizedComponent[] = (top?.address_components ?? []).map((c) => ({
    long: c.long_name ?? '',
    short: c.short_name ?? '',
    types: c.types ?? [],
  }))

  return {
    placeId: null,
    formattedAddress: top?.formatted_address ?? '',
    lat: lat as number,
    lng: lng as number,
    ...mapComponents(components),
  }
}

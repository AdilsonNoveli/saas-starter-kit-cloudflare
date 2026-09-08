/**
 * Contratos do BFF de endereços (Google Maps Platform via proxy server-side).
 *
 * O frontend NUNCA fala com a Google diretamente: consome apenas `/api/maps/*`.
 * Estes tipos definem o payload MÍNIMO devolvido ao cliente — metadados
 * irrelevantes da Google são descartados no servidor (economia de banda +
 * não expõe a estrutura interna da resposta da Google).
 */

/** Sugestão de autocomplete (Places Autocomplete New). */
export interface AddressSuggestion {
  /** place_id opaco da Google — usado para buscar detalhes. */
  readonly placeId: string
  /** Texto completo da sugestão (ex.: "Rua X, 123 - Bairro, Cidade - UF"). */
  readonly description: string
  /** Linha principal (normalmente a rua). */
  readonly mainText: string
  /** Linha secundária (bairro/cidade/UF). */
  readonly secondaryText: string
}

/** Resposta de `GET /api/maps/autocomplete`. */
export interface AutocompleteResponse {
  readonly suggestions: readonly AddressSuggestion[]
}

/** Detalhes resolvidos de um endereço (Place Details New ou Geocoding). */
export interface AddressDetails {
  readonly placeId: string | null
  readonly formattedAddress: string
  readonly lat: number
  readonly lng: number
  readonly rua: string | null
  readonly numero: string | null
  readonly bairro: string | null
  readonly cidade: string | null
  readonly uf: string | null
  readonly cep: string | null
}

/** Resposta de `GET /api/maps/geocode` (subconjunto de AddressDetails + cobertura de entrega). */
export interface GeocodeResponse {
  readonly formattedAddress: string
  readonly lat: number
  readonly lng: number
  readonly bairro: string | null
  readonly cidade: string | null
  readonly uf: string | null
  readonly cep: string | null
  /** Indica se o endereço está dentro do raio de atendimento da loja. */
  readonly dentro_do_raio?: boolean
  /** Distância em km entre a loja e o endereço. */
  readonly distancia_km?: number | null
  /** Taxa de entrega calculada para o endereço (em R$). */
  readonly taxa_entrega?: number | null
  /** Mensagem explicativa sobre a cobertura de entrega. */
  readonly mensagem_raio?: string | null
}


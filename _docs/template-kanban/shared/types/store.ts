/**
 * Store-related shared contracts consumed by both client and server.
 * Exposes only the public subset of the `store` table needed by the frontend.
 * Sensitive/admin columns (cnpj, etc.) must be read via admin endpoints only.
 * Note: chave_pix (pix_key) is intentionally public — displayed on customer receipts.
 */

/**
 * Store operational status — mirrors the CHECK constraint on `loja.status_operacao`.
 *  - `automatico`: follows the weekly schedule `config_horarios`.
 *  - `aberta` / `fechada` / `pausada`: manual operator override.
 */
export type OperationStatus = 'aberta' | 'fechada' | 'pausada' | 'automatico'

/** Configuration for a single weekday in `config_horarios`. Times are `HH:mm` (24h, local). */
export interface DayScheduleConfig {
  readonly aberto: boolean
  readonly inicio: string
  readonly fim: string
}

/** Weekday → operating window map. Keys: '0' (Sunday) .. '6' (Saturday) per `Date.getDay()`. */
export type StoreScheduleConfig = Readonly<Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', DayScheduleConfig>>

/** Global upsell / promotion settings (not to be confused with the `promocoes` table). */
export interface PromotionConfig {
  readonly habilitar_upsell_frete: boolean
  readonly meta_frete_gratis: number
  /** Exibe a barra de progresso do frete grátis no carrinho e no checkout. */
  readonly habilitar_toast_upsell: boolean
  /** Mensagem ao atingir a meta. */
  readonly copy_upsell_success: string
  /** Mensagem de progresso; use `{valor}` como placeholder do quanto falta. */
  readonly copy_upsell_progress: string
  readonly mostrar_miniaturas_card?: boolean
}

export type BorderRadiusOption = 'none' | 'sm' | 'md' | 'lg' | 'full'

/**
 * Raio das bordas para cartões, caixas e contêineres no catálogo.
 * Valores padronizados com estética quadrada e enterprise-grade (zero cantos excessivos).
 */
export const CARD_RADIUS_MAP: Record<BorderRadiusOption, string> = {
  none: '0px',
  sm: '2px',
  md: '6px', // Padrão: mais quadrado, limpo e enterprise
  lg: '10px',
  full: '14px',
} as const

/**
 * Raio das bordas para botões no catálogo.
 */
export const BTN_RADIUS_MAP: Record<BorderRadiusOption, string> = {
  none: '0px',
  sm: '2px',
  md: '4px', // Padrão: mais quadrado e limpo
  lg: '6px',
  full: '9999px',
} as const

export const DEFAULT_CARD_RADIUS = CARD_RADIUS_MAP.md // '6px'
export const DEFAULT_BTN_RADIUS = BTN_RADIUS_MAP.md // '4px'

/**
 * Public subset of the store consumed by the client (catalogue, login, layouts, cart store).
 * Null strings are preserved to faithfully reflect the database — the UI handles display.
 */
export interface StorePublic {
  readonly id: string
  readonly nome_fantasia: string
  readonly cnpj: string | null
  readonly logomarca: string | null
  readonly logomarca_dark: string | null
  readonly whatsapp_atendimento: string | null
  readonly taxa_entrega_padrao: number
  readonly permite_retirada: boolean
  readonly raio_atendimento_km: number | null
  readonly latitude_origem: number | null
  readonly longitude_origem: number | null
  readonly endereco_rua: string | null
  readonly endereco_numero: string | null
  readonly endereco_bairro: string | null
  readonly endereco_cidade: string | null
  readonly endereco_uf: string | null
  readonly endereco_cep: string | null
  readonly status_operacao: OperationStatus
  readonly status_override_data: string | null
  readonly config_horarios: StoreScheduleConfig
  readonly config_promocoes: PromotionConfig
  readonly chave_pix: string | null
  readonly config_loja_fechada: StoreFechadaConfig
  readonly tema_catalogo: 'light' | 'dark' | 'system'
  readonly config_layout: {
    brand_color?: string
    brand_hover_color?: string
    header_bg_color?: string
    header_buttons_bg_color?: string
    header_buttons_text_color?: string
    layout_categoria?: 'nome' | 'card'
    border_radius?: BorderRadiusOption
    banner_hero_url?: string
    whatsapp_flutuante_ativo?: boolean
    whatsapp_flutuante_texto?: string
    product_view_mode?: 'modal' | 'page'
  } | null
}

/** One rule in the order archiving config. */
export interface ArchiveRule {
  readonly status: string
  readonly horas: number
}

/**
 * Archiving rules stored in loja.config_pedidos.
 * `regras_arquivamento`: per-status rules (archive after N hours of inactivity).
 * `horas_fallback`: catch-all — archive any order older than N hours regardless of status.
 * `permitir_editar_kanban`: enables column management (add/edit/reorder/delete of
 *   non-system columns) on the orders Kanban. Optional for backwards compatibility
 *   with rows saved before the flag existed — absent means `false`.
 */
export interface PedidosConfig {
  readonly regras_arquivamento: readonly ArchiveRule[]
  readonly horas_fallback: number
  readonly permitir_editar_kanban?: boolean
}

/** Configuration for the store-closed page shown to customers. */
export interface StoreFechadaConfig {
  readonly titulo: string
  readonly mensagem_custom: string
  readonly mostrar_horarios: boolean
  readonly mostrar_whatsapp: boolean
  readonly mostrar_endereco: boolean
  /**
   * When false: catalog remains accessible when the store is closed;
   * only order finalization (checkout submit) is blocked server-side.
   * When true (default): redirects to /catalog/store-closed.
   */
  readonly mostrar_pagina_fechada: boolean
  /**
   * When true (default): shows a narrow warning banner below categories
   * informing customers the store is closed and when it reopens.
   * Only relevant when mostrar_pagina_fechada is false.
   */
  readonly mostrar_faixa_fechada: boolean
  /** URL da imagem personalizada enviada pelo admin (fallback para /icons/storefront.svg). */
  readonly imagem_url?: string
}

export const DEFAULT_LOJA_FECHADA_CONFIG: StoreFechadaConfig = {
  titulo: '',
  mensagem_custom: '',
  mostrar_horarios: true,
  mostrar_whatsapp: true,
  mostrar_endereco: false,
  mostrar_pagina_fechada: true,
  mostrar_faixa_fechada: true,
  imagem_url: '',
}

/** Default config — mirrors the hardcoded values in earlier archive logic. */
export const DEFAULT_PEDIDOS_CONFIG: PedidosConfig = {
  regras_arquivamento: [
    { status: 'entregue', horas: 6 },
    { status: 'cancelado', horas: 6 },
  ],
  horas_fallback: 48,
  permitir_editar_kanban: false,
}

/**
 * Public columns list for `store` — single source for the `select(...)` call.
 * `store` (ex-`loja`) was renamed to English at the DB layer; this list uses
 * PostgREST aliases (`alias:column`) so the response keeps matching the
 * `StorePublic` shape below without forcing a rename across every consumer.
 */
export const STORE_PUBLIC_COLUMNS = [
  'id',
  'nome_fantasia:trade_name',
  'cnpj',
  'logomarca:logo_url',
  'logomarca_dark:logo_url_dark',
  'whatsapp_atendimento:support_whatsapp_number',
  'taxa_entrega_padrao:default_delivery_fee',
  'permite_retirada:allows_pickup',
  'raio_atendimento_km:service_radius_km',
  'latitude_origem:origin_latitude',
  'longitude_origem:origin_longitude',
  'endereco_rua:address_street',
  'endereco_numero:address_number',
  'endereco_bairro:address_neighborhood',
  'endereco_cidade:address_city',
  'endereco_uf:address_state',
  'endereco_cep:address_zip_code',
  'status_operacao:operation_status',
  'status_override_data:status_override_date',
  'config_horarios:hours_config',
  'config_promocoes:promotions_config',
  'chave_pix:pix_key',
  'config_loja_fechada:closed_store_config',
  'tema_catalogo:catalog_theme',
].join(',') as string

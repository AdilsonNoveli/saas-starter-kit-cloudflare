/**
 * Contratos compartilhados do sistema de outbox de webhooks (Fase 2.11/3.6).
 *
 * `dispatchWebhook` enfileira em `webhook_outbox`; o worker drena com
 * backoff exponencial e idempotência (event_id como Idempotency-Key).
 */

/**
 * Eventos canônicos disparados pelo sistema. Mantido como union literal
 * para evitar typos ao chamar `dispatchWebhook(...)`.
 */
export const WEBHOOK_EVENTS = [
  'pedido.criado',
  'pedido.status_alterado',
  'entrega.atribuida',
] as const
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

/**
 * Credenciais de SAÍDA do webhook, juntas porque são inseparáveis no envio e
 * porque assim o caminho que já levava o token até o worker não precisa
 * carregar um segundo parâmetro por código que nada tem a ver com credencial
 * (`finalizeCheckout`, `toolContext`). Rotação futura entra aqui, não na
 * assinatura de meia dúzia de funções.
 */
export interface WebhookOutboundCredentials {
  /** `Authorization: Bearer` — autentica o canal. */
  readonly token: string
  /** Chave do HMAC sobre o corpo — autentica a mensagem (ver `signature.ts`). */
  readonly signingSecret: string
}

/**
 * Status do registro no outbox. Espelha `webhook_outbox_status_enum` no banco.
 */
export type WebhookOutboxStatus =
  | 'pendente'
  | 'enviando'
  | 'enviado'
  | 'falha'
  | 'morto'

export interface WebhookOutboxRow {
  id: string
  event_id: string
  event: string
  payload: Record<string, unknown>
  destination_url: string
  status: WebhookOutboxStatus
  attempts: number
  max_attempts: number
  next_retry_at: string
  last_error: string | null
  http_status: number | null
  created_at: string
  sent_at: string | null
}

export interface WorkerRunResult {
  picked: number
  enviados: number
  falhas: number
  mortos: number
  /**
   * Preenchido quando a rodada foi **recusada** antes de reservar qualquer
   * linha — hoje só por falta do token de saída. Distingue "não havia nada a
   * enviar" (zeros) de "havia, e o worker se recusou a enviar sem credencial",
   * que de outro modo sairiam idênticos para quem chama.
   */
  recusado?: WebhookRefusalReason
}

/**
 * Por que uma rodada do worker foi recusada antes de reservar qualquer linha.
 * Sempre falta de segredo: sem credencial não se envia dado de cliente, e sem
 * segredo de assinatura o receptor não tem como provar integridade.
 */
export type WebhookRefusalReason = 'sem_token' | 'sem_segredo_de_assinatura'

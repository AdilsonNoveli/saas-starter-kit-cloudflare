import type { H3Event } from 'h3'
import { createError, getRouterParam } from 'h3'
import { safeCompare } from '../security/safeCompare'

/**
 * Autenticação do webhook do WhatsApp (seção 3 da arquitetura do agente
 * WhatsApp). Nem a Meta nem o provedor enviam `X-Hub-Signature-256` ou
 * qualquer assinatura HMAC — a proteção de entrada não pode depender disso.
 *
 * Decisão: token imprevisível embutido no próprio PATH da URL (não header,
 * não query string), gerado por nós e configurado como a URL de destino no
 * painel do provedor — ex. `/api/whatsapp/webhook/<token>`. A rota (construída
 * na seção 12, passo 7) expõe o segmento dinâmico via `getRouterParam(event,
 * 'token')`, comparado aqui em tempo constante (`safeCompare`).
 */
export function requireMatchingWebhookToken(
  provided: string | undefined | null,
  expected: string,
): void {
  if (!expected) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Webhook do WhatsApp não configurado (token ausente).',
    })
  }

  if (!provided || !safeCompare(provided, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }
}

/** Adaptador fino para rotas HTTP: lê o token esperado do runtime config e o fornecido do path. */
export function verifyWebhookToken(event: H3Event): void {
  const config = useRuntimeConfig(event)
  const expected = (config.whatsappWebhookToken as string) || ''
  requireMatchingWebhookToken(getRouterParam(event, 'token'), expected)
}

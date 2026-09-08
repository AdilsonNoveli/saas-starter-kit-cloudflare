import { createError, getQuery } from 'h3'
import { verifyWebhookToken } from '../../../utils/whatsapp/verifyWebhookToken'

/**
 * GET /api/whatsapp/webhook/[token] — handshake de verificação da Cloud API
 * (seção 7 da arquitetura do agente WhatsApp). O provedor configurado é hoje
 * quem detém o App Meta homologado e faz a ponte (seção 3) — este handshake é o contrato
 * padrão da WhatsApp Cloud API, mantido de forma defensiva caso a verificação
 * chegue diretamente da Meta no futuro. A autenticação de fato continua
 * sendo o token no path (`verifyWebhookToken`), não `hub.verify_token`: este
 * projeto não tem App Secret próprio para validar contra a Meta.
 */
export default defineEventHandler((event) => {
  verifyWebhookToken(event)

  const query = getQuery(event)
  const challenge = query['hub.challenge']
  if (query['hub.mode'] !== 'subscribe' || typeof challenge !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Handshake inválido.' })
  }

  return challenge
})

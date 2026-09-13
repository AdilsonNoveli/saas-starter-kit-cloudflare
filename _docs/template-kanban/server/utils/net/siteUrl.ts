import { createError } from 'h3'

/**
 * Resolve a base pública da aplicação, sem barra final.
 *
 * Exige `NUXT_SITE_URL` configurado — sem fallback para a origem da request.
 * Chamado tanto de rotas HTTP quanto do consumer de fila do agente (sem
 * `H3Event`, sem request de onde tirar origin), então não pode depender de
 * nenhum dos dois.
 *
 * Fonte única: qualquer link enviado por e-mail ou WhatsApp deve montar a URL
 * por aqui, senão cada chamador reimplementa o fallback de forma divergente.
 */
export function resolveSiteUrl(): string {
  const siteUrl = (useRuntimeConfig().siteUrl as string) || ''
  if (!siteUrl) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_SITE_URL não configurado.' })
  }
  return siteUrl.replace(/\/$/, '')
}

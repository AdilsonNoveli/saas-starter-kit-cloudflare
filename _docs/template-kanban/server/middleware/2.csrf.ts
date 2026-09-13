export default defineEventHandler((event) => {
  const req = event.node.req
  
  // Ignorar GET, HEAD, OPTIONS
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return
  }

  // Apenas validar rotas da API
  if (!req.url?.startsWith('/api/')) {
    return
  }

  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')
  const host = getHeader(event, 'host')

  // Em produção, o origin (ou, na ausência dele, o referer) deve bater com o host.
  // Requisições server-to-server (n8n) não enviam nem Origin nem Referer e são
  // autenticadas por Bearer — por isso a validação é pulada quando ambos faltam
  // (CSRF exige um browser, que sempre envia Origin em POST cross-site).
  //
  // Exceção: endpoints /api/admin/** sempre recebem requests de browsers
  // autenticados; browsers SEMPRE enviam Origin em POST cross-site. Se Origin
  // e Referer estiverem ausentes num request admin, é suspeito — rejeitamos.
  const source = origin || referer
  const isAdmin = req.url?.startsWith('/api/admin/')

  // Vale em todos os ambientes: um staging exposto na rede sem esta checagem
  // aceita POST cross-site de qualquer página. O fluxo server-to-server (n8n,
  // pg_cron) não é afetado — cai no ramo "sem Origin/Referer" abaixo — e em dev
  // o browser envia Origin igual ao Host.
  if (host) {
    if (source) {
      let sourceHost: string | null
      try {
        sourceHost = new URL(source).host
      } catch {
        sourceHost = null
      }
      if (sourceHost !== host) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden',
          message: 'Falha na validação CSRF (Origin mismatch)',
        })
      }
    } else if (isAdmin) {
      // Browsers legítimos sempre enviam Origin em POST cross-site para /admin.
      // Ausência de Origin/Referer em admin é sinal de request forjado.
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Falha na validação CSRF (Origin ausente)',
      })
    }
    // Não-admin sem source: server-to-server (n8n/pg_cron), protegido por Bearer.
  }
})

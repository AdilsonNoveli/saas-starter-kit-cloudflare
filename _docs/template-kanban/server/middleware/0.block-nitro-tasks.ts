/**
 * Bloqueia o endpoint HTTP /_nitro/tasks/* em produção.
 *
 * O endpoint /_nitro/tasks/:name não passa pelo rate-limiter, CSRF nem
 * admin-auth (todos só cobrem /api/**). Em CF Workers, scheduled tasks são
 * acionadas via evento CF Cron (não via HTTP), portanto o endpoint HTTP é
 * desnecessário em produção e pode ser bloqueado sem impacto.
 */
export default defineEventHandler((event) => {
  if (process.env.NODE_ENV === 'production' && event.path?.startsWith('/_nitro/tasks')) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})

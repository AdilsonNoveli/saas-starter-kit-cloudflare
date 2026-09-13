import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  if (!event.path?.startsWith('/api/admin/')) return

  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }
})

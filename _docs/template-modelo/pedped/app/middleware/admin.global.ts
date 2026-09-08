export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/admin')) return

  const user = useSupabaseUser()

  // Redireciona /admin (bare) para a landing padrão.
  if (to.path === '/admin') {
    return navigateTo('/admin/orders', { replace: true })
  }

  // Sem sessão → login, preservando o destino original para redirect pós-auth.
  if (!user.value && to.path !== '/admin/login') {
    return navigateTo(
      { path: '/admin/login', query: { redirect: to.fullPath } },
      { replace: true },
    )
  }

  // Já autenticado na página de login → destino original ou landing padrão.
  if (user.value && to.path === '/admin/login') {
    const destination = typeof to.query.redirect === 'string' ? to.query.redirect : '/admin/orders'
    return navigateTo(destination, { replace: true })
  }
})

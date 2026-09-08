export default defineNuxtRouteMiddleware(async (to) => {
  // Só aplica nas rotas de checkout
  if (!to.path.startsWith('/catalog/checkout')) return

  const sessaoId = to.query.sessao as string

  if (!sessaoId) {
    // Sem sessão → permite navegar para o checkout, onde o WhatsApp será coletado inline
    return
  }

  interface ValidationResponse {
    valid: boolean
  }

  // Valida a sessão no backend
  const res = await $fetch<ValidationResponse>('/api/session/validate', {
    method: 'POST',
    body: { sessionId: sessaoId }
  }).catch(() => null)

  if (!res?.valid) {
    // Parâmetro de sessão inválido/expirado → limpa a URL e deixa renderizar o passo de identificação inline no checkout
    return navigateTo('/catalog/checkout')
  }
})


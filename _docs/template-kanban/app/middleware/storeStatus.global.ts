interface CatalogStoreStatus {
  isOpen: boolean
  mostrar_pagina_fechada: boolean
  mostrar_faixa_fechada: boolean
  mensagem_custom: string
  mensagem: string
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/admin')) return
  if (
    to.path === '/sessao-invalida'
  ) return

  const catalogStatus = useState<CatalogStoreStatus | null>('catalog:storeStatus', () => null)

  try {
    const res = await $fetch<CatalogStoreStatus>('/api/store/status')
    catalogStatus.value = res

    if (to.path === '/catalog/store-closed') {
      if (res.isOpen || !(res.mostrar_pagina_fechada ?? true)) {
        return navigateTo('/catalog')
      }
      return
    }

    if (!res.isOpen && (res.mostrar_pagina_fechada ?? true)) {
      return navigateTo('/catalog/store-closed')
    }
  } catch {
    // Fail-open: sem bloquear acesso em caso de erro de rede
  }
})

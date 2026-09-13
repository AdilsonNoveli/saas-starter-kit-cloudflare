/**
 * @descricao: Persistência client-side do carrinho (localStorage).
 * @objetivo: Tornar o carrinho resiliente a recargas de página. O estado do
 *   store `cart` é in-memory; sem isto, qualquer reload (F5, restauração via
 *   bfcache no checkout, ou o hard-reload que o Nuxt dispara ao detectar build
 *   desatualizado depois da aba ficar muito tempo aberta) descarta o pedido em
 *   montagem — exatamente o bug do catálogo ("a página atualiza sozinha e o
 *   carrinho some").
 *
 *   Reidrata no hook `app:mounted` (após a hidratação) para não conflitar com o
 *   payload SSR do Pinia nem gerar mismatch de hidratação. Depois observa o
 *   carrinho e persiste cada mudança. Lógica de storage isolada em
 *   `~/utils/cartStorage` (SoC), validada com zod.
 */

import { watch } from 'vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { useCartStore } from '~/stores/cart'
import { loadPersistedCart, persistCart } from '~/utils/cartStorage'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const cart = useCartStore()

    const restored = loadPersistedCart()
    if (restored.length > 0) cart.items = restored

    watch(
      () => cart.items,
      (items) => { persistCart(items) },
      { deep: true },
    )
  })
})

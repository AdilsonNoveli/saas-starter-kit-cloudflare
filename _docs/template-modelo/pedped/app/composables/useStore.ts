/**
 * @descricao: Composable singleton de leitura da `loja` (config pública).
 * @objetivo: Fonte ÚNICA de leitura dos campos públicos da loja no client.
 *   Substitui o fetch duplicado que vivia no `cartStore` (`ref<any>`),
 *   entrega tipagem forte (`StorePublic`) e cache via `useState` (SSR-safe,
 *   compartilhado entre componentes).
 *
 *   Uso típico:
 *   ```ts
 *   const { loja, fetch, isLoaded } = useStore()
 *   await fetch() // idempotente — retorna cache em chamadas subsequentes
 *   ```
 */

import { computed, type ComputedRef, type Ref } from 'vue'
import { useState } from 'nuxt/app'
import type { StorePublic } from '~~/shared/types/store'
import { STORE_PUBLIC_COLUMNS } from '~~/shared/types/store'

interface UseLojaReturn {
  /** Estado reativo singleton. `null` enquanto não carregada. */
  readonly loja: Ref<StorePublic | null>
  /** `true` quando o fetch já populou o estado pelo menos uma vez. */
  readonly isLoaded: ComputedRef<boolean>
  /**
   * Carrega a loja do banco. Idempotente: se já estiver em cache,
   * retorna o valor cacheado. Use `force: true` para refazer a query.
   */
  readonly fetch: (options?: { force?: boolean }) => Promise<StorePublic | null>
}

export function useStore(): UseLojaReturn {
  const loja = useState<StorePublic | null>('loja:public', () => null)
  const isLoaded = computed<boolean>(() => loja.value !== null)

  const fetch = async (options?: { force?: boolean }): Promise<StorePublic | null> => {
    // Cache-first: evita N requests redundantes quando múltiplos componentes
    // chamam `fetch()` simultaneamente (ex.: layout + página).
    if (loja.value && !options?.force) {
      return loja.value
    }

    const supabase = useSupabaseClient()
    const cacheBuster = `cache-buster-${Date.now()}`

    // Query principal — colunas garantidamente presentes no schema. Como
    // STORE_PUBLIC_COLUMNS é uma string montada em runtime, o supabase-js não
    // infere a linha (retornaria o sentinela GenericStringError); afirmamos o
    // tipo via `.returns<>()`. O contrato é garantido pela lista explícita.
    const { data, error } = await supabase
      .from('loja')
      .select(STORE_PUBLIC_COLUMNS)
      .neq('nome_fantasia', cacheBuster)
      .limit(1)
      .maybeSingle()
      .returns<Omit<StorePublic, 'config_layout'>>()

    if (error) {
      // Fail-soft: a UI tem fallbacks (ex.: "Painel Admin" no login). Lançar
      // aqui derrubaria SSR e impediria o usuário de logar com a loja offline.
      console.error('[useStore] Failed to load public store data', error)
      return null
    }

    // Busca separada de config_layout para ser resiliente à ausência da coluna
    // (migration ainda não aplicada). Falha silenciosa: o catálogo funciona com
    // as cores padrão do design system.
    let configLayout: StorePublic['config_layout'] = null
    try {
      const { data: layoutData } = await supabase
        .from('loja')
        .select('config_layout')
        .neq('nome_fantasia', cacheBuster)
        .limit(1)
        .maybeSingle()
      configLayout = (layoutData as { config_layout: StorePublic['config_layout'] } | null)?.config_layout ?? null
    }
    catch {
      // coluna não existe ainda — ignora silenciosamente
    }

    // config_layout é buscado à parte (resiliente à ausência da coluna);
    // compomos aqui o contrato público completo (StorePublic).
    loja.value = data ? { ...data, config_layout: configLayout } : null
    return loja.value
  }

  return { loja, isLoaded, fetch }
}

/**
 * @descricao: Composable de tema (claro/escuro/sistema)
 * @objetivo: Gerenciar a preferência de tema com persistência em cookie
 *   (SSR-safe) e estado reativo singleton via `useState`. Reflete
 *   `prefers-color-scheme` quando a preferência for `system`. Aplica a
 *   classe `.dark` em `<html>` no cliente via `watch` registrado em um
 *   `effectScope` desacoplado — assim o sincronismo sobrevive a
 *   desmontagem de layouts/páginas. O FOUC é prevenido por um script
 *   inline em `nuxt.config.ts` que executa antes da hidratação.
 *
 *   Por que `useState` em vez de só `useCookie`?
 *   `useCookie` retorna refs isolados por chamada — duas instâncias do
 *   mesmo cookie não sincronizam reativamente entre componentes. Ao
 *   centralizar em `useState`, todas as chamadas de `useTheme()` veem
 *   a mesma preferência reativa; o cookie funciona apenas como camada
 *   de persistência (escrita via watcher).
 */

import { computed, effectScope, readonly, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useCookie, useState } from 'nuxt/app'
import { useStore } from './useStore'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/** Nome do cookie — referenciado também pelo script inline anti-FOUC */
const THEME_COOKIE = 'theme'
/**
 * Cookie espelho do tema da LOJA (`tema_catalogo`). Existe porque o tema efetivo
 * prioriza a config da loja, mas ela só carrega no client (pós-paint). Persistir
 * em cookie permite que o script inline anti-FOUC e o `resolvedTheme` acertem o
 * primeiro paint e a hidratação sem esperar o fetch — eliminando o flash.
 * Referenciado também pelo script inline em `nuxt.config.ts`.
 */
const STORE_THEME_COOKIE = 'store_theme'

/**
 * Singletons de módulo: garantem uma única instância de `prefers-color-scheme`
 * e do `resolvedTheme` reativo, vivos durante toda a sessão do app.
 */
let systemPrefersDarkRef: Ref<boolean> | null = null
let mediaQueryListenerRegistered = false
let resolvedThemeRef: ComputedRef<ResolvedTheme> | null = null

interface UseThemeReturn {
  readonly theme: Readonly<Ref<ThemePreference>>
  readonly resolvedTheme: Readonly<Ref<ResolvedTheme>>
  setTheme: (next: ThemePreference) => void
  toggleTheme: () => void
}

/**
 * Cria os singletons globais (computed `resolvedTheme` + watchers de
 * classList e cookie) em um `effectScope` desacoplado de qualquer
 * componente. Isso garante que o sincronismo continue funcionando mesmo
 * quando o layout/página que originou a primeira chamada de `useTheme()`
 * for desmontado.
 */
function ensureGlobalSetup(
  theme: Ref<ThemePreference>,
  systemPrefersDark: Ref<boolean>,
  cookie: Ref<ThemePreference | null | undefined>,
  loja: Ref<StorePublic | null>,
  storeThemeCookie: Ref<ThemePreference | null | undefined>,
): ComputedRef<ResolvedTheme> {
  if (resolvedThemeRef) return resolvedThemeRef

  effectScope(true).run(() => {
    resolvedThemeRef = computed<ResolvedTheme>(() => {
      // 1. Preferência explícita do usuário (claro/escuro) tem prioridade total
      if (theme.value === 'light' || theme.value === 'dark') {
        return theme.value
      }

      // 2. Se a preferência for 'system', tenta usar o tema configurado na loja
      const storeTheme = loja.value?.tema_catalogo ?? storeThemeCookie.value
      if (storeTheme && storeTheme !== 'system') {
        return storeTheme
      }

      // 3. Fallback para preferência do Sistema Operacional
      return systemPrefersDark.value ? 'dark' : 'light'
    })

    if (import.meta.client) {
      // Sincroniza a classe `.dark` e `color-scheme` com o tema resolvido.
      // O script inline anti-FOUC já cuida do primeiro paint; este watcher
      // assume a partir da hidratação.
      watch(
        resolvedThemeRef,
        (next) => {
          const root = document.documentElement
          root.classList.toggle('dark', next === 'dark')
          root.style.colorScheme = next
        },
        { immediate: true },
      )

      // Mantém o cookie persistido em sincronia com o estado em memória.
      watch(theme, (next) => {
        if (cookie.value !== next) {
          cookie.value = next
        }
      })

      // Espelha o tema da loja em cookie assim que a `loja` carrega, para que o
      // PRÓXIMO carregamento acerte o primeiro paint sem esperar o fetch.
      watch(
        () => loja.value?.tema_catalogo,
        (t) => {
          if ((t === 'light' || t === 'dark' || t === 'system') && storeThemeCookie.value !== t) {
            storeThemeCookie.value = t
          }
        },
        { immediate: true },
      )
    }
  })

  // O escopo permanece vivo intencionalmente — não chamamos scope.stop().
  // Em hot-reload de desenvolvimento, o módulo é recarregado e os refs
  // são reinicializados, então não há vazamento real.

  // Garantia de tipo: ensureGlobalSetup só retorna após criação.
  return resolvedThemeRef as unknown as ComputedRef<ResolvedTheme>
}

export function useTheme(): UseThemeReturn {
  // Chamado no contexto síncrono do composable
  const { loja } = useStore()

  // Cookie persistido (1 ano) — fonte de verdade entre páginas e sessões.
  const cookie = useCookie<ThemePreference>(THEME_COOKIE, {
    default: () => 'system',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  // Cookie espelho do tema da loja — sem default (ausente = ainda desconhecido).
  const storeThemeCookie = useCookie<ThemePreference | null>(STORE_THEME_COOKIE, {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  // Estado em memória compartilhado entre todos os componentes (singleton).
  const theme = useState<ThemePreference>(
    'theme:preference',
    () => cookie.value ?? 'system',
  )

  // Inicializa o ref de `prefers-color-scheme` (singleton de módulo).
  if (import.meta.client) {
    if (!systemPrefersDarkRef) {
      const mql = globalThis.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDarkRef = ref<boolean>(mql.matches)
      if (!mediaQueryListenerRegistered) {
        mql.addEventListener('change', (event: MediaQueryListEvent) => {
          if (systemPrefersDarkRef) systemPrefersDarkRef.value = event.matches
        })
        mediaQueryListenerRegistered = true
      }
    }
  } else {
    // No SSR não há media query: assume claro como fallback. O script
    // inline anti-FOUC já terá adicionado `.dark` no DOM antes da
    // hidratação se a preferência efetiva for escuro.
    systemPrefersDarkRef ??= ref<boolean>(false)
  }

  const systemPrefersDark = systemPrefersDarkRef

  // Cria (uma vez) o computed `resolvedTheme`, o watcher de classList e o
  // watcher de sincronização do cookie em escopo desacoplado, garantindo
  // persistência além do ciclo de vida do componente que primeiro chama
  // `useTheme()`.
  const resolvedTheme = ensureGlobalSetup(theme, systemPrefersDark, cookie, loja, storeThemeCookie)

  const setTheme = (next: ThemePreference): void => {
    theme.value = next
  }

  const toggleTheme = (): void => {
    // Alterna apenas entre claro e escuro (ignora `system` no toggle direto)
    setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(theme),
    resolvedTheme: readonly(resolvedTheme),
    setTheme,
    toggleTheme,
  }
}

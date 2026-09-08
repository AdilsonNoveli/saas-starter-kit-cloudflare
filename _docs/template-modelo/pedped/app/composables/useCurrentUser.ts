/**
 * @descricao: Composable singleton do usuário autenticado (perfil + papel).
 * @objetivo: Fonte ÚNICA do perfil próprio no client (nome, avatar, whatsapp,
 *   role). Usado para gating de navegação por papel (6.1) e pela página de
 *   perfil (6.2). Lê a própria linha de `usuarios` (RLS "Self read own profile").
 *
 *   Cache via `useState` (SSR-safe, compartilhado). Idempotente.
 */

import { computed, type ComputedRef, type Ref } from 'vue'
import { useState } from 'nuxt/app'
import type { UserRole, UserRow } from '~~/shared/types/user'
import { USER_MANAGEMENT_ROLES } from '~~/shared/types/user'

interface UseCurrentUserReturn {
  readonly user: Ref<UserRow | null>
  readonly isLoaded: ComputedRef<boolean>
  /** `true` quando o usuário pode gerir usuários (administrador/proprietario). */
  readonly canManageUsers: ComputedRef<boolean>
  readonly fetch: (options?: { force?: boolean }) => Promise<UserRow | null>
}

const USER_COLUMNS = 'id, nome, avatar_url, whatsapp, role, ativo, criado_em, atualizado_em'

export function useCurrentUser(): UseCurrentUserReturn {
  const user = useState<UserRow | null>('user:current', () => null)
  const isLoaded = computed<boolean>(() => user.value !== null)

  const canManageUsers = computed<boolean>(() =>
    user.value !== null
      && (USER_MANAGEMENT_ROLES as readonly UserRole[]).includes(user.value.role),
  )

  const fetch = async (options?: { force?: boolean }): Promise<UserRow | null> => {
    if (user.value && !options?.force) {
      return user.value
    }

    const authUser = useSupabaseUser()
    // authUser.value pode ser um objeto parcial durante a inicialização do Supabase
    // (.id ainda undefined) — verificar .id explicitamente previne id=eq.undefined.
    if (!authUser.value?.id) {
      user.value = null
      return null
    }

    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('usuarios')
      .select(USER_COLUMNS)
      .eq('id', authUser.value.id)
      .maybeSingle()

    if (error) {
      // Fail-soft: a navegação tem fallback (links extras simplesmente não aparecem).
      console.error('[useCurrentUser] Falha ao carregar perfil', error)
      return null
    }

    user.value = (data as UserRow | null) ?? null
    return user.value
  }

  return { user, isLoaded, canManageUsers, fetch }
}

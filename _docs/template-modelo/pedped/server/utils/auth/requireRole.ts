/**
 * Guarda de papel (RBAC) para endpoints administrativos — Fase 6.1.
 *
 * O middleware `3.admin-auth.ts` apenas autentica (garante que há sessão).
 * As policies RLS cobrem a maioria dos acessos, mas endpoints que precisam
 * usar `serverSupabaseServiceRole` (ex.: Supabase Auth Admin API) operam com
 * bypass de RLS — por isso a verificação de papel precisa ser explícita aqui.
 *
 * Substitui o antigo `server/utils/auth.ts` removido na Fase 0.2 (que
 * consultava a tabela inexistente `profiles`).
 */

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { logger } from '~/core/services/logger.service'
import type { UserRole } from '#shared/types/user'
import type { Database } from '~/types/database.types'

export interface AuthenticatedUser {
  readonly id: string
  readonly role: UserRole
}

/**
 * Garante que o usuário autenticado está ativo e possui um dos papéis
 * informados. Lança 401 (sem sessão) ou 403 (papel insuficiente/inativo).
 *
 * Lê o perfil via service role filtrando por `id = user.sub`.
 */
export async function requireRole(
  event: H3Event,
  roles: readonly UserRole[],
): Promise<AuthenticatedUser> {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }

  // createClient lança se serviceKey estiver vazio — capturamos para dar 503 claro.
  let admin: ReturnType<typeof serverSupabaseServiceRole>
  try {
    admin = serverSupabaseServiceRole(event)
  } catch (e) {
    logger.error('requireRole: service role client inválido — NUXT_SUPABASE_SECRET_KEY ausente?', {
      error: (e as Error).message,
    })
    throw createError({ statusCode: 503, statusMessage: 'Serviço indisponível.' })
  }

  const userId = user.sub as string
  type UsuarioRow = Pick<Database['public']['Tables']['usuarios']['Row'], 'id' | 'role' | 'ativo'>
  const rawResult = await admin
    .from('usuarios')
    .select('id, role, ativo')
    .eq('id', userId)
    .maybeSingle()
  const error = rawResult.error
  const data = rawResult.data as UsuarioRow | null

  if (error) {
    logger.error('requireRole: falha ao consultar perfil', {
      userId: user.sub,
      error: error.message,
      code: error.code,
    })
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado.' })
  }

  if (!data || data.ativo !== true) {
    logger.warn('requireRole: usuário sem perfil ativo', { userId: user.sub, ativo: data?.ativo ?? null })
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado.' })
  }

  if (!roles.includes(data.role as UserRole)) {
    logger.warn('requireRole: papel insuficiente', { userId: user.sub, role: data.role })
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado.' })
  }

  return { id: data.id as string, role: data.role as UserRole }
}

import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import {
  USER_ROLES,
  USER_MANAGEMENT_ROLES,
  type UsersResponse,
  type UserListItem,
  type UserRow,
} from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'

/**
 * Lista usuários do sistema (perfil + papel + e-mail). Restrito a
 * administrador/proprietario. Permite filtro por papel e status.
 *
 * O e-mail vive em `auth.users` (não em `public.usuarios`), por isso é
 * resolvido via Supabase Auth Admin API (`listUsers`) e mesclado por id.
 */
const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

/** Página máxima do Admin API. Suficiente para o volume de staff do MVP. */
const AUTH_USERS_PER_PAGE = 1000

export default defineEventHandler(async (event): Promise<UsersResponse> => {
  await requireRole(event, USER_MANAGEMENT_ROLES)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parâmetros inválidos',
      data: parsed.error.issues,
    })
  }

  const { q, role, ativo } = parsed.data
  const admin = serverSupabaseServiceRole(event)

  let query = admin
    .from('usuarios')
    .select('id, nome, avatar_url, whatsapp, role, ativo, criado_em, atualizado_em')
    .order('criado_em', { ascending: false })

  if (role) {
    query = query.eq('role', role)
  }
  if (typeof ativo === 'boolean') {
    query = query.eq('ativo', ativo)
  }
  if (q && q.length > 0) {
    query = query.ilike('nome', `%${q.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`)
  }

  const { data: rows, error } = await query
  if (error) {
    logger.error('Falha ao listar usuários', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar usuários' })
  }

  // Resolve e-mails via Auth Admin API e indexa por id (1 chamada, sem N+1).
  // Fail-soft: se a Admin API falhar (ex.: quota, permissão), exibe lista sem e-mails.
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: AUTH_USERS_PER_PAGE,
  })
  if (authError) {
    logger.warn('Auth Admin API indisponível — e-mails omitidos da listagem', { error: authError.message })
  }

  const emailById = new Map<string, string | null>(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? null]),
  )

  const userRows = (rows ?? []) as unknown as UserRow[]
  const data: UserListItem[] = userRows.map((u) => ({
    ...u,
    email: emailById.get(u.id) ?? null,
  }))

  return { data, total: data.length }
})

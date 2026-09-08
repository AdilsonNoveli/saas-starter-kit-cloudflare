import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'

/**
 * Remove fisicamente um usuário do sistema (auth.users + public.usuarios).
 * Restrito a administrador/proprietario.
 */
export default defineEventHandler(async (event) => {
  const caller = await requireRole(event, USER_MANAGEMENT_ROLES)

  const id = getRouterParam(event, 'id')
  if (!z.string().uuid().safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido.' })
  }

  // Proteção: o próprio usuário não pode se deletar
  if (id === caller.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Você não pode excluir a sua própria conta.',
    })
  }

  const admin = serverSupabaseServiceRole(event)

  // Hierarquia RBAC: carrega o papel do usuário alvo para barrar a exclusão de um proprietário por um administrador
  const { data: target, error: targetErr } = await admin
    .from('usuarios')
    .select('role, avatar_url')
    .eq('id', id!)
    .maybeSingle()

  if (targetErr) {
    logger.error('[users/delete] Falha ao carregar papel do usuário alvo', { id, error: targetErr.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao validar permissões.' })
  }
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Usuário não encontrado.' })
  }

  if (caller.role !== 'proprietario' && target.role === 'proprietario') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Apenas o proprietário pode excluir a conta de outro proprietário.',
    })
  }

  try {
    // 1. Limpeza de avatar no Storage caso exista
    if (target.avatar_url) {
      const match = target.avatar_url.match(/avatars\/(.+)$/)
      if (match && match[1]) {
        await admin.storage.from('pedped').remove([`avatars/${match[1]}`])
      }
    }

    // 2. Remove da tabela public.usuarios
    const { error: dbErr } = await admin
      .from('usuarios')
      .delete()
      .eq('id', id!)

    if (dbErr) {
      logger.error('[users/delete] Falha ao remover da tabela public.usuarios', { id, error: dbErr.message })
      throw dbErr
    }

    // 3. Remove da infraestrutura de autenticação do Supabase (auth.users)
    const { error: authErr } = await admin.auth.admin.deleteUser(id!)
    if (authErr) {
      logger.warn('[users/delete] Usuário removido de public.usuarios mas falhou ao deletar de auth.users', {
        id,
        error: authErr.message,
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const e = err as { message?: string }
    logger.error('[users/delete] Erro ao excluir usuário', { id, error: e.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro interno ao excluir usuário.' })
  }
})

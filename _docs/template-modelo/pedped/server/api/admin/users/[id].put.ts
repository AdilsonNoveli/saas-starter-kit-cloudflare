import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody, getRouterParam } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { USER_ROLES, USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'

/**
 * Edita o perfil/papel/status de um usuário. Restrito a
 * administrador/proprietario. Permite desativar (`ativo: false`) — o que
 * também tira o acesso (helpers RLS exigem `ativo = true`).
 *
 * Decisão: não há exclusão física aqui (preserva histórico/FKs). "Desativar"
 * é a operação de remoção lógica do sistema (Aceite 6.1).
 */
const bodySchema = z
  .object({
    nome: z.string().trim().min(1).max(120).optional(),
    role: z.enum(USER_ROLES).optional(),
    whatsapp: z.string().trim().max(20).nullable().optional(),
    ativo: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Nenhum campo para atualizar.',
  })

export default defineEventHandler(async (event) => {
  const caller = await requireRole(event, USER_MANAGEMENT_ROLES)

  const id = getRouterParam(event, 'id')
  if (!z.string().uuid().safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido.' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dados inválidos',
      data: parsed.error.issues,
    })
  }

  // Proteção: o próprio usuário não pode se autodesativar nem se rebaixar
  // (evita lockout acidental do último administrador via UI).
  if (id === caller.id && (parsed.data.ativo === false || parsed.data.role !== undefined)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Você não pode alterar o próprio papel ou se desativar.',
    })
  }

  const admin = serverSupabaseServiceRole(event)

  // Hierarquia RBAC: carrega o papel atual do alvo para barrar escalonamento
  // horizontal. Só o proprietário pode (a) modificar/desativar outro
  // proprietário ou (b) promover alguém a proprietário. Um administrador que
  // burlasse isto poderia neutralizar o proprietário ou clonar o papel máximo.
  if (caller.role !== 'proprietario') {
    const { data: target, error: targetErr } = await admin
      .from('usuarios')
      .select('role')
      .eq('id', id!)
      .maybeSingle()

    if (targetErr) {
      logger.error('Falha ao carregar papel do usuário alvo', { id, error: targetErr.message })
      throw createError({ statusCode: 500, statusMessage: 'Falha ao validar permissões.' })
    }
    if (!target) {
      throw createError({ statusCode: 404, statusMessage: 'Usuário não encontrado.' })
    }
    if (target.role === 'proprietario') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Apenas o proprietário pode alterar a conta do proprietário.',
      })
    }
    if (parsed.data.role === 'proprietario') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Apenas o proprietário pode conceder o papel de proprietário.',
      })
    }
  }
  const { data, error } = await admin
    .from('usuarios')
    .update(parsed.data)
    .eq('id', id!)
    .select('id')
    .maybeSingle()

  if (error) {
    logger.error('Falha ao atualizar usuário', { id, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar usuário.' })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Usuário não encontrado.' })
  }

  return { success: true }
})

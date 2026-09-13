import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { USER_ROLES, USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { resolveSiteUrl } from '../../../utils/net/siteUrl'

/**
 * Cria um usuário do sistema via Supabase Auth Admin API.
 *
 * `inviteUserByEmail` cria o `auth.users` e dispara o e-mail de convite
 * (o usuário define a própria senha ao aceitar). O trigger
 * `handle_new_auth_user` (003) popula `public.users` com `name`/`role`
 * a partir do `user_metadata`; em seguida gravamos o `whatsapp`.
 *
 * Restrito a administrador/proprietario.
 */
const bodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  nome: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  whatsapp: z.string().trim().max(20).optional(),
})

export default defineEventHandler(async (event) => {
  const { user: caller, supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dados inválidos',
      data: parsed.error.issues,
    })
  }

  const { email, nome, role, whatsapp } = parsed.data

  // Hierarquia RBAC: só o proprietário concede o papel de proprietário.
  // Sem isto, um administrador poderia criar outro proprietário (escalonamento).
  if (role === 'proprietario' && caller.role !== 'proprietario') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Apenas o proprietário pode conceder o papel de proprietário.',
    })
  }

  // O convite cria auth.users e envia o e-mail. `data` vira user_metadata,
  // lido pelo trigger handle_new_auth_user para popular nome/role.
  // `redirectTo` leva o convidado ao mesmo `/auth/confirm` da recuperação de
  // senha, que encaminha para a tela de definição de senha. Sem isso o link cai
  // no Site URL padrão e o usuário entra sem nunca definir uma senha própria.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { nome, role },
      redirectTo: `${resolveSiteUrl()}/auth/confirm?next=/admin/update-password`,
    },
  )

  if (inviteError || !invited?.user) {
    // 422 do GoTrue indica e-mail já cadastrado.
    const alreadyExists = inviteError?.status === 422
    logger.error('Falha ao convidar usuário', { email, error: inviteError?.message })
    throw createError({
      statusCode: alreadyExists ? 409 : 500,
      statusMessage: alreadyExists
        ? 'Já existe um usuário com este e-mail.'
        : 'Falha ao convidar usuário.',
    })
  }

  // Completa o perfil criado pelo trigger (whatsapp + reforça nome/role/ativo).
  const { error: profileError } = await admin
    .from('users')
    .update({ name: nome, role, whatsapp: whatsapp || null, active: true })
    .eq('id', invited.user.id)

  if (profileError) {
    logger.error('Usuário convidado mas perfil não atualizado', {
      id: invited.user.id,
      error: profileError.message,
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Usuário convidado, mas falha ao gravar o perfil.',
    })
  }

  return { success: true, id: invited.user.id }
})

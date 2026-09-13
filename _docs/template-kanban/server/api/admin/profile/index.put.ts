import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'

/**
 * Atualiza o perfil do PRÓPRIO usuário autenticado (Fase 6.2).
 *
 * Restringe os campos editáveis a `nome`, `avatar_url` e `whatsapp` — papel
 * (`role`) e status (`active`) NÃO são editáveis aqui (evita escalonamento de
 * privilégio, já que a policy "Self update own profile" é permissiva por
 * coluna). Usa o client RLS (`serverSupabaseClient`) com filtro `id = user.sub`.
 */
const bodySchema = z
  .object({
    nome: z.string().trim().min(1).max(120).optional(),
    avatar_url: z.string().trim().url().max(2048).nullable().optional(),
    whatsapp: z.string().trim().max(20).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Nenhum campo para atualizar.',
  })

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dados inválidos',
      data: parsed.error.issues,
    })
  }

  // `nome` continua sendo o campo do corpo da requisição (contrato da tela);
  // no banco a coluna é `name`. Só as chaves enviadas entram no UPDATE.
  const { nome, ...rest } = parsed.data
  const updates = { ...rest, ...(nome !== undefined ? { name: nome } : {}) }

  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.sub)
    .select('id, nome:name, avatar_url, whatsapp, role, ativo:active, criado_em:created_at, atualizado_em:updated_at')
    .maybeSingle()

  if (error) {
    logger.error('Falha ao atualizar perfil', { id: user.sub, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar perfil.' })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Perfil não encontrado.' })
  }

  return { success: true, user: data }
})

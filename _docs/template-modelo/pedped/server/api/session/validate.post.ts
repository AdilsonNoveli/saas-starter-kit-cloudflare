import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'

const bodySchema = z.object({ sessionId: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    return { valid: false }
  }

  const { sessionId } = parsed.data
  // Service role é obrigatório aqui: a policy pública de `sessoes` só expõe
  // `status='ativa' AND expira_em > now()`, enquanto esta rota também precisa
  // enxergar sessões `convertida` (pedido já feito) para considerá-las válidas.
  // Com o client sob RLS, toda sessão convertida seria reportada como inválida.
  const supabase = serverSupabaseServiceRole(event)

  const { data: sessao, error } = await supabase
    .from('sessoes')
    .select('status, expira_em')
    .eq('id', sessionId)
    .single()

  if (error || !sessao) {
    return { valid: false }
  }

  const isExpired = new Date(sessao.expira_em ?? 0) < new Date()

  if (!['ativa', 'convertida'].includes(sessao.status as string) || isExpired) {
    return { valid: false }
  }

  return { valid: true }
})

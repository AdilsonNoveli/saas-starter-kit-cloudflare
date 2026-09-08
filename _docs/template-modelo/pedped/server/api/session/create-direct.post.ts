import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { findOrCreateCustomer } from '../../utils/customers/findOrCreateCustomer'
import { createCatalogSession } from '../../utils/sessions/createCatalogSession'
import { validateWhatsapp } from '~~/shared/utils/phoneValidator'

const bodySchema = z.object({
  // Tira máscara antes de validar: frontend envia (11) 99999-9999 formatado.
  whatsapp: z.preprocess(
    (v) => (typeof v === 'string' ? v.replace(/[^\d+]/g, '') : v),
    z.string().min(10).max(16).regex(/^\+?\d+$/, 'Digite um número de Whatsapp válido!'),
  ),
})

/**
 * RISCO DE DESIGN ACEITO (impersonação): este endpoint público emite uma sessão
 * vinculada a QUALQUER número de WhatsApp informado, sem verificação de posse
 * (OTP). É intencional no fluxo de acesso direto via link do WhatsApp.
 *
 * Mitigação em profundidade: o RLS impede que a anon key leia PII de clientes
 * (`clientes`/`enderecos_cliente` são staff-only), então uma sessão forjada não
 * expõe dados de terceiros — no máximo permite iniciar um pedido em nome do
 * número informado. Se no futuro for necessário endurecer, adicionar OTP aqui.
 */
export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const parsed = bodySchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Digite um número de Whatsapp válido!' })
  }

  const validation = validateWhatsapp(parsed.data.whatsapp)
  if (!validation.isValid) {
    throw createError({ statusCode: 400, message: validation.reason || 'Digite um número de Whatsapp válido!' })
  }

  // Find-or-create — caminho único em utils/customers (normaliza e valida o número).
  const { id: customerId } = await findOrCreateCustomer(supabase, {
    whatsapp: parsed.data.whatsapp,
    nome: 'Visitante Web', // Nome genérico, será atualizado ao finalizar a primeira compra
    isVisitante: true,
  })

  // Criação da sessão — caminho único em utils/sessions.
  const { sessaoId } = await createCatalogSession(supabase, customerId, 'acesso_direto')

  return {
    success: true,
    sessaoId,
  }
})

import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { maskSecret } from '../../../utils/security/maskSecret'
import { normalizeProviderBaseUrl } from '../../../utils/whatsapp/normalizeProviderBaseUrl'

/**
 * POST /api/admin/integrations/whatsapp-provider — grava URL base, rótulo e
 * token do provedor de WhatsApp (fase 2 da §11 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`; migration 093).
 * É o que torna a troca de provedor uma edição na tela em vez de um deploy.
 *
 * Rota dedicada pelo mesmo motivo da chave OpenAI: o token vai para o Supabase
 * Vault via `whatsapp_api_key_set` (SECURITY DEFINER), que exige service role —
 * o `supabase.from('store').update()` do client autenticado não alcança.
 *
 * O token é obrigatório em toda gravação, inclusive quando só a URL muda. Duas
 * razões: a validação da §9 confere a dupla (URL, token) contra o provedor real
 * — validar uma URL nova com um token que não foi apresentado exigiria
 * decriptar o segredo aqui, ampliando a superfície de decriptação que a §9
 * limita a escrita e uso em runtime. E é o mesmo contrato do card da OpenAI,
 * onde salvar também pede a chave.
 */
const bodySchema = z.object({
  apiToken: z.string().trim().min(10, 'Token inválido.'),
  baseUrl: z.string().trim().min(1, 'Informe a URL base do provedor.'),
  provedorNome: z.string().trim().min(1).max(60).optional(),
})

/**
 * Valida a credencial contra o próprio provedor antes de gravar: `GET /me`
 * devolve os identificadores da conta do token (`_docs/implementar/api-1.yaml`,
 * rota `/me`) — a chamada mais barata que prova que URL e token combinam.
 *
 * Distinguir credencial inválida (401/403 → 400, culpa do valor colado) de
 * indisponibilidade (rede/5xx → 502, nada é persistido) é a mesma lição já
 * corrigida em `openai-key.post.ts`: acusar o lojista de ter colado um token
 * errado quando o provedor é que estava fora manda ele procurar o problema no
 * lugar errado.
 *
 * Timeout explícito porque a URL é fornecida pelo admin: um host que aceita a
 * conexão e nunca responde seguraria o worker até o limite da plataforma.
 */
async function assertProviderCredentialUsable(baseUrl: string, apiToken: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    logger.error('Falha de rede ao validar credencial do provedor de WhatsApp', {
      baseUrl,
      error: err instanceof Error ? err.message : String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Não foi possível falar com o provedor nessa URL. Nada foi salvo — confira o endereço e tente de novo.' })
  }

  if (res.status === 401 || res.status === 403) {
    throw createError({ statusCode: 400, statusMessage: 'O provedor recusou esse token. Verifique se copiou a credencial correta.' })
  }
  if (res.status === 404) {
    throw createError({ statusCode: 400, statusMessage: 'Essa URL não parece ser a de um provedor compatível (a rota /me não existe lá).' })
  }
  if (!res.ok) {
    logger.error('Provedor de WhatsApp respondeu erro na validação da credencial', { baseUrl, status: res.status })
    throw createError({ statusCode: 502, statusMessage: 'O provedor respondeu com erro agora. Nada foi salvo — tente de novo em instantes.' })
  }
}

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

  const { apiToken } = parsed.data
  // Normaliza e valida ANTES de qualquer I/O: é a barreira anti-SSRF da §9, e
  // a URL só vira destino de `fetch` (com o token no header) depois de passar.
  const baseUrl = normalizeProviderBaseUrl(parsed.data.baseUrl)

  // A loja é lida antes de qualquer escrita: sem ela não há onde gravar os
  // metadados, e descobrir isso depois deixaria o token no Vault com a máscara
  // e a URL desalinhadas (mesma ordem de `openai-key.post.ts`).
  const { data: loja, error: lojaError } = await admin.from('store').select('id, whatsapp_provider_name').limit(1).maybeSingle()
  if (lojaError || !loja) {
    logger.error('Falha ao carregar a loja para gravar o provedor de WhatsApp', { error: lojaError?.message ?? 'nenhuma loja cadastrada' })
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar a configuração da loja.' })
  }

  const provedorNome = parsed.data.provedorNome ?? loja.whatsapp_provider_name
  await assertProviderCredentialUsable(baseUrl, apiToken)

  const { error: setError } = await admin.rpc('whatsapp_api_key_set', { p_key: apiToken })
  if (setError) {
    logger.error('Falha ao gravar token do provedor no Vault', { error: setError.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao salvar o token.' })
  }

  const mascara = maskSecret(apiToken)
  const { error: updateError } = await admin
    .from('store')
    .update({
      whatsapp_api_key_mask: mascara,
      whatsapp_api_base_url: baseUrl,
      whatsapp_provider_name: provedorNome,
    })
    .eq('id', loja.id)

  if (updateError) {
    logger.error('Token gravado no Vault, mas falha ao atualizar URL/máscara do provedor', { error: updateError.message })
    throw createError({ statusCode: 500, statusMessage: 'Token salvo, mas falha ao atualizar os metadados.' })
  }

  logger.info('Provedor de WhatsApp atualizado', { userId: caller.id, baseUrl, provedorNome })

  return { configurado: true, mascara, baseUrl, provedorNome, usandoFallbackEnv: false }
})

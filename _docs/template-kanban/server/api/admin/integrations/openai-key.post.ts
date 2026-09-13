import { createError, readBody } from 'h3'
import OpenAI from 'openai'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { maskSecret } from '../../../utils/security/maskSecret'

/**
 * POST /api/admin/integrations/openai-key — grava/atualiza a chave OpenAI do
 * agente WhatsApp via Supabase Vault (seção 10 da arquitetura do agente
 * WhatsApp — migration 088). Rota dedicada, não o padrão genérico de
 * `supabase.from('store').update()`: uma chave de API real precisa de
 * service role pra chamar `agent_openai_key_set` (SECURITY DEFINER sobre
 * `vault.create_secret`/`vault.update_secret`).
 *
 * A chave completa só existe na memória desta requisição — nunca é
 * logada nem devolvida ao client; a resposta e o log carregam só a máscara.
 */
const bodySchema = z.object({
  apiKey: z.string().trim().min(20, 'Chave inválida.'),
  model: z.string().trim().min(1).optional(),
})

/**
 * Valida a chave fazendo exatamente o que o agente faz em runtime: uma
 * completion mínima no modelo escolhido. Prefererido a `models.list()` porque
 * cobre os três modos de falha que importam de uma vez — chave revogada
 * (401), chave restrita sem o escopo `model.request` (403) e projeto sem
 * acesso ao modelo selecionado (404/403) — enquanto `models.list()` exige o
 * escopo `model.read`, que uma chave restrita perfeitamente funcional pode
 * não ter, e não diz nada sobre o modelo em questão.
 *
 * Falha de rede/5xx/429 NÃO é chave inválida: devolve 502 e não persiste
 * nada, em vez de acusar o lojista de ter colado uma chave errada.
 */
async function assertKeyUsable(apiKey: string, model: string): Promise<void> {
  try {
    await new OpenAI({ apiKey, maxRetries: 1 }).chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'ping' }],
      max_completion_tokens: 1,
    })
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? err.status : undefined

    if (status === 401) {
      throw createError({ statusCode: 400, statusMessage: 'Chave OpenAI inválida ou revogada — verifique e tente novamente.' })
    }
    if (status === 403) {
      throw createError({ statusCode: 400, statusMessage: `Chave sem permissão para usar o modelo ${model}. Libere o escopo de uso de modelos para esta chave na OpenAI.` })
    }
    if (status === 404) {
      throw createError({ statusCode: 400, statusMessage: `O modelo ${model} não está disponível para este projeto da OpenAI. Escolha outro modelo.` })
    }

    logger.error('Falha ao validar chave OpenAI (não é chave inválida)', {
      status: status ?? null,
      error: err instanceof Error ? err.message : String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Não foi possível falar com a OpenAI agora. A chave não foi salva — tente de novo em instantes.' })
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

  const { apiKey } = parsed.data

  // A loja é lida ANTES de qualquer escrita: sem ela não há onde gravar a
  // máscara, e descobrir isso depois deixaria a chave no Vault com os
  // metadados desalinhados (antes o `.eq('id', '')` estourava um erro de uuid
  // inválido já com o segredo persistido).
  const { data: loja, error: lojaError } = await admin.from('store').select('id, agent_model').limit(1).maybeSingle()
  if (lojaError || !loja) {
    logger.error('Falha ao carregar a loja para gravar a chave OpenAI', { error: lojaError?.message ?? 'nenhuma loja cadastrada' })
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar a configuração da loja.' })
  }

  // Valida contra a própria OpenAI antes de gravar — rejeita cedo em vez de
  // persistir algo que só quebra silenciosamente no próximo turno do agente
  // (seção 10). Valida contra o modelo que de fato vai ser salvo.
  const model = parsed.data.model ?? loja.agent_model
  await assertKeyUsable(apiKey, model)

  const { error: setError } = await admin.rpc('agent_openai_key_set', { p_key: apiKey })
  if (setError) {
    logger.error('Falha ao gravar chave OpenAI no Vault', { error: setError.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao salvar a chave.' })
  }

  const mascara = maskSecret(apiKey)
  const { error: updateError } = await admin
    .from('store')
    .update({ agent_openai_key_mask: mascara, agent_model: model })
    .eq('id', loja.id)

  if (updateError) {
    logger.error('Chave gravada no Vault, mas falha ao atualizar máscara/modelo', { error: updateError.message })
    throw createError({ statusCode: 500, statusMessage: 'Chave salva, mas falha ao atualizar os metadados.' })
  }

  logger.info('Chave OpenAI do agente atualizada', { userId: caller.id, modelo: model })

  return { configurado: true, mascara, modelo: model }
})

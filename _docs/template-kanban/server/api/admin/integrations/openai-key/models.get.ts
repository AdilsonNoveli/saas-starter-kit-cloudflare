import OpenAI from 'openai'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { logger } from '~/core/services/logger.service'
import {
  OPENAI_CONVERSATIONAL_MODELS,
  OPENAI_JUDGE_MODELS,
  type OpenAiModelOption,
} from '~~/shared/types/agent'

export interface OpenAiModelsResponse {
  conversational: readonly OpenAiModelOption[]
  judge: readonly OpenAiModelOption[]
  /** `false` quando a resposta é o catálogo estático (sem chave, sem escopo `model.read`, ou falha de rede). */
  disponibilidadeConfirmada: boolean
}

const FALLBACK: OpenAiModelsResponse = {
  conversational: OPENAI_CONVERSATIONAL_MODELS,
  judge: OPENAI_JUDGE_MODELS,
  disponibilidadeConfirmada: false,
}

/**
 * GET /api/admin/integrations/openai-key/models — cruza o catálogo de preços
 * mantido à mão (`shared/types/agent.ts`) com `GET /v1/models` da própria
 * chave configurada, para o select de `/admin/settings/agent` só oferecer
 * modelo que:
 *   (a) o projeto desta chave de fato tem acesso HOJE — não um catálogo
 *       estático que pode citar um modelo já desativado (o erro só aparece
 *       depois, em `assertKeyUsable` na hora de salvar); e
 *   (b) tem preço cadastrado — senão "Custo estimado" volta a zerar
 *       silenciosamente para esse modelo, mesma classe de bug já corrigida em
 *       `ai-usage.get.ts`.
 *
 * O preço em si **não** vem da OpenAI — a API de modelos não expõe preço (só
 * `id`/`created`/`owned_by`, ver `openai/resources/models.d.ts`). Não existe
 * jeito de eliminar esse catálogo mantido à mão; o que dá pra eliminar é a
 * lista ficar dizendo que um modelo está disponível quando não está mais.
 *
 * Sem chave configurada, chave sem escopo `model.read` (403 — restrição
 * legítima, `openai-key.post.ts` já documenta esse caso), ou falha de rede:
 * cai pro catálogo estático (`disponibilidadeConfirmada: false`) em vez de
 * travar a tela de configuração.
 */
export default defineEventHandler(async (event): Promise<OpenAiModelsResponse> => {
  const { supabase: admin } = await requireServiceRole(event, USER_MANAGEMENT_ROLES)
  const { data: loja } = await admin
    .from('store')
    .select('agent_openai_key_id')
    .limit(1)
    .maybeSingle()

  if (!loja?.agent_openai_key_id) return FALLBACK

  const { data: apiKey, error: vaultError } = await admin.rpc('agent_openai_key_get')
  if (vaultError || !apiKey) return FALLBACK

  let availableIds: Set<string>
  try {
    const client = new OpenAI({ apiKey, maxRetries: 1 })
    const page = await client.models.list()
    availableIds = new Set(page.data.map((m) => m.id))
  } catch (err) {
    logger.warn('[openai-key/models] falha ao listar modelos da OpenAI — usando catálogo estático', {
      error: err instanceof Error ? err.message : String(err),
    })
    return FALLBACK
  }

  const disponiveis = (catalog: readonly OpenAiModelOption[]): OpenAiModelOption[] =>
    catalog.filter((m) => availableIds.has(m.value))

  const conversational = disponiveis(OPENAI_CONVERSATIONAL_MODELS)
  const judge = disponiveis(OPENAI_JUDGE_MODELS)

  // Nenhum modelo do catálogo apareceu na lista da OpenAI — mais provável
  // ser um problema momentâneo/escopo do que todo o catálogo ter sido
  // descontinuado de uma vez. Lista vazia no select é pior do que o catálogo
  // estático desatualizado.
  if (conversational.length === 0 || judge.length === 0) {
    logger.warn('[openai-key/models] nenhum modelo do catálogo apareceu em /v1/models — usando catálogo estático', {
      totalDisponivelNaOpenAi: availableIds.size,
    })
    return FALLBACK
  }

  return { conversational, judge, disponibilidadeConfirmada: true }
})

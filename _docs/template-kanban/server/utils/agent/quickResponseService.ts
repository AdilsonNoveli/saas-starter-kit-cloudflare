/**
 * Camada de serviço do CRUD admin de Respostas Rápidas do Agente IA
 * (`agent_quick_responses`, migration 120) — rotas em
 * `server/api/admin/quick-responses/**` ficam finas, delegam pra cá, mesmo
 * padrão de `server/utils/chat/chatService.ts`.
 *
 * Validação de vocabulário do `triggerType` acontece só no Zod da rota de
 * escrita (nunca aqui, nunca no banco) — ver `shared/types/agentQuickResponse.ts`.
 */
import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { logger } from '~/core/services/logger.service'
import type {
  AgentQuickResponse,
  CreateAgentQuickResponsePayload,
  ReorderAgentQuickResponsesPayload,
  UpdateAgentQuickResponsePayload,
} from '#shared/types/agentQuickResponse'
import { toAgentQuickResponse } from './agentQuickResponseMapper'

export async function listQuickResponses(
  supabase: SupabaseClient<Database>,
): Promise<AgentQuickResponse[]> {
  const { data, error } = await supabase
    .from('agent_quick_responses')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    logger.error('[quick-responses] falha ao listar', { error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar respostas rápidas.' })
  }

  return (data ?? []).map(toAgentQuickResponse)
}

export async function getQuickResponse(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<AgentQuickResponse> {
  const { data, error } = await supabase
    .from('agent_quick_responses')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    logger.error('[quick-responses] falha ao buscar', { id, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar resposta rápida.' })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Resposta rápida não encontrada.' })
  }

  return toAgentQuickResponse(data)
}

/**
 * A regra nova entra no FIM da lista quando o chamador não informa
 * `sortOrder` (a página de criação, `[id].vue`, não tem a lista carregada
 * pra saber a posição — pediria um fetch a mais só pra isso). `sort_order`
 * não é `SERIAL`/`IDENTITY` (é reordenável por drag-and-drop, migration 120),
 * então o próximo valor é sempre "1 + o maior já usado", nunca `COUNT(*)`
 * (que quebraria depois de qualquer exclusão no meio da lista).
 */
async function nextSortOrder(supabase: SupabaseClient<Database>): Promise<number> {
  const { data } = await supabase
    .from('agent_quick_responses')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.sort_order ?? -1) + 1
}

export async function createQuickResponse(
  supabase: SupabaseClient<Database>,
  payload: CreateAgentQuickResponsePayload,
): Promise<AgentQuickResponse> {
  const sortOrder = payload.sortOrder ?? await nextSortOrder(supabase)

  const { data, error } = await supabase
    .from('agent_quick_responses')
    .insert({
      name: payload.name,
      trigger_type: payload.triggerType,
      keywords: payload.keywords ? [...payload.keywords] : null,
      kanban_stage_key: payload.kanbanStageKey ?? null,
      customer_statuses: payload.customerStatuses ? [...payload.customerStatuses] : null,
      reply_text: payload.replyText,
      active: payload.active ?? true,
      sort_order: sortOrder,
    })
    .select('*')
    .single()

  if (error || !data) {
    logger.error('[quick-responses] falha ao criar', { error: error?.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao criar resposta rápida.' })
  }

  return toAgentQuickResponse(data)
}

export async function updateQuickResponse(
  supabase: SupabaseClient<Database>,
  id: string,
  payload: UpdateAgentQuickResponsePayload,
): Promise<AgentQuickResponse> {
  const patch: Database['public']['Tables']['agent_quick_responses']['Update'] = {}
  if (payload.name !== undefined) patch.name = payload.name
  if (payload.triggerType !== undefined) patch.trigger_type = payload.triggerType
  if (payload.keywords !== undefined) patch.keywords = [...payload.keywords]
  if (payload.kanbanStageKey !== undefined) patch.kanban_stage_key = payload.kanbanStageKey
  if (payload.customerStatuses !== undefined) patch.customer_statuses = [...payload.customerStatuses]
  if (payload.replyText !== undefined) patch.reply_text = payload.replyText
  if (payload.active !== undefined) patch.active = payload.active
  if (payload.sortOrder !== undefined) patch.sort_order = payload.sortOrder

  const { data, error } = await supabase
    .from('agent_quick_responses')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Resposta rápida não encontrada.' })
  }

  return toAgentQuickResponse(data)
}

export async function deleteQuickResponse(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('agent_quick_responses').delete().eq('id', id)
  if (error) {
    logger.error('[quick-responses] falha ao excluir', { id, error: error.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro ao excluir resposta rápida.' })
  }
}

/**
 * `sort_order` não tem UNIQUE (migration 120) — atualizações sequenciais por
 * `id`, sem risco de colisão. Não é transacional: uma falha no meio deixa
 * parte das regras com a ordem nova e parte com a antiga — inofensivo
 * (empate/ordem levemente errada, nunca dado corrompido) e resolvível
 * tentando reordenar de novo, então não vale a complexidade de uma RPC só
 * para isto.
 */
export async function reorderQuickResponses(
  supabase: SupabaseClient<Database>,
  payload: ReorderAgentQuickResponsesPayload,
): Promise<void> {
  for (const item of payload.items) {
    const { error } = await supabase
      .from('agent_quick_responses')
      .update({ sort_order: item.sortOrder })
      .eq('id', item.id)

    if (error) {
      logger.error('[quick-responses] falha ao reordenar', { id: item.id, error: error.message })
      throw createError({ statusCode: 500, statusMessage: 'Erro ao reordenar respostas rápidas.' })
    }
  }
}

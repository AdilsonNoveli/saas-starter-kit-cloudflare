/**
 * Consumer da fila do laboratório de avaliação sob demanda
 * (`_docs/implementar/prd-laboratorio-avaliacao-agente.md` §6) — mesmo padrão
 * de `whatsapp-queue.ts` (hook nativo `cloudflare:queue`), mas roda uma
 * persona roteirizada inteira por mensagem, contra o agente real, em sandbox
 * isolado (cliente sintético, `FinalizarPedido` lab-safe, sem envio real de
 * WhatsApp).
 *
 * Reprodutibilidade (§0 do PRD — "mesmo roteiro, mesmo resultado
 * comparável"): o histórico da conversa simulada vive só em memória, NUNCA em
 * `whatsapp_conversas` — persistir contaminaria a próxima corrida com o
 * histórico da anterior, quebrando a comparação "config real vs config
 * alterada" que é o critério de sucesso do laboratório (§1/fase 7). Pelo
 * mesmo motivo, cada persona ganha uma sessão de carrinho NOVA
 * (`createCatalogSession`, nunca `getOrCreateActiveSession`) — carrinho limpo
 * a cada corrida. E nada é gravado em `agente_uso_tokens`: aquela tabela
 * alimenta a amostragem de PRODUÇÃO (`avaliacao_pendente`), e tráfego
 * sintético ali contaminaria a métrica "como o agente está indo com clientes
 * reais".
 */
import OpenAI from 'openai'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database, Json } from '~/types/database.types'
import { LAB_QUEUE_SUFFIX, isBatchForQueue, type WhatsappLabQueueMessage } from '../utils/whatsapp/queueBindings'
import { findOrCreateCustomer } from '../utils/customers/findOrCreateCustomer'
import { createCatalogSession } from '../utils/sessions/createCatalogSession'
import { resolveAgentRuntimeConfig } from '../utils/agent/resolveAgentRuntimeConfig'
import { buildSystemPrompt, AGENT_JUDGE_RULES } from '../utils/agent/systemPrompt'
import { runAgent, type AgentHistoryMessage } from '../utils/agent/runAgent'
import { buildLabAgentTools } from '../utils/agent/toolRegistry'
import { judgeConversation, scoreFromVeredicto, type JudgeToolCall } from '../utils/agent/conversationJudge'
import { findLabPersona, labPersonaPhone, LAB_PERSONAS } from '../utils/lab/personas'
import { fetchLabCatalogSample } from '../utils/lab/labCatalogSample'
import { requireServerKey } from '../utils/maps/google'
import type { AgentToolContext } from '../utils/agent/toolContext'

interface QueueMessage<T> {
  readonly body: T
  ack(): void
}

interface QueueBatch<T> {
  readonly queue: string
  readonly messages: readonly QueueMessage<T>[]
}

interface CloudflareQueueHookPayload {
  batch: QueueBatch<WhatsappLabQueueMessage>
}

/** Mesmo motivo de `whatsapp-queue.ts`: augmentation do hook só existe sob o preset `cloudflare-module`. */
interface QueueHookRegistrar {
  hook(name: 'cloudflare:queue', fn: (payload: CloudflareQueueHookPayload) => void | Promise<void>): void
}

function buildSupabaseServiceClient(): SupabaseClient<Database> {
  const config = useRuntimeConfig()
  const url = (config.public as Record<string, unknown> & { supabase?: { url?: string } }).supabase?.url ?? ''
  const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY ?? ''
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false } })
}

export default defineNitroPlugin((nitroApp) => {
  const hooks = nitroApp.hooks as unknown as QueueHookRegistrar

  hooks.hook('cloudflare:queue', async ({ batch }) => {
    if (!isBatchForQueue(batch.queue, LAB_QUEUE_SUFFIX)) return

    const supabase = buildSupabaseServiceClient()

    for (const message of batch.messages) {
      await processPersonaMessage(supabase, message.body).catch((err: unknown) => {
        logger.error('[whatsapp-lab-queue] falha inesperada fora do try/catch da persona', {
          runId: message.body.runId,
          personaKey: message.body.personaKey,
          error: err instanceof Error ? err.message : String(err),
        })
      })
      message.ack()
    }
  })
})

async function processPersonaMessage(
  supabase: SupabaseClient<Database>,
  body: WhatsappLabQueueMessage,
): Promise<void> {
  const { runId, personaKey, personaIndex } = body
  const persona = findLabPersona(personaKey)

  if (!persona) {
    logger.error('[whatsapp-lab-queue] persona desconhecida', { runId, personaKey })
    await recordFailure(supabase, runId, personaKey, 'persona desconhecida')
    await finalizeRunIfComplete(supabase, runId)
    return
  }

  try {
    const runtimeConfig = await resolveAgentRuntimeConfig(supabase, useRuntimeConfig())
    if (!runtimeConfig.agent) {
      await recordFailure(supabase, runId, persona.key, 'agente sem chave OpenAI configurada')
      await finalizeRunIfComplete(supabase, runId)
      return
    }
    const agentConfig = runtimeConfig.agent

    const customer = await findOrCreateCustomer(supabase, {
      whatsapp: labPersonaPhone(personaIndex),
      nome: `Laboratório — ${persona.label}`,
      isTesteLaboratorio: true,
    })

    // Sessão SEMPRE nova (nunca `getOrCreateActiveSession`): carrinho limpo a
    // cada corrida, para a comparação entre corridas ser exata (§0 do PRD).
    const session = await createCatalogSession(supabase, customer.id, 'whatsapp_bot')
    const googleMapsServerKey = requireServerKey((useRuntimeConfig().googleMapsServerKey as string) || '')

    const ctx: AgentToolContext = {
      supabase,
      sessaoId: session.sessaoId,
      clienteId: customer.id,
      whatsapp: labPersonaPhone(personaIndex),
      catalogoUrl: session.url,
      googleMapsServerKey,
      // No-op logado (§2.3 do PRD) — mesmo padrão de `ctx.sendCatalogButton`
      // injetado, nunca uma chamada real ao WhatsApp Cloud API.
      sendCatalogButton: async (input) => {
        logger.info('[whatsapp-lab-queue] EnviarBotaoCatalogo (no-op)', { runId, persona: persona.key, body: input.body })
      },
    }

    const openai = new OpenAI({ apiKey: agentConfig.apiKey })
    const tools = buildLabAgentTools(agentConfig.activeTools)
    const systemPrompt = buildSystemPrompt({
      // Sem `agenteNome`/`agenteSaudacao` de propósito: `AGENT_IDENTITY_NOTE`
      // depende de `customer_profile.is_new_customer` no BRIEFING, e o
      // laboratório usa este placeholder fixo (sem briefing dinâmico real) —
      // incluir a nota aqui testaria um sinal que nunca existe na simulação.
      briefing: 'LABORATORIO DE AVALIACAO: conversa simulada, sem briefing dinamico de cliente real.',
      instrucoesExtra: agentConfig.instrucoesExtra,
    })

    const history: AgentHistoryMessage[] = []
    const toolCallTrace: JudgeToolCall[] = []
    const catalogSample = await fetchLabCatalogSample(supabase)
    const falas = persona.falas(catalogSample)

    for (const fala of falas) {
      const result = await runAgent({
        openai,
        model: agentConfig.model,
        systemPrompt,
        history,
        userMessage: fala,
        ctx,
        tools,
        // Dá ao juiz visibilidade do que as tools realmente retornaram — sem
        // isso ele não distingue um preço citado a partir do retorno real de
        // BuscarProdutos de um preço inventado (medido em corrida real: todo
        // preço legítimo era marcado 'alucinacao' por falta desta evidência).
        onToolCall: (call) => { toolCallTrace.push(call) },
      })
      history.push({ role: 'user', content: fala })
      history.push({ role: 'assistant', content: result.text || '(sem resposta de texto)' })
    }

    const verdict = await judgeConversation(openai, agentConfig.model, {
      janela: history,
      regras: AGENT_JUDGE_RULES,
      instrucoesExtra: agentConfig.instrucoesExtra ?? '',
      contexto: `laboratório — persona "${persona.label}" (${persona.proposito})`,
      toolCalls: toolCallTrace,
    })

    if (verdict.status === 'done') {
      await supabase.from('agente_avaliacao').insert({
        origem: 'laboratorio',
        run_id: runId,
        persona: persona.key,
        cliente_id: customer.id,
        modelo_avaliador: agentConfig.model,
        janela: history as unknown as Json,
        status: 'done',
        veredicto: verdict.verdict.veredicto,
        achados: verdict.verdict.achados as unknown as Json,
        tokens_avaliacao: verdict.tokens,
      })
    } else {
      logger.warn('[whatsapp-lab-queue] juiz falhou ao avaliar persona', { runId, persona: persona.key, detail: verdict.detail })
      await supabase.from('agente_avaliacao').insert({
        origem: 'laboratorio',
        run_id: runId,
        persona: persona.key,
        cliente_id: customer.id,
        modelo_avaliador: agentConfig.model,
        janela: history as unknown as Json,
        status: 'judge_failed',
      })
    }
  } catch (err) {
    logger.error('[whatsapp-lab-queue] persona abortou', {
      runId,
      persona: persona.key,
      error: err instanceof Error ? err.message : String(err),
    })
    await recordFailure(supabase, runId, persona.key, err instanceof Error ? err.message : String(err))
  }

  await finalizeRunIfComplete(supabase, runId)
}

async function recordFailure(
  supabase: SupabaseClient<Database>,
  runId: string,
  personaKey: string,
  motivo: string,
): Promise<void> {
  const { error } = await supabase.from('agente_avaliacao').insert({
    origem: 'laboratorio',
    run_id: runId,
    persona: personaKey,
    modelo_avaliador: 'n/a',
    janela: [] as unknown as Json,
    status: 'failed',
  })
  if (error) {
    logger.error('[whatsapp-lab-queue] falha ao gravar status=failed da persona', { runId, personaKey, motivo, error: error.message })
  }
}

/**
 * Fecha a corrida quando as `LAB_PERSONAS.length` linhas já foram gravadas.
 * Idempotente por natureza (recomputa o mesmo score de novo) — não precisa de
 * lock: uma UPDATE redundante não corrompe nada, só recalcula o mesmo valor.
 */
async function finalizeRunIfComplete(supabase: SupabaseClient<Database>, runId: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from('agente_avaliacao')
    .select('status, veredicto')
    .eq('run_id', runId)

  if (error || !rows || rows.length < LAB_PERSONAS.length) return

  const concluidas = rows.filter((r) => r.status === 'done' && r.veredicto)
  const score = concluidas.length > 0
    ? Math.round((concluidas.reduce((soma, r) => soma + scoreFromVeredicto(r.veredicto as 'verde' | 'amarelo' | 'vermelho'), 0) / concluidas.length) * 100)
    : 0

  await supabase
    .from('agente_teste_run')
    .update({
      status: concluidas.length > 0 ? 'done' : 'failed',
      score,
      erro: concluidas.length === 0 ? 'todas as personas falharam ao rodar ou julgar' : null,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', runId)
}

/**
 * Consumer da fila do agente WhatsApp (passo 6 da seção 12 da arquitetura do
 * agente WhatsApp — `_docs/implementar/arquitetura-agente-whatsapp-in-app.md`). Hook
 * nativo `cloudflare:queue` do preset Cloudflare do Nitro: recebe
 * `{batch, env, context}`, nunca um `H3Event` (seção 2) — todo cliente
 * (Supabase, OpenAI, WhatsApp Cloud API) é montado aqui, nunca herdado de uma
 * rota HTTP.
 *
 * Fluxo por mensagem do lote: claim atômico do buffer de rajada → se vazio,
 * no-op (superado por mensagem mais nova ou já processado, seção 4) → monta
 * `AgentToolContext` → roda `runAgent` → persiste histórico/telemetria →
 * responde via WhatsApp. Um único try/catch cobre tudo pós-claim: qualquer
 * falha vira a mensagem de fallback padrão para o cliente, nunca uma exceção
 * relançada para a fila retentar (seção 4).
 */
import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSupabaseServiceClient } from '../utils/supabase/serviceClient'
import { logger } from '~/core/services/logger.service'
import type { Database, Json } from '~/types/database.types'
import type { JudgeToolCall } from '../utils/agent/conversationJudge'
import { claimBurstBuffer, type ClaimedBurstBuffer } from '../utils/whatsapp/claimBurstBuffer'
import { TURN_QUEUE_SUFFIX, isBatchForQueue, type WhatsappTurnQueueMessage } from '../utils/whatsapp/queueBindings'
import { markReadAndTyping, sendText, sendChoiceButtons, type CloudApiClientConfig, type WhatsappRecipient } from '../utils/whatsapp/cloudApiClient'
import { getCustomerContext } from '../utils/integration/getCustomerContext'
import { findOrCreateCustomer } from '../utils/customers/findOrCreateCustomer'
import { getOrCreateActiveSession } from '../utils/sessions/createCatalogSession'
import { resolveAgentRuntimeConfig, type AgentConfig, type AgentRuntimeConfig } from '../utils/agent/resolveAgentRuntimeConfig'
import { buildSystemPrompt } from '../utils/agent/systemPrompt'
import { loadCustomerSkillFacts } from '../utils/agent/customerIntelligence'
import { renderCustomerSkill } from '../utils/agent/customerSkill'
import { countRecentUserTurns, loadConversationHistory, saveConversationTurn, type SavedConversationTurn } from '../utils/agent/conversationHistory'
import { runAgent } from '../utils/agent/runAgent'
import { getActiveAgentTools } from '../utils/agent/toolRegistry'
import {
  CEILING_REPLY,
  detectPromptInjection,
  INJECTION_REPLY,
  sanitizeAgentReply,
  TURN_CEILING_PER_HOUR,
  TURN_CEILING_WINDOW_MS,
} from '../utils/agent/guardrails'
import { GREETING_REPLY, isPureGreeting } from '../utils/agent/greeting'
import { checkUnresolvedTechnicalFailure } from '../utils/agent/technicalEscalation'
import {
  requiresFirstMessageLookup,
  requiresStatusLookup,
  resolveQuickResponse,
} from '../utils/agent/quickResponse'
import { resolveQuickResponseContext } from '../utils/agent/resolveQuickResponseContext'
import { toAgentQuickResponse } from '../utils/agent/agentQuickResponseMapper'
import type { AgentQuickResponse } from '#shared/types/agentQuickResponse'
import { pauseCustomer } from '../utils/whatsapp/pauseState'
import { resolvePausaConfig } from '../utils/whatsapp/resolvePausaConfig'
import { requireServerKey } from '../utils/maps/google'
import type { AgentToolContext } from '../utils/agent/toolContext'
import { notifyRealtimeRoom } from '../utils/chat/chatRoom'
import { extractToolNames } from '../utils/chat/toolTrace'
import { maskPhone } from '../utils/security/maskPhone'

const FALLBACK_TEXT = 'Tive um probleminha aqui pra processar sua mensagem. Pode mandar de novo, por favor?'
const NO_KEY_TEXT = 'Ainda não consegui falar com o atendimento automático — já vamos te responder por aqui, um momento.'
/**
 * Camada 5 (guardrails.ts + technicalEscalation.ts): reply do turno quando o
 * modelo terminou com uma falha TÉCNICA não resolvida (produto_id alucinado,
 * 5xx). Nunca menciona o que aconteceu por dentro — o cliente não fez nada
 * errado e a venda não pode morrer numa desculpa técnica (§2).
 */
const TECHNICAL_ESCALATION_REPLY = 'Já anotei tudo aqui certinho. Vou confirmar rapidinho com a equipe e te aviso assim que tiver novidade.'

interface QueueMessage<T> {
  readonly body: T
  ack(): void
}

interface QueueBatch<T> {
  /**
   * O hook `cloudflare:queue` é um só para todas as filas do Worker: desde que
   * `whatsapp-midia` existe (fase 6 da arquitetura de mídia), este consumer
   * recebe também os lotes dela e precisa ignorá-los.
   */
  readonly queue: string
  readonly messages: readonly QueueMessage<T>[]
}

interface CloudflareQueueHookPayload {
  batch: QueueBatch<WhatsappTurnQueueMessage>
  env?: Record<string, unknown>
}

/**
 * O tipo do hook `cloudflare:queue` só é conhecido pelo TypeScript quando o
 * preset `cloudflare-module` está ativo (`nitropack@2.13.4`,
 * `presets/cloudflare/types.d.ts` — augmentation carregada só nesse build).
 * `nuxi typecheck` roda com o preset padrão (node-server), então o nome do
 * hook não é reconhecido — tipado aqui via `unknown` (nunca `any`) em vez de
 * depender da augmentation ausente.
 */
interface QueueHookRegistrar {
  hook(name: 'cloudflare:queue', fn: (payload: CloudflareQueueHookPayload) => void | Promise<void>): void
}

/**
 * Regras ativas de Resposta Rápida do Agente IA (`agent_quick_responses`,
 * migration 120), carregadas UMA VEZ POR LOTE — mesmo padrão de
 * `resolveAgentRuntimeConfig` logo abaixo (comentário no hook `cloudflare:queue`):
 * repetir a leitura por mensagem pagaria 1 SELECT por mensagem sem ganho, já
 * que a lista de regras não muda no meio de um lote. Loja sem nenhuma regra
 * ativa devolve array vazio — o motor de decisão (`quickResponse.ts`) nunca
 * entra em cena nesse caso, zero custo adicional por turno.
 */
async function loadActiveQuickResponses(supabase: SupabaseClient<Database>): Promise<AgentQuickResponse[]> {
  // Try/catch, não só `{error}`: best-effort como toda leitura auxiliar deste
  // arquivo (mesma régua de `countRecentUserTurns`) — uma falha aqui (rede,
  // client não suporta a chamada) nunca pode derrubar o lote inteiro, só
  // deixa a loja sem respostas rápidas neste ciclo.
  try {
    const { data, error } = await supabase
      .from('agent_quick_responses')
      .select('*')
      .eq('active', true)

    if (error) {
      logger.error('[whatsapp-queue] falha ao carregar respostas rápidas — seguindo sem elas', { error: error.message })
      return []
    }

    return (data ?? []).map(toAgentQuickResponse)
  } catch (err) {
    logger.error('[whatsapp-queue] falha inesperada ao carregar respostas rápidas — seguindo sem elas', {
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

export default defineNitroPlugin((nitroApp) => {
  const hooks = nitroApp.hooks as unknown as QueueHookRegistrar

  hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    if (!isBatchForQueue(batch.queue, TURN_QUEUE_SUFFIX)) return

    const supabase = buildSupabaseServiceClient()
    // Resolvido uma vez por lote, não por mensagem: nem a config do agente nem
    // a do provedor mudam no meio de um batch, e repetir a leitura pagaria
    // 1 SELECT + 2 RPC por mensagem sem nenhum ganho.
    const runtimeConfig = await resolveAgentRuntimeConfig(supabase, useRuntimeConfig())
    const quickResponseRules = await loadActiveQuickResponses(supabase)

    for (const message of batch.messages) {
      await processQueueMessage(supabase, runtimeConfig, quickResponseRules, message.body, env).catch((err: unknown) => {
        logger.error('[whatsapp-queue] falha inesperada fora do try/catch de turno', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
      message.ack()
    }
  })
})

/**
 * Turno com caminho de resposta. Todo o miolo abaixo responde ao cliente em
 * algum ramo (§2), e sem telefone nenhum desses envios existe — o provedor não
 * aceita `user_id` no envio (`api-1.yaml:689`, §5 armadilha 14). Estreitar o
 * tipo aqui é o que impede um `sendText(..., null, ...)` de nascer despercebido.
 */
type DeliverableTurn = ClaimedBurstBuffer & { telefone: string }

function podeResponder(claimed: ClaimedBurstBuffer): claimed is DeliverableTurn {
  return claimed.telefone !== null
}

/**
 * Identidade do cliente para a camada de envio (item (d) da FASE 0.4). O
 * consumer nunca mais monta um `to: string`: quem traduz identidade em
 * endereçamento é `cloudApiClient`, e é lá que a mudança acontece no dia em que
 * o provedor aceitar `user_id`. `DeliverableTurn` é o que prova o `telefone`
 * não-nulo que o tipo do destinatário exige.
 */
function recipientOf(claimed: DeliverableTurn): WhatsappRecipient {
  return { telefone: claimed.telefone, lid: claimed.lid }
}

/**
 * Transmite o par cliente/agente no socket único do Chat
 * (`notifyRealtimeRoom`), para quem está com a conversa aberta no painel ver
 * a mensagem sem precisar recarregar. `toolNames` só existe no braço que
 * passa pelo modelo (`runAgentTurn`) — os atalhos determinísticos
 * (`replyWithoutModel`, teto de falas) nunca chamam tool.
 */
async function broadcastTurn(
  env: Record<string, unknown> | undefined,
  clienteId: string,
  userMessage: string,
  assistantText: string,
  saved: SavedConversationTurn | null,
  toolNames?: readonly string[],
): Promise<void> {
  if (!saved) return

  await notifyRealtimeRoom(env, {
    topic: 'chat.message',
    payload: {
      id: saved.user.id,
      clienteId,
      role: 'user',
      content: userMessage,
      criadoEm: saved.user.criadoEm,
      seq: saved.user.seq,
      ator: 'cliente',
    },
  })
  await notifyRealtimeRoom(env, {
    topic: 'chat.message',
    payload: {
      id: saved.assistant.id,
      clienteId,
      role: 'assistant',
      content: assistantText,
      criadoEm: saved.assistant.criadoEm,
      seq: saved.assistant.seq,
      ator: 'agente_ia',
      toolsUsed: toolNames && toolNames.length > 0 ? [...toolNames] : undefined,
    },
  })
}

async function processQueueMessage(
  supabase: SupabaseClient<Database>,
  runtimeConfig: AgentRuntimeConfig,
  quickResponseRules: readonly AgentQuickResponse[],
  body: WhatsappTurnQueueMessage,
  env?: Record<string, unknown>,
): Promise<void> {
  const cloudApiConfig = runtimeConfig.provider
  const claimed = await claimBurstBuffer(supabase, body.chave, body.checkForMsgId)
  if (!claimed) return

  const userMessage = claimed.textos.join('\n')
  if (!userMessage.trim()) return // blindagem: buffer vazio não acorda o agente

  if (!podeResponder(claimed)) {
    // Turno identificado só pelo lid: processá-lo gastaria token numa resposta
    // que não tem por onde sair. Fica registrado no log, nunca em silêncio —
    // esta é a única saída do fluxo sem resposta ao cliente, e ela existe por
    // limite do provedor, não por decisão nossa. Some com o item (d) da FASE
    // 0.4 + `user_id` aceito no envio.
    logger.warn('[whatsapp-queue] turno sem telefone — sem caminho de resposta (armadilha 14)', {
      chave: claimed.chave,
      lid: claimed.lid,
    })
    return
  }

  try {
    await markReadAndTyping(cloudApiConfig, claimed.ultimaMsgId)

    // `agent: null` = agente desligado ou sem chave. O provedor vem preenchido
    // de qualquer jeito, justamente para esta resposta sair (§2).
    if (!runtimeConfig.agent) {
      await sendText(cloudApiConfig, recipientOf(claimed), NO_KEY_TEXT)
      return
    }

    await runAgentTurn(supabase, cloudApiConfig, claimed, userMessage, runtimeConfig.agent, quickResponseRules, env)
  } catch (err) {
    logger.error('[whatsapp-queue] turno abortou, respondendo fallback', {
      telefone: maskPhone(claimed.telefone),
      error: err instanceof Error ? err.message : String(err),
    })
    await sendText(cloudApiConfig, recipientOf(claimed), FALLBACK_TEXT).catch((sendErr: unknown) => {
      logger.error('[whatsapp-queue] fallback também falhou ao enviar', {
        telefone: maskPhone(claimed.telefone),
        error: sendErr instanceof Error ? sendErr.message : String(sendErr),
      })
    })
  }
}

/**
 * Resposta determinística: grava o turno e responde sem passar pelo modelo.
 *
 * Resolve o cliente por `findOrCreateCustomer` em vez de `getCustomerContext`
 * porque aqui só falta o `cliente_id` para persistir — montar briefing,
 * carrinho e agenda (~10 round-trips) seria pagar o turno inteiro para uma
 * resposta que já está decidida. O `lid` vai junto: cliente barrado continua
 * sendo cliente, e o backfill do identificador estável não pode depender de o
 * turno ter chegado ao modelo.
 */
async function replyWithoutModel(
  supabase: SupabaseClient<Database>,
  cloudApiConfig: CloudApiClientConfig,
  claimed: DeliverableTurn,
  userMessage: string,
  reply: string,
  env?: Record<string, unknown>,
): Promise<void> {
  const customer = await findOrCreateCustomer(supabase, {
    whatsapp: claimed.telefone,
    ...(claimed.lid ? { lid: claimed.lid } : {}),
  })
  const saved = await saveConversationTurn(supabase, customer.id, userMessage, reply)
  await broadcastTurn(env, customer.id, userMessage, reply, saved)
  await sendText(cloudApiConfig, recipientOf(claimed), reply)
}

async function runAgentTurn(
  supabase: SupabaseClient<Database>,
  cloudApiConfig: CloudApiClientConfig,
  claimed: DeliverableTurn,
  userMessage: string,
  openAiConfig: AgentConfig,
  quickResponseRules: readonly AgentQuickResponse[],
  env?: Record<string, unknown>,
): Promise<void> {
  // Camada 1 (guardrails.ts): tentativa clara de sequestro de instrução NUNCA
  // chega à OpenAI. É a única camada com garantia dura — sem chamada ao modelo
  // não há o que induzir — e por isso roda antes de resolver contexto, montar
  // prompt ou anexar tool. O cliente ainda recebe resposta (§2) e o turno é
  // gravado no histórico para auditoria.
  const injecao = detectPromptInjection(userMessage)
  if (injecao) {
    logger.warn('[guardrail] tentativa de sequestro de instrução — turno não foi ao modelo', {
      telefone: maskPhone(claimed.telefone),
      padrao: injecao.padrao,
      trecho: injecao.trecho,
    })
    await replyWithoutModel(supabase, cloudApiConfig, claimed, userMessage, INJECTION_REPLY, env)
    return
  }

  // Respostas Rápidas do Agente IA (quickResponse.ts) — regra do lojista tem
  // prioridade sobre o comportamento padrão do sistema (a saudação genérica
  // logo abaixo), mas nunca sobre a Camada 1 de segurança acima. Avaliação
  // preguiçosa em duas camadas: loja sem regra ativa nenhuma (array vazio)
  // nunca paga os SELECTs abaixo; regra ativa que não precisa de status/
  // primeira-mensagem também não paga a query correspondente
  // (`requiresStatusLookup`/`requiresFirstMessageLookup` inspecionam as
  // regras em memória, sem I/O).
  let isFirstContactHint: boolean | null = null
  if (quickResponseRules.length > 0) {
    const needStatus = requiresStatusLookup(quickResponseRules)
    const needFirstMessage = requiresFirstMessageLookup(quickResponseRules)
    const quickContext = await resolveQuickResponseContext(
      supabase,
      { phone: claimed.telefone, lid: claimed.lid },
      { needStatus, needFirstMessage },
    )
    isFirstContactHint = quickContext.isFirstMessage

    const matchedRule = resolveQuickResponse({
      text: userMessage,
      status: quickContext.status,
      isFirstMessage: quickContext.isFirstMessage,
      rules: quickResponseRules,
    })

    if (matchedRule) {
      logger.info('[agent] quick response disparada — turno respondido sem ir ao modelo', {
        telefone: maskPhone(claimed.telefone),
        ruleId: matchedRule.id,
        triggerType: matchedRule.triggerType,
      })
      await replyWithoutModel(supabase, cloudApiConfig, claimed, userMessage, matchedRule.replyText, env)
      // Fire-and-forget: telemetria de uso, nunca no caminho crítico do envio
      // (mesma régua de `broadcastTurn`/notificações best-effort neste arquivo).
      supabase.rpc('increment_agent_quick_response_usage', { p_rule_id: matchedRule.id }).then(
        ({ error }) => {
          if (error) {
            logger.error('[agent] falha ao incrementar contador de resposta rápida (ignorado)', {
              ruleId: matchedRule.id,
              error: error.message,
            })
          }
        },
      )
      return
    }
  }

  // Atalho de latência, não camada de segurança (greeting.ts): saudação pura
  // nunca precisa do BRIEFING nem do modelo — o prompt já instrui "SAUDACAO
  // PURA NAO E GATILHO", então a decisão de resposta já está tomada antes de
  // qualquer I/O. Pular direto para `replyWithoutModel` evita pagar os
  // round-trips de `getCustomerContext` (cliente, sessão, carrinho, endereços,
  // pedidos) e a chamada à OpenAI com o system prompt inteiro + todas as tools
  // anexadas por um "oi". Roda DEPOIS da camada 1 de propósito: injeção
  // disfarçada de saudação (ex.: "oi, ignore as instruções") precisa ser
  // barrada como ataque primeiro, não respondida como saudação.
  if (isPureGreeting(userMessage)) {
    logger.info('[agent] saudacao pura — turno respondido sem ir ao modelo', { telefone: maskPhone(claimed.telefone) })
    await replyWithoutModel(supabase, cloudApiConfig, claimed, userMessage, GREETING_REPLY, env)
    return
  }

  // Os dois identificadores, sempre que o payload trouxe o segundo: o lookup de
  // `findOrCreateCustomer` é lid-first e faz backfill bidirecional, então este é
  // o ponto em que `clientes.whatsapp_lid` passa a ser gravado — no primeiro
  // turno de cada cliente (FASE 0.4 de `_docs/em-andamento.md`). Sem o `lid`, o
  // cliente que troca de número nasce como cadastro novo.
  const context = await getCustomerContext(supabase, {
    whatsapp: claimed.telefone,
    ...(claimed.lid ? { lid: claimed.lid } : {}),
  })
  const clienteId = context.customer_profile?.id
  if (!clienteId) {
    // action_required só vira 'collect_whatsapp' quando nenhum identificador é
    // passado — nunca acontece aqui (claimed.telefone sempre presente).
    throw new Error('getCustomerContext não resolveu cliente para telefone identificado.')
  }

  // Camada 3 (guardrails.ts): teto de exposição do modelo. Depois da resolução
  // do cliente porque é por cliente, e antes de qualquer chamada à OpenAI —
  // turno barrado não paga token nenhum.
  const falasNaJanela = await countRecentUserTurns(
    supabase,
    clienteId,
    new Date(Date.now() - TURN_CEILING_WINDOW_MS),
  )
  if (falasNaJanela > TURN_CEILING_PER_HOUR) {
    logger.warn('[guardrail] teto de falas por janela atingido — turno não foi ao modelo', {
      clienteId,
      falasNaJanela,
      teto: TURN_CEILING_PER_HOUR,
    })
    const savedCeiling = await saveConversationTurn(supabase, clienteId, userMessage, CEILING_REPLY)
    await broadcastTurn(env, clienteId, userMessage, CEILING_REPLY, savedCeiling)
    await sendText(cloudApiConfig, recipientOf(claimed), CEILING_REPLY)
    return
  }

  const session = await getOrCreateActiveSession(supabase, clienteId)
  const googleMapsServerKey = requireServerKey((useRuntimeConfig().googleMapsServerKey as string) || '')

  const ctx: AgentToolContext = {
    supabase,
    sessaoId: session.sessaoId,
    clienteId,
    whatsapp: claimed.telefone,
    catalogoUrl: session.url,
    googleMapsServerKey,
    sendChoiceButtons: async (input) => {
      await sendChoiceButtons(cloudApiConfig, { recipient: recipientOf(claimed), body: input.body })
    },
  }

  // Em paralelo: são consultas independentes, e o turno já espera a mais lenta.
  const [history, skillFacts] = await Promise.all([
    loadConversationHistory(supabase, clienteId),
    loadCustomerSkillFacts(supabase, clienteId),
  ])

  // Sinal de "primeiro contato" pra REGRA de identidade (`AGENT_IDENTITY_NOTE`)
  // — NUNCA `customer_profile.is_new_customer`: aquele campo reflete se
  // `findOrCreateCustomer` criou a linha na ÚLTIMA chamada, e `gateInboundTurn`
  // (pauseGate.ts) já resolveu/criou o cliente ANTES deste turno chegar aqui —
  // a flag sempre voltava `false`, mesmo no primeiro contato real. `history`
  // só ganha linha em `saveConversationTurn`, no FIM do turno — vazio aqui é
  // garantia de "nenhuma resposta enviada antes", incondicional à corrida acima.
  // `isFirstContactHint` reaproveita o EXISTS já pago acima (respostas
  // rápidas com regra `first_message` ativa) em vez de fazer a MESMA pergunta
  // duas vezes no mesmo turno — `null` quando nada pagou essa consulta ainda.
  const isFirstContact = isFirstContactHint ?? history.length === 0

  const systemPrompt = buildSystemPrompt({
    briefing: context.briefing,
    instrucoesExtra: openAiConfig.instrucoesExtra,
    agenteNome: openAiConfig.nome,
    agenteSaudacao: openAiConfig.saudacao,
    isFirstContact,
    skill: skillFacts ? renderCustomerSkill(skillFacts, new Date()) : null,
  })
  const openai = new OpenAI({ apiKey: openAiConfig.apiKey })
  const tools = getActiveAgentTools(openAiConfig.activeTools)

  // Trace das tools chamadas neste turno — persistido em `agente_uso_tokens`
  // (migration 106) para `evaluate.ts` dar ao juiz visibilidade do que foi
  // realmente retornado. Sem isso o juiz só vê o texto final e não distingue
  // um preço tool-grounded de um inventado (medido em corrida real do
  // laboratório de avaliação — mesmo problema, mesma correção).
  const toolCallTrace: JudgeToolCall[] = []

  const result = await runAgent({
    openai,
    model: openAiConfig.model,
    systemPrompt,
    history,
    userMessage,
    ctx,
    tools,
    onRound: async () => {
      await markReadAndTyping(cloudApiConfig, claimed.ultimaMsgId)
    },
    onToolCall: (call) => { toolCallTrace.push(call) },
  })

  // Camada 4 (guardrails.ts): nada do que o modelo escreveu chega ao cliente sem
  // passar por aqui — vazamento de instrução/segredo vira resposta neutra, e o
  // markdown que a REGRA 5 proíbe deixa de depender só do prompt (item 8.3).
  const sanitizada = sanitizeAgentReply(result.text)
  if (sanitizada.violacoes.length > 0) {
    logger.warn('[guardrail] resposta do modelo corrigida antes do envio', {
      clienteId,
      violacoes: sanitizada.violacoes,
    })
  }

  // Camada 5 (technicalEscalation.ts): backstop determinístico — não confia só
  // no prompt (TECHNICAL_ERROR_NOTE) para o modelo nunca admitir falha técnica
  // ao cliente. Produto_id alucinado que nunca foi corrigido no turno, ou
  // qualquer 5xx, vira transbordo silencioso (mesmo mecanismo de
  // `pauseGate.ts`/§0.5.2 item h) em vez de desculpa técnica — venda não pode
  // morrer por falha interna (§2).
  const falhaTecnica = checkUnresolvedTechnicalFailure(toolCallTrace)
  if (falhaTecnica.deveEscalar) {
    logger.error('[agent] falha tecnica nao resolvida no turno — escalando para humano em silencio', {
      clienteId,
      motivo: falhaTecnica.motivo,
    })
    const pausaConfig = await resolvePausaConfig(supabase)
    if (pausaConfig.ativo) {
      await pauseCustomer(supabase, clienteId, pausaConfig.minutos, 'transbordo')
      await notifyRealtimeRoom(env, {
        topic: 'chat.conversation_updated',
        payload: {
          clienteId,
          pausadoAte: new Date(Date.now() + pausaConfig.minutos * 60_000).toISOString(),
          pausadoMotivo: 'transbordo',
        },
      })
    }
  }

  // Modelo pode fechar o turno sem texto (só tool_calls no último round, ou
  // `content: null` após um refusal). `sendText` com corpo vazio é 400 na
  // Cloud API — o cliente ficaria sem nenhuma resposta. Cai no mesmo fallback
  // padrão da seção 4, e o histórico grava o que o cliente de fato recebeu.
  const replyText = falhaTecnica.deveEscalar
    ? TECHNICAL_ESCALATION_REPLY
    : (sanitizada.texto.trim() || FALLBACK_TEXT)

  const savedTurn = await saveConversationTurn(supabase, clienteId, userMessage, replyText)
  const toolNames = extractToolNames(toolCallTrace)
  await broadcastTurn(env, clienteId, userMessage, replyText, savedTurn, toolNames)
  await supabase.from('agent_token_usage').insert({
    customer_id: clienteId,
    model: openAiConfig.model,
    prompt_tokens: result.usage.promptTokens,
    completion_tokens: result.usage.completionTokens,
    rounds: result.rounds,
    latency_ms: result.latencyMs,
    seq: savedTurn?.assistant.seq ?? null,
    tool_trace: toolCallTrace as unknown as Json,
  })

  // O `wamid` da nossa própria resposta (§0.5.1, passo 2). Ainda **não** é
  // registrado em tabela: reconhecer o próprio echo exige extrair o GUID do
  // wamid — o endereçamento varia entre echo e status (§5, armadilha 12) — e
  // isso é item próprio, com spec alimentada pelos dois wamids reais de
  // `payloads-waba.md`. Logar é o que dá, hoje, a captura em produção que a
  // §0.5.1 pede no passo 1: o contrato documenta `messages[0].id`, mas quem
  // responde é um espelho do contrato, não o contrato.
  const wamidResposta = await sendText(cloudApiConfig, recipientOf(claimed), replyText)
  logger.info('[whatsapp-queue] resposta enviada', { clienteId, wamidResposta })
}

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
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database, Json } from '~/types/database.types'
import type { JudgeToolCall } from '../utils/agent/conversationJudge'
import { claimBurstBuffer, type ClaimedBurstBuffer } from '../utils/whatsapp/claimBurstBuffer'
import { TURN_QUEUE_SUFFIX, isBatchForQueue, type WhatsappTurnQueueMessage } from '../utils/whatsapp/queueBindings'
import { markReadAndTyping, sendText, sendCatalogButton, type CloudApiClientConfig, type WhatsappRecipient } from '../utils/whatsapp/cloudApiClient'
import { getCustomerContext } from '../utils/integration/getCustomerContext'
import { findOrCreateCustomer } from '../utils/customers/findOrCreateCustomer'
import { getOrCreateActiveSession } from '../utils/sessions/createCatalogSession'
import { resolveAgentRuntimeConfig, type AgentConfig, type AgentRuntimeConfig } from '../utils/agent/resolveAgentRuntimeConfig'
import { buildSystemPrompt } from '../utils/agent/systemPrompt'
import { loadCustomerSkillFacts } from '../utils/agent/customerIntelligence'
import { renderCustomerSkill } from '../utils/agent/customerSkill'
import { countRecentUserTurns, loadConversationHistory, saveConversationTurn } from '../utils/agent/conversationHistory'
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
import { checkUnresolvedTechnicalFailure } from '../utils/agent/technicalEscalation'
import { pauseCustomer } from '../utils/whatsapp/pauseState'
import { resolvePausaConfig } from '../utils/whatsapp/resolvePausaConfig'
import { requireServerKey } from '../utils/maps/google'
import type { AgentToolContext } from '../utils/agent/toolContext'

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

function buildSupabaseServiceClient(): SupabaseClient<Database> {
  const config = useRuntimeConfig()
  const url = (config.public as Record<string, unknown> & { supabase?: { url?: string } }).supabase?.url ?? ''
  const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY ?? ''
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false } })
}

export default defineNitroPlugin((nitroApp) => {
  const hooks = nitroApp.hooks as unknown as QueueHookRegistrar

  hooks.hook('cloudflare:queue', async ({ batch }) => {
    if (!isBatchForQueue(batch.queue, TURN_QUEUE_SUFFIX)) return

    const supabase = buildSupabaseServiceClient()
    // Resolvido uma vez por lote, não por mensagem: nem a config do agente nem
    // a do provedor mudam no meio de um batch, e repetir a leitura pagaria
    // 1 SELECT + 2 RPC por mensagem sem nenhum ganho.
    const runtimeConfig = await resolveAgentRuntimeConfig(supabase, useRuntimeConfig())

    for (const message of batch.messages) {
      await processQueueMessage(supabase, runtimeConfig, message.body).catch((err: unknown) => {
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

async function processQueueMessage(
  supabase: SupabaseClient<Database>,
  runtimeConfig: AgentRuntimeConfig,
  body: WhatsappTurnQueueMessage,
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

    await runAgentTurn(supabase, cloudApiConfig, claimed, userMessage, runtimeConfig.agent)
  } catch (err) {
    logger.error('[whatsapp-queue] turno abortou, respondendo fallback', {
      telefone: claimed.telefone,
      error: err instanceof Error ? err.message : String(err),
    })
    await sendText(cloudApiConfig, recipientOf(claimed), FALLBACK_TEXT).catch((sendErr: unknown) => {
      logger.error('[whatsapp-queue] fallback também falhou ao enviar', {
        telefone: claimed.telefone,
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
): Promise<void> {
  const customer = await findOrCreateCustomer(supabase, {
    whatsapp: claimed.telefone,
    ...(claimed.lid ? { lid: claimed.lid } : {}),
  })
  await saveConversationTurn(supabase, customer.id, userMessage, reply)
  await sendText(cloudApiConfig, recipientOf(claimed), reply)
}

async function runAgentTurn(
  supabase: SupabaseClient<Database>,
  cloudApiConfig: CloudApiClientConfig,
  claimed: DeliverableTurn,
  userMessage: string,
  openAiConfig: AgentConfig,
): Promise<void> {
  // Camada 1 (guardrails.ts): tentativa clara de sequestro de instrução NUNCA
  // chega à OpenAI. É a única camada com garantia dura — sem chamada ao modelo
  // não há o que induzir — e por isso roda antes de resolver contexto, montar
  // prompt ou anexar tool. O cliente ainda recebe resposta (§2) e o turno é
  // gravado no histórico para auditoria.
  const injecao = detectPromptInjection(userMessage)
  if (injecao) {
    logger.warn('[guardrail] tentativa de sequestro de instrução — turno não foi ao modelo', {
      telefone: claimed.telefone,
      padrao: injecao.padrao,
      trecho: injecao.trecho,
    })
    await replyWithoutModel(supabase, cloudApiConfig, claimed, userMessage, INJECTION_REPLY)
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
    await saveConversationTurn(supabase, clienteId, userMessage, CEILING_REPLY)
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
    sendCatalogButton: async (input) => {
      await sendCatalogButton(cloudApiConfig, { recipient: recipientOf(claimed), body: input.body, buttonUrl: session.url })
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
  const isFirstContact = history.length === 0

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
    }
  }

  // Modelo pode fechar o turno sem texto (só tool_calls no último round, ou
  // `content: null` após um refusal). `sendText` com corpo vazio é 400 na
  // Cloud API — o cliente ficaria sem nenhuma resposta. Cai no mesmo fallback
  // padrão da seção 4, e o histórico grava o que o cliente de fato recebeu.
  const replyText = falhaTecnica.deveEscalar
    ? TECHNICAL_ESCALATION_REPLY
    : (sanitizada.texto.trim() || FALLBACK_TEXT)

  const assistantSeq = await saveConversationTurn(supabase, clienteId, userMessage, replyText)
  await supabase.from('agente_uso_tokens').insert({
    cliente_id: clienteId,
    modelo: openAiConfig.model,
    prompt_tokens: result.usage.promptTokens,
    completion_tokens: result.usage.completionTokens,
    rounds: result.rounds,
    latencia_ms: result.latencyMs,
    seq: assistantSeq,
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

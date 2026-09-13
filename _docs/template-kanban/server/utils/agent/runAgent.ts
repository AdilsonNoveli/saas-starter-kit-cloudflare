/**
 * Loop do agente WhatsApp (passo 5 da seção 12 da arquitetura do agente
 * WhatsApp) — SDK puro da OpenAI (Chat Completions), sem framework de
 * orquestração. Chamado pelo consumer da fila (`whatsapp-queue.ts`, passo 6)
 * com o prompt já composto (`buildSystemPrompt`), o histórico do cliente
 * (`whatsapp_conversas` — só `user`/`assistant`, tool calls não persistem
 * entre turnos) e o texto batido do lote (seção 2).
 *
 * O `try/catch` de fallback ao cliente ("Tive um probleminha...") é
 * responsabilidade do consumer (seção 4) — aqui só o essencial: parse de
 * argumentos de tool call malformados não deve derrubar o turno inteiro
 * (viraria erro de validação normal via `dispatchAgentTool`).
 */
import type OpenAI from 'openai'
import { ALL_AGENT_TOOLS, buildToolSpecs, dispatchAgentTool } from './toolRegistry'
import type { AgentToolContext } from './toolContext'

type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam
type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool

/** Máximo de rounds de tool_calls antes de forçar um fechamento em texto (seção 2/12). */
export const MAX_AGENT_ROUNDS = 8

export interface AgentHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RunAgentInput {
  /** Client já construído com a chave resolvida pelo chamador (seção 10 — nunca lida aqui). */
  openai: OpenAI
  model: string
  /** Saída de `buildSystemPrompt()` — já compõe regras fixas + instruções extra + briefing. */
  systemPrompt: string
  history: readonly AgentHistoryMessage[]
  userMessage: string
  ctx: AgentToolContext
  /** Lista já filtrada por `getActiveAgentTools()` (padrão: todas as 9). */
  tools?: Parameters<typeof dispatchAgentTool>[3]
  /**
   * Chamado ao final de cada round que envolveu tool_calls — o consumer usa
   * para atualizar o indicador "digitando" no canal de WhatsApp (hoje via
   * provedor homologado, espelho 1:1 da Meta Cloud API oficial — seção 3; amanhã pode ser
   * a Graph API oficial direto, sem alterar este arquivo). Callback
   * genérico de propósito: `agent/*` nunca importa `whatsapp/*` diretamente
   * (seção 7/11), então quem decide a implementação real é o consumer.
   */
  onRound?: () => void | Promise<void>
  /**
   * Chamado uma vez por tool call executada, com nome/argumentos/resultado —
   * side-channel opcional, sem efeito no loop (não muda comportamento para
   * quem não passa). Usado pelo laboratório de avaliação
   * (`_docs/implementar/prd-laboratorio-avaliacao-agente.md`) para dar ao
   * juiz visibilidade do que as tools de fato retornaram: sem isso, o juiz só
   * vê o texto final e não tem como distinguir um preço citado a partir do
   * retorno real de `BuscarProdutos` de um preço inventado — os dois texto
   * parecem idênticos. Produção não usa este hook hoje.
   */
  onToolCall?: (call: { name: string, args: unknown, result: unknown }) => void | Promise<void>
}

export interface RunAgentUsage {
  promptTokens: number
  completionTokens: number
}

export interface RunAgentResult {
  text: string
  usage: RunAgentUsage
  rounds: number
  latencyMs: number
}

function toChatTools(tools: Parameters<typeof buildToolSpecs>[0]): ChatCompletionTool[] {
  return buildToolSpecs(tools).map((spec) => ({
    type: 'function',
    function: {
      name: spec.function.name,
      description: spec.function.description,
      parameters: spec.function.parameters,
    },
  }))
}

/**
 * `tools`/`tool_choice` são um par indivisível para a API: `tool_choice` sem
 * `tools` é 400, e `tools: []` também (o array tem mínimo de 1 item). Lista
 * vazia só acontece quando `loja.agente_tools_habilitadas` cita apenas nomes
 * que não existem mais (tool renomeada/removida) — aí o turno vira uma
 * conversa em texto puro em vez de estourar o request.
 */
function toolParams(
  chatTools: readonly ChatCompletionTool[],
  choice: 'auto' | 'none',
): { tools?: ChatCompletionTool[], tool_choice?: 'auto' | 'none' } {
  if (chatTools.length === 0) return {}
  return { tools: [...chatTools], tool_choice: choice }
}

function parseToolArguments(raw: string): unknown {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const { openai, model, systemPrompt, history, userMessage, ctx, onRound, onToolCall } = input
  const tools = input.tools ?? ALL_AGENT_TOOLS
  const chatTools = toChatTools(tools)

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const usage: RunAgentUsage = { promptTokens: 0, completionTokens: 0 }
  const startedAt = Date.now()

  const accumulateUsage = (completionUsage: OpenAI.CompletionUsage | undefined): void => {
    if (!completionUsage) return
    usage.promptTokens += completionUsage.prompt_tokens
    usage.completionTokens += completionUsage.completion_tokens
  }

  for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      ...toolParams(chatTools, 'auto'),
    })
    accumulateUsage(completion.usage)

    const message = completion.choices[0]?.message
    if (!message) {
      return { text: '', usage, rounds: round + 1, latencyMs: Date.now() - startedAt }
    }
    messages.push(message)

    const toolCalls = message.tool_calls ?? []
    if (toolCalls.length === 0) {
      return { text: message.content ?? '', usage, rounds: round + 1, latencyMs: Date.now() - startedAt }
    }

    // TODO tool_call precisa de uma mensagem `tool` de volta, inclusive as de
    // tipo não-`function`: a API rejeita (400) o próximo round se algum
    // `tool_call_id` do assistant ficar sem resposta. Antes o filtro por
    // `type === 'function'` descartava as outras silenciosamente e o turno
    // inteiro morria no round seguinte.
    for (const call of toolCalls) {
      const args = call.type === 'function' ? parseToolArguments(call.function.arguments) : undefined
      const result = call.type === 'function'
        ? await dispatchAgentTool(call.function.name, args, ctx, tools)
        : { error: true, message: `Tipo de tool call não suportado: ${call.type}.` }
      if (onToolCall && call.type === 'function') {
        await onToolCall({ name: call.function.name, args, result })
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }

    if (onRound) await onRound()
  }

  // Cap de rounds estourado (seção 2/12): força um fechamento em texto.
  // `tools` continua na chamada de propósito — `tool_choice` sem `tools` é
  // rejeitado com 400 ("'tool_choice' is only allowed when 'tools' are
  // specified"), então quem desliga as tools aqui é o `'none'`, não a omissão.
  const finalCompletion = await openai.chat.completions.create({
    model,
    messages,
    ...toolParams(chatTools, 'none'),
  })
  accumulateUsage(finalCompletion.usage)

  return {
    text: finalCompletion.choices[0]?.message.content ?? '',
    usage,
    rounds: MAX_AGENT_ROUNDS,
    latencyMs: Date.now() - startedAt,
  }
}

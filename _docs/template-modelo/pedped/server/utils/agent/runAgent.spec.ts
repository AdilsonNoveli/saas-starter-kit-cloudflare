import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { runAgent, MAX_AGENT_ROUNDS } from './runAgent'
import type { AgentToolContext, AgentToolDefinition } from './toolContext'
import type OpenAI from 'openai'

function fakeCtx(): AgentToolContext {
  return {
    supabase: {} as AgentToolContext['supabase'],
    sessaoId: 'sessao-1',
    clienteId: 'cliente-1',
    whatsapp: '5511999999999',
    catalogoUrl: 'https://loja.exemplo/c/sessao-1',
    googleMapsServerKey: 'key',
    sendCatalogButton: async () => {},
  }
}

const echoTool: AgentToolDefinition<{ valor: number }> = {
  name: 'Echo',
  description: 'devolve o dobro do valor',
  schema: z.object({ valor: z.number() }),
  run: async (args) => ({ dobro: args.valor * 2 }),
}

function textCompletion(content: string, usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }) {
  return {
    choices: [{ message: { role: 'assistant', content, tool_calls: undefined } }],
    usage,
  }
}

function toolCallCompletion(name: string, args: unknown, id = 'call_1') {
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
      },
    }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }
}

function fakeOpenAi(createImpl: (...args: unknown[]) => unknown): OpenAI {
  return {
    chat: { completions: { create: vi.fn(createImpl) } },
  } as unknown as OpenAI
}

describe('runAgent', () => {
  it('retorna o texto direto quando o modelo não chama nenhuma tool', async () => {
    const create = vi.fn().mockResolvedValueOnce(textCompletion('Oi! Como posso ajudar?'))
    const openai = fakeOpenAi(create)

    const result = await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'oi',
      ctx: fakeCtx(),
      tools: [echoTool],
    })

    expect(result.text).toBe('Oi! Como posso ajudar?')
    expect(result.rounds).toBe(1)
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('executa a tool chamada, injeta o resultado e faz um novo round até o texto final', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(toolCallCompletion('Echo', { valor: 21 }))
      .mockResolvedValueOnce(textCompletion('O dobro é 42.'))
    const openai = fakeOpenAi(create)

    const result = await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'dobra 21',
      ctx: fakeCtx(),
      tools: [echoTool],
    })

    expect(result.text).toBe('O dobro é 42.')
    expect(result.rounds).toBe(2)
    expect(create).toHaveBeenCalledTimes(2)

    const secondCallArgs = create.mock.calls[1]![0] as { messages: Array<{ role: string, content?: string }> }
    const toolMessage = secondCallArgs.messages.find((m) => m.role === 'tool')
    expect(toolMessage?.content).toBe(JSON.stringify({ dobro: 42 }))
  })

  it('argumentos de tool call malformados (JSON inválido) viram erro de validação, não exceção', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'Echo', arguments: '{not json' } }],
          },
        }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      })
      .mockResolvedValueOnce(textCompletion('ok'))
    const openai = fakeOpenAi(create)

    const result = await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'msg',
      ctx: fakeCtx(),
      tools: [echoTool],
    })

    expect(result.text).toBe('ok')
    const secondCallArgs = create.mock.calls[1]![0] as { messages: Array<{ role: string, content?: string }> }
    const toolMessage = secondCallArgs.messages.find((m) => m.role === 'tool')
    expect(toolMessage?.content).toContain('Argumentos inválidos')
  })

  it('para tool desconhecida, devolve { error: true } como conteúdo da mensagem tool — não lança', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(toolCallCompletion('NaoExiste', {}))
      .mockResolvedValueOnce(textCompletion('ok'))
    const openai = fakeOpenAi(create)

    await expect(runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'msg',
      ctx: fakeCtx(),
      tools: [echoTool],
    })).resolves.toMatchObject({ text: 'ok' })
  })

  it('cap de rounds: após MAX_AGENT_ROUNDS de tool_calls, força um fechamento em texto com tool_choice none', async () => {
    const create = vi.fn()
    for (let i = 0; i < MAX_AGENT_ROUNDS; i++) {
      create.mockResolvedValueOnce(toolCallCompletion('Echo', { valor: i }, `call_${i}`))
    }
    create.mockResolvedValueOnce(textCompletion('Fechando por aqui.'))
    const openai = fakeOpenAi(create)

    const result = await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'insiste',
      ctx: fakeCtx(),
      tools: [echoTool],
    })

    expect(result.text).toBe('Fechando por aqui.')
    expect(result.rounds).toBe(MAX_AGENT_ROUNDS)
    expect(create).toHaveBeenCalledTimes(MAX_AGENT_ROUNDS + 1)

    // `tool_choice` sem `tools` é 400 na API real ("'tool_choice' is only
    // allowed when 'tools' are specified") — o fechamento tem que continuar
    // mandando as tools e desligá-las via `'none'`, nunca omitindo o campo.
    const finalCallArgs = create.mock.calls[MAX_AGENT_ROUNDS]![0] as { tool_choice?: string, tools?: unknown[] }
    expect(finalCallArgs.tool_choice).toBe('none')
    expect(finalCallArgs.tools).toHaveLength(1)
  })

  it('sem tools ativas, omite tools e tool_choice (a API rejeita tools: [])', async () => {
    const create = vi.fn().mockResolvedValueOnce(textCompletion('sem tools'))
    const openai = fakeOpenAi(create)

    const result = await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'oi',
      ctx: fakeCtx(),
      tools: [],
    })

    expect(result.text).toBe('sem tools')
    const args = create.mock.calls[0]![0] as Record<string, unknown>
    expect(args).not.toHaveProperty('tools')
    expect(args).not.toHaveProperty('tool_choice')
  })

  it('chama onRound uma vez por round com tool_calls', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(toolCallCompletion('Echo', { valor: 1 }))
      .mockResolvedValueOnce(textCompletion('ok'))
    const openai = fakeOpenAi(create)
    const onRound = vi.fn()

    await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'msg',
      ctx: fakeCtx(),
      tools: [echoTool],
      onRound,
    })

    expect(onRound).toHaveBeenCalledTimes(1)
  })

  it('chama onToolCall com nome/args/resultado de cada tool executada', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(toolCallCompletion('Echo', { valor: 21 }))
      .mockResolvedValueOnce(textCompletion('O dobro é 42.'))
    const openai = fakeOpenAi(create)
    const onToolCall = vi.fn()

    await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'system',
      history: [],
      userMessage: 'dobra 21',
      ctx: fakeCtx(),
      tools: [echoTool],
      onToolCall,
    })

    expect(onToolCall).toHaveBeenCalledTimes(1)
    expect(onToolCall).toHaveBeenCalledWith({ name: 'Echo', args: { valor: 21 }, result: { dobro: 42 } })
  })

  it('inclui o histórico e a mensagem do usuário na primeira chamada', async () => {
    const create = vi.fn().mockResolvedValueOnce(textCompletion('ok'))
    const openai = fakeOpenAi(create)

    await runAgent({
      openai,
      model: 'gpt-4.1-mini',
      systemPrompt: 'PROMPT DO SISTEMA',
      history: [{ role: 'user', content: 'oi' }, { role: 'assistant', content: 'tudo bem?' }],
      userMessage: 'quero um bolo',
      ctx: fakeCtx(),
      tools: [echoTool],
    })

    // `messages` é o mesmo array mutado a cada round (push) — captura só o
    // prefixo presente no momento da 1ª chamada, já que `mock.calls` guarda a
    // referência, não uma cópia.
    const firstCallArgs = create.mock.calls[0]![0] as { messages: Array<{ role: string, content?: string }> }
    expect(firstCallArgs.messages.slice(0, 4)).toEqual([
      { role: 'system', content: 'PROMPT DO SISTEMA' },
      { role: 'user', content: 'oi' },
      { role: 'assistant', content: 'tudo bem?' },
      { role: 'user', content: 'quero um bolo' },
    ])
  })
})

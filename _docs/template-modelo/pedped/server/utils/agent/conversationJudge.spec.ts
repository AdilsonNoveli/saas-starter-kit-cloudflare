import { describe, it, expect, vi } from 'vitest'
import { judgeConversation, scoreFromVeredicto } from './conversationJudge'
import type OpenAI from 'openai'

function fakeOpenAi(content: string, usage = { total_tokens: 123 }): OpenAI {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content } }],
          usage,
        }),
      },
    },
  } as unknown as OpenAI
}

function fakeOpenAiWithSpy(content: string): { openai: OpenAI, create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content } }],
    usage: { total_tokens: 10 },
  })
  return { openai: { chat: { completions: { create } } } as unknown as OpenAI, create }
}

const baseInput = {
  janela: [
    { role: 'user' as const, content: 'quanto custa a pizza de calabresa?' },
    { role: 'assistant' as const, content: 'a calabresa sai por R$ 45, quer que eu já reserve?' },
  ],
  regras: 'REGRA 1 — nunca invente preço sem tool.',
  instrucoesExtra: '',
  contexto: 'conversa real',
}

describe('judgeConversation', () => {
  it('devolve status done e o veredito validado quando o modelo responde JSON válido', async () => {
    const openai = fakeOpenAi(JSON.stringify({ veredicto: 'verde', achados: [] }))

    const result = await judgeConversation(openai, 'gpt-4.1-mini', baseInput)

    expect(result).toEqual({
      status: 'done',
      verdict: { veredicto: 'verde', achados: [] },
      tokens: 123,
    })
  })

  it('preserva achados categorizados com evidência e sugestão', async () => {
    const achado = {
      tipo: 'alucinacao',
      evidencia: 'a calabresa sai por R$ 45',
      sugestao: 'nunca informar preço sem chamar BuscarProdutos antes',
    }
    const openai = fakeOpenAi(JSON.stringify({ veredicto: 'vermelho', achados: [achado] }))

    const result = await judgeConversation(openai, 'gpt-4.1-mini', baseInput)

    expect(result.status).toBe('done')
    if (result.status === 'done') {
      expect(result.verdict.achados).toEqual([achado])
    }
  })

  it('devolve judge_failed quando a resposta não é JSON válido', async () => {
    const openai = fakeOpenAi('isto não é json')

    const result = await judgeConversation(openai, 'gpt-4.1-mini', baseInput)

    expect(result.status).toBe('judge_failed')
  })

  it('devolve judge_failed quando o Zod rejeita o schema', async () => {
    const openai = fakeOpenAi(JSON.stringify({ veredicto: 'roxo', achados: [] }))

    const result = await judgeConversation(openai, 'gpt-4.1-mini', baseInput)

    expect(result.status).toBe('judge_failed')
  })

  it('devolve judge_failed quando a chamada OpenAI lança', async () => {
    const openai = {
      chat: { completions: { create: vi.fn().mockRejectedValue(new Error('timeout')) } },
    } as unknown as OpenAI

    const result = await judgeConversation(openai, 'gpt-4.1-mini', baseInput)

    expect(result).toEqual({ status: 'judge_failed', detail: 'timeout' })
  })
})

describe('judgeConversation — visibilidade de tool calls (correção do falso-positivo de alucinação)', () => {
  it('inclui os resultados de tool no prompt do sistema quando toolCalls é passado', async () => {
    const { openai, create } = fakeOpenAiWithSpy(JSON.stringify({ veredicto: 'verde', achados: [] }))

    await judgeConversation(openai, 'gpt-4.1-mini', {
      ...baseInput,
      toolCalls: [
        { name: 'BuscarProdutos', args: { q: 'calabresa' }, result: [{ nome: 'Esfiha de Calabresa', preco: 4 }] },
      ],
    })

    const systemMessage = create.mock.calls[0]![0].messages[0].content as string
    expect(systemMessage).toContain('RESULTADOS DE TOOLS EXECUTADAS')
    expect(systemMessage).toContain('BuscarProdutos')
    expect(systemMessage).toContain('Esfiha de Calabresa')
  })

  it('não inclui o bloco de tool calls quando toolCalls não é passado (produção, comportamento anterior preservado)', async () => {
    const { openai, create } = fakeOpenAiWithSpy(JSON.stringify({ veredicto: 'verde', achados: [] }))

    await judgeConversation(openai, 'gpt-4.1-mini', baseInput)

    const systemMessage = create.mock.calls[0]![0].messages[0].content as string
    expect(systemMessage).not.toContain('RESULTADOS DE TOOLS EXECUTADAS')
  })

  it('avisa quando nenhuma tool foi chamada (toolCalls vazio) em vez de omitir o bloco', async () => {
    const { openai, create } = fakeOpenAiWithSpy(JSON.stringify({ veredicto: 'verde', achados: [] }))

    await judgeConversation(openai, 'gpt-4.1-mini', { ...baseInput, toolCalls: [] })

    const systemMessage = create.mock.calls[0]![0].messages[0].content as string
    expect(systemMessage).toContain('nenhuma tool foi chamada')
  })
})

describe('scoreFromVeredicto', () => {
  it('verde=1, amarelo=0.5, vermelho=0', () => {
    expect(scoreFromVeredicto('verde')).toBe(1)
    expect(scoreFromVeredicto('amarelo')).toBe(0.5)
    expect(scoreFromVeredicto('vermelho')).toBe(0)
  })
})

import { describe, it, expect, vi } from 'vitest'
import type OpenAI from 'openai'
import { describeImage, IMAGE_EXTRACTION_PROMPT } from './describeImage'
import { MEDIA_SIZE_LIMITS } from './mediaProcessing'

type ContentPart = { type: string, text?: string, image_url?: { url: string } }
type CreateCall = {
  model: string
  messages: Array<{ role: string, content: string | ContentPart[] }>
}

function fakeOpenAi(createImpl: (...args: unknown[]) => unknown): { openai: OpenAI, create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(createImpl)
  return {
    openai: { chat: { completions: { create } } } as unknown as OpenAI,
    create,
  }
}

function visionCompletion(content: string | null) {
  return {
    choices: [{ message: { role: 'assistant', content } }],
    usage: { prompt_tokens: 800, completion_tokens: 40, total_tokens: 840 },
  }
}

/** Não aloca de verdade os 5 MB: `byteLength` é o que o guard lê. */
function bytesOfLength(length: number): Uint8Array {
  return { byteLength: length, length } as unknown as Uint8Array
}

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

describe('describeImage', () => {
  it('descreve a imagem, marca a proveniência e devolve tokens de visão', async () => {
    const { openai, create } = fakeOpenAi(() => Promise.resolve(visionCompletion('Uma garrafa de Coca-Cola 2 L.')))

    const result = await describeImage({
      openai,
      model: 'gpt-4o-mini',
      bytes: PNG_BYTES,
      mimeType: 'image/png',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.texto).toBe('[imagem: Uma garrafa de Coca-Cola 2 L.]')
    expect(result.modelo).toBe('gpt-4o-mini')
    expect(result.tamanhoBytes).toBe(PNG_BYTES.byteLength)
    expect(result.duracaoMs).toBeGreaterThanOrEqual(0)
    expect(result.usage).toEqual({ promptTokens: 800, completionTokens: 40 })

    const call = create.mock.calls[0]?.[0] as CreateCall
    expect(call.model).toBe('gpt-4o-mini')
    expect(call.messages[0]).toEqual({ role: 'system', content: IMAGE_EXTRACTION_PROMPT })

    // A imagem vai como data URL base64, nunca como link (§7.2).
    const parts = call.messages[1]?.content as ContentPart[]
    const image = parts.find((p) => p.type === 'image_url')
    expect(image?.image_url?.url).toBe(`data:image/png;base64,${btoa(String.fromCharCode(...PNG_BYTES))}`)
  })

  it('achata a descrição em uma linha para a marcação continuar legível', async () => {
    const { openai } = fakeOpenAi(() => Promise.resolve(visionCompletion(' Duas caixas de leite.\n  Marca Italac. ')))

    const result = await describeImage({ openai, model: 'gpt-4o-mini', bytes: PNG_BYTES })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.texto).toBe('[imagem: Duas caixas de leite. Marca Italac.]')
  })

  it('concatena a legenda do cliente e a manda junto como contexto', async () => {
    const { openai, create } = fakeOpenAi(() => Promise.resolve(visionCompletion('Uma lata de Coca-Cola 350 ml.')))

    const result = await describeImage({
      openai,
      model: 'gpt-4o-mini',
      bytes: PNG_BYTES,
      mimeType: 'image/jpeg',
      caption: '  quero 6 dessas  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.texto).toBe('[imagem: Uma lata de Coca-Cola 350 ml.]\nquero 6 dessas')

    const parts = (create.mock.calls[0]?.[0] as CreateCall).messages[1]?.content as ContentPart[]
    expect(parts[0]?.type).toBe('text')
    expect(parts[0]?.text).toContain('quero 6 dessas')
    expect(parts[1]?.type).toBe('image_url')
  })

  it('sem legenda, a mensagem do usuário leva só a imagem', async () => {
    const { openai, create } = fakeOpenAi(() => Promise.resolve(visionCompletion('Um comprovante de PIX de R$ 45,00.')))

    await describeImage({ openai, model: 'gpt-4o-mini', bytes: PNG_BYTES })

    const parts = (create.mock.calls[0]?.[0] as CreateCall).messages[1]?.content as ContentPart[]
    expect(parts).toHaveLength(1)
    expect(parts[0]?.type).toBe('image_url')
  })

  it('recusa acima de 5 MB sem chamar a OpenAI (§7.5)', async () => {
    const { openai, create } = fakeOpenAi(() => Promise.reject(new Error('não deveria ser chamada')))

    const result = await describeImage({
      openai,
      model: 'gpt-4o-mini',
      bytes: bytesOfLength(MEDIA_SIZE_LIMITS.image + 1),
      mimeType: 'image/jpeg',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.motivo).toBe('tamanho')
    expect(result.tamanhoBytes).toBe(MEDIA_SIZE_LIMITS.image + 1)
    expect(create).not.toHaveBeenCalled()
  })

  it('descrição vazia sem legenda vira recusa', async () => {
    const { openai } = fakeOpenAi(() => Promise.resolve(visionCompletion(null)))

    const result = await describeImage({ openai, model: 'gpt-4o-mini', bytes: PNG_BYTES })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.motivo).toBe('vazio')
  })

  it('descrição vazia com legenda preserva o texto do cliente (§7.2)', async () => {
    const { openai } = fakeOpenAi(() => Promise.resolve(visionCompletion('')))

    const result = await describeImage({
      openai,
      model: 'gpt-4o-mini',
      bytes: PNG_BYTES,
      caption: 'tem esse aqui?',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.texto).toBe('tem esse aqui?')
  })

  it('erro da OpenAI sobe — quem decide entre retry e "falhou" é o consumer (§8.3)', async () => {
    const { openai } = fakeOpenAi(() => Promise.reject(new Error('500 server error')))

    await expect(describeImage({ openai, model: 'gpt-4o-mini', bytes: PNG_BYTES }))
      .rejects.toThrow('500 server error')
  })
})

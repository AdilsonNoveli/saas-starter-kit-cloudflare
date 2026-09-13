import { describe, it, expect, vi } from 'vitest'
import type OpenAI from 'openai'
import { transcribeAudio, audioFileName, AUDIO_TRANSCRIPT_PREFIX } from './transcribeAudio'
import { MEDIA_SIZE_LIMITS } from './mediaProcessing'

type CreateCall = { file: File, model: string, language: string }

function fakeOpenAi(createImpl: (...args: unknown[]) => unknown): { openai: OpenAI, create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(createImpl)
  return {
    openai: { audio: { transcriptions: { create } } } as unknown as OpenAI,
    create,
  }
}

/** Não aloca de verdade os 16 MB: `byteLength` é o que o guard lê. */
function bytesOfLength(length: number): Uint8Array {
  return { byteLength: length, length } as unknown as Uint8Array
}

const OGG_MIME = 'audio/ogg; codecs=opus'

describe('audioFileName', () => {
  it('mapeia o mime real da captura de produção para .ogg', () => {
    expect(audioFileName(OGG_MIME)).toBe('audio.ogg')
  })

  it('mapeia os demais formatos suportados', () => {
    expect(audioFileName('audio/mpeg')).toBe('audio.mp3')
    expect(audioFileName('AUDIO/MP4')).toBe('audio.m4a')
    expect(audioFileName('audio/wav')).toBe('audio.wav')
  })

  it('mime inesperado ou ausente cai em .ogg — o formato que o WhatsApp entrega', () => {
    expect(audioFileName('audio/amr')).toBe('audio.ogg')
    expect(audioFileName(null)).toBe('audio.ogg')
    expect(audioFileName(undefined)).toBe('audio.ogg')
  })
})

describe('transcribeAudio', () => {
  it('transcreve, marca a proveniência e devolve telemetria', async () => {
    const { openai, create } = fakeOpenAi(() => Promise.resolve({ text: '  quero duas coca lata  ' }))

    const result = await transcribeAudio({
      openai,
      model: 'gpt-4o-mini-transcribe',
      bytes: new Uint8Array([1, 2, 3, 4]),
      mimeType: OGG_MIME,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.texto).toBe(`${AUDIO_TRANSCRIPT_PREFIX} quero duas coca lata`)
    expect(result.modelo).toBe('gpt-4o-mini-transcribe')
    expect(result.tamanhoBytes).toBe(4)
    expect(result.duracaoMs).toBeGreaterThanOrEqual(0)
    // Cobrança por duração não devolve token (§7.3).
    expect(result.usage).toBeNull()

    const call = create.mock.calls[0]?.[0] as CreateCall
    expect(call.model).toBe('gpt-4o-mini-transcribe')
    expect(call.language).toBe('pt')
    expect(call.file.name).toBe('audio.ogg')
  })

  it('devolve os tokens quando a API cobra por token', async () => {
    const { openai } = fakeOpenAi(() => Promise.resolve({
      text: 'oi',
      usage: { type: 'tokens', input_tokens: 30, output_tokens: 7, total_tokens: 37 },
    }))

    const result = await transcribeAudio({ openai, model: 'gpt-4o-mini-transcribe', bytes: new Uint8Array([1]) })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.usage).toEqual({ promptTokens: 30, completionTokens: 7 })
  })

  it('mime inesperado ainda transcreve, com o arquivo nomeado .ogg', async () => {
    const { openai, create } = fakeOpenAi(() => Promise.resolve({ text: 'texto' }))

    const result = await transcribeAudio({
      openai,
      model: 'gpt-4o-mini-transcribe',
      bytes: new Uint8Array([9]),
      mimeType: 'application/octet-stream',
    })

    expect(result.ok).toBe(true)
    const call = create.mock.calls[0]?.[0] as CreateCall
    expect(call.file.name).toBe('audio.ogg')
  })

  it('recusa acima de 16 MB sem chamar a OpenAI (§7.5)', async () => {
    const { openai, create } = fakeOpenAi(() => Promise.reject(new Error('não deveria ser chamada')))

    const result = await transcribeAudio({
      openai,
      model: 'gpt-4o-mini-transcribe',
      bytes: bytesOfLength(MEDIA_SIZE_LIMITS.audio + 1),
      mimeType: OGG_MIME,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.motivo).toBe('tamanho')
    expect(result.tamanhoBytes).toBe(MEDIA_SIZE_LIMITS.audio + 1)
    expect(create).not.toHaveBeenCalled()
  })

  it('transcrição vazia vira recusa em vez de marcação sem conteúdo', async () => {
    const { openai } = fakeOpenAi(() => Promise.resolve({ text: '   ' }))

    const result = await transcribeAudio({ openai, model: 'gpt-4o-mini-transcribe', bytes: new Uint8Array([1]) })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.motivo).toBe('vazio')
  })

  it('erro da OpenAI sobe — quem decide entre retry e "falhou" é o consumer (§8.3)', async () => {
    const { openai } = fakeOpenAi(() => Promise.reject(new Error('429 rate limit')))

    await expect(transcribeAudio({
      openai,
      model: 'gpt-4o-mini-transcribe',
      bytes: new Uint8Array([1]),
      mimeType: OGG_MIME,
    })).rejects.toThrow('429 rate limit')
  })
})

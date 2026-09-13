import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CloudApiClientConfig } from './cloudApiClient'
import { downloadMedia, getMediaMetadata } from './cloudApiMedia'

const config: CloudApiClientConfig = {
  apiToken: 'sk_live_xxx',
  baseUrl: 'https://api.provedor.com.br',
}

function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => impl(String(input), init))
  vi.stubGlobal('fetch', spy)
  return spy
}

/** Resposta com body streamado — o caminho real, onde o guard aborta no meio. */
function streamResponse(chunks: Uint8Array[], headers: Record<string, string> = {}): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getMediaMetadata', () => {
  it('chama GET /media/{id} com o Authorization do provedor e mapeia url, mime_type e size', async () => {
    // Payload conferido campo a campo contra `_docs/implementar/api-1.yaml`
    // (`/media/{id}`): `{url, mime_type, size}`.
    const fetchSpy = stubFetch(() => new Response(
      JSON.stringify({
        url: 'https://files.provedor.com.br/uuid/2026/06/arquivo.jpg',
        mime_type: 'image/jpeg',
        size: 86_620,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    await expect(getMediaMetadata(config, '1710255123316890')).resolves.toEqual({
      url: 'https://files.provedor.com.br/uuid/2026/06/arquivo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 86_620,
    })

    const [url, init] = fetchSpy.mock.calls[0]!
    expect(url).toBe('https://api.provedor.com.br/media/1710255123316890')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk_live_xxx')
    // A credencial nunca vai na URL (§9).
    expect(String(url)).not.toContain('sk_live')
  })

  it('devolve null no 404 de mídia expirada — o chamador ainda pode tentar o url inline', async () => {
    stubFetch(() => new Response('not found', { status: 404 }))
    await expect(getMediaMetadata(config, 'expirada')).resolves.toBeNull()
  })

  it('devolve null quando a rede falha, sem lançar', async () => {
    stubFetch(() => { throw new Error('connection reset') })
    await expect(getMediaMetadata(config, 'x')).resolves.toBeNull()
  })

  it('devolve null quando a resposta não traz url utilizável', async () => {
    stubFetch(() => new Response(JSON.stringify({ mime_type: 'image/jpeg' }), { status: 200 }))
    await expect(getMediaMetadata(config, 'x')).resolves.toBeNull()
  })

  it('aceita a resposta sem size nem mime_type — o guard volta a valer sobre os bytes', async () => {
    stubFetch(() => new Response(JSON.stringify({ url: 'https://files.provedor.com.br/a.ogg' }), { status: 200 }))

    await expect(getMediaMetadata(config, 'x')).resolves.toEqual({
      url: 'https://files.provedor.com.br/a.ogg',
      mimeType: null,
      sizeBytes: null,
    })
  })
})

describe('downloadMedia', () => {
  it('baixa com a credencial no header e devolve os bytes', async () => {
    const fetchSpy = stubFetch(() => streamResponse(
      [new Uint8Array([1, 2, 3]), new Uint8Array([4])],
      { 'content-type': 'audio/ogg' },
    ))

    const result = await downloadMedia(config, 'https://files.provedor.com.br/a.ogg', 1024)

    expect(result).toEqual({ ok: true, bytes: new Uint8Array([1, 2, 3, 4]), mimeType: 'audio/ogg' })
    const [, init] = fetchSpy.mock.calls[0]!
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk_live_xxx')
  })

  it('recusa pelo Content-Length antes de ler o corpo (§7.5)', async () => {
    stubFetch(() => streamResponse([new Uint8Array(10)], { 'content-length': '9000' }))

    await expect(downloadMedia(config, 'https://files.provedor.com.br/a.ogg', 1024))
      .resolves.toEqual({ ok: false, motivo: 'tamanho', tamanhoBytes: 9000 })
  })

  it('aborta o stream ao ultrapassar o limite quando não há Content-Length', async () => {
    // Sem `Content-Length` (ou com um mentiroso) só os bytes lidos são fato —
    // sem esse corte a memória do Worker seria o limite real.
    stubFetch(() => streamResponse([new Uint8Array(600), new Uint8Array(600)]))

    await expect(downloadMedia(config, 'https://files.provedor.com.br/a.ogg', 1000))
      .resolves.toMatchObject({ ok: false, motivo: 'tamanho' })
  })

  it('recusa URL não-https antes de mandar a credencial pela rede (§9)', async () => {
    const fetchSpy = stubFetch(() => new Response('', { status: 200 }))

    await expect(downloadMedia(config, 'http://files.provedor.com.br/a.ogg', 1024))
      .rejects.toThrow(/https/)
    await expect(downloadMedia(config, 'nao-e-url', 1024)).rejects.toThrow(/inválida/)
    // O token nunca chegou a sair.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('aplica timeout no download e nos metadados', async () => {
    const fetchSpy = stubFetch(() => streamResponse([new Uint8Array([1])]))

    await downloadMedia(config, 'https://files.provedor.com.br/a.ogg', 1024)
    expect(fetchSpy.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal)

    await getMediaMetadata(config, 'x').catch(() => null)
    expect(fetchSpy.mock.calls[1]![1]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('lança em erro HTTP — só o consumer sabe se ainda há retry (§8.3)', async () => {
    stubFetch(() => new Response('forbidden', { status: 403 }))

    await expect(downloadMedia(config, 'https://files.provedor.com.br/a.ogg', 1024))
      .rejects.toThrow(/403/)
  })
})

/**
 * Fiação do consumer de mídia — o que os testes de `processInboundMedia` NÃO
 * cobrem: o hook `cloudflare:queue` é **um só para todas as filas do Worker**,
 * e cada consumer só faz o seu trabalho se `batch.queue` bater. Com o filtro
 * invertido nada estoura: o lote é ignorado em silêncio e nenhuma mídia é
 * processada. Daí o teste ser sobre despacho, ack/retry e ordem — não sobre o
 * corpo do processamento, que tem spec próprio.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WhatsappMediaQueueMessage } from '../utils/whatsapp/queueBindings'

// Nomes REAIS de produção: prefixados pelo nome do Worker (`{{WORKER_NAME}}` no
// wrangler.toml). O spec antigo usava a mesma constante sem prefixo que o
// código — os dois concordavam entre si e o apagão da §8.1 passou verde.
const MEDIA_QUEUE = 'lojateste-midia'
const TURN_QUEUE = 'lojateste-turno-check'


const mocks = vi.hoisted(() => ({
  processInboundMedia: vi.fn(),
  resolveAgentRuntimeConfig: vi.fn(),
  createClient: vi.fn(),
}))

// `mediaRetryDelaySeconds` fica REAL de propósito: o teste do delay só vale se
// medir a política de verdade, não um número copiado para dentro do mock.
vi.mock('../utils/whatsapp/processInboundMedia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/whatsapp/processInboundMedia')>()),
  processInboundMedia: mocks.processInboundMedia,
}))

vi.mock('../utils/agent/resolveAgentRuntimeConfig', () => ({
  resolveAgentRuntimeConfig: mocks.resolveAgentRuntimeConfig,
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

interface FakeMessage {
  body: WhatsappMediaQueueMessage
  attempts: number
  ack: ReturnType<typeof vi.fn>
  retry: ReturnType<typeof vi.fn>
}

function fakeMessage(body: Partial<WhatsappMediaQueueMessage>, attempts = 1): FakeMessage {
  return {
    body: body as WhatsappMediaQueueMessage,
    attempts,
    ack: vi.fn(),
    retry: vi.fn(),
  }
}

type QueueHook = (payload: { batch: { queue: string, messages: readonly FakeMessage[] }, env?: Record<string, unknown> }) => Promise<void>

/**
 * Carrega o plugin com `defineNitroPlugin` neutralizado e captura o callback
 * registrado — é ele, e não o `export default`, que roda por lote.
 */
async function loadHook(): Promise<QueueHook> {
  let captured: QueueHook | null = null
  const nitroApp = {
    hooks: {
      hook: (name: string, fn: QueueHook) => {
        if (name === 'cloudflare:queue') captured = fn
      },
    },
  }

  const plugin = (await import('./whatsapp-media-queue')).default as unknown as (app: unknown) => void
  plugin(nitroApp)

  if (!captured) throw new Error('o plugin não registrou o hook cloudflare:queue')
  return captured
}

describe('plugin whatsapp-media-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('defineNitroPlugin', (fn: unknown) => fn)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabase: { url: 'https://projeto.supabase.co' } } }))
    mocks.createClient.mockReturnValue({})
    mocks.resolveAgentRuntimeConfig.mockResolvedValue({
      agent: null,
      provider: { baseUrl: 'https://api.provedor.com.br', token: 't', phoneNumberId: '1' },
      media: { modeloTranscricao: 'whisper-1', modeloVisao: 'gpt-4o-mini' },
    })
    mocks.processInboundMedia.mockResolvedValue('ack')
  })

  it('ignora lote da fila de turno sem tocar em Supabase nem processar mídia', async () => {
    const hook = await loadHook()
    const message = fakeMessage({ wamid: 'wamid.1' })

    await hook({ batch: { queue: TURN_QUEUE, messages: [message] } })

    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.processInboundMedia).not.toHaveBeenCalled()
    // Nem `ack` nem `retry`: o lote é do outro consumer, o desfecho é dele.
    expect(message.ack).not.toHaveBeenCalled()
    expect(message.retry).not.toHaveBeenCalled()
  })

  it('processa o lote da própria fila e dá ack no desfecho final', async () => {
    const hook = await loadHook()
    const message = fakeMessage({ wamid: 'wamid.1', caption: 'quantos desses?' })

    await hook({ batch: { queue: MEDIA_QUEUE, messages: [message] } })

    expect(mocks.processInboundMedia).toHaveBeenCalledTimes(1)
    expect(mocks.processInboundMedia).toHaveBeenCalledWith(expect.anything(), message.body)
    expect(message.ack).toHaveBeenCalledTimes(1)
    expect(message.retry).not.toHaveBeenCalled()
  })

  it('resolve a configuração uma vez por lote, não por mensagem', async () => {
    const hook = await loadHook()
    const messages = [fakeMessage({ wamid: 'wamid.1' }), fakeMessage({ wamid: 'wamid.2' })]

    await hook({ batch: { queue: MEDIA_QUEUE, messages } })

    expect(mocks.resolveAgentRuntimeConfig).toHaveBeenCalledTimes(1)
    expect(mocks.processInboundMedia).toHaveBeenCalledTimes(2)
  })

  it('devolve à fila com backoff crescente quando o desfecho é retry', async () => {
    mocks.processInboundMedia.mockResolvedValue('retry')
    const hook = await loadHook()
    const message = fakeMessage({ wamid: 'wamid.1' }, 3)

    await hook({ batch: { queue: MEDIA_QUEUE, messages: [message] } })

    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 45 })
    expect(message.ack).not.toHaveBeenCalled()
  })

  it('devolve à fila quando o processamento lança — falha antes do claim reentrega', async () => {
    mocks.processInboundMedia.mockRejectedValue(new Error('supabase fora'))
    const hook = await loadHook()
    const message = fakeMessage({ wamid: 'wamid.1' }, 1)

    await hook({ batch: { queue: MEDIA_QUEUE, messages: [message] } })

    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 15 })
    expect(message.ack).not.toHaveBeenCalled()
  })

  it('descarta mensagem sem wamid em vez de queimar as tentativas num veneno', async () => {
    const hook = await loadHook()
    const message = fakeMessage({})

    await hook({ batch: { queue: MEDIA_QUEUE, messages: [message] } })

    expect(mocks.processInboundMedia).not.toHaveBeenCalled()
    expect(message.ack).toHaveBeenCalledTimes(1)
    expect(message.retry).not.toHaveBeenCalled()
  })

  it('uma mensagem envenenada não impede o resto do lote', async () => {
    const hook = await loadHook()
    const [ruim, boa] = [fakeMessage({}), fakeMessage({ wamid: 'wamid.2' })]

    await hook({ batch: { queue: MEDIA_QUEUE, messages: [ruim, boa] } })

    expect(mocks.processInboundMedia).toHaveBeenCalledTimes(1)
    expect(boa.ack).toHaveBeenCalledTimes(1)
  })
})

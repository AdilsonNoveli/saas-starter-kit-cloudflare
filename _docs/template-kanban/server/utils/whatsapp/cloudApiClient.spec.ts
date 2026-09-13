/**
 * A camada de envio — o último ponto do fluxo que traduz **identidade do
 * cliente** em endereçamento do provedor (item (d) da FASE 0.4 de
 * `_docs/em-andamento.md`) e o único que sabe em que forma o `wamid` de saída
 * volta (§0.5.1, passo 2).
 *
 * Este arquivo nunca teve spec: era `Promise<void>` chamando `fetch`. As duas
 * coisas que ele passa a garantir falham **em silêncio** se quebrarem — envio
 * endereçado ao cliente errado, e wamid de saída perdido, que é justamente o
 * que faria o agente não reconhecer o próprio echo e se pausar para sempre.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  sendCatalogButton,
  sendExpressCheckoutButton,
  sendChoiceButtons,
  sendText,
  markReadAndTyping,
  CHOICE_BUTTON_CATALOG_ID,
  CHOICE_BUTTON_EXPRESS_ID,
  type CloudApiClientConfig,
} from './cloudApiClient'

const config: CloudApiClientConfig = { apiToken: 'sk_live_x', baseUrl: 'https://api.provedor.com.br' }

/** `SendResponse` do contrato (`api-1.yaml:51`), com o wamid real da captura. */
const WAMID_SAIDA = 'wamid.HBgNNTU1MTE5NDAyMDQ0NDkVAgARGBJBNTU3MUEzNDQzQ0I5Rjc1NkUA'

function fetchOk(body: unknown): ReturnType<typeof vi.fn> {
  return vi.fn(async () => ({ ok: true, json: async () => body }))
}

describe('sendText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('endereça pelo telefone mesmo com o @lid presente — o provedor não aceita user_id (armadilha 14)', async () => {
    const fetchMock = fetchOk({ messages: [{ id: WAMID_SAIDA }] })
    vi.stubGlobal('fetch', fetchMock)

    await sendText(config, { telefone: '5511940204449', lid: 'BR.1892507442136090' }, 'oi')

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(url).toBe('https://api.provedor.com.br/messages/send/text')
    // O dia em que o provedor aceitar `user_id` este teste muda — e é o único
    // lugar que muda. É exatamente esse o ponto do item (d).
    expect(JSON.parse(init.body)).toEqual({ to: '5511940204449', text: 'oi' })
  })

  it('devolve o wamid da mensagem enviada (§0.5.1, passo 2)', async () => {
    vi.stubGlobal('fetch', fetchOk({ messaging_product: 'whatsapp', messages: [{ id: WAMID_SAIDA }] }))

    await expect(sendText(config, { telefone: '5511940204449' }, 'oi')).resolves.toBe(WAMID_SAIDA)
  })

  it('200 sem wamid no corpo NÃO é falha: a mensagem chegou ao cliente', async () => {
    // Nenhuma propriedade de `SendResponse` é `required` no contrato. Tratar a
    // ausência como erro faria o consumer mandar a mensagem de fallback DEPOIS
    // de o cliente já ter recebido a resposta certa.
    vi.stubGlobal('fetch', fetchOk({ messaging_product: 'whatsapp' }))

    await expect(sendText(config, { telefone: '5511940204449' }, 'oi')).resolves.toBeNull()
  })

  it('corpo não-JSON também não derruba o envio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { throw new Error('Unexpected token') } })))

    await expect(sendText(config, { telefone: '5511940204449' }, 'oi')).resolves.toBeNull()
  })

  it('retenta 3x antes de desistir, e a 2ª tentativa já vale', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'indisponível' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: WAMID_SAIDA }] }) })
    vi.stubGlobal('fetch', fetchMock)

    const promessa = sendText(config, { telefone: '5511940204449' }, 'oi')
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promessa).resolves.toBe(WAMID_SAIDA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('esgotadas as 3 tentativas, o erro sobe para o consumer decidir', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' }))
    vi.stubGlobal('fetch', fetchMock)

    const promessa = sendText(config, { telefone: '5511940204449' }, 'oi')
    const assercao = expect(promessa).rejects.toThrow(/respondeu 500/)
    await vi.advanceTimersByTimeAsync(2000)

    await assercao
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('destinatário sem telefone falha na hora, sem gastar 3 tentativas e 2s', async () => {
    // Erro de programação, não falha de rede: `to: ""` seria um 400 retentado.
    // A mensagem carrega o `lid` porque é o que identifica o cliente afetado.
    const fetchMock = fetchOk({})
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendText(config, { telefone: '', lid: 'BR.189' }, 'oi'))
      .rejects.toThrow(/lid: BR\.189/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('sendCatalogButton', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('endereça pelo telefone e devolve o wamid — o botão também volta como echo', async () => {
    const fetchMock = fetchOk({ messages: [{ id: WAMID_SAIDA }] })
    vi.stubGlobal('fetch', fetchMock)

    const wamid = await sendCatalogButton(config, {
      recipient: { telefone: '5511940204449', lid: 'BR.189' },
      body: 'Confira o cardápio!',
      buttonUrl: 'https://loja.exemplo/catalogo/abc',
    })

    expect(wamid).toBe(WAMID_SAIDA)
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({
      to: '5511940204449',
      body: 'Confira o cardápio!',
      button_label: 'Ver todos os itens',
      button_url: 'https://loja.exemplo/catalogo/abc',
    })
  })

  it('nunca derruba o turno: falha de envio vira null, não exceção', async () => {
    // A tool `EnviarBotaoCatalogo` devolve `{success:true}` ao modelo de todo
    // jeito; deixar a exceção subir aqui abortaria o turno inteiro.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })))

    await expect(sendCatalogButton(config, {
      recipient: { telefone: '5511940204449' }, body: 'b', buttonUrl: 'u',
    })).resolves.toBeNull()
  })

  it('destinatário inválido também é engolido, ao contrário do sendText', async () => {
    vi.stubGlobal('fetch', fetchOk({}))

    await expect(sendCatalogButton(config, {
      recipient: { telefone: '' }, body: 'b', buttonUrl: 'u',
    })).resolves.toBeNull()
  })
})

describe('sendExpressCheckoutButton', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mesmo envio do botão do catálogo, rótulo "Compra Expressa" — enviado À PARTE, nunca substitui o do catálogo', async () => {
    const fetchMock = fetchOk({ messages: [{ id: WAMID_SAIDA }] })
    vi.stubGlobal('fetch', fetchMock)

    const wamid = await sendExpressCheckoutButton(config, {
      recipient: { telefone: '5511940204449', lid: 'BR.189' },
      body: 'Ou prefere fechar o pedido comigo agora mesmo?',
      buttonUrl: 'https://loja.exemplo/catalog?sessao=abc&chat=1',
    })

    expect(wamid).toBe(WAMID_SAIDA)
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({
      to: '5511940204449',
      body: 'Ou prefere fechar o pedido comigo agora mesmo?',
      button_label: 'Compra Expressa',
      button_url: 'https://loja.exemplo/catalog?sessao=abc&chat=1',
    })
  })

  it('nunca derruba o turno: falha de envio vira null, não exceção', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })))

    await expect(sendExpressCheckoutButton(config, {
      recipient: { telefone: '5511940204449' }, body: 'b', buttonUrl: 'u',
    })).resolves.toBeNull()
  })
})

describe('sendChoiceButtons', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('envia os dois botões de resposta rápida numa mensagem só, com ids estáveis', async () => {
    const fetchMock = fetchOk({ messages: [{ id: WAMID_SAIDA }] })
    vi.stubGlobal('fetch', fetchMock)

    const wamid = await sendChoiceButtons(config, {
      recipient: { telefone: '5511940204449', lid: 'BR.189' },
      body: 'Toque para ver tudo que a gente tem:',
    })

    expect(wamid).toBe(WAMID_SAIDA)
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(url).toBe('https://api.provedor.com.br/messages/send/buttons')
    expect(JSON.parse(init.body)).toEqual({
      to: '5511940204449',
      body: 'Toque para ver tudo que a gente tem:',
      buttons: [
        { id: CHOICE_BUTTON_CATALOG_ID, title: 'Ver os Itens' },
        { id: CHOICE_BUTTON_EXPRESS_ID, title: 'Compra Rápida' },
      ],
    })
  })

  it('nunca derruba o turno: falha de envio vira null, não exceção', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })))

    await expect(sendChoiceButtons(config, {
      recipient: { telefone: '5511940204449' }, body: 'b',
    })).resolves.toBeNull()
  })
})

describe('markReadAndTyping', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('é indicador de UX: falha não bloqueia o turno', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })))

    await expect(markReadAndTyping(config, 'wamid.ABC')).resolves.toBeUndefined()
  })
})

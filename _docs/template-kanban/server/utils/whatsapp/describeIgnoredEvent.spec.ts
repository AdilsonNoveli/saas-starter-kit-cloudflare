import { describe, expect, it } from 'vitest'
import { describeIgnoredEvent } from './describeIgnoredEvent'

/**
 * Os dois payloads abaixo são capturas reais de produção de 2026-07-29,
 * copiadas de `_docs/implementar/payloads-waba.md` — não são inventados. São
 * exatamente os eventos que hoje somem no `if (!parsed) return { ok: true }`.
 */
const echoPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '866620122710183',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '5511992161422', phone_number_id: '1129099030297574' },
        contacts: [{ wa_id: '5511940204449', user_id: 'BR.1892507442136090' }],
        message_echoes: [{
          from: '5511992161422',
          to: '5511940204449',
          id: 'wamid.HBgNNTUxMTk0MDIwNDQ0ORUCABEYIEE1NTcxQTM0NDNDQjlGNzU2RTMyQjdFRDYzRUM5MjFCAA==',
          to_user_id: 'BR.1892507442136090',
          timestamp: '1785368649',
          text: { body: 'Teste de resposta' },
          type: 'text',
        }],
      },
      field: 'smb_message_echoes',
    }],
  }],
}

const statusPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '866620122710183',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '5511992161422', phone_number_id: '1129099030297574' },
        contacts: [{ wa_id: '5511940204449', user_id: 'BR.1892507442136090' }],
        statuses: [{
          id: 'wamid.HBgTQlIuMTg5MjUwNzQ0MjEzNjA5MBUUABEYIEE1NTcxQTM0NDNDQjlGNzU2RTMyQjdFRDYzRUM5MjFCAA==',
          status: 'delivered',
          timestamp: '1785368650',
          recipient_id: '5511940204449',
          recipient_user_id: 'BR.1892507442136090',
        }],
      },
      field: 'messages',
    }],
  }],
}

describe('describeIgnoredEvent', () => {
  it('identifica o echo pelo array `message_echoes` e devolve o wamid', () => {
    const result = describeIgnoredEvent(echoPayload)

    expect(result.entries).toBe(1)
    expect(result.changes).toBe(1)
    expect(result.described[0]?.field).toBe('smb_message_echoes')
    expect(result.described[0]?.arrays).toEqual([
      { name: 'contacts', size: 1, wamids: [] },
      {
        name: 'message_echoes',
        size: 1,
        wamids: ['wamid.HBgNNTUxMTk0MDIwNDQ0ORUCABEYIEE1NTcxQTM0NDNDQjlGNzU2RTMyQjdFRDYzRUM5MjFCAA=='],
      },
    ])
  })

  it('identifica o status pelo array `statuses`, apesar de `field` ser `messages`', () => {
    // §0.5.2 item (c): quem discrimina é o array, nunca o `field` — status e
    // mensagem de verdade compartilham `field: "messages"`.
    const result = describeIgnoredEvent(statusPayload)

    expect(result.described[0]?.field).toBe('messages')
    expect(result.described[0]?.arrays.map(array => array.name)).toEqual(['contacts', 'statuses'])
    expect(result.described[0]?.arrays[1]?.wamids).toHaveLength(1)
  })

  it('sobrevive à serialização com o nome do array e o wamid intactos', () => {
    // Regressão do tail de 2026-07-30: `console.info` do Worker inspeciona com
    // profundidade 2 e imprimiu `arrays: [Array]`, escondendo justamente o que
    // discrimina o evento. Por isso o webhook loga a descrição serializada — o
    // que este teste trava é que o dado chega inteiro nessa forma.
    const serialized = JSON.stringify(describeIgnoredEvent(echoPayload))

    expect(serialized).toContain('"name":"message_echoes"')
    expect(serialized).toContain('wamid.HBgNNTUxMTk0MDIwNDQ0ORUCABEYIEE1NTcxQTM0NDNDQjlGNzU2RTMyQjdFRDYzRUM5MjFCAA==')
  })

  it('nunca devolve conteúdo de mensagem do cliente', () => {
    // O echo capturado carrega `text.body: "Teste de resposta"`. Nada do corpo
    // pode vazar para o log, em nenhum nível da descrição.
    expect(JSON.stringify(describeIgnoredEvent(echoPayload))).not.toContain('Teste de resposta')
  })

  it('descreve `history` gigante em custo O(1): tamanho real, no máximo 3 wamids', () => {
    // `api-1.yaml:240` — `history` pode trazer milhares de mensagens num único
    // POST, e o webhook responde sob contrato de tempo.
    const history = Array.from({ length: 5000 }, (_, index) => ({ id: `wamid.H${index}`, text: { body: 'segredo' } }))
    const result = describeIgnoredEvent({ entry: [{ changes: [{ field: 'history', value: { history } }] }] })

    expect(result.described[0]?.arrays[0]).toEqual({
      name: 'history',
      size: 5000,
      wamids: ['wamid.H0', 'wamid.H1', 'wamid.H2'],
    })
    expect(JSON.stringify(result)).not.toContain('segredo')
  })

  it('não percorre o array inteiro procurando `id` quando os primeiros itens não têm', () => {
    // O laço para em MAX_WAMIDS posições, não em MAX_WAMIDS ids encontrados.
    const items = Array.from({ length: 1000 }, (_, index) => (index < 900 ? { status: 'sent' } : { id: `wamid.T${index}` }))
    const result = describeIgnoredEvent({ entry: [{ changes: [{ field: 'messages', value: { statuses: items } }] }] })

    expect(result.described[0]?.arrays[0]).toEqual({ name: 'statuses', size: 1000, wamids: [] })
  })

  it('conta todas as `changes` mas descreve no máximo 3', () => {
    const changes = Array.from({ length: 7 }, (_, index) => ({ field: `campo-${index}`, value: {} }))
    const result = describeIgnoredEvent({ entry: [{ changes }] })

    expect(result.changes).toBe(7)
    expect(result.described.map(change => change.field)).toEqual(['campo-0', 'campo-1', 'campo-2'])
  })

  it('soma `changes` de várias `entry`', () => {
    const result = describeIgnoredEvent({
      entry: [{ changes: [{ field: 'a', value: {} }] }, { changes: [{ field: 'b', value: {} }] }],
    })

    expect(result).toEqual({
      rootKeys: ['entry'],
      entries: 2,
      changes: 2,
      described: [{ field: 'a', arrays: [] }, { field: 'b', arrays: [] }],
    })
  })

  it('descreve corpo que nem é envelope de webhook, em vez de sumir com ele', () => {
    expect(describeIgnoredEvent({ object: 'whatsapp_business_account', erro: 'shape novo' })).toEqual({
      rootKeys: ['object', 'erro'],
      entries: 0,
      changes: 0,
      described: [],
    })
  })

  it.each([
    ['null', null],
    ['string', 'nao e json de objeto'],
    ['array', [{ entry: [] }]],
  ])('não quebra com corpo %s', (_label, rawBody) => {
    expect(describeIgnoredEvent(rawBody)).toEqual({ rootKeys: [], entries: 0, changes: 0, described: [] })
  })

  it('tolera `changes` e `value` com shape inesperado', () => {
    const result = describeIgnoredEvent({ entry: [{ changes: ['texto solto', { value: 42 }] }] })

    expect(result.changes).toBe(2)
    expect(result.described).toEqual([{ field: null, arrays: [] }, { field: null, arrays: [] }])
  })
})

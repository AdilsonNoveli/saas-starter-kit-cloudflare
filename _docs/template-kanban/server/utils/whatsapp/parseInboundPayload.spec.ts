import { describe, expect, it } from 'vitest'
import { parseEchoEvent, parseInboundPayload } from './parseInboundPayload'

// Payload confirmado por captura real de produção (seção 3 da arquitetura
// do agente WhatsApp) — mensagem de texto.
function textPayload(overrides: { textBody?: string } = {}) {
  return {
    entry: [{
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '5511999999999',
            phone_number_id: '123456789',
          },
          contacts: [{
            profile: { name: 'Cliente Teste' },
            wa_id: '5511988888888',
            user_id: 'lid-abc',
          }],
          messages: [{
            from: '5511988888888',
            id: 'wamid.ABC123',
            timestamp: '1700000000',
            type: 'text',
            text: { body: overrides.textBody ?? 'Olá, quero uma pizza' },
          }],
        },
      }],
    }],
  }
}

/** Envelope mínimo em torno de uma mensagem — usado pelos casos de mídia. */
function payloadWithMessage(message: Record<string, unknown>) {
  return {
    entry: [{
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '5511999999999', phone_number_id: '123456789' },
          messages: [message],
        },
      }],
    }],
  }
}

describe('parseInboundPayload', () => {
  it('extrai os campos de uma mensagem de texto', () => {
    const result = parseInboundPayload(textPayload())
    expect(result).toEqual({
      telefone: '5511988888888',
      wamid: 'wamid.ABC123',
      timestamp: '1700000000',
      tipo: 'text',
      texto: 'Olá, quero uma pizza',
      midia: null,
      nomeContato: 'Cliente Teste',
      waId: '5511988888888',
      userId: 'lid-abc',
      phoneNumberId: '123456789',
      botaoRespondidoId: null,
    })
  })

  it('extrai a mídia do áudio da captura real de produção', () => {
    // Captura real (§1.3 de `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`):
    // áudio traz `url` inline, `sha256` e `voice` além do que consumimos.
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.AUDIO1',
      timestamp: '1700000001',
      type: 'audio',
      audio: {
        mime_type: 'audio/ogg; codecs=opus',
        sha256: 'Ff9JQbS0fClGFReBjR2560cg49/tyb65qcJity7S+UQ=',
        id: '2112121579740403',
        url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=abc',
        voice: true,
      },
    }))

    expect(result?.tipo).toBe('audio')
    expect(result?.texto).toBeNull()
    expect(result?.midia).toEqual({
      mediaId: '2112121579740403',
      mimeType: 'audio/ogg; codecs=opus',
      url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=abc',
      caption: null,
      filename: null,
    })
  })

  it('extrai a mídia da imagem com url inline', () => {
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.IMG1',
      timestamp: '1700000002',
      type: 'image',
      image: {
        mime_type: 'image/jpeg',
        id: '1710255123316890',
        url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=img',
      },
    }))

    expect(result?.midia).toEqual({
      mediaId: '1710255123316890',
      mimeType: 'image/jpeg',
      url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=img',
      caption: null,
      filename: null,
    })
  })

  it('extrai a mídia da imagem sem url inline — o shape de image não está confirmado (§1.3)', () => {
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.IMG2',
      timestamp: '1700000003',
      type: 'image',
      image: { mime_type: 'image/jpeg', id: '1710255123316891' },
    }))

    expect(result?.midia).toEqual({
      mediaId: '1710255123316891',
      mimeType: 'image/jpeg',
      url: null,
      caption: null,
      filename: null,
    })
  })

  it('preserva a legenda da imagem — é texto que o cliente digitou (§7.2)', () => {
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.IMG3',
      timestamp: '1700000004',
      type: 'image',
      image: { mime_type: 'image/jpeg', id: '1710255123316892', caption: 'quantos desses tem?' },
    }))

    expect(result?.midia?.caption).toBe('quantos desses tem?')
  })

  it('devolve a mensagem (nunca null) para tipo não suportado — o produtor recusa educadamente', () => {
    // §1.1: devolver `null` aqui reintroduziria o descarte silencioso — o
    // cliente ficaria sem resposta nenhuma.
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.VIDEO1',
      timestamp: '1700000005',
      type: 'video',
      video: { mime_type: 'video/mp4', id: '999' },
    }))

    expect(result).not.toBeNull()
    expect(result?.tipo).toBe('video')
    expect(result?.texto).toBeNull()
    expect(result?.midia).toBeNull()
  })

  it('ignora o campo de mídia que não corresponde ao type declarado', () => {
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.STICKER1',
      timestamp: '1700000006',
      type: 'sticker',
      image: { mime_type: 'image/webp', id: '888' },
    }))

    expect(result?.midia).toBeNull()
  })

  it('devolve null para payload sem messages (evento de status)', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '5511999999999', phone_number_id: '123456789' },
            statuses: [{ id: 'wamid.ABC123', status: 'read' }],
          },
        }],
      }],
    }
    expect(parseInboundPayload(payload)).toBeNull()
  })

  it('devolve null para payload malformado', () => {
    expect(parseInboundPayload({})).toBeNull()
    expect(parseInboundPayload(null)).toBeNull()
    expect(parseInboundPayload('not json')).toBeNull()
  })

  it('devolve texto null para tipos diferentes de text', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '5511999999999', phone_number_id: '123456789' },
            messages: [{
              from: '5511988888888',
              id: 'wamid.AUDIO1',
              timestamp: '1700000001',
              type: 'audio',
            }],
          },
        }],
      }],
    }

    const result = parseInboundPayload(payload)
    expect(result?.tipo).toBe('audio')
    expect(result?.texto).toBeNull()
  })

  it('funciona sem contacts (campo opcional)', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '5511999999999', phone_number_id: '123456789' },
            messages: [{
              from: '5511988888888',
              id: 'wamid.ABC123',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'oi' },
            }],
          },
        }],
      }],
    }

    const result = parseInboundPayload(payload)
    expect(result?.nomeContato).toBeNull()
    expect(result?.waId).toBeNull()
    expect(result?.userId).toBeNull()
  })
})

/**
 * FASE 0.4 (a) de `_docs/em-andamento.md`: o identificador estável é a âncora do
 * cliente — telefone não é identidade. Aqui se trava a EXTRAÇÃO; os hops
 * seguintes (buffer, claim, consumer) têm specs próprios.
 */
describe('parseInboundPayload — identificador estável (@lid)', () => {
  it('prefere messages[].from_user_id, que é o campo da própria mensagem', () => {
    // Valores da captura real de 2026-07-29 (`payloads-waba.md`). `contacts[]`
    // é lista paralela a `messages[]`: casá-las por posição é suposição, e
    // `from_user_id` dispensa a suposição.
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511940204449',
      from_user_id: 'BR.1892507442136090',
      id: 'wamid.HBgNNTUxMTk0MDIwNDQ0ORUCABIYFjNFQjBDRjlBM0I5OTVGQ0JFQjk4QzUA',
      timestamp: '1784298466',
      type: 'text',
      text: { body: 'oi' },
    }))

    expect(result?.userId).toBe('BR.1892507442136090')
  })

  it('cai em contacts[].user_id quando a mensagem não traz o campo', () => {
    expect(parseInboundPayload(textPayload())?.userId).toBe('lid-abc')
  })

  it('payload sem identificador nenhum segue sendo um turno válido, com userId null', () => {
    // Definição de pronto (ii): ausência do identificador não pode derrubar o
    // turno — o cliente continua identificado por telefone.
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511940204449',
      id: 'wamid.SEMLID',
      timestamp: '1784298466',
      type: 'text',
      text: { body: 'oi' },
    }))

    expect(result).not.toBeNull()
    expect(result?.userId).toBeNull()
    expect(result?.telefone).toBe('5511940204449')
  })
})

/**
 * §0.5.2 (c) / §7.6 item 1 de `_docs/em-andamento.md`: `value.message_echoes`
 * como evento próprio. Payloads verbatim de `_docs/implementar/payloads-waba.md`
 * (captura real de 2026-07-29/31) — não construídos a partir de prosa.
 */
describe('parseEchoEvent — value.message_echoes como evento próprio', () => {
  // Captura real: echo de "Teste de resposta" enviado pela loja pelo app do
  // celular. `field` do envelope é `smb_message_echoes` (não testado aqui de
  // propósito — a função nunca olha `field`).
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

  // Captura real: recibo de entrega do echo acima. `field` é `messages` —
  // igual ao de mensagem de verdade (§5, armadilha 11).
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

  it('extrai o cliente de `to`/`to_user_id` — nunca de `from`, que é a loja', () => {
    const result = parseEchoEvent(echoPayload)

    expect(result).toEqual({
      telefone: '5511940204449',
      wamid: 'wamid.HBgNNTUxMTk0MDIwNDQ0ORUCABEYIEE1NTcxQTM0NDNDQjlGNzU2RTMyQjdFRDYzRUM5MjFCAA==',
      timestamp: '1785368649',
      tipo: 'text',
      userId: 'BR.1892507442136090',
      phoneNumberId: '1129099030297574',
      texto: 'Teste de resposta',
    })
  })

  it('texto null quando o tipo ecoado não é text (§0.5.2 item f grava um marcador próprio nesse caso)', () => {
    const payload = structuredClone(echoPayload)
    const echo = payload.entry[0]!.changes[0]!.value.message_echoes[0] as { type: string, text?: { body: string } }
    echo.type = 'image'
    delete echo.text

    expect(parseEchoEvent(payload)?.texto).toBeNull()
  })

  it('parseInboundPayload NUNCA trata o echo como mensagem do cliente', () => {
    // Guarda de regressão: se isto voltar a `null` por causa de `profile`
    // ausente E também passar a achar uma "mensagem" em `message_echoes`,
    // o agente responderia como se o cliente tivesse falado.
    expect(parseInboundPayload(echoPayload)).toBeNull()
  })

  it('discrimina por array, não por `field`: status tem `field: "messages"` e não é confundido com echo nem com mensagem', () => {
    expect(parseEchoEvent(statusPayload)).toBeNull()
    expect(parseInboundPayload(statusPayload)).toBeNull()
  })

  it('discrimina por array mesmo que `field` minta: `message_echoes` presente com `field: "messages"` ainda é reconhecido como echo', () => {
    const misleadingField = structuredClone(echoPayload)
    misleadingField.entry[0]!.changes[0]!.field = 'messages'

    const result = parseEchoEvent(misleadingField)
    expect(result?.telefone).toBe('5511940204449')
  })

  it('devolve null para payload sem message_echoes', () => {
    expect(parseEchoEvent(textPayload())).toBeNull()
  })

  it('devolve null para payload malformado', () => {
    expect(parseEchoEvent({})).toBeNull()
    expect(parseEchoEvent(null)).toBeNull()
  })

  it('userId null quando o echo não traz to_user_id', () => {
    const payload = structuredClone(echoPayload)
    delete (payload.entry[0]!.changes[0]!.value.message_echoes[0] as { to_user_id?: string }).to_user_id

    expect(parseEchoEvent(payload)?.userId).toBeNull()
  })
})

/**
 * `profile` virou opcional em `inboundContactSchema` para o echo e o status
 * (nenhum dos dois traz `profile` na captura real) passarem da validação do
 * envelope. Aqui se confere que o caminho de `messages` — que sempre teve
 * `profile` — não regrediu (§7.6 item 1: "reconfira o caminho de messages").
 */
/**
 * Toque num botão de `send/buttons` (sem migration de schema) — `interactive.button_reply.id`
 * volta no webhook exatamente como definido no envio (`handleButtonReply.ts`
 * é quem interpreta o id; aqui só se trava a extração).
 */
describe('parseInboundPayload — botaoRespondidoId (interactive.button_reply)', () => {
  it('extrai o id do botão tocado', () => {
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.BTN1',
      timestamp: '1700000007',
      type: 'interactive',
      interactive: { type: 'button_reply', button_reply: { id: 'ver_itens', title: 'Ver os Itens' } },
    }))

    expect(result?.tipo).toBe('interactive')
    expect(result?.botaoRespondidoId).toBe('ver_itens')
    expect(result?.texto).toBeNull()
  })

  it('botaoRespondidoId null para tipo interactive sem button_reply (ex.: list_reply, ainda não tratado)', () => {
    const result = parseInboundPayload(payloadWithMessage({
      from: '5511988888888',
      id: 'wamid.LIST1',
      timestamp: '1700000008',
      type: 'interactive',
      interactive: { type: 'list_reply', list_reply: { id: 'algo', title: 'Algo' } },
    }))

    expect(result?.botaoRespondidoId).toBeNull()
  })

  it('botaoRespondidoId null para qualquer tipo que não seja interactive', () => {
    expect(parseInboundPayload(textPayload())?.botaoRespondidoId).toBeNull()
  })
})

describe('inboundContactSchema — profile opcional (§7.6 item 1)', () => {
  it('mensagem do cliente sem profile.name continua um turno válido, com nomeContato null', () => {
    const result = parseInboundPayload({
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '5511999999999', phone_number_id: '123456789' },
            contacts: [{ wa_id: '5511988888888', user_id: 'lid-abc' }],
            messages: [{
              from: '5511988888888',
              id: 'wamid.ABC123',
              timestamp: '1700000000',
              type: 'text',
              text: { body: 'oi' },
            }],
          },
        }],
      }],
    })

    expect(result).not.toBeNull()
    expect(result?.nomeContato).toBeNull()
    expect(result?.waId).toBe('5511988888888')
    expect(result?.userId).toBe('lid-abc')
  })

  it('mensagem do cliente com profile.name continua extraindo nomeContato — regressão do caminho existente', () => {
    expect(parseInboundPayload(textPayload())?.nomeContato).toBe('Cliente Teste')
  })
})

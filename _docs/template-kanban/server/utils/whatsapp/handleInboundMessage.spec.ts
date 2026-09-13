import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { handleInboundMessage } from './handleInboundMessage'
import {
  MEDIA_DISABLED_TEXT,
  MEDIA_FAILED_TEXT,
  UNSUPPORTED_TYPE_TEXT,
} from './inboundMediaPolicy'
import { TRANSBORDO_ACK_TEXT } from './transbordoHeuristic'
import type { ParsedInboundMessage } from './parseInboundPayload'

const { markReadAndTyping, sendText, appendToBurstBuffer, gateInboundTurn } = vi.hoisted(() => ({
  markReadAndTyping: vi.fn(async () => {}),
  sendText: vi.fn(async () => {}),
  // Devolve a chave do buffer (migration 101): é ela que o produtor enfileira.
  appendToBurstBuffer: vi.fn(async () => '5511988888888'),
  // Item (d)/(e) da §0.5.2: não-pausado por padrão nos testes que não são dele.
  gateInboundTurn: vi.fn(async () => ({ clienteId: 'cliente-1', pausado: false, escalatedNow: false })),
}))

vi.mock('./cloudApiClient', () => ({ markReadAndTyping, sendText }))
vi.mock('./burstBuffer', () => ({ appendToBurstBuffer }))
vi.mock('./pauseGate', () => ({ gateInboundTurn }))

const provider = { apiToken: 'sk_live_xxx', baseUrl: 'https://api.provedor.com.br', usandoFallbackEnv: false }

function fakeSupabase(options: { upsertError?: string } = {}) {
  const upsert = vi.fn(async () => ({ error: options.upsertError ? { message: options.upsertError } : null }))
  const supabase = { from: () => ({ upsert }) } as unknown as SupabaseClient<Database>
  return { supabase, upsert }
}

function message(overrides: Partial<ParsedInboundMessage> = {}): ParsedInboundMessage {
  return {
    telefone: '5511988888888',
    wamid: 'wamid.ABC123',
    timestamp: '1700000000',
    tipo: 'text',
    texto: 'quero uma coca',
    midia: null,
    nomeContato: 'Cliente Teste',
    waId: '5511988888888',
    userId: null,
    phoneNumberId: '123456789',
    ...overrides,
  }
}

const audio = message({
  tipo: 'audio',
  texto: null,
  wamid: 'wamid.AUDIO1',
  midia: { mediaId: '2112121579740403', mimeType: 'audio/ogg; codecs=opus', url: 'https://inline/a.ogg', caption: null, filename: null },
})

const imagem = message({
  tipo: 'image',
  texto: null,
  wamid: 'wamid.IMG1',
  midia: { mediaId: '1710255123316890', mimeType: 'image/jpeg', url: null, caption: 'quantos desses?', filename: null },
})

function deps(supabase: SupabaseClient<Database>, flags = { audioHabilitado: true, imagemHabilitado: true }) {
  const turnQueue = { send: vi.fn(async () => {}) }
  const mediaQueue = { send: vi.fn(async () => {}) }
  return { deps: { supabase, provider, media: flags, turnQueue, mediaQueue }, turnQueue, mediaQueue }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleInboundMessage — tabela de degradação da §7.4', () => {
  it('texto: bufferiza e agenda o turno com 8s de debounce', async () => {
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue, mediaQueue } = deps(supabase)

    await handleInboundMessage(d, message())

    expect(markReadAndTyping).toHaveBeenCalledWith(provider, 'wamid.ABC123')
    expect(appendToBurstBuffer).toHaveBeenCalledWith(supabase, {
      telefone: '5511988888888',
      texto: 'quero uma coca',
      msgId: 'wamid.ABC123',
      lid: null,
    })
    // A chave enfileirada é a que o RPC devolveu, nunca uma recalculada aqui.
    expect(turnQueue.send).toHaveBeenCalledWith(
      { chave: '5511988888888', checkForMsgId: 'wamid.ABC123' },
      { delaySeconds: 8 },
    )
    expect(mediaQueue.send).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })

  it('texto consulta o gate de pausa antes de bufferizar, com telefone/lid/texto do turno (item d da §0.5.2)', async () => {
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await handleInboundMessage(d, message({ userId: 'BR.1892507442136090' }))

    expect(gateInboundTurn).toHaveBeenCalledWith(
      supabase,
      { telefone: '5511988888888', lid: 'BR.1892507442136090' },
      'quero uma coca',
      'Cliente Teste',
      undefined,
    )
  })

  it('cliente já pausado (não é esta mensagem que escalou): NÃO bufferiza nem enfileira, e não repete a confirmação', async () => {
    gateInboundTurn.mockResolvedValueOnce({ clienteId: 'cliente-1', pausado: true, escalatedNow: false })
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue, mediaQueue } = deps(supabase)

    await handleInboundMessage(d, message())

    expect(appendToBurstBuffer).not.toHaveBeenCalled()
    expect(turnQueue.send).not.toHaveBeenCalled()
    expect(mediaQueue.send).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })

  it('mensagem que ACABOU de disparar o transbordo: manda a confirmação uma vez, sem bufferizar', async () => {
    gateInboundTurn.mockResolvedValueOnce({ clienteId: 'cliente-1', pausado: true, escalatedNow: true })
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue, mediaQueue } = deps(supabase)

    await handleInboundMessage(d, message({ texto: 'quero falar com um humano' }))

    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: null }, TRANSBORDO_ACK_TEXT)
    expect(appendToBurstBuffer).not.toHaveBeenCalled()
    expect(turnQueue.send).not.toHaveBeenCalled()
    expect(mediaQueue.send).not.toHaveBeenCalled()
  })

  it('enfileira a chave do RPC mesmo quando ela não é o telefone', async () => {
    // Item (b) da FASE 0.4: turno identificado só pelo lid tem chave prefixada.
    // Se o produtor derivasse a chave por conta própria, esta divergência não
    // daria erro — o claim simplesmente nunca casaria.
    appendToBurstBuffer.mockResolvedValueOnce('lid:BR.1892507442136090')
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue } = deps(supabase)

    await handleInboundMessage(d, message({ userId: 'BR.1892507442136090' }))

    expect(turnQueue.send).toHaveBeenCalledWith(
      { chave: 'lid:BR.1892507442136090', checkForMsgId: 'wamid.ABC123' },
      { delaySeconds: 8 },
    )
  })

  it('texto com identificador estável: o @lid entra no buffer junto do lote (FASE 0.4 a)', async () => {
    // O produtor é o único ponto do fluxo em que o identificador existe — o
    // consumer só volta a ver o turno depois dos 8s de debounce. Descartá-lo
    // aqui é o buraco que fazia o agente identificar cliente só por telefone.
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await handleInboundMessage(d, message({ userId: 'BR.1892507442136090' }))

    expect(appendToBurstBuffer).toHaveBeenCalledWith(supabase, {
      telefone: '5511988888888',
      texto: 'quero uma coca',
      msgId: 'wamid.ABC123',
      lid: 'BR.1892507442136090',
    })
  })

  it('áudio ligado: grava pendente e enfileira só identificadores, nunca bytes (§5.1)', async () => {
    const { supabase, upsert } = fakeSupabase()
    const { deps: d, mediaQueue, turnQueue } = deps(supabase)

    await handleInboundMessage(d, audio)

    expect(upsert).toHaveBeenCalledWith({
      wamid: 'wamid.AUDIO1',
      phone: '5511988888888',
      whatsapp_lid: null,
      contact_name: 'Cliente Teste',
      type: 'audio',
      media_id: '2112121579740403',
      mime_type: 'audio/ogg; codecs=opus',
      status: 'pendente',
    }, { onConflict: 'wamid', ignoreDuplicates: true })
    expect(mediaQueue.send).toHaveBeenCalledWith(
      { wamid: 'wamid.AUDIO1', urlInline: 'https://inline/a.ogg' },
      undefined,
    )
    // Mídia não bufferiza nem acorda o turno agora — quem faz isso é o consumer,
    // depois da transcrição (§5.2).
    expect(appendToBurstBuffer).not.toHaveBeenCalled()
    expect(turnQueue.send).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })

  it('mídia com identificador estável grava o @lid na linha (item c da FASE 0.4)', async () => {
    // O produtor é o único ponto do fluxo que vê o `from_user_id` da mensagem
    // de mídia. Sem gravá-lo aqui, o consumer não tem de onde tirá-lo e o turno
    // iniciado por áudio nunca grava `customers.whatsapp_lid`.
    const { supabase, upsert } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await handleInboundMessage(d, { ...audio, userId: 'BR.1892507442136090' })

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ whatsapp_lid: 'BR.1892507442136090' }),
      { onConflict: 'wamid', ignoreDuplicates: true },
    )
  })

  it('imagem ligada: leva a legenda para o consumer, sem url inline quando não vier (§1.3)', async () => {
    const { supabase } = fakeSupabase()
    const { deps: d, mediaQueue } = deps(supabase)

    await handleInboundMessage(d, imagem)

    expect(mediaQueue.send).toHaveBeenCalledWith(
      { wamid: 'wamid.IMG1', caption: 'quantos desses?' },
      undefined,
    )
  })

  it('áudio com o recurso desligado: responde e grava recusado, sem enfileirar', async () => {
    const { supabase, upsert } = fakeSupabase()
    const { deps: d, mediaQueue } = deps(supabase, { audioHabilitado: false, imagemHabilitado: true })

    await handleInboundMessage(d, audio)

    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: null }, MEDIA_DISABLED_TEXT.audio)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'recusado', error: 'recurso_desligado', type: 'audio' }),
      { onConflict: 'wamid', ignoreDuplicates: true },
    )
    expect(mediaQueue.send).not.toHaveBeenCalled()
  })

  it('imagem com o recurso desligado: responde e grava recusado, sem enfileirar', async () => {
    const { supabase, upsert } = fakeSupabase()
    const { deps: d, mediaQueue } = deps(supabase, { audioHabilitado: true, imagemHabilitado: false })

    await handleInboundMessage(d, imagem)

    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: null }, MEDIA_DISABLED_TEXT.image)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'recusado', error: 'recurso_desligado', type: 'image' }),
      { onConflict: 'wamid', ignoreDuplicates: true },
    )
    expect(mediaQueue.send).not.toHaveBeenCalled()
  })

  it.each(['video', 'document', 'sticker', 'location', 'contacts'])(
    'tipo não suportado (%s): responde e não grava linha de mídia',
    async (tipo) => {
      const { supabase, upsert } = fakeSupabase()
      const { deps: d, mediaQueue } = deps(supabase)

      await handleInboundMessage(d, message({ tipo, texto: null, midia: null }))

      expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: null }, UNSUPPORTED_TYPE_TEXT)
      // `media_id` é NOT NULL e não sabemos o dele — não há linha a gravar.
      expect(upsert).not.toHaveBeenCalled()
      expect(mediaQueue.send).not.toHaveBeenCalled()
    },
  )

  it('falha ao gravar a mídia pendente ainda responde ao cliente (§2)', async () => {
    // Se o registro falha, o consumer nunca roda — a mensagem de falha, que
    // normalmente é dele, tem que sair daqui.
    const { supabase } = fakeSupabase({ upsertError: 'connection reset' })
    const { deps: d, mediaQueue } = deps(supabase)

    await handleInboundMessage(d, audio)

    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: null }, MEDIA_FAILED_TEXT)
    expect(mediaQueue.send).not.toHaveBeenCalled()
  })

  it('falha ao registrar a recusa não engole a resposta ao cliente', async () => {
    const { supabase } = fakeSupabase({ upsertError: 'connection reset' })
    const { deps: d } = deps(supabase, { audioHabilitado: false, imagemHabilitado: true })

    await handleInboundMessage(d, audio)

    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: null }, MEDIA_DISABLED_TEXT.audio)
  })

  it('a resposta de recusa leva a IDENTIDADE do cliente, não só o telefone', async () => {
    // Item (d) da FASE 0.4: o produtor é o único ponto do fluxo em que os dois
    // identificadores existem juntos de graça. Mandar só o telefone à camada de
    // envio jogaria o `@lid` fora exatamente onde ele é mais barato — e é essa
    // camada que muda no dia em que o provedor aceitar `user_id` no envio.
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase, { audioHabilitado: false, imagemHabilitado: true })

    await handleInboundMessage(d, { ...audio, userId: 'BR.1892507442136090' })

    expect(sendText).toHaveBeenCalledWith(
      provider,
      { telefone: '5511988888888', lid: 'BR.1892507442136090' },
      MEDIA_DISABLED_TEXT.audio,
    )
  })

  it('nunca rebaixa uma linha existente — reentrega pós-dedup não paga a OpenAI de novo (§8.2)', async () => {
    const { supabase, upsert } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await handleInboundMessage(d, audio)

    // `ignoreDuplicates` vira `ON CONFLICT DO NOTHING`: um `DO UPDATE` devolveria
    // a linha para `pendente` e a tornaria reivindicável outra vez.
    expect(upsert).toHaveBeenCalledWith(
      expect.anything(),
      { onConflict: 'wamid', ignoreDuplicates: true },
    )
  })

  it('sem binding de fila (fora do runtime Cloudflare) não lança', async () => {
    const { supabase } = fakeSupabase()

    await expect(handleInboundMessage(
      { supabase, provider, media: { audioHabilitado: true, imagemHabilitado: true } },
      audio,
    )).resolves.toBeUndefined()
    expect(sendText).not.toHaveBeenCalled()
  })
})

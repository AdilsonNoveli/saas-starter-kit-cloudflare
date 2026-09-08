import type { SupabaseClient } from '@supabase/supabase-js'
import type OpenAI from 'openai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { MEDIA_FAILED_TEXT, MEDIA_TOO_LARGE_TEXT } from './inboundMediaPolicy'
import { mediaRetryDelaySeconds, processInboundMedia, MAX_MEDIA_ATTEMPTS } from './processInboundMedia'

const {
  claimMedia,
  getMediaMetadata,
  downloadMedia,
  sendText,
  appendToBurstBuffer,
  transcribeAudio,
  describeImage,
  gateInboundTurn,
} = vi.hoisted(() => ({
  claimMedia: vi.fn(),
  getMediaMetadata: vi.fn(),
  downloadMedia: vi.fn(),
  sendText: vi.fn(async () => {}),
  appendToBurstBuffer: vi.fn(async () => '5511988888888'),
  transcribeAudio: vi.fn(),
  describeImage: vi.fn(),
  // Item (d)/(e) da §0.5.2: não-pausado por padrão nos testes que não são dele.
  gateInboundTurn: vi.fn(async () => ({ clienteId: 'cliente-1', pausado: false })),
}))

vi.mock('./claimMedia', () => ({ claimMedia }))
vi.mock('./cloudApiMedia', () => ({ getMediaMetadata, downloadMedia }))
vi.mock('./cloudApiClient', () => ({ sendText }))
vi.mock('./burstBuffer', () => ({ appendToBurstBuffer }))
vi.mock('../media/transcribeAudio', () => ({ transcribeAudio }))
vi.mock('../media/describeImage', () => ({ describeImage }))
vi.mock('./pauseGate', () => ({ gateInboundTurn }))

const provider = { apiToken: 'sk_live_xxx', baseUrl: 'https://api.provedor.com.br', usandoFallbackEnv: false }

const claimedAudio = {
  wamid: 'wamid.AUDIO1',
  telefone: '5511988888888',
  lid: 'BR.1892507442136090',
  nomeContato: 'Cliente Teste',
  tipo: 'audio',
  mediaId: '2112121579740403',
  mimeType: 'audio/ogg; codecs=opus',
  tamanhoBytes: null,
  tentativas: 1,
}

interface SupabaseCalls {
  updates: Array<Record<string, unknown>>
  inserts: Array<Record<string, unknown>>
}

function fakeSupabase(row?: {
  telefone: string | null
  whatsapp_lid?: string | null
  status: string
  texto: string | null
} | null) {
  const calls: SupabaseCalls = { updates: [], inserts: [] }

  const supabase = {
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          calls.updates.push({ table, ...patch })
          return { error: null }
        },
      }),
      insert: async (values: Record<string, unknown>) => {
        calls.inserts.push({ table, ...values })
        return { error: null }
      },
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row ?? null, error: null }) }),
      }),
    }),
  } as unknown as SupabaseClient<Database>

  return { supabase, calls }
}

function deps(supabase: SupabaseClient<Database>, openai: OpenAI | null = {} as OpenAI) {
  const turnQueue = { send: vi.fn(async () => {}) }
  return {
    deps: {
      supabase,
      provider,
      openai,
      modeloTranscricao: 'gpt-4o-mini-transcribe',
      modeloVisao: 'gpt-4o-mini',
      turnQueue,
    },
    turnQueue,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  getMediaMetadata.mockResolvedValue({
    url: 'https://files.provedor.com.br/a.ogg',
    mimeType: 'audio/ogg',
    sizeBytes: 14_233,
  })
  downloadMedia.mockResolvedValue({ ok: true, bytes: new Uint8Array([1, 2, 3]), mimeType: 'audio/ogg' })
  transcribeAudio.mockResolvedValue({
    ok: true,
    texto: '[áudio transcrito] quero duas cocas',
    usage: null,
    modelo: 'gpt-4o-mini-transcribe',
    duracaoMs: 1200,
    tamanhoBytes: 3,
  })
})

describe('processInboundMedia', () => {
  it('áudio: claim → metadados → download → transcrição → buffer → turno com 8s', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    const { supabase, calls } = fakeSupabase()
    const { deps: d, turnQueue } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(claimMedia).toHaveBeenCalledWith(supabase, 'wamid.AUDIO1', MAX_MEDIA_ATTEMPTS)
    expect(downloadMedia).toHaveBeenCalledWith(provider, 'https://files.provedor.com.br/a.ogg', 16 * 1024 * 1024)
    // `mime_type` do payload tem precedência sobre o do provedor.
    expect(transcribeAudio).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini-transcribe',
      mimeType: 'audio/ogg; codecs=opus',
    }))
    expect(calls.updates).toContainEqual(expect.objectContaining({
      table: 'whatsapp_midia',
      status: 'concluido',
      texto: '[áudio transcrito] quero duas cocas',
      modelo: 'gpt-4o-mini-transcribe',
      duracao_ms: 1200,
      tamanho_bytes: 3,
    }))
    // O @lid vai junto desde a migration 101 (item (c)): é isto que faz o turno
    // iniciado por áudio também gravar `clientes.whatsapp_lid`.
    expect(appendToBurstBuffer).toHaveBeenCalledWith(supabase, {
      telefone: '5511988888888',
      texto: '[áudio transcrito] quero duas cocas',
      msgId: 'wamid.AUDIO1',
      lid: 'BR.1892507442136090',
    })
    expect(turnQueue.send).toHaveBeenCalledWith(
      { chave: '5511988888888', checkForMsgId: 'wamid.AUDIO1' },
      { delaySeconds: 8 },
    )
    expect(sendText).not.toHaveBeenCalled()
  })

  it('consulta o gate de pausa com o texto transcrito, antes de bufferizar (item d da §0.5.2)', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(gateInboundTurn).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ telefone: '5511988888888', lid: 'BR.1892507442136090' }),
      '[áudio transcrito] quero duas cocas',
      'Cliente Teste',
    )
  })

  it('cliente pausado: transcreve (já pago) mas NÃO bufferiza nem enfileira o turno (item e da §0.5.2)', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    gateInboundTurn.mockResolvedValueOnce({ clienteId: 'cliente-1', pausado: true })
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(appendToBurstBuffer).not.toHaveBeenCalled()
    expect(turnQueue.send).not.toHaveBeenCalled()
  })

  it('imagem: descreve com a legenda e soma os tokens de visão em agente_uso_tokens (§7.3)', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, tipo: 'image', mimeType: 'image/jpeg' })
    describeImage.mockResolvedValue({
      ok: true,
      texto: '[imagem: duas garrafas de coca 2L]\nquantos desses?',
      usage: { promptTokens: 800, completionTokens: 40 },
      modelo: 'gpt-4o-mini',
      duracaoMs: 2400,
      tamanhoBytes: 3,
    })
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.IMG1', caption: 'quantos desses?' })

    expect(describeImage).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      caption: 'quantos desses?',
    }))
    expect(calls.inserts).toContainEqual({
      table: 'agente_uso_tokens',
      modelo: 'gpt-4o-mini',
      prompt_tokens: 800,
      completion_tokens: 40,
      latencia_ms: 2400,
    })
  })

  it('claim duplo da fila processa uma vez só — a segunda entrega é no-op sem OpenAI (§8.2)', async () => {
    claimMedia.mockResolvedValue(null)
    // Linha ainda em `processando`: a outra entrega está com ela.
    const { supabase, calls } = fakeSupabase({ telefone: '5511988888888', status: 'processando', texto: null })
    const { deps: d, turnQueue } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(downloadMedia).not.toHaveBeenCalled()
    expect(appendToBurstBuffer).not.toHaveBeenCalled()
    expect(turnQueue.send).not.toHaveBeenCalled()
    expect(calls.updates).toHaveLength(0)
  })

  it('`concluido` reaproveita o texto sem chamar a OpenAI de novo — proteção de custo (§8.2)', async () => {
    claimMedia.mockResolvedValue(null)
    const { supabase } = fakeSupabase({
      telefone: '5511988888888',
      whatsapp_lid: 'BR.1892507442136090',
      status: 'concluido',
      texto: '[áudio transcrito] quero duas cocas',
    })
    const { deps: d, turnQueue } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(getMediaMetadata).not.toHaveBeenCalled()
    // Reentrega também releva o lid: o caminho que reaproveita o texto não pode
    // ser o único que perde o identificador.
    expect(appendToBurstBuffer).toHaveBeenCalledWith(supabase, {
      telefone: '5511988888888',
      texto: '[áudio transcrito] quero duas cocas',
      msgId: 'wamid.AUDIO1',
      lid: 'BR.1892507442136090',
    })
    expect(turnQueue.send).toHaveBeenCalled()
  })

  it('recusa pelo size de GET /media/{id}, antes de baixar (§7.5)', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    getMediaMetadata.mockResolvedValue({ url: 'https://files/a.ogg', mimeType: null, sizeBytes: 20 * 1024 * 1024 })
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(downloadMedia).not.toHaveBeenCalled()
    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', erro: 'tamanho' }))
    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: 'BR.1892507442136090' }, MEDIA_TOO_LARGE_TEXT)
  })

  it('recusa pelo tamanho detectado no download quando o size não veio', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    getMediaMetadata.mockResolvedValue({ url: 'https://files/a.ogg', mimeType: null, sizeBytes: null })
    downloadMedia.mockResolvedValue({ ok: false, motivo: 'tamanho', tamanhoBytes: 20 * 1024 * 1024 })
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', erro: 'tamanho' }))
    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: 'BR.1892507442136090' }, MEDIA_TOO_LARGE_TEXT)
  })

  it('cai para o url inline do payload quando GET /media/{id} falha (§1.3)', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    getMediaMetadata.mockResolvedValue(null)
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1', urlInline: 'https://lookaside/a.ogg' })

    expect(downloadMedia).toHaveBeenCalledWith(provider, 'https://lookaside/a.ogg', 16 * 1024 * 1024)
  })

  it('falha transitória com tentativa restante pede reentrega e NÃO avisa o cliente ainda (§7.4)', async () => {
    // A §7.4 manda a mensagem de falha "após retries". Avisar na primeira
    // topada de um 5xx transitório queimaria a mídia que a 2ª tentativa
    // resolveria — e a migration 094 deixou `falhou` reclaimável justamente
    // para isso.
    claimMedia.mockResolvedValue({ ...claimedAudio, tentativas: 1 })
    downloadMedia.mockRejectedValue(new Error('Download de mídia respondeu 500'))
    const { supabase, calls } = fakeSupabase()
    const { deps: d, turnQueue } = deps(supabase)

    await expect(processInboundMedia(d, { wamid: 'wamid.AUDIO1' })).resolves.toBe('retry')

    expect(calls.updates).toContainEqual(expect.objectContaining({
      status: 'falhou',
      erro: expect.stringContaining('500') as unknown as string,
    }))
    expect(sendText).not.toHaveBeenCalled()
    expect(turnQueue.send).not.toHaveBeenCalled()
  })

  it('esgotadas as tentativas, responde ao cliente, grava falhou e NÃO relança (§8.3)', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, tentativas: MAX_MEDIA_ATTEMPTS })
    downloadMedia.mockRejectedValue(new Error('Download de mídia respondeu 500'))
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await expect(processInboundMedia(d, { wamid: 'wamid.AUDIO1' })).resolves.toBe('ack')

    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'falhou' }))
    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: 'BR.1892507442136090' }, MEDIA_FAILED_TEXT)
  })

  it('retentativa reaproveita o texto já pago, sem chamar a OpenAI de novo (§8.2)', async () => {
    // Tentativa anterior transcreveu e morreu depois (buffer/fila). A linha
    // ficou `falhou` **com** o texto — reclaimável, e agora barata.
    claimMedia.mockResolvedValue({ ...claimedAudio, tentativas: 2 })
    const { supabase, calls } = fakeSupabase({
      telefone: '5511988888888',
      status: 'falhou',
      texto: '[áudio transcrito] quero duas cocas',
    })
    const { deps: d, turnQueue } = deps(supabase)

    await expect(processInboundMedia(d, { wamid: 'wamid.AUDIO1' })).resolves.toBe('ack')

    expect(getMediaMetadata).not.toHaveBeenCalled()
    expect(downloadMedia).not.toHaveBeenCalled()
    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'concluido' }))
    // Aqui o lid vem do CLAIM (a linha já estava reivindicada), não da releitura.
    expect(appendToBurstBuffer).toHaveBeenCalledWith(supabase, {
      telefone: '5511988888888',
      texto: '[áudio transcrito] quero duas cocas',
      msgId: 'wamid.AUDIO1',
      lid: 'BR.1892507442136090',
    })
    expect(turnQueue.send).toHaveBeenCalled()
  })

  it('retentativa sem texto anterior processa normalmente', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, tentativas: 2 })
    const { supabase } = fakeSupabase({ telefone: '5511988888888', status: 'falhou', texto: null })
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(transcribeAudio).toHaveBeenCalled()
  })

  it('mídia ilegível (motivo `vazio`) também responde, em vez de sumir', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    transcribeAudio.mockResolvedValue({
      ok: false,
      motivo: 'vazio',
      modelo: 'gpt-4o-mini-transcribe',
      duracaoMs: 900,
      tamanhoBytes: 3,
    })
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', erro: 'vazio' }))
    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: 'BR.1892507442136090' }, MEDIA_FAILED_TEXT)
    expect(appendToBurstBuffer).not.toHaveBeenCalled()
  })

  it('sem chave da OpenAI responde e marca falhou, sem tentar baixar', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase, null)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(getMediaMetadata).not.toHaveBeenCalled()
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'falhou', erro: 'sem_chave_openai' }))
    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: 'BR.1892507442136090' }, MEDIA_FAILED_TEXT)
  })

  it('mídia sem @lid propaga null — o COALESCE do RPC é quem preserva o da rajada', async () => {
    // Áudio cujo payload não trouxe `from_user_id`, numa rajada em que o texto
    // trouxe. `appendToBurstBuffer` OMITE `p_lid` quando ele é falsy, e o
    // COALESCE do ON CONFLICT mantém o lid já gravado. Remover o COALESCE por
    // achar que "agora a mídia conhece o lid" apagaria o identificador aqui.
    claimMedia.mockResolvedValue({ ...claimedAudio, lid: null })
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(appendToBurstBuffer).toHaveBeenCalledWith(supabase, expect.objectContaining({ lid: null }))
  })

  it('mídia lid-only: falha grava status e NÃO tenta responder um telefone que não existe', async () => {
    // Item (c) da FASE 0.4 + armadilha 14: ler por identidade já funciona,
    // responder ainda exige telefone. `sendText(provider, null, ...)` seria um
    // 400 do provedor; o certo é registrar e seguir.
    claimMedia.mockResolvedValue({ ...claimedAudio, telefone: null })
    transcribeAudio.mockResolvedValue({
      ok: false, motivo: 'vazio', modelo: 'gpt-4o-mini-transcribe', duracaoMs: 900, tamanhoBytes: 3,
    })
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await expect(processInboundMedia(d, { wamid: 'wamid.AUDIO1' })).resolves.toBe('ack')

    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', erro: 'vazio' }))
    expect(sendText).not.toHaveBeenCalled()
  })

  it('mídia lid-only bem-sucedida ainda vira turno, com a chave prefixada', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, telefone: null })
    appendToBurstBuffer.mockResolvedValueOnce('lid:BR.1892507442136090')
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(appendToBurstBuffer).toHaveBeenCalledWith(supabase, expect.objectContaining({
      telefone: null,
      lid: 'BR.1892507442136090',
    }))
    expect(turnQueue.send).toHaveBeenCalledWith(
      { chave: 'lid:BR.1892507442136090', checkForMsgId: 'wamid.AUDIO1' },
      { delaySeconds: 8 },
    )
  })

  it('falha anterior ao claim sobe para a fila retentar — é o único caso sem ack (§8.3)', async () => {
    claimMedia.mockRejectedValue(new Error('Falha ao reivindicar mídia do WhatsApp.'))
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await expect(processInboundMedia(d, { wamid: 'wamid.AUDIO1' })).rejects.toThrow(/reivindicar/)
    expect(sendText).not.toHaveBeenCalled()
  })
})

describe('mediaRetryDelaySeconds', () => {
  it('cresce com a tentativa e tem teto — o cliente está esperando do outro lado', () => {
    expect(mediaRetryDelaySeconds(1)).toBe(15)
    expect(mediaRetryDelaySeconds(2)).toBe(30)
    expect(mediaRetryDelaySeconds(99)).toBe(60)
  })

  it('nunca devolve zero, mesmo com contagem ausente ou zerada', () => {
    expect(mediaRetryDelaySeconds(0)).toBe(15)
  })
})

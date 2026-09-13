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
  uploadFile,
  getOrCreateActiveSession,
} = vi.hoisted(() => ({
  claimMedia: vi.fn(),
  getMediaMetadata: vi.fn(),
  downloadMedia: vi.fn(),
  sendText: vi.fn(async () => {}),
  appendToBurstBuffer: vi.fn(async () => '5511988888888'),
  transcribeAudio: vi.fn(),
  describeImage: vi.fn(),
  // Item (d)/(e) da §0.5.2: não-pausado por padrão nos testes que não são dele.
  gateInboundTurn: vi.fn(async () => ({ clienteId: 'cliente-1', pausado: false, escalatedNow: false })),
  // Migration 114 — anexação de arte nunca deve tocar o S3 de verdade num teste unitário.
  uploadFile: vi.fn(),
  // `buildCatalogUrl` (dentro de `getOrCreateActiveSession`) exige `NUXT_SITE_URL`
  // em `useRuntimeConfig()`, que o ambiente `nuxt` do vitest não popula. É
  // infraestrutura de sessão, não o comportamento sob teste aqui.
  getOrCreateActiveSession: vi.fn(async () => ({
    sessaoId: 'sessao-1',
    url: 'https://loja.example.com/catalog?sessao=sessao-1',
  })),
}))

vi.mock('./claimMedia', () => ({ claimMedia }))
vi.mock('./cloudApiMedia', () => ({ getMediaMetadata, downloadMedia }))
vi.mock('./cloudApiClient', () => ({ sendText }))
vi.mock('./burstBuffer', () => ({ appendToBurstBuffer }))
vi.mock('../media/transcribeAudio', () => ({ transcribeAudio }))
vi.mock('../media/describeImage', () => ({ describeImage }))
vi.mock('./pauseGate', () => ({ gateInboundTurn }))
vi.mock('../s3/upload', () => ({ uploadFile }))
vi.mock('../sessions/createCatalogSession', () => ({ getOrCreateActiveSession }))
// Só `getBucketName` — ele valida as credenciais de S3 do ambiente, que não
// existem num teste unitário. As whitelists e os tetos de tamanho do módulo são
// parte do comportamento sob teste e continuam reais.
vi.mock('../s3/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../s3/constants')>()),
  getBucketName: () => 'attachments',
}))

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

/**
 * Stub encadeável genérico (migration 114): `select/eq/in/gt/order/limit`
 * devolvem o próprio stub, `single`/`maybeSingle` resolvem o resultado
 * configurado, e `then` deixa o stub "thenable" pra chains que terminam sem
 * `.single()` (ex.: `getCartState`'s `cart_items`, que só dá `await` direto
 * na query, igual ao builder real do supabase-js).
 */
function chainableStub(result: { data: unknown, error: null }): unknown {
  const stub: Record<string, unknown> = {
    select: () => stub,
    eq: () => stub,
    in: () => stub,
    not: () => stub,
    or: () => stub,
    gt: () => stub,
    order: () => stub,
    limit: () => stub,
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (v: typeof result) => void) => resolve(result),
  }
  return stub
}

/**
 * `arte` (migration 114) configura a resolução de `tryAttachIncomingFileAsArt`
 * — por padrão "cliente existente, sessão existente, carrinho vazio" (sem
 * pendência), que é o caso comum e não muda o comportamento das specs de
 * áudio/imagem anteriores à 114. Sobrescreva `cartItems`/`opcaoGrupos` para
 * simular um carrinho com pendência de arte.
 */
function fakeSupabase(row?: {
  phone: string | null
  whatsapp_lid?: string | null
  status: string
  text: string | null
} | null, arte: {
  cartItems?: unknown[]
  opcaoGrupos?: unknown[]
  cartItemsOpcoes?: unknown[]
} = {}) {
  const calls: SupabaseCalls = { updates: [], inserts: [] }

  const from = (table: string): unknown => {
    if (table === 'customers') {
      return chainableStub({ data: { id: 'cliente-1', name: 'Cliente Teste', whatsapp_phone: '5511988888888', whatsapp_lid: 'BR.1892507442136090' }, error: null })
    }
    if (table === 'sessions') {
      return chainableStub({ data: { id: 'sessao-1', delivery_mode: null, payment_method: null, address_id: null }, error: null })
    }
    if (table === 'cart_items') {
      return chainableStub({ data: arte.cartItems ?? [], error: null })
    }
    // migration 127 — fallback pós-pedido (`pendingOrderArt.ts`) só entra
    // quando o carrinho não tem pendência; "sem pedido nenhum" é o cenário
    // padrão destas specs (não testam o fallback em si).
    if (table === 'orders') {
      return chainableStub({ data: [], error: null })
    }
    if (table === 'cart_item_options') {
      return {
        ...(chainableStub({ data: arte.cartItemsOpcoes ?? [], error: null }) as Record<string, unknown>),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        insert: async (values: Record<string, unknown>) => { calls.inserts.push({ table, ...values }); return { error: null } },
      }
    }
    if (table === 'product_option_group') {
      return chainableStub({ data: arte.opcaoGrupos ?? [], error: null })
    }
    // `getCartState` recalcula o total pelas promoções ativas — sem promoção
    // nenhuma o desconto é zero, que é o cenário destes testes.
    if (table === 'promotions') {
      return chainableStub({ data: [], error: null })
    }

    return {
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
    }
  }

  const supabase = { from } as unknown as SupabaseClient<Database>

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
  uploadFile.mockResolvedValue({
    key: 'artes-clientes/arte.pdf',
    url: 'https://cdn.example.com/artes-clientes/arte.pdf',
    bucket: 'attachments',
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
      table: 'whatsapp_media',
      status: 'concluido',
      text: '[áudio transcrito] quero duas cocas',
      model: 'gpt-4o-mini-transcribe',
      duration_ms: 1200,
      size_bytes: 3,
    }))
    // O @lid vai junto desde a migration 101 (item (c)): é isto que faz o turno
    // iniciado por áudio também gravar `customers.whatsapp_lid`.
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
      undefined,
    )
  })

  it('cliente pausado: transcreve (já pago) mas NÃO bufferiza nem enfileira o turno (item e da §0.5.2)', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    gateInboundTurn.mockResolvedValueOnce({ clienteId: 'cliente-1', pausado: true, escalatedNow: false })
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(appendToBurstBuffer).not.toHaveBeenCalled()
    expect(turnQueue.send).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })

  it('mídia que ACABOU de disparar o transbordo: manda a confirmação (com telefone)', async () => {
    claimMedia.mockResolvedValue(claimedAudio)
    gateInboundTurn.mockResolvedValueOnce({ clienteId: 'cliente-1', pausado: true, escalatedNow: true })
    const { supabase } = fakeSupabase()
    const { deps: d, turnQueue } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(sendText).toHaveBeenCalledWith(
      provider,
      { telefone: '5511988888888', lid: 'BR.1892507442136090' },
      expect.stringContaining('atendente humano'),
    )
    expect(turnQueue.send).not.toHaveBeenCalled()
  })

  it('mídia lid-only (sem telefone) que escala: não tenta mandar confirmação (sendText exigiria telefone)', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, telefone: null })
    gateInboundTurn.mockResolvedValueOnce({ clienteId: 'cliente-1', pausado: true, escalatedNow: true })
    const { supabase } = fakeSupabase()
    const { deps: d } = deps(supabase)

    await expect(processInboundMedia(d, { wamid: 'wamid.AUDIO1' })).resolves.toBe('ack')
    expect(sendText).not.toHaveBeenCalled()
  })

  it('imagem: descreve com a legenda e soma os tokens de visão em agent_token_usage (§7.3)', async () => {
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
      table: 'agent_token_usage',
      model: 'gpt-4o-mini',
      prompt_tokens: 800,
      completion_tokens: 40,
      latency_ms: 2400,
    })
  })

  it('claim duplo da fila processa uma vez só — a segunda entrega é no-op sem OpenAI (§8.2)', async () => {
    claimMedia.mockResolvedValue(null)
    // Linha ainda em `processando`: a outra entrega está com ela.
    const { supabase, calls } = fakeSupabase({ phone: '5511988888888', status: 'processando', text: null })
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
      phone: '5511988888888',
      whatsapp_lid: 'BR.1892507442136090',
      status: 'concluido',
      text: '[áudio transcrito] quero duas cocas',
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
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', error: 'tamanho' }))
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
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', error: 'tamanho' }))
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
      error: expect.stringContaining('500') as unknown as string,
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
      phone: '5511988888888',
      status: 'falhou',
      text: '[áudio transcrito] quero duas cocas',
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
    const { supabase } = fakeSupabase({ phone: '5511988888888', status: 'falhou', text: null })
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

    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', error: 'vazio' }))
    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: 'BR.1892507442136090' }, MEDIA_FAILED_TEXT)
    expect(appendToBurstBuffer).not.toHaveBeenCalled()
  })

  it('sem chave da OpenAI responde e marca falhou, sem chamar a OpenAI', async () => {
    // O gate de chave roda DEPOIS do download desde a migration 114: anexar
    // arte (documento sempre, imagem com pendência) precisa dos bytes e nunca
    // usa a OpenAI, então antecipá-lo quebraria aquele caminho. O que o gate
    // protege é a chamada ao modelo — é isso que este teste fixa.
    claimMedia.mockResolvedValue(claimedAudio)
    const { supabase, calls } = fakeSupabase()
    const { deps: d } = deps(supabase, null)

    await processInboundMedia(d, { wamid: 'wamid.AUDIO1' })

    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(describeImage).not.toHaveBeenCalled()
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'falhou', error: 'sem_chave_openai' }))
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

    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', error: 'vazio' }))
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

describe('migration 114 — arte de produto (documento/anexo e foto) anexada automaticamente', () => {
  const cartItemPendenteArte = {
    id: 'cart-item-camiseta',
    product_id: 'produto-camiseta',
    quantity: 1,
    target_date: null,
    note: null,
    delivery_mode: null,
    address_id: null,
    products: {
      name: 'Camiseta Personalizada',
      sale_price: 60,
      promo_price: null,
      available: true,
      requirements: { requires_date: false },
    },
  }

  const grupoArtePdf = {
    id: 'grupo-arte',
    product_id: 'produto-camiseta',
    name: 'Arte da estampa',
    required: true,
    accepted_file_types: ['application/pdf'],
    max_file_size_mb: 10,
    product_option_item: [{ id: 'item-arte-ancora', price_delta: 0 }],
  }

  it('documento PDF aceito pelo grupo upload_arquivo pendente: anexa direto ao carrinho, nunca chama visão/transcrição', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, wamid: 'wamid.DOC1', tipo: 'document', mimeType: 'application/pdf' })
    getMediaMetadata.mockResolvedValue({ url: 'https://files.provedor.com.br/arte.pdf', mimeType: 'application/pdf', sizeBytes: 50_000 })
    downloadMedia.mockResolvedValue({ ok: true, bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf' })

    const { supabase, calls } = fakeSupabase(undefined, {
      cartItems: [cartItemPendenteArte],
      opcaoGrupos: [grupoArtePdf],
    })
    const { deps: d, turnQueue } = deps(supabase, null) // sem chave OpenAI — anexar arte NUNCA deveria precisar dela

    await processInboundMedia(d, { wamid: 'wamid.DOC1', filename: 'logo-final.pdf' })

    expect(uploadFile).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      mimeType: 'application/pdf',
      keyPrefix: 'artes-clientes',
      fileName: 'logo-final.pdf',
    }))
    expect(calls.inserts).toContainEqual(expect.objectContaining({
      table: 'cart_item_options',
      cart_item_id: 'cart-item-camiseta',
      option_item_id: 'item-arte-ancora',
      file_url: 'https://cdn.example.com/artes-clientes/arte.pdf',
      original_file_name: 'logo-final.pdf',
    }))
    expect(describeImage).not.toHaveBeenCalled()
    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(calls.updates).toContainEqual(expect.objectContaining({ table: 'whatsapp_media', status: 'concluido' }))
    expect(turnQueue.send).toHaveBeenCalled()
  })

  it('documento sem NENHUMA pendência de arte no carrinho: recusa educadamente — nunca existiu fluxo genérico de documento', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, wamid: 'wamid.DOC2', tipo: 'document', mimeType: 'application/pdf' })
    getMediaMetadata.mockResolvedValue({ url: 'https://files.provedor.com.br/algo.pdf', mimeType: 'application/pdf', sizeBytes: 50_000 })
    downloadMedia.mockResolvedValue({ ok: true, bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf' })

    const { supabase, calls } = fakeSupabase() // carrinho vazio (default) — sem pendência
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.DOC2' })

    expect(describeImage).not.toHaveBeenCalled()
    expect(uploadFile).not.toHaveBeenCalled()
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', error: 'tipo_nao_suportado' }))
  })

  it('cliente manda FOTO mas o grupo pendente exige documento (PDF): recusa pedindo documento — nunca aceita foto como substituto (WhatsApp comprime foto)', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, wamid: 'wamid.IMG2', tipo: 'image', mimeType: 'image/jpeg' })
    getMediaMetadata.mockResolvedValue({ url: 'https://files.provedor.com.br/foto.jpg', mimeType: 'image/jpeg', sizeBytes: 50_000 })
    downloadMedia.mockResolvedValue({ ok: true, bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg' })

    const { supabase, calls } = fakeSupabase(undefined, {
      cartItems: [cartItemPendenteArte],
      opcaoGrupos: [grupoArtePdf],
    })
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.IMG2' })

    expect(describeImage).not.toHaveBeenCalled()
    expect(uploadFile).not.toHaveBeenCalled()
    expect(calls.inserts.find((i) => i.table === 'cart_item_options')).toBeUndefined()
    expect(calls.updates).toContainEqual(expect.objectContaining({ status: 'recusado', error: 'precisa_documento' }))
  })

  it('imagem comum SEM pendência de arte: cai no fluxo antigo de describeImage, comportamento inalterado', async () => {
    claimMedia.mockResolvedValue({ ...claimedAudio, wamid: 'wamid.IMG3', tipo: 'image', mimeType: 'image/jpeg' })
    getMediaMetadata.mockResolvedValue({ url: 'https://files.provedor.com.br/foto.jpg', mimeType: 'image/jpeg', sizeBytes: 50_000 })
    downloadMedia.mockResolvedValue({ ok: true, bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg' })
    describeImage.mockResolvedValue({
      ok: true,
      texto: '[imagem: duas garrafas de coca 2L]',
      usage: null,
      modelo: 'gpt-4o-mini',
      duracaoMs: 900,
      tamanhoBytes: 3,
    })

    const { supabase } = fakeSupabase() // carrinho vazio — sem pendência
    const { deps: d } = deps(supabase)

    await processInboundMedia(d, { wamid: 'wamid.IMG3' })

    expect(uploadFile).not.toHaveBeenCalled()
    expect(describeImage).toHaveBeenCalled()
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

import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { HUMAN_REPLY_PREFIX } from '../agent/systemPrompt'
import { handleEchoEvent } from './handleEchoEvent'
import type { ParsedInboundEcho } from './parseInboundPayload'

const { findOrCreateCustomer, hasRecentCustomerMessage, pauseCustomer } = vi.hoisted(() => ({
  findOrCreateCustomer: vi.fn(async () => ({
    id: 'cliente-1', nome: 'Cliente', telefoneWhatsapp: '5511940204449', whatsappLid: null, isNew: false,
  })),
  hasRecentCustomerMessage: vi.fn(async () => true),
  pauseCustomer: vi.fn(async () => {}),
}))

vi.mock('../customers/findOrCreateCustomer', () => ({ findOrCreateCustomer }))
vi.mock('./pauseState', () => ({ hasRecentCustomerMessage, pauseCustomer }))

function echo(overrides: Partial<ParsedInboundEcho> = {}): ParsedInboundEcho {
  return {
    telefone: '5511940204449',
    wamid: 'wamid.ECHO1',
    timestamp: '1785368649',
    tipo: 'text',
    userId: 'BR.1892507442136090',
    phoneNumberId: '1129099030297574',
    texto: 'Teste de resposta',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  findOrCreateCustomer.mockResolvedValue({
    id: 'cliente-1', nome: 'Cliente', telefoneWhatsapp: '5511940204449', whatsappLid: null, isNew: false,
  })
  hasRecentCustomerMessage.mockResolvedValue(true)
})

function fakeSupabase() {
  const insert = vi.fn(async () => ({ error: null }))
  const supabase = { from: () => ({ insert }) } as unknown as SupabaseClient<Database>
  return { supabase, insert }
}

describe('handleEchoEvent — item (c2)(f)(g) da §0.5.2', () => {
  it('grava a fala do humano no histórico, marcada e projetada como assistant (§0.5.3)', async () => {
    const { supabase, insert } = fakeSupabase()

    await handleEchoEvent({ supabase, pausaConfig: { minutos: 15, ativo: true } }, echo())

    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, {
      whatsapp: '5511940204449',
      lid: 'BR.1892507442136090',
    })
    expect(insert).toHaveBeenCalledWith({
      cliente_id: 'cliente-1',
      role: 'assistant',
      content: `${HUMAN_REPLY_PREFIX} Teste de resposta`,
    })
  })

  it('janela de 24h aberta (loja respondendo): pausa com o motivo resposta_humana', async () => {
    const { supabase } = fakeSupabase()

    await handleEchoEvent({ supabase, pausaConfig: { minutos: 20, ativo: true } }, echo())

    expect(hasRecentCustomerMessage).toHaveBeenCalledWith(supabase, 'cliente-1')
    expect(pauseCustomer).toHaveBeenCalledWith(supabase, 'cliente-1', 20, 'resposta_humana')
  })

  it('janela fechada (disparo/campanha): grava mas NÃO pausa (item c2)', async () => {
    hasRecentCustomerMessage.mockResolvedValueOnce(false)
    const { supabase, insert } = fakeSupabase()

    await handleEchoEvent({ supabase, pausaConfig: { minutos: 15, ativo: true } }, echo())

    expect(insert).toHaveBeenCalled()
    expect(pauseCustomer).not.toHaveBeenCalled()
  })

  it('toggle desligado: grava mas nunca pausa, nem consulta a janela', async () => {
    const { supabase, insert } = fakeSupabase()

    await handleEchoEvent({ supabase, pausaConfig: { minutos: 15, ativo: false } }, echo())

    expect(insert).toHaveBeenCalled()
    expect(hasRecentCustomerMessage).not.toHaveBeenCalled()
    expect(pauseCustomer).not.toHaveBeenCalled()
  })

  it('echo sem texto (tipo != text): grava um marcador com o tipo, nunca conteúdo vazio', async () => {
    const { supabase, insert } = fakeSupabase()

    await handleEchoEvent(
      { supabase, pausaConfig: { minutos: 15, ativo: true } },
      echo({ tipo: 'image', texto: null }),
    )

    expect(insert).toHaveBeenCalledWith({
      cliente_id: 'cliente-1',
      role: 'assistant',
      content: `${HUMAN_REPLY_PREFIX} [image]`,
    })
  })

  it('falha ao gravar no histórico não lança — best-effort, mesmo padrão de telemetria do repositório', async () => {
    const insert = vi.fn(async () => ({ error: { message: 'connection reset' } }))
    const supabase = { from: () => ({ insert }) } as unknown as SupabaseClient<Database>

    await expect(
      handleEchoEvent({ supabase, pausaConfig: { minutos: 15, ativo: true } }, echo()),
    ).resolves.toBeUndefined()
  })

  it('resolve o cliente só por lid quando o echo não trouxe to_user_id', async () => {
    const { supabase } = fakeSupabase()

    await handleEchoEvent(
      { supabase, pausaConfig: { minutos: 15, ativo: true } },
      echo({ userId: null }),
    )

    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, { whatsapp: '5511940204449' })
  })
})

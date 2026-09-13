import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { HUMAN_REPLY_PREFIX } from '#shared/constants/whatsapp'
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

/** Por padrão, nenhuma linha com o mesmo `wamid` já existe (G6, dedupe do echo). */
function fakeSupabase(options: { wamidJaExistente?: boolean } = {}) {
  const insert = vi.fn((row: { customer_id: string, role: string, content: string, actor: string }) => ({
    select: () => ({
      single: async () => ({
        data: { id: 'msg-1', customer_id: row.customer_id, role: row.role, content: row.content, created_at: '2026-08-17T10:00:00.000Z', seq: 1 },
        error: null,
      }),
    }),
  }))
  const select = vi.fn(() => ({
    eq: () => ({
      maybeSingle: async () => ({
        data: options.wamidJaExistente ? { id: 'msg-do-painel' } : null,
        error: null,
      }),
    }),
  }))
  const supabase = { from: () => ({ select, insert }) } as unknown as SupabaseClient<Database>
  return { supabase, insert, select }
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
      customer_id: 'cliente-1',
      role: 'assistant',
      content: `${HUMAN_REPLY_PREFIX} Teste de resposta`,
      actor: 'humano_celular',
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
      customer_id: 'cliente-1',
      role: 'assistant',
      content: `${HUMAN_REPLY_PREFIX} [image]`,
      actor: 'humano_celular',
    })
  })

  it('falha ao gravar no histórico não lança — best-effort, mesmo padrão de telemetria do repositório', async () => {
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: null, error: { message: 'connection reset' } }),
      }),
    }))
    const select = vi.fn(() => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }))
    const supabase = { from: () => ({ select, insert }) } as unknown as SupabaseClient<Database>

    await expect(
      handleEchoEvent({ supabase, pausaConfig: { minutos: 15, ativo: true } }, echo()),
    ).resolves.toBeUndefined()
  })

  it('descarta o echo quando o wamid já foi gravado pelo painel (G6, dedupe) — não insere, não pausa', async () => {
    const { supabase, insert, select } = fakeSupabase({ wamidJaExistente: true })

    await handleEchoEvent({ supabase, pausaConfig: { minutos: 15, ativo: true } }, echo())

    expect(select).toHaveBeenCalled()
    expect(findOrCreateCustomer).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(pauseCustomer).not.toHaveBeenCalled()
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

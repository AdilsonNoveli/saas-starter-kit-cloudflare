import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { gateInboundTurn } from './pauseGate'

const { findOrCreateCustomer, isCustomerPaused, pauseCustomer, resolvePausaConfig } = vi.hoisted(() => ({
  findOrCreateCustomer: vi.fn(async () => ({
    id: 'cliente-1', nome: 'Cliente', telefoneWhatsapp: '5511988888888', whatsappLid: null, isNew: false,
  })),
  isCustomerPaused: vi.fn(async () => false),
  pauseCustomer: vi.fn(async () => {}),
  resolvePausaConfig: vi.fn(async () => ({ minutos: 15, ativo: true })),
}))

vi.mock('../customers/findOrCreateCustomer', () => ({ findOrCreateCustomer }))
vi.mock('./pauseState', () => ({ isCustomerPaused, pauseCustomer }))
vi.mock('./resolvePausaConfig', () => ({ resolvePausaConfig }))

beforeEach(() => {
  vi.clearAllMocks()
  findOrCreateCustomer.mockResolvedValue({
    id: 'cliente-1', nome: 'Cliente', telefoneWhatsapp: '5511988888888', whatsappLid: null, isNew: false,
  })
  isCustomerPaused.mockResolvedValue(false)
  resolvePausaConfig.mockResolvedValue({ minutos: 15, ativo: true })
})

function fakeSupabase() {
  const insert = vi.fn((row: { customer_id: string, role: string, content: string, actor: string }) => ({
    select: () => ({
      single: async () => ({
        data: { id: 'msg-1', customer_id: row.customer_id, role: row.role, content: row.content, created_at: '2026-08-17T10:00:00.000Z', seq: 1 },
        error: null,
      }),
    }),
  }))
  const supabase = { from: () => ({ insert }) } as unknown as SupabaseClient<Database>
  return { supabase, insert }
}

describe('gateInboundTurn — item (d)/(e) da §0.5.2', () => {
  it('não pausado, sem léxico de transbordo: resolve o cliente, não grava nada aqui — quem grava é saveConversationTurn no consumer', async () => {
    const { supabase, insert } = fakeSupabase()

    const gate = await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'quero uma coca')

    expect(gate).toEqual({ clienteId: 'cliente-1', pausado: false, escalatedNow: false })
    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, { whatsapp: '5511988888888' })
    expect(insert).not.toHaveBeenCalled()
    expect(resolvePausaConfig).not.toHaveBeenCalled()
  })

  it('já pausado: grava a fala do cliente como user e sinaliza para não enfileirar', async () => {
    isCustomerPaused.mockResolvedValueOnce(true)
    const { supabase, insert } = fakeSupabase()

    const gate = await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'ainda esta ai?')

    expect(gate.pausado).toBe(true)
    expect(gate.escalatedNow).toBe(false)
    expect(insert).toHaveBeenCalledWith({ customer_id: 'cliente-1', role: 'user', content: 'ainda esta ai?', actor: 'cliente' })
  })

  it('já pausado: não consulta o léxico de transbordo nem a config — a pausa existente já basta', async () => {
    isCustomerPaused.mockResolvedValueOnce(true)
    const { supabase } = fakeSupabase()

    await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'vou no procon reclamar')

    expect(resolvePausaConfig).not.toHaveBeenCalled()
    expect(pauseCustomer).not.toHaveBeenCalled()
  })

  it('resolve por lid quando telefone é null (turno iniciado por mídia lid-only)', async () => {
    const { supabase } = fakeSupabase()

    await gateInboundTurn(supabase, { telefone: null, lid: 'BR.123' }, 'texto')

    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, { lid: 'BR.123' })
  })

  it('repassa o pushname (profile.name do payload) para o backfill do nome real', async () => {
    const { supabase } = fakeSupabase()

    await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'oi', 'Maria Eduarda')

    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, { whatsapp: '5511988888888', nome: 'Maria Eduarda' })
  })

  it('sem pushname (mensagem sem profile.name, ou mídia sem ele), não manda a chave nome', async () => {
    const { supabase } = fakeSupabase()

    await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'oi', null)

    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, { whatsapp: '5511988888888' })
  })

  it('falha ao gravar durante a pausa não lança — best-effort, mesmo padrão de telemetria do repositório', async () => {
    isCustomerPaused.mockResolvedValueOnce(true)
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: null, error: { message: 'connection reset' } }),
      }),
    }))
    const supabase = { from: () => ({ insert }) } as unknown as SupabaseClient<Database>

    await expect(gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'oi')).resolves.toEqual({
      clienteId: 'cliente-1',
      pausado: true,
      escalatedNow: false,
    })
  })
})

describe('gateInboundTurn — item 4 da §7.6, léxico de transbordo', () => {
  it('mensagem com termo do léxico e toggle ativo: pausa com motivo transbordo e grava a fala', async () => {
    const { supabase, insert } = fakeSupabase()

    const gate = await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'quero cancelar meu pedido')

    expect(gate.pausado).toBe(true)
    expect(gate.escalatedNow).toBe(true)
    expect(pauseCustomer).toHaveBeenCalledWith(supabase, 'cliente-1', 15, 'transbordo')
    expect(insert).toHaveBeenCalledWith({ customer_id: 'cliente-1', role: 'user', content: 'quero cancelar meu pedido', actor: 'cliente' })
  })

  it('pedido explícito de atendimento humano também escala (não só o léxico de fúria original)', async () => {
    const { supabase } = fakeSupabase()

    const gate = await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'quero falar com um humano')

    expect(gate.pausado).toBe(true)
    expect(gate.escalatedNow).toBe(true)
    expect(pauseCustomer).toHaveBeenCalledWith(supabase, 'cliente-1', 15, 'transbordo')
  })

  it('acento não impede o match ("robô" bate no termo sem acento "robo")', async () => {
    const { supabase } = fakeSupabase()

    const gate = await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'você é um robô?')

    expect(gate.escalatedNow).toBe(true)
  })

  it('mensagem com termo do léxico mas toggle desligado: NÃO pausa, segue fluxo normal', async () => {
    resolvePausaConfig.mockResolvedValueOnce({ minutos: 15, ativo: false })
    const { supabase, insert } = fakeSupabase()

    const gate = await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'vou no procon')

    expect(gate.pausado).toBe(false)
    expect(pauseCustomer).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('mensagem sem termo do léxico: nem consulta a config de pausa (custo zero no caminho comum)', async () => {
    const { supabase } = fakeSupabase()

    await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'quero duas pizzas')

    expect(resolvePausaConfig).not.toHaveBeenCalled()
    expect(pauseCustomer).not.toHaveBeenCalled()
  })

  it('usa os minutos configurados na loja, não um valor fixo', async () => {
    resolvePausaConfig.mockResolvedValueOnce({ minutos: 45, ativo: true })
    const { supabase } = fakeSupabase()

    await gateInboundTurn(supabase, { telefone: '5511988888888', lid: null }, 'já chamei meu advogado')

    expect(pauseCustomer).toHaveBeenCalledWith(supabase, 'cliente-1', 45, 'transbordo')
  })
})

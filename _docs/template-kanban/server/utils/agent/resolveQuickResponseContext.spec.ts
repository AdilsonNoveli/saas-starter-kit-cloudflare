import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { resolveQuickResponseContext } from './resolveQuickResponseContext'

interface FakeSupabaseOptions {
  clienteByLid?: { id: string, status: string | null } | null
  clienteByPhone?: { id: string, status: string | null } | null
  messageCount?: number | null
  messageError?: boolean
}

function fakeSupabase(options: FakeSupabaseOptions = {}) {
  const eqCalls: Array<{ table: string, column: string, value: string }> = []

  const from = vi.fn((table: string) => {
    if (table === 'customers') {
      return {
        select: () => ({
          eq: (column: string, value: string) => {
            eqCalls.push({ table, column, value })
            const result = column === 'whatsapp_lid' ? options.clienteByLid : options.clienteByPhone
            return { maybeSingle: async () => ({ data: result ?? null, error: null }) }
          },
        }),
      }
    }
    if (table === 'whatsapp_conversations') {
      return {
        select: () => ({
          eq: (column: string, value: string) => {
            eqCalls.push({ table, column, value })
            return Promise.resolve({
              count: options.messageError ? null : (options.messageCount ?? 0),
              error: options.messageError ? { message: 'connection reset' } : null,
            })
          },
        }),
      }
    }
    throw new Error(`tabela inesperada no teste: ${table}`)
  })

  const supabase = { from } as unknown as SupabaseClient<Database>
  return { supabase, eqCalls, from }
}

describe('resolveQuickResponseContext', () => {
  it('nenhuma necessidade: não consulta nada, devolve tudo null', async () => {
    const { supabase, from } = fakeSupabase()

    const result = await resolveQuickResponseContext(
      supabase,
      { phone: '5511988888888', lid: 'BR.123' },
      { needStatus: false, needFirstMessage: false },
    )

    expect(result).toEqual({ status: null, isFirstMessage: null })
    expect(from).not.toHaveBeenCalled()
  })

  it('resolve por lid quando disponível, sem consultar telefone', async () => {
    const { supabase, eqCalls } = fakeSupabase({ clienteByLid: { id: 'cliente-1', status: 'VIP' } })

    const result = await resolveQuickResponseContext(
      supabase,
      { phone: '5511988888888', lid: 'BR.123' },
      { needStatus: true, needFirstMessage: false },
    )

    expect(result.status).toBe('VIP')
    expect(eqCalls).toEqual([{ table: 'customers', column: 'whatsapp_lid', value: 'BR.123' }])
  })

  it('sem lid, resolve por telefone', async () => {
    const { supabase, eqCalls } = fakeSupabase({ clienteByPhone: { id: 'cliente-1', status: 'Novo' } })

    const result = await resolveQuickResponseContext(
      supabase,
      { phone: '5511988888888', lid: null },
      { needStatus: true, needFirstMessage: false },
    )

    expect(result.status).toBe('Novo')
    expect(eqCalls).toEqual([{ table: 'customers', column: 'whatsapp_phone', value: '5511988888888' }])
  })

  it('cliente não encontrado: devolve status/isFirstMessage null, sem lançar', async () => {
    const { supabase } = fakeSupabase({ clienteByLid: null, clienteByPhone: null })

    const result = await resolveQuickResponseContext(
      supabase,
      { phone: '5511988888888', lid: 'BR.123' },
      { needStatus: true, needFirstMessage: true },
    )

    expect(result).toEqual({ status: null, isFirstMessage: null })
  })

  it('só dispara o EXISTS de primeira mensagem quando needFirstMessage é true', async () => {
    const { supabase, from } = fakeSupabase({ clienteByLid: { id: 'cliente-1', status: 'Novo' } })

    await resolveQuickResponseContext(
      supabase,
      { phone: '5511988888888', lid: 'BR.123' },
      { needStatus: true, needFirstMessage: false },
    )

    expect(from).not.toHaveBeenCalledWith('whatsapp_conversations')
  })

  it('isFirstMessage true quando não há nenhuma mensagem prévia', async () => {
    const { supabase } = fakeSupabase({ clienteByLid: { id: 'cliente-1', status: null }, messageCount: 0 })

    const result = await resolveQuickResponseContext(
      supabase,
      { phone: null, lid: 'BR.123' },
      { needStatus: false, needFirstMessage: true },
    )

    expect(result.isFirstMessage).toBe(true)
  })

  it('isFirstMessage false quando já existe mensagem prévia', async () => {
    const { supabase } = fakeSupabase({ clienteByLid: { id: 'cliente-1', status: null }, messageCount: 3 })

    const result = await resolveQuickResponseContext(
      supabase,
      { phone: null, lid: 'BR.123' },
      { needStatus: false, needFirstMessage: true },
    )

    expect(result.isFirstMessage).toBe(false)
  })

  it('erro ao consultar mensagens não lança — devolve isFirstMessage=false (nunca dispara a regra por engano)', async () => {
    const { supabase } = fakeSupabase({ clienteByLid: { id: 'cliente-1', status: null }, messageError: true })

    const result = await resolveQuickResponseContext(
      supabase,
      { phone: null, lid: 'BR.123' },
      { needStatus: false, needFirstMessage: true },
    )

    expect(result.isFirstMessage).toBe(false)
  })
})

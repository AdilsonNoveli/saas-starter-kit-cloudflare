import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { hasRecentCustomerMessage, isCustomerPaused, pauseCustomer } from './pauseState'

describe('isCustomerPaused — item (d)/(g) da §0.5.2', () => {
  it('paused_until no futuro: pausado, sem tocar a linha', async () => {
    const update = vi.fn()
    const futuro = new Date(Date.now() + 60_000).toISOString()
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { paused_until: futuro }, error: null }) }) }),
        update,
      }),
    } as unknown as SupabaseClient<Database>

    await expect(isCustomerPaused(supabase, 'cliente-1')).resolves.toBe(true)
    expect(update).not.toHaveBeenCalled()
  })

  it('paused_until no passado: expira (limpa a linha) e devolve não-pausado — sem cron (§0.5.1b)', async () => {
    const passado = new Date(Date.now() - 60_000).toISOString()
    const lte = vi.fn(async () => ({ error: null }))
    const eqUpdate = vi.fn(() => ({ lte }))
    const update = vi.fn(() => ({ eq: eqUpdate }))
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { paused_until: passado }, error: null }) }) }),
        update,
      }),
    } as unknown as SupabaseClient<Database>

    await expect(isCustomerPaused(supabase, 'cliente-1')).resolves.toBe(false)
    expect(update).toHaveBeenCalledWith({ paused_until: null, pause_reason: null })
    expect(eqUpdate).toHaveBeenCalledWith('id', 'cliente-1')
    expect(lte).toHaveBeenCalledWith('paused_until', expect.any(String))
  })

  it('sem paused_until (null): não pausado, sem UPDATE', async () => {
    const update = vi.fn()
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { paused_until: null }, error: null }) }) }),
        update,
      }),
    } as unknown as SupabaseClient<Database>

    await expect(isCustomerPaused(supabase, 'cliente-1')).resolves.toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('falha de leitura: não pausado — proteção de UX, não porta de atendimento', async () => {
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'timeout' } }) }) }),
      }),
    } as unknown as SupabaseClient<Database>

    await expect(isCustomerPaused(supabase, 'cliente-1')).resolves.toBe(false)
  })
})

describe('pauseCustomer — item (g): janela deslizante, sempre now() + minutos', () => {
  it('grava paused_until no futuro e o motivo informado', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn((_patch: { paused_until: string, pause_reason: string }) => ({ eq }))
    const supabase = { from: () => ({ update }) } as unknown as SupabaseClient<Database>

    const antes = Date.now()
    await pauseCustomer(supabase, 'cliente-1', 15, 'resposta_humana')

    expect(update).toHaveBeenCalledTimes(1)
    const patch = update.mock.calls[0]![0]
    expect(patch.pause_reason).toBe('resposta_humana')
    expect(new Date(patch.paused_until).getTime()).toBeGreaterThanOrEqual(antes + 15 * 60_000)
    expect(eq).toHaveBeenCalledWith('id', 'cliente-1')
  })
})

describe('hasRecentCustomerMessage — discriminador da §0.5.1b (janela de 24h)', () => {
  function fakeSupabase(count: number | null, error: { message: string } | null = null) {
    const gte = vi.fn(async () => ({ count, error }))
    const eqRole = vi.fn(() => ({ gte }))
    const eqCliente = vi.fn(() => ({ eq: eqRole }))
    const select = vi.fn(() => ({ eq: eqCliente }))
    const supabase = { from: () => ({ select }) } as unknown as SupabaseClient<Database>
    return { supabase, select, eqCliente, eqRole, gte }
  }

  it('há mensagem do cliente na janela: janela aberta', async () => {
    const { supabase } = fakeSupabase(3)
    await expect(hasRecentCustomerMessage(supabase, 'cliente-1')).resolves.toBe(true)
  })

  it('nenhuma mensagem na janela (disparo/campanha): janela fechada', async () => {
    const { supabase } = fakeSupabase(0)
    await expect(hasRecentCustomerMessage(supabase, 'cliente-1')).resolves.toBe(false)
  })

  it('filtra por role=user e por customer_id — nunca conta fala do agente', async () => {
    const { supabase, select, eqCliente, eqRole } = fakeSupabase(1)
    await hasRecentCustomerMessage(supabase, 'cliente-1')

    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(eqCliente).toHaveBeenCalledWith('customer_id', 'cliente-1')
    expect(eqRole).toHaveBeenCalledWith('role', 'user')
  })

  it('falha de leitura: janela fechada, nunca pausa por engano', async () => {
    const { supabase } = fakeSupabase(null, { message: 'timeout' })
    await expect(hasRecentCustomerMessage(supabase, 'cliente-1')).resolves.toBe(false)
  })
})

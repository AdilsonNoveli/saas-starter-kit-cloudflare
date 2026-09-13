import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import {
  createQuickResponse,
  deleteQuickResponse,
  listQuickResponses,
  reorderQuickResponses,
  updateQuickResponse,
} from './quickResponseService'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    name: 'Regra de teste',
    trigger_type: 'greeting',
    keywords: null,
    customer_statuses: null,
    reply_text: 'Oi!',
    active: true,
    sort_order: 0,
    trigger_count: 0,
    created_at: '2026-08-18T00:00:00.000Z',
    updated_at: '2026-08-18T00:00:00.000Z',
    ...overrides,
  }
}

describe('listQuickResponses', () => {
  it('mapeia as linhas para o formato camelCase, ordenadas por sortOrder', async () => {
    const order = vi.fn().mockResolvedValue({ data: [row()], error: null })
    const supabase = { from: () => ({ select: () => ({ order }) }) } as unknown as SupabaseClient<Database>

    const result = await listQuickResponses(supabase)

    expect(order).toHaveBeenCalledWith('sort_order', { ascending: true })
    expect(result).toEqual([{
      id: 'rule-1',
      name: 'Regra de teste',
      triggerType: 'greeting',
      keywords: null,
      customerStatuses: null,
      replyText: 'Oi!',
      active: true,
      sortOrder: 0,
      triggerCount: 0,
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    }])
  })

  it('erro do supabase vira 500, nunca lista parcial', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection reset' } })
    const supabase = { from: () => ({ select: () => ({ order }) }) } as unknown as SupabaseClient<Database>

    await expect(listQuickResponses(supabase)).rejects.toMatchObject({ statusCode: 500 })
  })
})

describe('createQuickResponse', () => {
  it('grava os campos convertidos para snake_case e devolve o formato camelCase', async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({ single: async () => ({ data: row({ id: 'new-rule' }), error: null }) }),
    })
    const supabase = { from: () => ({ insert }) } as unknown as SupabaseClient<Database>

    const result = await createQuickResponse(supabase, {
      name: 'Regra de teste',
      triggerType: 'greeting',
      replyText: 'Oi!',
      sortOrder: 0,
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Regra de teste',
      trigger_type: 'greeting',
      reply_text: 'Oi!',
      active: true,
      sort_order: 0,
    }))
    expect(result.id).toBe('new-rule')
  })
})

describe('updateQuickResponse', () => {
  it('só inclui no patch os campos enviados', async () => {
    const update = vi.fn().mockReturnValue({
      eq: () => ({ select: () => ({ single: async () => ({ data: row({ active: false }), error: null }) }) }),
    })
    const supabase = { from: () => ({ update }) } as unknown as SupabaseClient<Database>

    await updateQuickResponse(supabase, 'rule-1', { active: false })

    expect(update).toHaveBeenCalledWith({ active: false })
  })

  it('regra não encontrada vira 404', async () => {
    const update = vi.fn().mockReturnValue({
      eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'not found' } }) }) }),
    })
    const supabase = { from: () => ({ update }) } as unknown as SupabaseClient<Database>

    await expect(updateQuickResponse(supabase, 'missing', { active: false })).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('deleteQuickResponse', () => {
  it('exclui pelo id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const supabase = { from: () => ({ delete: () => ({ eq }) }) } as unknown as SupabaseClient<Database>

    await deleteQuickResponse(supabase, 'rule-1')

    expect(eq).toHaveBeenCalledWith('id', 'rule-1')
  })

  it('erro do supabase vira 500', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'connection reset' } })
    const supabase = { from: () => ({ delete: () => ({ eq }) }) } as unknown as SupabaseClient<Database>

    await expect(deleteQuickResponse(supabase, 'rule-1')).rejects.toMatchObject({ statusCode: 500 })
  })
})

describe('reorderQuickResponses', () => {
  it('atualiza sort_order sequencialmente, um UPDATE por item', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    const supabase = { from: () => ({ update }) } as unknown as SupabaseClient<Database>

    await reorderQuickResponses(supabase, { items: [{ id: 'a', sortOrder: 0 }, { id: 'b', sortOrder: 1 }] })

    expect(update).toHaveBeenNthCalledWith(1, { sort_order: 0 })
    expect(eq).toHaveBeenNthCalledWith(1, 'id', 'a')
    expect(update).toHaveBeenNthCalledWith(2, { sort_order: 1 })
    expect(eq).toHaveBeenNthCalledWith(2, 'id', 'b')
  })

  it('falha num item lança 500 e para (itens já atualizados ficam, resolvível reordenando de novo)', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'connection reset' } })
    const update = vi.fn().mockReturnValue({ eq })
    const supabase = { from: () => ({ update }) } as unknown as SupabaseClient<Database>

    await expect(reorderQuickResponses(supabase, { items: [{ id: 'a', sortOrder: 0 }] })).rejects.toMatchObject({ statusCode: 500 })
  })
})

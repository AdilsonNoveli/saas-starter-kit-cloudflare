import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { resolveKanbanStageQuickResponse } from './kanbanStageQuickResponse'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    name: 'Confirmado',
    trigger_type: 'kanban_stage',
    keywords: null,
    kanban_stage_key: 'confirmado',
    customer_statuses: null,
    reply_text: 'Seu pedido foi confirmado!',
    active: true,
    sort_order: 0,
    trigger_count: 0,
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
    ...overrides,
  }
}

function fakeSupabase(rows: ReturnType<typeof row>[], error: { message: string } | null = null) {
  const eq3 = vi.fn().mockReturnValue({ order: async () => ({ data: rows, error }) })
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const select = vi.fn().mockReturnValue({ eq: eq1 })
  const from = vi.fn().mockReturnValue({ select })
  const supabase = { from } as unknown as SupabaseClient<Database>
  return { supabase, from, select, eq1, eq2, eq3 }
}

describe('resolveKanbanStageQuickResponse', () => {
  it('resolve a regra que bate com a etapa, filtrando active/trigger_type/kanban_stage_key na query', async () => {
    const { supabase, eq1, eq2, eq3 } = fakeSupabase([row()])

    const result = await resolveKanbanStageQuickResponse(supabase, { kanbanStageKey: 'confirmado', customerStatus: null })

    expect(result?.replyText).toBe('Seu pedido foi confirmado!')
    expect(eq1).toHaveBeenCalledWith('active', true)
    expect(eq2).toHaveBeenCalledWith('trigger_type', 'kanban_stage')
    expect(eq3).toHaveBeenCalledWith('kanban_stage_key', 'confirmado')
  })

  it('respeita customerStatuses — não bate se o status do cliente não estiver na lista', async () => {
    const { supabase } = fakeSupabase([row({ customer_statuses: ['VIP'] })])

    const result = await resolveKanbanStageQuickResponse(supabase, { kanbanStageKey: 'confirmado', customerStatus: 'Novo' })

    expect(result).toBeNull()
  })

  it('bate quando o status do cliente está na lista', async () => {
    const { supabase } = fakeSupabase([row({ customer_statuses: ['VIP'] })])

    const result = await resolveKanbanStageQuickResponse(supabase, { kanbanStageKey: 'confirmado', customerStatus: 'VIP' })

    expect(result).not.toBeNull()
  })

  it('nenhuma linha devolvida → null', async () => {
    const { supabase } = fakeSupabase([])

    const result = await resolveKanbanStageQuickResponse(supabase, { kanbanStageKey: 'confirmado', customerStatus: null })

    expect(result).toBeNull()
  })

  it('erro do supabase não lança — devolve null (best-effort)', async () => {
    const { supabase } = fakeSupabase([], { message: 'connection reset' })

    await expect(resolveKanbanStageQuickResponse(supabase, { kanbanStageKey: 'confirmado', customerStatus: null })).resolves.toBeNull()
  })

  it('exceção lançada pelo client não escapa — devolve null', async () => {
    const supabase = {
      from: () => { throw new Error('client indisponível') },
    } as unknown as SupabaseClient<Database>

    await expect(resolveKanbanStageQuickResponse(supabase, { kanbanStageKey: 'confirmado', customerStatus: null })).resolves.toBeNull()
  })

  it('primeira regra que bate por sort_order vence quando várias respondem pela mesma etapa', async () => {
    const { supabase } = fakeSupabase([
      row({ id: 'first', sort_order: 0, reply_text: 'primeira' }),
      row({ id: 'second', sort_order: 1, reply_text: 'segunda' }),
    ])

    const result = await resolveKanbanStageQuickResponse(supabase, { kanbanStageKey: 'confirmado', customerStatus: null })

    expect(result?.id).toBe('first')
  })
})

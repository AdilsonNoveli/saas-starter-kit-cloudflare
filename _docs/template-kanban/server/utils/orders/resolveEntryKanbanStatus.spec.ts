import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { resolveEntryKanbanStatus } from './resolveEntryKanbanStatus'

function fakeSupabase(row: { key: string } | null, error: { message: string } | null = null) {
  const maybeSingle = async () => ({ data: row, error })
  const limit = () => ({ maybeSingle })
  const eq = () => ({ limit })
  const select = () => ({ eq })
  const supabase = { from: () => ({ select }) } as unknown as SupabaseClient<Database>
  return supabase
}

describe('resolveEntryKanbanStatus', () => {
  it('devolve a key da coluna com is_entry=true', async () => {
    const supabase = fakeSupabase({ key: 'pendente' })
    await expect(resolveEntryKanbanStatus(supabase)).resolves.toBe('pendente')
  })

  it('funciona pra qualquer key configurada — nunca assume o literal "pendente"', async () => {
    const supabase = fakeSupabase({ key: 'novo-personalizado' })
    await expect(resolveEntryKanbanStatus(supabase)).resolves.toBe('novo-personalizado')
  })

  it('nenhuma coluna marcada como entrada (não deveria acontecer, guard garante) — falha alto, nunca undefined silencioso', async () => {
    const supabase = fakeSupabase(null)
    await expect(resolveEntryKanbanStatus(supabase)).rejects.toMatchObject({ statusCode: 500 })
  })

  it('erro de consulta também falha alto', async () => {
    const supabase = fakeSupabase(null, { message: 'connection reset' })
    await expect(resolveEntryKanbanStatus(supabase)).rejects.toMatchObject({ statusCode: 500 })
  })
})

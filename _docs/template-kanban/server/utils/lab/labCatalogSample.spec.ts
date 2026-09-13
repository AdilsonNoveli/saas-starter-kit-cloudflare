import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { fetchLabCatalogSample } from './labCatalogSample'

function fakeSupabase(rows: { name: string }[] | null, error: unknown = null): SupabaseClient<Database> {
  const builder: Record<string, unknown> = {}
  const passthrough = ['select', 'eq', 'order', 'limit']
  for (const method of passthrough) builder[method] = () => builder
  builder.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: rows, error })
  return { from: () => builder } as unknown as SupabaseClient<Database>
}

describe('fetchLabCatalogSample', () => {
  it('devolve os 3 primeiros produtos disponíveis, em ordem', async () => {
    const supabase = fakeSupabase([{ name: 'Alfa' }, { name: 'Beta' }, { name: 'Gama' }])

    const sample = await fetchLabCatalogSample(supabase)

    expect(sample).toEqual({ principal: 'Alfa', secundario: 'Beta', terciario: 'Gama' })
  })

  it('devolve null quando a loja tem menos de 3 produtos disponíveis', async () => {
    const supabase = fakeSupabase([{ name: 'Alfa' }])
    expect(await fetchLabCatalogSample(supabase)).toBeNull()
  })

  it('devolve null em erro de leitura, nunca lança', async () => {
    const supabase = fakeSupabase(null, { message: 'falhou' })
    expect(await fetchLabCatalogSample(supabase)).toBeNull()
  })
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '~/types/database.types'
import { resolvePausaConfig } from './resolvePausaConfig'

function fakeSupabase(options: {
  loja?: { agent_human_pause_minutes: number, agent_human_pause_active: boolean } | null
  error?: string
}) {
  const supabase = {
    from: () => ({
      select: () => ({
        limit: () => ({
          maybeSingle: async () => ({
            data: options.loja === undefined ? null : options.loja,
            error: options.error ? { message: options.error } : null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>
  return { supabase }
}

describe('resolvePausaConfig', () => {
  it('devolve os valores da loja quando a leitura funciona', async () => {
    const { supabase } = fakeSupabase({ loja: { agent_human_pause_minutes: 30, agent_human_pause_active: false } })

    await expect(resolvePausaConfig(supabase)).resolves.toEqual({ minutos: 30, ativo: false })
  })

  it('cai para o default (15 min, ativo) quando a loja não existe', async () => {
    const { supabase } = fakeSupabase({ loja: null })

    await expect(resolvePausaConfig(supabase)).resolves.toEqual({ minutos: 15, ativo: true })
  })

  it('cai para o default quando a leitura falha, sem lançar', async () => {
    const { supabase } = fakeSupabase({ error: 'connection reset' })

    await expect(resolvePausaConfig(supabase)).resolves.toEqual({ minutos: 15, ativo: true })
  })
})

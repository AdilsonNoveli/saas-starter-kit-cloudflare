import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { pruneWebhookOutbox } from './worker'

/**
 * Retenção do outbox (§8.16, defeito 7 — 277 linhas sem nenhuma poda).
 *
 * Os dois casos que importam não são "apaga": são **o que ele se recusa a
 * apagar**. Podar `morto` destruiria a dead-letter que o admin acabou de
 * ganhar, e podar sem `WHERE` seria recusado pelo `pg-safeupdate` (§5,
 * armadilha 2) — ou pior, aceito e catastrófico.
 */

interface FiltrosAplicados {
  eq: Array<[string, unknown]>
  lt: Array<[string, unknown]>
}

function buildSupabase(removidos: Array<{ id: string }> = []) {
  const filtros: FiltrosAplicados = { eq: [], lt: [] }
  const deleteChamado = vi.fn()

  const from = (): unknown => ({
    delete: () => {
      deleteChamado()
      const chain = {
        eq: (coluna: string, valor: unknown) => {
          filtros.eq.push([coluna, valor])
          return chain
        },
        lt: (coluna: string, valor: unknown) => {
          filtros.lt.push([coluna, valor])
          return chain
        },
        select: async () => ({ data: removidos, error: null }),
      }
      return chain
    },
  })

  return { supabase: { from } as unknown as SupabaseClient, filtros, deleteChamado }
}

describe('pruneWebhookOutbox', () => {
  it('apaga somente eventos já entregues', async () => {
    const { supabase, filtros } = buildSupabase()

    await pruneWebhookOutbox(supabase)

    expect(filtros.eq).toContainEqual(['status', 'enviado'])
  })

  it('NUNCA apaga `morto` — é a dead-letter que o admin enxerga', async () => {
    const { supabase, filtros } = buildSupabase()

    await pruneWebhookOutbox(supabase)

    const statusFiltrados = filtros.eq.filter(([coluna]) => coluna === 'status').map(([, valor]) => valor)
    expect(statusFiltrados).toEqual(['enviado'])
    expect(statusFiltrados).not.toContain('morto')
  })

  it('todo DELETE leva WHERE de status E de data (pg-safeupdate)', async () => {
    const { supabase, filtros } = buildSupabase()

    await pruneWebhookOutbox(supabase)

    expect(filtros.eq.length).toBeGreaterThan(0)
    expect(filtros.lt.map(([coluna]) => coluna)).toContain('enviado_em')
  })

  it('usa a janela de retenção pedida para calcular o corte', async () => {
    const { supabase, filtros } = buildSupabase()
    const antes = Date.now()

    await pruneWebhookOutbox(supabase, 7)

    const corte = new Date(filtros.lt[0]?.[1] as string).getTime()
    const esperado = antes - 7 * 24 * 60 * 60 * 1000
    expect(Math.abs(corte - esperado)).toBeLessThan(5_000)
  })

  it('devolve quantas linhas saíram', async () => {
    const { supabase } = buildSupabase([{ id: 'a' }, { id: 'b' }])

    await expect(pruneWebhookOutbox(supabase)).resolves.toEqual({ removidos: 2 })
  })

  it('não derruba a drenagem quando o banco recusa a poda', async () => {
    const supabase = {
      from: () => ({
        delete: () => ({
          eq: () => ({
            lt: () => ({ select: async () => ({ data: null, error: { message: 'boom' } }) }),
          }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(pruneWebhookOutbox(supabase)).resolves.toEqual({ removidos: 0 })
  })
})

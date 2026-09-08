/**
 * Claim atômico do buffer de rajada — o outro lado de `burstBuffer.spec.ts`.
 *
 * Dois contratos aqui: o `DELETE ... WHERE chave AND ultima_msg_id RETURNING`
 * (que é o que garante entrega única do turno — a coluna do filtro mudou na
 * migration 101, a garantia não) e a devolução do identificador estável gravado
 * pelo produtor (migration 100, FASE 0.4 de `_docs/em-andamento.md`). Sem
 * selecionar `whatsapp_lid`, o valor morre no banco e o consumer volta a
 * identificar o cliente só por telefone — sem erro nenhum, que é o modo de
 * falha caro deste projeto.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { claimBurstBuffer } from './claimBurstBuffer'

interface BufferRow {
  chave: string
  telefone: string | null
  textos: unknown
  ultima_msg_id: string
  whatsapp_lid: string | null
}

function fakeSupabase(result: { data?: BufferRow | null, error?: { message: string } }) {
  const calls = { filters: [] as Array<[string, unknown]>, select: '' }
  const chain = {
    delete: () => chain,
    eq: (column: string, value: unknown) => {
      calls.filters.push([column, value])
      return chain
    },
    select: (columns: string) => {
      calls.select = columns
      return chain
    },
    maybeSingle: async () => ({ data: result.data ?? null, error: result.error ?? null }),
  }
  const from = vi.fn(() => chain)
  return { supabase: { from } as unknown as SupabaseClient<Database>, from, calls }
}

const row: BufferRow = {
  chave: '5511940204449',
  telefone: '5511940204449',
  textos: ['oi', 'quero uma coca'],
  ultima_msg_id: 'wamid.ABC',
  whatsapp_lid: 'BR.1892507442136090',
}

describe('claimBurstBuffer', () => {
  it('devolve o lote com o identificador estável e filtra pelas duas colunas do claim', async () => {
    const { supabase, from, calls } = fakeSupabase({ data: row })

    const claimed = await claimBurstBuffer(supabase, '5511940204449', 'wamid.ABC')

    expect(from).toHaveBeenCalledWith('whatsapp_turno_buffer')
    // As DUAS colunas, sempre: só `chave` reprocessaria um lote já superado por
    // mensagem mais nova, e é esse par que garante entrega única.
    expect(calls.filters).toEqual([['chave', '5511940204449'], ['ultima_msg_id', 'wamid.ABC']])
    expect(calls.select).toContain('whatsapp_lid')
    expect(claimed).toEqual({
      chave: '5511940204449',
      telefone: '5511940204449',
      textos: ['oi', 'quero uma coca'],
      ultimaMsgId: 'wamid.ABC',
      lid: 'BR.1892507442136090',
    })
  })

  it('lote sem telefone volta com telefone null e a chave prefixada (item b)', async () => {
    // Cliente identificado só pelo lid: o turno existe e é reivindicável; quem
    // decide que não há caminho de resposta é o consumer.
    const { supabase } = fakeSupabase({
      data: { ...row, chave: 'lid:BR.1892507442136090', telefone: null },
    })

    const claimed = await claimBurstBuffer(supabase, 'lid:BR.1892507442136090', 'wamid.ABC')

    expect(claimed?.telefone).toBeNull()
    expect(claimed?.chave).toBe('lid:BR.1892507442136090')
    expect(claimed?.lid).toBe('BR.1892507442136090')
  })

  it('lote sem identificador devolve lid null, não undefined', async () => {
    // O consumer decide entre passar ou omitir `lid` a partir deste valor;
    // `undefined` vindo do banco esconderia uma coluna esquecida no select.
    const { supabase } = fakeSupabase({ data: { ...row, whatsapp_lid: null } })

    const claimed = await claimBurstBuffer(supabase, '5511940204449', 'wamid.ABC')

    expect(claimed?.lid).toBeNull()
  })

  it('descarta entrada não-string de textos (jsonb é livre)', async () => {
    const { supabase } = fakeSupabase({ data: { ...row, textos: ['oi', 42, null, 'coca'] } })

    expect((await claimBurstBuffer(supabase, '5511940204449', 'wamid.ABC'))?.textos).toEqual(['oi', 'coca'])
  })

  it('claim vazio devolve null — turno superado por mensagem mais nova', async () => {
    const { supabase } = fakeSupabase({ data: null })

    expect(await claimBurstBuffer(supabase, '5511940204449', 'wamid.ABC')).toBeNull()
  })

  it('erro do banco devolve null em vez de lançar — a fila não deve retentar o turno', async () => {
    const { supabase } = fakeSupabase({ error: { message: 'connection reset' } })

    expect(await claimBurstBuffer(supabase, '5511940204449', 'wamid.ABC')).toBeNull()
  })
})

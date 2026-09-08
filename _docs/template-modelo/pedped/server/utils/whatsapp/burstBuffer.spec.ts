/**
 * Contrato de chamada do RPC `whatsapp_buffer_append` (migrations 087 e 100).
 *
 * O que este spec protege é invisível em runtime: se `p_lid` deixar de ser
 * enviado, ou for enviado como `null`, nada falha — o buffer segue funcionando,
 * o turno segue respondendo, e `clientes.whatsapp_lid` simplesmente nunca é
 * gravado. Foi exatamente esse o estado até a FASE 0.4 (a) de
 * `_docs/em-andamento.md`: 4 de 64 clientes com identificador estável.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { appendToBurstBuffer } from './burstBuffer'

function fakeSupabase(options: { error?: string, chave?: string | null } = {}) {
  // Parâmetros tipados de propósito: é `rpc.mock.calls[0][1]` que este spec
  // inspeciona, e sem eles o TypeScript trata a lista de argumentos como vazia.
  const rpc = vi.fn(async (_fn: string, _args: Record<string, unknown>) => ({
    // O RPC devolve a chave do buffer desde a migration 101 — é ela que vira a
    // mensagem da fila e, depois, o filtro do claim.
    data: options.chave === undefined ? '5511940204449' : options.chave,
    error: options.error ? { message: options.error } : null,
  }))
  return { supabase: { rpc } as unknown as SupabaseClient<Database>, rpc }
}

/** Argumentos com que o RPC foi chamado — `{}` se nunca foi. */
function argsOf(rpc: ReturnType<typeof fakeSupabase>['rpc']): Record<string, unknown> {
  return rpc.mock.calls[0]?.[1] ?? {}
}

describe('appendToBurstBuffer', () => {
  it('manda o @lid como p_lid quando o payload o trouxe', async () => {
    const { supabase, rpc } = fakeSupabase()

    await appendToBurstBuffer(supabase, {
      telefone: '5511940204449',
      texto: 'quero uma coca',
      msgId: 'wamid.ABC',
      lid: 'BR.1892507442136090',
    })

    expect(rpc).toHaveBeenCalledWith('whatsapp_buffer_append', {
      p_telefone: '5511940204449',
      p_texto: 'quero uma coca',
      p_msg_id: 'wamid.ABC',
      p_lid: 'BR.1892507442136090',
    })
  })

  it('OMITE p_lid quando não há identificador — nunca envia null', async () => {
    // Enviar `null` explicitamente sobrescreveria o valor já gravado: o
    // `COALESCE` do ON CONFLICT (migration 100) depende do DEFAULT NULL do
    // parâmetro, e é ele que impede o append do consumer de mídia de apagar o
    // lid que a mensagem de texto da mesma rajada gravou.
    const { supabase, rpc } = fakeSupabase()

    await appendToBurstBuffer(supabase, { telefone: '5511940204449', texto: 'oi', msgId: 'wamid.ABC' })

    expect(rpc).toHaveBeenCalledWith('whatsapp_buffer_append', {
      p_telefone: '5511940204449',
      p_texto: 'oi',
      p_msg_id: 'wamid.ABC',
    })
    expect(Object.keys(argsOf(rpc))).not.toContain('p_lid')
  })

  it.each([null, undefined, ''])('lid vazio (%s) também é omitido', async (lid) => {
    const { supabase, rpc } = fakeSupabase()

    await appendToBurstBuffer(supabase, { telefone: '5511940204449', texto: 'oi', msgId: 'wamid.ABC', lid })

    expect(Object.keys(argsOf(rpc))).not.toContain('p_lid')
  })

  it('falha do RPC não é engolida — a mensagem do cliente não pode desaparecer', async () => {
    const { supabase } = fakeSupabase({ error: 'connection reset' })

    await expect(appendToBurstBuffer(supabase, {
      telefone: '5511940204449',
      texto: 'oi',
      msgId: 'wamid.ABC',
    })).rejects.toMatchObject({ statusCode: 500 })
  })

  it('devolve a chave que o RPC derivou, em vez de recalculá-la aqui', async () => {
    // Duas fontes de verdade para a chave do claim é o pior defeito possível
    // deste caminho: divergir não dá erro, só perde o turno em silêncio.
    const { supabase } = fakeSupabase({ chave: '5511940204449' })

    await expect(appendToBurstBuffer(supabase, {
      telefone: '5511940204449',
      texto: 'oi',
      msgId: 'wamid.ABC',
    })).resolves.toBe('5511940204449')
  })

  it('turno sem telefone: manda p_telefone null e recebe a chave prefixada', async () => {
    // Item (b) da FASE 0.4: o buffer aceita cliente identificado só pelo lid.
    // `p_telefone` vai como `null` explícito (não omitido) — o RPC precisa do
    // argumento para decidir a chave, e a ausência dele não tem semântica de
    // "preserva o que já estava", ao contrário de `p_lid`.
    const { supabase, rpc } = fakeSupabase({ chave: 'lid:BR.1892507442136090' })

    const chave = await appendToBurstBuffer(supabase, {
      telefone: null,
      texto: 'oi',
      msgId: 'wamid.ABC',
      lid: 'BR.1892507442136090',
    })

    expect(argsOf(rpc)).toMatchObject({ p_telefone: null, p_lid: 'BR.1892507442136090' })
    expect(chave).toBe('lid:BR.1892507442136090')
  })

  it('RPC sem chave de volta é falha, não sucesso silencioso', async () => {
    // Sem chave não há o que enfileirar: seguir em frente produziria uma
    // mensagem de fila que nenhum claim casa.
    const { supabase } = fakeSupabase({ chave: null })

    await expect(appendToBurstBuffer(supabase, {
      telefone: '5511940204449',
      texto: 'oi',
      msgId: 'wamid.ABC',
    })).rejects.toMatchObject({ statusCode: 500 })
  })
})

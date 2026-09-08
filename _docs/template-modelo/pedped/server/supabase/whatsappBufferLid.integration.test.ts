/**
 * TESTE DE INTEGRAÇÃO — migration 100 (o buffer de rajada carrega o @lid)
 *
 * Roda contra o Supabase REAL, e existe por causa da armadilha nº 1 do handoff:
 * `CREATE FUNCTION` não valida corpo plpgsql, então **migration aplicada ≠ função
 * executável**. A única prova de que `whatsapp_buffer_append` funciona com o
 * quarto parâmetro é executá-la.
 *
 * Execute: `pnpm test:integration`
 *
 * ─── Por que é seguro rodar aqui ──────────────────────────────────────────────
 * `whatsapp_turno_buffer` é tabela transitória por desenho: cada turno apaga a
 * própria linha no claim, e `purge_agent_memory()` limpa o resto. Este teste
 * escreve UMA linha com um telefone sintético (nenhum cliente real, nenhuma
 * mensagem de fila apontando para ele) e a apaga em seguida, sempre com `WHERE`
 * (pg-safeupdate). Nenhum dado de produção é lido, alterado ou apagado.
 *
 * ─── Fica VERMELHO até a migration 100 ser aplicada ──────────────────────────
 * Igual ao teste de regressão da 099: o teste está certo e o banco está
 * desatualizado. Não "conserte" o teste — aplique a migration.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { Database } from '~/types/database.types'

config()

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.NUXT_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/** Telefone sintético fora de qualquer formato E.164 real — não colide com cliente. */
const TELEFONE_TESTE = '000000000000'
const LID_TESTE = 'TEST.integration-buffer-lid'

describe('Integração: migration 100 — whatsapp_turno_buffer.whatsapp_lid', () => {
  let supabase: SupabaseClient<Database>

  beforeAll(async () => {
    expect(SUPABASE_URL, 'NUXT_PUBLIC_SUPABASE_URL ausente no .env').toBeTruthy()
    expect(SERVICE_KEY, 'NUXT_SUPABASE_SECRET_KEY ausente no .env').toBeTruthy()
    supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    await supabase.from('whatsapp_turno_buffer').delete().eq('telefone', TELEFONE_TESTE)
  })

  afterAll(async () => {
    await supabase.from('whatsapp_turno_buffer').delete().eq('telefone', TELEFONE_TESTE)
  })

  it('a coluna existe e o claim consegue selecioná-la', async () => {
    // `select` com a lista explícita: coluna faltando devolve 42703. O
    // TypeScript acredita no `database.types.ts`, que é sincronizado à mão.
    const { error } = await supabase
      .from('whatsapp_turno_buffer')
      .select('chave, telefone, textos, ultima_msg_id, whatsapp_lid')
      .limit(1)

    expect(error, error?.message).toBeNull()
  })

  it('whatsapp_buffer_append grava o lid — o RPC executado, não só aplicado', async () => {
    const { error } = await supabase.rpc('whatsapp_buffer_append', {
      p_telefone: TELEFONE_TESTE,
      p_texto: 'primeira mensagem',
      p_msg_id: 'wamid.integration.1',
      p_lid: LID_TESTE,
    })
    expect(error, error?.message).toBeNull()

    const { data } = await supabase
      .from('whatsapp_turno_buffer')
      .select('textos, ultima_msg_id, whatsapp_lid')
      .eq('telefone', TELEFONE_TESTE)
      .single()

    expect(data?.whatsapp_lid).toBe(LID_TESTE)
    expect(data?.textos).toEqual(['primeira mensagem'])
  })

  it('append SEM lid não apaga o lid já gravado — rajada texto + áudio', async () => {
    // O consumer de mídia chama o mesmo RPC sem `p_lid` (`whatsapp_midia` também
    // é chaveada por telefone). Sem o COALESCE do ON CONFLICT, o áudio zeraria o
    // identificador que a mensagem de texto anterior gravou, e o turno voltaria a
    // identificar o cliente só por telefone — em silêncio.
    const { error } = await supabase.rpc('whatsapp_buffer_append', {
      p_telefone: TELEFONE_TESTE,
      p_texto: 'transcrição do áudio',
      p_msg_id: 'wamid.integration.2',
    })
    expect(error, error?.message).toBeNull()

    const { data } = await supabase
      .from('whatsapp_turno_buffer')
      .select('textos, ultima_msg_id, whatsapp_lid')
      .eq('telefone', TELEFONE_TESTE)
      .single()

    expect(data?.whatsapp_lid).toBe(LID_TESTE)
    expect(data?.ultima_msg_id).toBe('wamid.integration.2')
    expect(data?.textos).toEqual(['primeira mensagem', 'transcrição do áudio'])
  })

  it('o claim devolve o lid e apaga a linha', async () => {
    // Mesmo statement de `claimBurstBuffer`: DELETE ... WHERE chave AND
    // ultima_msg_id RETURNING (a coluna do filtro virou `chave` na migration
    // 101; para este telefone ela É o telefone). Se o lid não voltar aqui, ele
    // morre no banco.
    const { data, error } = await supabase
      .from('whatsapp_turno_buffer')
      .delete()
      .eq('chave', TELEFONE_TESTE)
      .eq('ultima_msg_id', 'wamid.integration.2')
      .select('chave, telefone, textos, ultima_msg_id, whatsapp_lid')
      .maybeSingle()

    expect(error, error?.message).toBeNull()
    expect(data?.whatsapp_lid).toBe(LID_TESTE)

    const { data: sobrou } = await supabase
      .from('whatsapp_turno_buffer')
      .select('telefone')
      .eq('telefone', TELEFONE_TESTE)
      .maybeSingle()
    expect(sobrou).toBeNull()
  })
})

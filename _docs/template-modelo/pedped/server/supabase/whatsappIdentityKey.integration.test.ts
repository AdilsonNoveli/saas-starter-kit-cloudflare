/**
 * TESTE DE INTEGRAÇÃO — migration 101 (identidade do turno deixa de ser o
 * telefone: itens (b) e (c) da FASE 0.4 de `_docs/em-andamento.md`)
 *
 * Roda contra o Supabase REAL, pela armadilha nº 1 do handoff: `CREATE FUNCTION`
 * não valida corpo plpgsql, então **migration aplicada ≠ função executável**. E
 * aqui há mais do que corpo de função para provar — `NOT NULL` removido, CHECK
 * novo e PRIMARY KEY trocada só existem se a migration rodou de fato.
 *
 * Execute: `pnpm test:integration`
 *
 * ─── Por que é seguro rodar aqui ──────────────────────────────────────────────
 * Escreve só linhas sintéticas (chave e wamid com marcador `__integration__`),
 * em duas tabelas transitórias por desenho (`whatsapp_turno_buffer` some no
 * claim; `whatsapp_midia` é expurgada por `purge_agent_memory`). Toda remoção
 * leva `WHERE` (pg-safeupdate). Nenhum dado de produção é lido ou alterado.
 *
 * ─── Fica VERMELHO até a migration 101 ser aplicada ──────────────────────────
 * Mesmo padrão das 099 e 100: o teste está certo e o banco está atrasado. Não
 * "conserte" o teste — aplique a migration.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { Database } from '~/types/database.types'

config()

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.NUXT_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/** Fora de qualquer formato E.164 real — não colide com cliente. */
const TELEFONE_TESTE = '000000000001'
const LID_TESTE = 'TEST.integration-identity'
const LID_ONLY = 'TEST.integration-lid-only'
const CHAVE_LID_ONLY = `lid:${LID_ONLY}`
const WAMID_MIDIA = 'wamid.__integration_identity__'

describe('Integração: migration 101 — chave por identidade e mídia lid-only', () => {
  let supabase: SupabaseClient<Database>

  async function limpar(): Promise<void> {
    await supabase.from('whatsapp_turno_buffer').delete().in('chave', [TELEFONE_TESTE, CHAVE_LID_ONLY])
    await supabase.from('whatsapp_midia').delete().eq('wamid', WAMID_MIDIA)
  }

  beforeAll(async () => {
    expect(SUPABASE_URL, 'NUXT_PUBLIC_SUPABASE_URL ausente no .env').toBeTruthy()
    expect(SERVICE_KEY, 'NUXT_SUPABASE_SECRET_KEY ausente no .env').toBeTruthy()
    supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    await limpar()
  })

  afterAll(limpar)

  it('append com telefone devolve a chave, e a chave É o telefone', async () => {
    // Comportamento de 100% do tráfego de hoje: nenhum turno existente muda de
    // chave por causa desta migration.
    const { data, error } = await supabase.rpc('whatsapp_buffer_append', {
      p_telefone: TELEFONE_TESTE,
      p_texto: 'primeira',
      p_msg_id: 'wamid.identity.1',
      p_lid: LID_TESTE,
    })

    expect(error, error?.message).toBeNull()
    expect(data).toBe(TELEFONE_TESTE)
  })

  it('append SEM telefone é aceito e devolve a chave prefixada (item b)', async () => {
    // O `NOT NULL` de `telefone` e a PRIMARY KEY antiga tornavam isto impossível:
    // é o núcleo do item (b). O prefixo existe para que um lid que pareça um
    // telefone nunca colida com um telefone de verdade.
    const { data, error } = await supabase.rpc('whatsapp_buffer_append', {
      p_telefone: null,
      p_texto: 'so lid',
      p_msg_id: 'wamid.identity.2',
      p_lid: LID_ONLY,
    })

    expect(error, error?.message).toBeNull()
    expect(data).toBe(CHAVE_LID_ONLY)

    const { data: linha } = await supabase
      .from('whatsapp_turno_buffer')
      .select('chave, telefone, whatsapp_lid')
      .eq('chave', CHAVE_LID_ONLY)
      .single()

    expect(linha?.telefone).toBeNull()
    expect(linha?.whatsapp_lid).toBe(LID_ONLY)
  })

  it('append sem telefone E sem lid é recusado pelo banco, não gravado torto', async () => {
    // Linha sem identificador nenhum seria órfã: nenhum claim a alcança e
    // ninguém a responde. Falhar alto é o comportamento correto.
    const { error } = await supabase.rpc('whatsapp_buffer_append', {
      p_telefone: null,
      p_texto: 'sem identidade',
      p_msg_id: 'wamid.identity.3',
    })

    expect(error).not.toBeNull()
  })

  it('o COALESCE sobrevive à 101 — rajada texto+áudio preserva o lid', async () => {
    // Com (c), a mídia PASSA a conhecer o lid — mas só quando o payload daquela
    // mídia o trouxe. O append sem lid continua existindo, e sem o COALESCE ele
    // rebaixaria para NULL o identificador que o texto acabou de gravar.
    const { error } = await supabase.rpc('whatsapp_buffer_append', {
      p_telefone: TELEFONE_TESTE,
      p_texto: 'transcrição do áudio',
      p_msg_id: 'wamid.identity.4',
    })
    expect(error, error?.message).toBeNull()

    const { data } = await supabase
      .from('whatsapp_turno_buffer')
      .select('textos, ultima_msg_id, whatsapp_lid')
      .eq('chave', TELEFONE_TESTE)
      .single()

    expect(data?.whatsapp_lid).toBe(LID_TESTE)
    expect(data?.textos).toEqual(['primeira', 'transcrição do áudio'])
  })

  it('o claim por chave continua atômico: uma linha, e a segunda tentativa é no-op', async () => {
    // Mesmo statement de `claimBurstBuffer`. É a garantia de entrega única do
    // turno, e a migration não podia custá-la.
    const claim = () => supabase
      .from('whatsapp_turno_buffer')
      .delete()
      .eq('chave', TELEFONE_TESTE)
      .eq('ultima_msg_id', 'wamid.identity.4')
      .select('chave, telefone, whatsapp_lid')
      .maybeSingle()

    const { data: primeira, error } = await claim()
    expect(error, error?.message).toBeNull()
    expect(primeira?.chave).toBe(TELEFONE_TESTE)
    expect(primeira?.whatsapp_lid).toBe(LID_TESTE)

    const { data: segunda } = await claim()
    expect(segunda).toBeNull()
  })

  it('whatsapp_midia aceita linha lid-only e o claim devolve o lid (item c)', async () => {
    // As duas metades do item (c): `telefone` deixou de ser NOT NULL e a coluna
    // nova chega até o consumer. Sem o RETURNING, `deliverToTurn` continuaria
    // sem ter o que propagar e o turno iniciado por mídia nunca gravaria o lid.
    const { error: insertError } = await supabase.from('whatsapp_midia').insert({
      wamid: WAMID_MIDIA,
      telefone: null,
      whatsapp_lid: LID_ONLY,
      tipo: 'audio',
      media_id: 'media.__integration__',
      status: 'pendente',
    })
    expect(insertError, insertError?.message).toBeNull()

    const { data, error } = await supabase
      .rpc('whatsapp_midia_claim', { p_wamid: WAMID_MIDIA, p_max_tentativas: 3 })
      .maybeSingle()

    expect(error, error?.message).toBeNull()
    expect(data?.whatsapp_lid).toBe(LID_ONLY)
    expect(data?.telefone).toBeNull()
  })

  it('whatsapp_midia sem telefone e sem lid é recusada pelo CHECK de identidade', async () => {
    const { error } = await supabase.from('whatsapp_midia').insert({
      wamid: `${WAMID_MIDIA}.sem_identidade`,
      telefone: null,
      whatsapp_lid: null,
      tipo: 'audio',
      media_id: 'media.__integration__',
      status: 'pendente',
    })

    expect(error).not.toBeNull()
  })
})

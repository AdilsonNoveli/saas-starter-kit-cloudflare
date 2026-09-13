import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { claimMedia } from './claimMedia'

interface ClaimRow {
  wamid: string
  phone: string | null
  whatsapp_lid: string | null
  contact_name: string | null
  type: string
  media_id: string
  mime_type: string | null
  size_bytes: number | null
  attempts: number
}

/**
 * Stub mínimo: só `rpc().maybeSingle()`, que é tudo o que a função usa.
 */
function fakeSupabase(options: {
  row?: ClaimRow | null
  error?: string
}): { supabase: SupabaseClient<Database>, rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn().mockReturnValue({
    maybeSingle: async () => ({
      data: options.row ?? null,
      error: options.error ? { message: options.error } : null,
    }),
  })

  return { supabase: { rpc } as unknown as SupabaseClient<Database>, rpc }
}

const row: ClaimRow = {
  wamid: 'wamid.HBgN',
  phone: '5511999999999',
  whatsapp_lid: 'BR.1892507442136090',
  contact_name: 'Adilson',
  type: 'audio',
  media_id: '2112121579740403',
  mime_type: 'audio/ogg; codecs=opus',
  size_bytes: 14_233,
  attempts: 1,
}

describe('claimMedia', () => {
  it('devolve a mídia reivindicada em camelCase, repassando o teto de tentativas', async () => {
    const { supabase, rpc } = fakeSupabase({ row })

    await expect(claimMedia(supabase, 'wamid.HBgN', 2)).resolves.toEqual({
      wamid: 'wamid.HBgN',
      telefone: '5511999999999',
      // Migration 101: sem o lid aqui, o turno iniciado por mídia não teria o
      // que propagar e `clientes.whatsapp_lid` só seria gravado pelo texto.
      lid: 'BR.1892507442136090',
      // Migration 107: mesmo motivo do lid — sem isto o turno iniciado por
      // mídia nunca chegaria com o pushname até `deliverToTurn`.
      nomeContato: 'Adilson',
      tipo: 'audio',
      mediaId: '2112121579740403',
      mimeType: 'audio/ogg; codecs=opus',
      tamanhoBytes: 14_233,
      tentativas: 1,
    })
    expect(rpc).toHaveBeenCalledWith('whatsapp_media_claim', {
      p_wamid: 'wamid.HBgN',
      p_max_attempts: 2,
    })
  })

  it('mídia sem pushname no payload original devolve nomeContato null', async () => {
    const { supabase } = fakeSupabase({ row: { ...row, contact_name: null } })

    await expect(claimMedia(supabase, 'wamid.HBgN', 2)).resolves.toMatchObject({ nomeContato: null })
  })

  it('preserva os campos opcionais nulos que o provedor não devolveu', async () => {
    const { supabase } = fakeSupabase({ row: { ...row, mime_type: null, size_bytes: null } })

    await expect(claimMedia(supabase, 'wamid.HBgN', 2)).resolves.toMatchObject({
      mimeType: null,
      tamanhoBytes: null,
    })
  })

  it('mídia lid-only devolve telefone null — sem caminho de resposta, não sem cliente', async () => {
    // Item (c) da FASE 0.4: `whatsapp_media.phone` deixou de ser NOT NULL.
    const { supabase } = fakeSupabase({ row: { ...row, phone: null } })

    await expect(claimMedia(supabase, 'wamid.HBgN', 2)).resolves.toMatchObject({
      telefone: null,
      lid: 'BR.1892507442136090',
    })
  })

  it('mídia sem identificador estável devolve lid null, não undefined', async () => {
    const { supabase } = fakeSupabase({ row: { ...row, whatsapp_lid: null } })

    await expect(claimMedia(supabase, 'wamid.HBgN', 2)).resolves.toMatchObject({ lid: null })
  })

  it('devolve null quando o claim não casa — entrega dupla da fila é no-op', async () => {
    // A RPC não devolve linha quando o wamid já está em `processando`,
    // `concluido`/`recusado`, ou esgotou as tentativas. O consumer trata como
    // "outro já cuidou disto" e dá ack, sem chamar a OpenAI de novo (§8.2).
    const { supabase } = fakeSupabase({ row: null })

    await expect(claimMedia(supabase, 'wamid.HBgN', 2)).resolves.toBeNull()
  })

  it('lança quando a RPC falha, em vez de silenciar como no-op', async () => {
    // Erro de infraestrutura não pode virar `null`: a mídia ainda não foi
    // processada e a mensagem precisa voltar para a fila (§8.3).
    const { supabase } = fakeSupabase({ error: 'connection reset' })

    await expect(claimMedia(supabase, 'wamid.HBgN', 2)).rejects.toMatchObject({ statusCode: 500 })
  })
})

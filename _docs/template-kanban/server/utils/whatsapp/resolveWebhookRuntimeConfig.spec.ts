import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { resolveWebhookRuntimeConfig } from './resolveWebhookRuntimeConfig'

interface LojaRow {
  whatsapp_api_base_url: string
  whatsapp_api_key_id: string | null
  agent_audio_enabled: boolean
  agent_image_enabled: boolean
}

const lojaBase: LojaRow = {
  whatsapp_api_base_url: 'https://api.provedor.com.br',
  whatsapp_api_key_id: 'uuid-1',
  agent_audio_enabled: true,
  agent_image_enabled: true,
}

/**
 * Stub mínimo do client: só o encadeamento `from().select().limit().maybeSingle()`
 * e o `rpc()` que a função realmente usa — montar mais superfície do que isso só
 * criaria manutenção sem cobrir nada.
 */
function fakeSupabase(options: {
  loja?: LojaRow | null
  lojaError?: string
  vaultToken?: string | null
  vaultError?: string
}): { supabase: SupabaseClient<Database>, rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn().mockResolvedValue({
    data: options.vaultToken ?? null,
    error: options.vaultError ? { message: options.vaultError } : null,
  })

  const supabase = {
    from: () => ({
      select: () => ({
        limit: () => ({
          maybeSingle: async () => ({
            data: options.loja === undefined ? null : options.loja,
            error: options.lojaError ? { message: options.lojaError } : null,
          }),
        }),
      }),
    }),
    rpc,
  } as unknown as SupabaseClient<Database>

  return { supabase, rpc }
}

describe('resolveWebhookRuntimeConfig', () => {
  it('usa o token do Vault e a URL da coluna quando a chave está cadastrada', async () => {
    const { supabase, rpc } = fakeSupabase({ loja: lojaBase, vaultToken: 'sk_live_do_vault' })

    const config = await resolveWebhookRuntimeConfig(supabase, { whatsappApiToken: 'sk_live_da_env' })

    expect(config.provider).toEqual({
      apiToken: 'sk_live_do_vault',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: false,
    })
    expect(rpc).toHaveBeenCalledWith('whatsapp_api_key_get')
  })

  it('cai para a env quando não há chave no Vault, sinalizando o fallback', async () => {
    const { supabase, rpc } = fakeSupabase({ loja: { ...lojaBase, whatsapp_api_key_id: null } })

    const config = await resolveWebhookRuntimeConfig(supabase, { whatsappApiToken: 'sk_live_da_env' })

    expect(config.provider).toEqual({
      apiToken: 'sk_live_da_env',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: true,
    })
    // Sem chave referenciada não há o que decriptar — o Vault nem é consultado.
    expect(rpc).not.toHaveBeenCalled()
  })

  it('cai para a env quando a leitura do Vault falha, em vez de deixar o turno sem transporte', async () => {
    const { supabase } = fakeSupabase({ loja: lojaBase, vaultError: 'permission denied' })

    const config = await resolveWebhookRuntimeConfig(supabase, { whatsappApiToken: 'sk_live_da_env' })

    expect(config.provider.apiToken).toBe('sk_live_da_env')
    expect(config.provider.usandoFallbackEnv).toBe(true)
  })

  it('devolve token vazio quando não há nem Vault nem env, sem lançar', async () => {
    const { supabase } = fakeSupabase({ loja: { ...lojaBase, whatsapp_api_key_id: null } })

    const config = await resolveWebhookRuntimeConfig(supabase, {})

    expect(config.provider).toEqual({
      apiToken: '',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: false,
    })
  })

  it('usa a URL padrão quando a loja não existe ou a leitura falha', async () => {
    const semLoja = fakeSupabase({ loja: null })
    await expect(resolveWebhookRuntimeConfig(semLoja.supabase, { whatsappApiToken: 'env' })).resolves.toMatchObject({
      provider: { baseUrl: '', usandoFallbackEnv: true },
    })

    const comErro = fakeSupabase({ lojaError: 'connection reset' })
    await expect(resolveWebhookRuntimeConfig(comErro.supabase, { whatsappApiToken: 'env' })).resolves.toMatchObject({
      provider: { baseUrl: '' },
    })
  })

  it('usa a URL padrão quando a coluna está em branco', async () => {
    const { supabase } = fakeSupabase({ loja: { ...lojaBase, whatsapp_api_base_url: '   ' } })

    const config = await resolveWebhookRuntimeConfig(supabase, { whatsappApiToken: 'env' })
    expect(config.provider.baseUrl).toBe('')
  })

  it('devolve as flags de mídia da loja no mesmo SELECT do provedor', async () => {
    const { supabase } = fakeSupabase({
      loja: { ...lojaBase, agent_audio_enabled: false, agent_image_enabled: true },
      vaultToken: 'sk_live_do_vault',
    })

    const config = await resolveWebhookRuntimeConfig(supabase, {})
    expect(config.media).toEqual({ audioHabilitado: false, imagemHabilitado: true })
  })

  it('mantém mídia ligada quando a loja não pôde ser lida — o padrão da coluna (093)', async () => {
    const { supabase } = fakeSupabase({ loja: null })

    const config = await resolveWebhookRuntimeConfig(supabase, {})
    expect(config.media).toEqual({ audioHabilitado: true, imagemHabilitado: true })
  })
})

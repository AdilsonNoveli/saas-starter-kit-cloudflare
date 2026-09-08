import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { resolveAgentRuntimeConfig } from './resolveAgentRuntimeConfig'

type LojaRow = Record<string, unknown>

const LOJA_COMPLETA: LojaRow = {
  agente_ativo: true,
  agente_modelo: 'gpt-4o-mini',
  agente_instrucoes_extra: 'Fale como gente.',
  agente_tools_habilitadas: ['buscar_produtos'],
  agente_openai_key_id: 'uuid-openai',
  agente_nome: 'Marcos',
  agente_saudacao: 'Bem-vindo à Pizzaria do Zé!',
  agente_audio_habilitado: true,
  agente_imagem_habilitado: false,
  agente_modelo_transcricao: 'gpt-4o-mini-transcribe',
  agente_modelo_visao: 'gpt-4o-mini',
  whatsapp_api_base_url: 'https://api.provedor.com.br',
  whatsapp_api_key_id: 'uuid-whatsapp',
}

/**
 * Stub mínimo do client: o encadeamento `from().select().limit().maybeSingle()`
 * e o `rpc()` despachado por nome — as duas RPC de Vault têm retornos
 * diferentes e os testes precisam distinguir quais foram chamadas.
 */
function fakeSupabase(options: {
  loja?: LojaRow | null
  lojaError?: string
  openAiKey?: string | null
  openAiError?: string
  providerToken?: string | null
  providerError?: string
}): { supabase: SupabaseClient<Database>, rpc: ReturnType<typeof vi.fn>, selected: { columns: string } } {
  const selected = { columns: '' }

  const rpc = vi.fn().mockImplementation((name: string) => {
    if (name === 'agente_openai_key_get') {
      return Promise.resolve({
        data: options.openAiKey ?? null,
        error: options.openAiError ? { message: options.openAiError } : null,
      })
    }
    return Promise.resolve({
      data: options.providerToken ?? null,
      error: options.providerError ? { message: options.providerError } : null,
    })
  })

  const supabase = {
    from: () => ({
      select: (columns: string) => {
        selected.columns = columns
        return {
          limit: () => ({
            maybeSingle: async () => ({
              data: options.loja === undefined ? LOJA_COMPLETA : options.loja,
              error: options.lojaError ? { message: options.lojaError } : null,
            }),
          }),
        }
      },
    }),
    rpc,
  } as unknown as SupabaseClient<Database>

  return { supabase, rpc, selected }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveAgentRuntimeConfig', () => {
  it('resolve agente, mídia e provedor em um SELECT e duas RPC', async () => {
    const { supabase, rpc, selected } = fakeSupabase({
      openAiKey: 'sk-openai',
      providerToken: 'sk_live_do_vault',
    })

    const config = await resolveAgentRuntimeConfig(supabase, { whatsappApiToken: 'sk_live_da_env' })

    expect(config.agent).toEqual({
      apiKey: 'sk-openai',
      model: 'gpt-4o-mini',
      instrucoesExtra: 'Fale como gente.',
      activeTools: ['buscar_produtos'],
      nome: 'Marcos',
      saudacao: 'Bem-vindo à Pizzaria do Zé!',
    })
    expect(config.media).toEqual({
      audioHabilitado: true,
      imagemHabilitado: false,
      modeloTranscricao: 'gpt-4o-mini-transcribe',
      modeloVisao: 'gpt-4o-mini',
    })
    expect(config.provider).toEqual({
      apiToken: 'sk_live_do_vault',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: false,
    })

    // O ganho da §3.5 é justamente não repetir o SELECT: uma leitura só, com
    // as colunas dos três blocos juntas.
    expect(selected.columns).toContain('agente_ativo')
    expect(selected.columns).toContain('agente_modelo_visao')
    expect(selected.columns).toContain('whatsapp_api_base_url')
    expect(rpc.mock.calls.map(call => call[0])).toEqual(['whatsapp_api_key_get', 'agente_openai_key_get'])
  })

  it('cai para a env do provedor quando não há token no Vault, avisando da depreciação', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const { supabase, rpc } = fakeSupabase({
      loja: { ...LOJA_COMPLETA, whatsapp_api_key_id: null },
      openAiKey: 'sk-openai',
    })

    const config = await resolveAgentRuntimeConfig(supabase, { whatsappApiToken: 'sk_live_da_env' })

    expect(config.provider).toEqual({
      apiToken: 'sk_live_da_env',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: true,
    })
    expect(warn.mock.calls[0]?.[0]).toContain('NUXT_WHATSAPP_API_TOKEN')
    // Sem chave referenciada não há o que decriptar — o Vault do provedor nem é consultado.
    expect(rpc.mock.calls.map(call => call[0])).toEqual(['agente_openai_key_get'])
    expect(config.agent?.apiKey).toBe('sk-openai')
  })

  it('devolve token vazio quando não há nem Vault nem env do provedor, sem lançar', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    const { supabase } = fakeSupabase({
      loja: { ...LOJA_COMPLETA, whatsapp_api_key_id: null },
      openAiKey: 'sk-openai',
    })

    const config = await resolveAgentRuntimeConfig(supabase, {})

    expect(config.provider).toEqual({
      apiToken: '',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: false,
    })
  })

  it('devolve agent null com o provedor preenchido quando o agente está desligado', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const { supabase, rpc } = fakeSupabase({
      loja: { ...LOJA_COMPLETA, agente_ativo: false },
      providerToken: 'sk_live_do_vault',
    })

    const config = await resolveAgentRuntimeConfig(supabase, {})

    expect(config.agent).toBeNull()
    // O cliente recebe "ainda não consegui falar com o atendimento automático":
    // sem este log, descobrir QUAL precondição reprovou exige adivinhação.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('precondição da loja'),
      expect.objectContaining({ lojaLida: true, agenteAtivo: false, temKeyId: true }),
    )
    // Sem transporte o consumer não conseguiria nem mandar o fallback (§2).
    expect(config.provider.apiToken).toBe('sk_live_do_vault')
    // Agente desligado não decripta chave da OpenAI (§9).
    expect(rpc.mock.calls.map(call => call[0])).toEqual(['whatsapp_api_key_get'])
  })

  it('devolve agent null com o provedor preenchido quando não há chave OpenAI', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const semReferencia = fakeSupabase({
      loja: { ...LOJA_COMPLETA, agente_openai_key_id: null },
      providerToken: 'sk_live_do_vault',
    })
    const semChave = await resolveAgentRuntimeConfig(semReferencia.supabase, {})
    expect(semChave.agent).toBeNull()
    expect(semChave.provider.apiToken).toBe('sk_live_do_vault')
    expect(semReferencia.rpc.mock.calls.map(call => call[0])).toEqual(['whatsapp_api_key_get'])

    // Referência presente mas Vault falhando: mesmo desfecho, sem exceção.
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const vaultFalhou = fakeSupabase({ openAiError: 'permission denied', providerToken: 'sk_live_do_vault' })
    const comFalha = await resolveAgentRuntimeConfig(vaultFalhou.supabase, {})
    expect(comFalha.agent).toBeNull()
    expect(comFalha.provider.apiToken).toBe('sk_live_do_vault')
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('chave OpenAI'),
      expect.objectContaining({ motivo: 'rpc_falhou', error: 'permission denied' }),
    )
  })

  it('distingue "o RPC falhou" de "o Vault devolveu null" — são diagnósticos diferentes', async () => {
    // Este era o caminho **mudo**: referência de chave presente, RPC sem erro e
    // sem dado. Acontece quando o segredo some do Vault ou quando
    // `loja.agente_openai_key_id` aponta para um id que não existe mais lá — e o
    // cliente só via a mensagem genérica, sem nada no log para investigar.
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const { supabase } = fakeSupabase({ openAiKey: null, providerToken: 'sk_live_do_vault' })

    const config = await resolveAgentRuntimeConfig(supabase, {})

    expect(config.agent).toBeNull()
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('chave OpenAI'),
      expect.objectContaining({ motivo: 'vault_devolveu_null', error: null }),
    )
  })

  it('usa defaults de mídia e a URL padrão quando a leitura da loja falha', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    const { supabase } = fakeSupabase({ loja: null, lojaError: 'connection reset' })

    const config = await resolveAgentRuntimeConfig(supabase, { whatsappApiToken: 'sk_live_da_env' })

    expect(config.agent).toBeNull()
    expect(config.media).toEqual({
      audioHabilitado: true,
      imagemHabilitado: true,
      modeloTranscricao: 'gpt-4o-mini-transcribe',
      modeloVisao: 'gpt-4o-mini',
    })
    expect(config.provider.baseUrl).toBe('')
    expect(config.provider.apiToken).toBe('sk_live_da_env')
  })
})

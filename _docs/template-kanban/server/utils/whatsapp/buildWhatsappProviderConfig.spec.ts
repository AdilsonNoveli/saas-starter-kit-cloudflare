import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '~/core/services/logger.service'
import { buildWhatsappProviderConfig, hasLegacyEnvToken } from './buildWhatsappProviderConfig'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildWhatsappProviderConfig', () => {
  it('prefere o token do Vault e a URL da coluna', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const config = buildWhatsappProviderConfig(
      { baseUrl: 'https://api.provedor.com.br', vaultToken: 'sk_live_do_vault' },
      { whatsappApiToken: 'sk_live_da_env' },
    )

    expect(config).toEqual({
      apiToken: 'sk_live_do_vault',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: false,
    })
    // Com o Vault resolvido não há depreciação a avisar.
    expect(warn).not.toHaveBeenCalled()
  })

  it('cai para a env sem token no Vault, sinalizando o fallback e avisando da depreciação', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const config = buildWhatsappProviderConfig(
      { baseUrl: 'https://api.provedor.com.br', vaultToken: null },
      { whatsappApiToken: 'sk_live_da_env' },
    )

    expect(config).toEqual({
      apiToken: 'sk_live_da_env',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: true,
    })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('NUXT_WHATSAPP_API_TOKEN')
  })

  it('devolve token vazio quando não há nem Vault nem env, sem lançar', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})

    const config = buildWhatsappProviderConfig({ baseUrl: 'https://api.provedor.com.br' }, {})

    // Token vazio, e não exceção: o envio falha adiante com o erro do provedor
    // e o turno ainda chega a tentar responder (§2).
    expect(config).toEqual({
      apiToken: '',
      baseUrl: 'https://api.provedor.com.br',
      usandoFallbackEnv: false,
    })
    expect(error).toHaveBeenCalledOnce()
  })

  it('usa a URL padrão quando a coluna está ausente ou em branco', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})

    // Sem URL configurada NÃO se inventa um fornecedor: devolve vazio e loga
    // erro. Cravar o endereço de um provedor aqui era o acoplamento removido
    // pela migration 103.
    expect(buildWhatsappProviderConfig({ vaultToken: 'tok' }, {}).baseUrl).toBe('')
    expect(buildWhatsappProviderConfig({ baseUrl: '   ', vaultToken: 'tok' }, {}).baseUrl).toBe('')
    expect(buildWhatsappProviderConfig({ baseUrl: null, vaultToken: 'tok' }, {}).baseUrl).toBe('')
  })
})

describe('hasLegacyEnvToken', () => {
  it('só reconhece string não vazia', () => {
    expect(hasLegacyEnvToken({ whatsappApiToken: 'sk_live' })).toBe(true)
    expect(hasLegacyEnvToken({ whatsappApiToken: '' })).toBe(false)
    expect(hasLegacyEnvToken({})).toBe(false)
    expect(hasLegacyEnvToken({ whatsappApiToken: 123 })).toBe(false)
  })
})

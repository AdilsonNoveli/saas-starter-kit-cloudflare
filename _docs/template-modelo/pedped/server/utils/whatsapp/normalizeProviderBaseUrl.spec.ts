import { describe, expect, it } from 'vitest'
import { normalizeProviderBaseUrl } from './normalizeProviderBaseUrl'

describe('normalizeProviderBaseUrl', () => {
  it('remove a barra final para que as duas formas gerem a mesma chamada', () => {
    expect(normalizeProviderBaseUrl('https://cloud.exemplo.com.br/')).toBe('https://cloud.exemplo.com.br')
    expect(normalizeProviderBaseUrl('https://cloud.exemplo.com.br')).toBe('https://cloud.exemplo.com.br')
  })

  it('aceita espaços em volta e normaliza o host para minúsculas', () => {
    expect(normalizeProviderBaseUrl('  https://Cloud.Exemplo.COM.BR/  ')).toBe('https://cloud.exemplo.com.br')
  })

  it('preserva porta explícita', () => {
    expect(normalizeProviderBaseUrl('https://api.exemplo.com.br:8443')).toBe('https://api.exemplo.com.br:8443')
  })

  it('rejeita http (o token viaja no cabeçalho)', () => {
    expect(() => normalizeProviderBaseUrl('http://cloud.exemplo.com.br')).toThrowError(
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it('rejeita credenciais embutidas na URL', () => {
    expect(() => normalizeProviderBaseUrl('https://user:senha@cloud.exemplo.com.br')).toThrowError(
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it('rejeita path, query e fragmento', () => {
    for (const url of [
      'https://cloud.exemplo.com.br/v1',
      'https://cloud.exemplo.com.br/?token=x',
      'https://cloud.exemplo.com.br/#frag',
    ]) {
      expect(() => normalizeProviderBaseUrl(url)).toThrowError(expect.objectContaining({ statusCode: 400 }))
    }
  })

  it('rejeita IP literal — inclusive as faixas privadas e a de metadata', () => {
    for (const host of ['127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.254', '192.168.1.1', '169.254.169.254', '8.8.8.8']) {
      expect(() => normalizeProviderBaseUrl(`https://${host}`)).toThrowError(
        expect.objectContaining({ statusCode: 400 }),
      )
    }
  })

  it('rejeita IPv4 disfarçado de decimal/octal/hex e IPv6 literal', () => {
    for (const host of ['2130706433', '0177.0.0.1', '0x7f000001', '[::1]', '[fd00::1]']) {
      expect(() => normalizeProviderBaseUrl(`https://${host}`)).toThrowError(
        expect.objectContaining({ statusCode: 400 }),
      )
    }
  })

  it('rejeita localhost e nomes internos sem TLD', () => {
    for (const host of ['localhost', 'metadata', 'supabase.internal.']) {
      expect(() => normalizeProviderBaseUrl(`https://${host}`)).toThrowError(
        expect.objectContaining({ statusCode: 400 }),
      )
    }
  })

  it('rejeita string vazia e URL sem protocolo', () => {
    expect(() => normalizeProviderBaseUrl('   ')).toThrowError(expect.objectContaining({ statusCode: 400 }))
    expect(() => normalizeProviderBaseUrl('cloud.exemplo.com.br')).toThrowError(
      expect.objectContaining({ statusCode: 400 }),
    )
  })
})

import { describe, it, expect } from 'vitest'
import { validateWebhookUrl } from './webhookUrl'

describe('validateWebhookUrl', () => {
  describe('aceita destino público em HTTPS', () => {
    it.each([
      'https://api.exemplo.com/webhook',
      'https://api.exemplo.com:8443/webhook?x=1',
      'https://8.8.8.8/webhook',
      'https://[2606:4700:4700::1111]/webhook',
    ])('%s', (url) => {
      expect(validateWebhookUrl(url).ok).toBe(true)
    })

    it('devolve a URL normalizada', () => {
      const result = validateWebhookUrl('  https://API.Exemplo.com/webhook  ')
      expect(result).toEqual({ ok: true, url: 'https://api.exemplo.com/webhook' })
    })
  })

  describe('recusa esquema inseguro', () => {
    it.each([
      'http://api.exemplo.com/webhook',
      'ftp://api.exemplo.com/webhook',
      'file:///etc/passwd',
      'javascript:alert(1)',
    ])('%s', (url) => {
      const result = validateWebhookUrl(url)
      expect(result.ok).toBe(false)
    })

    it('exige HTTPS com mensagem explícita', () => {
      const result = validateWebhookUrl('http://api.exemplo.com/webhook')
      expect(result).toMatchObject({ ok: false })
      if (!result.ok) expect(result.motivo).toContain('HTTPS')
    })
  })

  describe('recusa entrada vazia ou malformada', () => {
    it.each([null, undefined, '', '   ', 'não é url', 'https://'])('%s', (url) => {
      expect(validateWebhookUrl(url).ok).toBe(false)
    })
  })

  it('recusa credencial embutida na URL', () => {
    const result = validateWebhookUrl('https://user:senha@api.exemplo.com/webhook')
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.motivo).toContain('senha')
  })

  describe('recusa nome que endereça a própria máquina ou a rede local', () => {
    it.each([
      'https://localhost/webhook',
      'https://localhost:3000/webhook',
      'https://app.localhost/webhook',
      'https://supabase.local/webhook',
      'https://metadata.internal/webhook',
      'https://roteador.home.arpa/webhook',
      'https://LOCALHOST/webhook',
      'https://localhost./webhook',
    ])('%s', (url) => {
      expect(validateWebhookUrl(url).ok).toBe(false)
    })
  })

  describe('recusa literal IPv4 de faixa interna', () => {
    it.each([
      'https://127.0.0.1/webhook',
      'https://127.1.2.3/webhook',
      'https://0.0.0.0/webhook',
      'https://10.0.0.5/webhook',
      'https://172.16.0.1/webhook',
      'https://172.31.255.254/webhook',
      'https://192.168.1.1/webhook',
      'https://169.254.169.254/latest/meta-data', // endpoint de metadados de nuvem
      'https://100.64.0.1/webhook',
      'https://192.0.0.1/webhook',
      'https://198.18.0.1/webhook',
      'https://224.0.0.1/webhook',
      'https://255.255.255.255/webhook',
    ])('%s', (url) => {
      const result = validateWebhookUrl(url)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.motivo).toContain('interna')
    })

    it('não confunde faixa vizinha legítima com privada', () => {
      expect(validateWebhookUrl('https://172.15.0.1/webhook').ok).toBe(true)
      expect(validateWebhookUrl('https://172.32.0.1/webhook').ok).toBe(true)
      expect(validateWebhookUrl('https://11.0.0.1/webhook').ok).toBe(true)
      expect(validateWebhookUrl('https://100.63.0.1/webhook').ok).toBe(true)
    })
  })

  describe('recusa literal IPv6 de faixa interna', () => {
    it.each([
      'https://[::1]/webhook',
      'https://[::]/webhook',
      'https://[fc00::1]/webhook',
      'https://[fd12:3456::1]/webhook',
      'https://[fe80::1]/webhook',
      'https://[::ffff:127.0.0.1]/webhook', // IPv4 mapeado em IPv6
      'https://[::ffff:169.254.169.254]/webhook',
    ])('%s', (url) => {
      expect(validateWebhookUrl(url).ok).toBe(false)
    })

    it('aceita IPv6 mapeando IPv4 público', () => {
      expect(validateWebhookUrl('https://[::ffff:8.8.8.8]/webhook').ok).toBe(true)
    })
  })
})

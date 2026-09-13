import { describe, expect, it } from 'vitest'
import { requireMatchingWebhookToken } from './verifyWebhookToken'

describe('requireMatchingWebhookToken', () => {
  it('não lança quando o token fornecido bate com o esperado', () => {
    expect(() => requireMatchingWebhookToken('segredo-123', 'segredo-123')).not.toThrow()
  })

  it('lança 500 quando o token esperado não está configurado', () => {
    expect(() => requireMatchingWebhookToken('qualquer', '')).toThrowError(
      expect.objectContaining({ statusCode: 500 }),
    )
  })

  it('lança 401 quando o token fornecido está ausente', () => {
    expect(() => requireMatchingWebhookToken(undefined, 'segredo-123')).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    )
    expect(() => requireMatchingWebhookToken(null, 'segredo-123')).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    )
  })

  it('lança 401 quando o token fornecido diverge do esperado', () => {
    expect(() => requireMatchingWebhookToken('errado', 'segredo-123')).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    )
  })
})

import { describe, it, expect } from 'vitest'
import { createError } from 'h3'
import { runTool, isAgentToolError } from './runTool'

describe('runTool', () => {
  it('devolve o retorno da função em sucesso', async () => {
    const result = await runTool(async () => ({ ok: true }))
    expect(result).toEqual({ ok: true })
  })

  it('converte createError (statusMessage) em { error: true, message, statusCode }', async () => {
    const result = await runTool(async () => {
      throw createError({ statusCode: 422, statusMessage: 'Produto indisponível.' })
    })
    expect(result).toEqual({ error: true, message: 'Produto indisponível.', statusCode: 422 })
  })

  it('usa mensagem genérica e sem statusCode quando o erro não tem statusMessage', async () => {
    const result = await runTool(async () => {
      throw new Error('boom')
    })
    expect(result).toEqual({ error: true, message: 'Erro ao processar a solicitação.' })
  })

  it('propaga statusCode 5xx — sinal que technicalEscalation.ts usa para nunca explicar ao cliente', async () => {
    const result = await runTool(async () => {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar item do carrinho.' })
    })
    expect(result).toEqual({ error: true, message: 'Falha ao atualizar item do carrinho.', statusCode: 500 })
  })

  it('nunca relança — turno nunca é derrubado por erro de negócio', async () => {
    await expect(runTool(async () => {
      throw createError({ statusCode: 409, statusMessage: 'Conflito.' })
    })).resolves.not.toThrow()
  })
})

describe('isAgentToolError', () => {
  it('reconhece o formato de erro de tool', () => {
    expect(isAgentToolError({ error: true, message: 'x' })).toBe(true)
  })

  it('rejeita valores normais de retorno', () => {
    expect(isAgentToolError({ ok: true })).toBe(false)
    expect(isAgentToolError(null)).toBe(false)
    expect(isAgentToolError('erro')).toBe(false)
  })
})

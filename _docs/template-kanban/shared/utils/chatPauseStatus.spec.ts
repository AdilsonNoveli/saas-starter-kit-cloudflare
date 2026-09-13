import { describe, it, expect } from 'vitest'
import { deriveChatPauseStatus } from './chatPauseStatus'

describe('deriveChatPauseStatus', () => {
  it('devolve agent quando pausadoAte é nulo', () => {
    expect(deriveChatPauseStatus({ pausadoAte: null, pausadoMotivo: null })).toBe('agent')
  })

  it('devolve agent quando pausadoAte já passou (expiração preguiçosa)', () => {
    const passado = new Date(Date.now() - 60_000).toISOString()
    expect(deriveChatPauseStatus({ pausadoAte: passado, pausadoMotivo: 'transbordo' })).toBe('agent')
  })

  it('devolve transbordo quando ativo', () => {
    const futuro = new Date(Date.now() + 60_000).toISOString()
    expect(deriveChatPauseStatus({ pausadoAte: futuro, pausadoMotivo: 'transbordo' })).toBe('transbordo')
  })

  it('devolve human_manual quando ativo', () => {
    const futuro = new Date(Date.now() + 60_000).toISOString()
    expect(deriveChatPauseStatus({ pausadoAte: futuro, pausadoMotivo: 'manual' })).toBe('human_manual')
  })

  it('devolve human_echo quando ativo', () => {
    const futuro = new Date(Date.now() + 60_000).toISOString()
    expect(deriveChatPauseStatus({ pausadoAte: futuro, pausadoMotivo: 'resposta_humana' })).toBe('human_echo')
  })
})

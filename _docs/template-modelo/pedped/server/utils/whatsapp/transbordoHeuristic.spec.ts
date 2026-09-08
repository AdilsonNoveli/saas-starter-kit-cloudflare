import { describe, expect, it } from 'vitest'
import { matchesTransbordoLexicon } from './transbordoHeuristic'

describe('matchesTransbordoLexicon — item 4 da §7.6, léxico verbatim da §2.3', () => {
  it.each([
    'quero cancelar meu pedido',
    'vou no PROCON amanhã',
    'já chamei meu advogado',
    'vou postar no reclame aqui',
    'vou te processar',
  ])('detecta "%s"', (texto) => {
    expect(matchesTransbordoLexicon(texto)).toBe(true)
  })

  it('case-insensitive', () => {
    expect(matchesTransbordoLexicon('CANCELAR AGORA')).toBe(true)
  })

  it('substring dentro de frase maior', () => {
    expect(matchesTransbordoLexicon('oi, tudo bem? queria saber se dá pra cancelar')).toBe(true)
  })

  it('não detecta fala normal de pedido', () => {
    expect(matchesTransbordoLexicon('quero uma coca e uma pizza de calabresa')).toBe(false)
  })

  it('não detecta string vazia', () => {
    expect(matchesTransbordoLexicon('')).toBe(false)
  })
})

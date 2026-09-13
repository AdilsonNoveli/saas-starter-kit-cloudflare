import { describe, it, expect } from 'vitest'
import { extractToolNames } from './toolTrace'

describe('extractToolNames', () => {
  it('extrai os nomes das tools chamadas', () => {
    const trace = [
      { name: 'BuscarProdutos', args: { q: 'pizza' }, result: [{ nome: 'Pizza' }] },
      { name: 'AtualizarPedido', args: {}, result: { ok: true } },
    ]
    expect(extractToolNames(trace)).toEqual(['BuscarProdutos', 'AtualizarPedido'])
  })

  it('remove nomes duplicados (mesma tool chamada mais de uma vez no turno)', () => {
    const trace = [
      { name: 'BuscarProdutos', args: {}, result: [] },
      { name: 'BuscarProdutos', args: {}, result: [] },
    ]
    expect(extractToolNames(trace)).toEqual(['BuscarProdutos'])
  })

  it('devolve lista vazia para null (turno anterior à migration 106)', () => {
    expect(extractToolNames(null)).toEqual([])
  })

  it('devolve lista vazia para array vazio (turno sem tool call)', () => {
    expect(extractToolNames([])).toEqual([])
  })

  it('devolve lista vazia para dado malformado, nunca lança', () => {
    expect(extractToolNames('texto inesperado')).toEqual([])
    expect(extractToolNames([{ semNome: true }])).toEqual([])
    expect(extractToolNames(undefined)).toEqual([])
  })
})

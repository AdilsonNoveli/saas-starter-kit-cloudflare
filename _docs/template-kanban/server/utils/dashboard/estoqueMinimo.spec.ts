import { describe, it, expect } from 'vitest'
import { rankEstoqueMinimo, type EstoqueRow } from './estoqueMinimo'

function linha(overrides: Partial<EstoqueRow> & { id: string }): EstoqueRow {
  return {
    nome: `Item ${overrides.id}`,
    tipo: 'produto',
    estoqueAtual: 10,
    estoqueMinimo: 5,
    ...overrides,
  }
}

describe('rankEstoqueMinimo', () => {
  it('ignora linha sem estoque mínimo configurado (sem alerta)', () => {
    const linhas = [linha({ id: 'A', estoqueAtual: 0, estoqueMinimo: null })]
    expect(rankEstoqueMinimo(linhas)).toEqual([])
  })

  it('ignora linha com estoque acima do mínimo', () => {
    const linhas = [linha({ id: 'A', estoqueAtual: 10, estoqueMinimo: 5 })]
    expect(rankEstoqueMinimo(linhas)).toEqual([])
  })

  it('inclui linha com estoque igual ao mínimo (limiar é inclusivo)', () => {
    const linhas = [linha({ id: 'A', estoqueAtual: 5, estoqueMinimo: 5 })]
    expect(rankEstoqueMinimo(linhas)).toHaveLength(1)
  })

  it('inclui linha com estoque abaixo do mínimo', () => {
    const linhas = [linha({ id: 'A', estoqueAtual: 2, estoqueMinimo: 5 })]
    const result = rankEstoqueMinimo(linhas)
    expect(result).toEqual([{ id: 'A', nome: 'Item A', tipo: 'produto', estoqueAtual: 2, estoqueMinimo: 5 }])
  })

  it('produto e insumo são tratados pela mesma regra, tipo preservado no resultado', () => {
    const linhas = [
      linha({ id: 'P1', tipo: 'produto', estoqueAtual: 1, estoqueMinimo: 5 }),
      linha({ id: 'I1', tipo: 'insumo', estoqueAtual: 1, estoqueMinimo: 5 }),
    ]
    const result = rankEstoqueMinimo(linhas)
    expect(result.map((c) => c.tipo)).toEqual(expect.arrayContaining(['produto', 'insumo']))
  })

  it('ordena do mais urgente (mais abaixo do mínimo) para o menos urgente', () => {
    const linhas = [
      linha({ id: 'pouco-urgente', estoqueAtual: 4, estoqueMinimo: 5 }), // -1
      linha({ id: 'muito-urgente', estoqueAtual: 0, estoqueMinimo: 5 }), // -5
    ]
    const result = rankEstoqueMinimo(linhas)
    expect(result.map((c) => c.id)).toEqual(['muito-urgente', 'pouco-urgente'])
  })

  it('limita a quantidade de itens ao máximo configurado', () => {
    const linhas = Array.from({ length: 25 }, (_, i) => linha({ id: `P${i}`, estoqueAtual: 0, estoqueMinimo: 5 }))
    const result = rankEstoqueMinimo(linhas, { maxItens: 5 })
    expect(result).toHaveLength(5)
  })

  it('devolve lista vazia sem linhas', () => {
    expect(rankEstoqueMinimo([])).toEqual([])
  })
})

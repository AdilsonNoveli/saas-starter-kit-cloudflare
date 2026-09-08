import { describe, it, expect } from 'vitest'
import { aggregateAfinidadeCesta, type PedidoProdutoRow } from './afinidadeCesta'

function pedido(pedidoId: string, ...produtoIds: string[]): PedidoProdutoRow[] {
  return produtoIds.map((produtoId) => ({ pedidoId, produtoId }))
}

describe('aggregateAfinidadeCesta', () => {
  it('detecta par que sempre aparece junto (lift alto)', () => {
    const rows = [
      ...pedido('p1', 'A', 'B'),
      ...pedido('p2', 'A', 'B'),
      ...pedido('p3', 'A', 'B'),
      ...pedido('p4', 'C'),
      ...pedido('p5', 'D'),
    ]

    const result = aggregateAfinidadeCesta(rows)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ produtoAId: 'A', produtoBId: 'B', coOcorrencias: 3, lift: 5 / 3 })
  })

  it('produtos populares que só coincidem ao acaso têm lift baixo (perto de 1)', () => {
    // A e B em quase todo pedido (populares), mas não mais juntos do que a
    // popularidade individual de cada um já explicaria.
    const rows = [
      ...pedido('p1', 'A', 'B'),
      ...pedido('p2', 'A'),
      ...pedido('p3', 'B'),
      ...pedido('p4', 'A', 'B'),
      ...pedido('p5', 'A'),
      ...pedido('p6', 'B'),
    ]

    const result = aggregateAfinidadeCesta(rows, { minCoOcorrencias: 1 })
    const par = result.find((p) => p.produtoAId === 'A' && p.produtoBId === 'B')

    // countA=4, countB=4, coOcorrencias=2, total=6 → lift = 2*6/(4*4) = 0.75
    expect(par?.lift).toBeCloseTo(0.75, 5)
  })

  it('dedupe: mesmo produto duas vezes no mesmo pedido conta como uma presença', () => {
    const rows: PedidoProdutoRow[] = [
      { pedidoId: 'p1', produtoId: 'A' },
      { pedidoId: 'p1', produtoId: 'A' },
      { pedidoId: 'p1', produtoId: 'B' },
      ...pedido('p2', 'A', 'B'),
    ]

    const result = aggregateAfinidadeCesta(rows, { minCoOcorrencias: 1 })

    expect(result).toHaveLength(1)
    expect(result[0]?.coOcorrencias).toBe(2)
  })

  it('descarta pares abaixo do mínimo de co-ocorrências', () => {
    const rows = [...pedido('p1', 'A', 'B'), ...pedido('p2', 'C')]

    const result = aggregateAfinidadeCesta(rows, { minCoOcorrencias: 2 })

    expect(result).toEqual([])
  })

  it('ordena por lift desc', () => {
    const rows = [
      // AB: co=3, countA=countB=3, total=8 → lift = 3*8/(3*3) = 2.667
      ...pedido('p1', 'A', 'B'),
      ...pedido('p2', 'A', 'B'),
      ...pedido('p3', 'A', 'B'),
      // CD: co=4, countC=countD=4, total=8 → lift = 4*8/(4*4) = 2.0
      // (mais co-ocorrências que AB, mas lift MENOR — C e D também aparecem
      // sozinhos em nenhum outro pedido, então a proporção é a mesma peso
      // relativo; o teste prova que lift não é só "quem repete mais")
      ...pedido('p4', 'C', 'D'),
      ...pedido('p5', 'C', 'D'),
      ...pedido('p6', 'C', 'D'),
      ...pedido('p7', 'C', 'D'),
      ...pedido('p8', 'E'),
    ]

    const result = aggregateAfinidadeCesta(rows)

    expect(result.map((p) => `${p.produtoAId}${p.produtoBId}`)).toEqual(['AB', 'CD'])
  })

  it('desempata por co-ocorrências desc quando o lift é igual', () => {
    const rows = [
      // A sempre com B (nunca sozinho): co=2, countA=2, countB=4 → lift = 2*N/(2*4) = N/4
      ...pedido('p1', 'A', 'B'),
      ...pedido('p2', 'A', 'B'),
      ...pedido('p3', 'B'),
      ...pedido('p4', 'B'),
      // C e D sempre juntos: co=4, countC=countD=4 → lift = 4*N/(4*4) = N/4 (mesmo lift, mais co-ocorrências)
      ...pedido('p5', 'C', 'D'),
      ...pedido('p6', 'C', 'D'),
      ...pedido('p7', 'C', 'D'),
      ...pedido('p8', 'C', 'D'),
    ]

    const result = aggregateAfinidadeCesta(rows)

    expect(result[0]?.lift).toBeCloseTo(result[1]!.lift, 10)
    expect(result.map((p) => `${p.produtoAId}${p.produtoBId}`)).toEqual(['CD', 'AB'])
  })

  it('limita quantidade de pares ao máximo configurado', () => {
    const rows = [
      ...pedido('p1', 'A', 'B'),
      ...pedido('p2', 'A', 'B'),
      ...pedido('p3', 'C', 'D'),
      ...pedido('p4', 'C', 'D'),
      ...pedido('p5', 'E', 'F'),
      ...pedido('p6', 'E', 'F'),
    ]

    const result = aggregateAfinidadeCesta(rows, { maxPares: 2 })

    expect(result).toHaveLength(2)
  })

  it('devolve lista vazia sem pedidos', () => {
    expect(aggregateAfinidadeCesta([])).toEqual([])
  })

  it('pedido com um único produto não gera par', () => {
    const rows = [...pedido('p1', 'A'), ...pedido('p2', 'A'), ...pedido('p3', 'A')]

    expect(aggregateAfinidadeCesta(rows)).toEqual([])
  })
})

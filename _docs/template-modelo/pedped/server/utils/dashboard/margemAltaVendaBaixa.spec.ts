import { describe, it, expect } from 'vitest'
import { rankMargemAltaVendaBaixa, type ProdutoCatalogoRow } from './margemAltaVendaBaixa'

function produto(overrides: Partial<ProdutoCatalogoRow> & { produtoId: string }): ProdutoCatalogoRow {
  return {
    nome: `Produto ${overrides.produtoId}`,
    precoCusto: 10,
    precoVenda: 15,
    margemLucroPct: 50,
    disponivel: true,
    ...overrides,
  }
}

describe('rankMargemAltaVendaBaixa', () => {
  it('exclui produto indisponível', () => {
    const produtos = [produto({ produtoId: 'A', disponivel: false })]

    expect(rankMargemAltaVendaBaixa(produtos, new Map())).toEqual([])
  })

  it('exclui produto com margem zero ou negativa', () => {
    const produtos = [
      produto({ produtoId: 'A', margemLucroPct: 0 }),
      produto({ produtoId: 'B', margemLucroPct: -5 }),
    ]

    expect(rankMargemAltaVendaBaixa(produtos, new Map())).toEqual([])
  })

  it('exclui produto sem preço de venda calculado', () => {
    const produtos = [produto({ produtoId: 'A', precoVenda: null })]

    expect(rankMargemAltaVendaBaixa(produtos, new Map())).toEqual([])
  })

  it('produto nunca vendido fica no topo entre produtos de margem igual', () => {
    const produtos = [
      produto({ produtoId: 'vendido', margemLucroPct: 40 }),
      produto({ produtoId: 'nunca-vendido', margemLucroPct: 40 }),
    ]
    const vendas = new Map([['vendido', 10]])

    const result = rankMargemAltaVendaBaixa(produtos, vendas)

    expect(result.map((p) => p.produtoId)).toEqual(['nunca-vendido', 'vendido'])
  })

  it('margem maior vence venda baixa quando o score empata em favor de outro', () => {
    // A: margem 80, vendido 1x → score = 80/2 = 40
    // B: margem 20, nunca vendido → score = 20/1 = 20
    const produtos = [
      produto({ produtoId: 'A', margemLucroPct: 80 }),
      produto({ produtoId: 'B', margemLucroPct: 20 }),
    ]
    const vendas = new Map([['A', 1]])

    const result = rankMargemAltaVendaBaixa(produtos, vendas)

    expect(result.map((p) => p.produtoId)).toEqual(['A', 'B'])
  })

  it('calcula lucroUnitario e quantidadeVendida corretamente', () => {
    const produtos = [produto({ produtoId: 'A', precoCusto: 10, precoVenda: 18, margemLucroPct: 80 })]
    const vendas = new Map([['A', 3]])

    const result = rankMargemAltaVendaBaixa(produtos, vendas)

    expect(result[0]).toMatchObject({ lucroUnitario: 8, quantidadeVendida: 3 })
  })

  it('limita quantidade de itens ao máximo configurado', () => {
    const produtos = Array.from({ length: 15 }, (_, i) => produto({ produtoId: `P${i}` }))

    const result = rankMargemAltaVendaBaixa(produtos, new Map(), { maxItens: 5 })

    expect(result).toHaveLength(5)
  })

  it('devolve lista vazia sem produtos', () => {
    expect(rankMargemAltaVendaBaixa([], new Map())).toEqual([])
  })
})

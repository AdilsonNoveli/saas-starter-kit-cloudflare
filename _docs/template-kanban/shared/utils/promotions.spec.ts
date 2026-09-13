import { describe, it, expect } from 'vitest'
import { resolverItensElegiveis, calcularDescontoPorTipo, type ItemCalculo } from './promotions'

const ITENS: ItemCalculo[] = [
  { produto_id: 'a', preco: 10, quantidade: 2 },
  { produto_id: 'b', preco: 20, quantidade: 1 },
]

describe('resolverItensElegiveis', () => {
  it('devolve todos os itens quando o vínculo de produtos está vazio', () => {
    expect(resolverItensElegiveis(ITENS, new Set())).toEqual(ITENS)
  })

  it('filtra só os itens vinculados quando o Set não está vazio', () => {
    expect(resolverItensElegiveis(ITENS, new Set(['b']))).toEqual([ITENS[1]])
  })

  it('devolve array vazio quando nenhum item participa', () => {
    expect(resolverItensElegiveis(ITENS, new Set(['inexistente']))).toEqual([])
  })
})

describe('calcularDescontoPorTipo', () => {
  it('despacha leve_pague para calcularLevePague', () => {
    const itens: ItemCalculo[] = [{ produto_id: 'a', preco: 10, quantidade: 3 }]
    expect(calcularDescontoPorTipo('leve_pague', { compre: 2, leve: 3 }, itens, 30)).toBe(10)
  })

  it('despacha progressivo para calcularProgressivo', () => {
    const itens: ItemCalculo[] = [{ produto_id: 'a', preco: 10, quantidade: 2 }]
    const config = { faixas: [{ quantidade: 2, desconto_percentual: 10 }] }
    expect(calcularDescontoPorTipo('progressivo', config, itens, 20)).toBe(2)
  })

  it('despacha desconto_carrinho para calcularDescontoCarrinho, usando o subtotal do carrinho (não dos itens elegíveis)', () => {
    const config = { valor_minimo: 100, desconto_percentual: 10 }
    expect(calcularDescontoPorTipo('desconto_carrinho', config, ITENS, 150)).toBe(15)
  })

  it('devolve 0 para destaque (banner sem mecânica de desconto)', () => {
    expect(calcularDescontoPorTipo('destaque', {}, ITENS, 100)).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { definirItemCarrinhoTool } from './cart'

describe('DefinirItemCarrinho — schema', () => {
  it('aceita produto_id + quantidade', () => {
    const result = definirItemCarrinhoTool.schema.safeParse({
      produto_id: '11111111-1111-4111-8111-111111111111',
      quantidade: 2,
    })
    expect(result.success).toBe(true)
  })

  it('aceita quantidade 0 (remoção)', () => {
    const result = definirItemCarrinhoTool.schema.safeParse({
      produto_id: '11111111-1111-4111-8111-111111111111',
      quantidade: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita quantidade negativa', () => {
    const result = definirItemCarrinhoTool.schema.safeParse({
      produto_id: '11111111-1111-4111-8111-111111111111',
      quantidade: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita produto_id que não é UUID', () => {
    const result = definirItemCarrinhoTool.schema.safeParse({
      produto_id: 'não-uuid',
      quantidade: 1,
    })
    expect(result.success).toBe(false)
  })

  it('aceita overrides opcionais de delivery_mode/address_id', () => {
    const result = definirItemCarrinhoTool.schema.safeParse({
      produto_id: '11111111-1111-4111-8111-111111111111',
      quantidade: 1,
      delivery_mode: 'retirada',
      address_id: '22222222-2222-4222-8222-222222222222',
    })
    expect(result.success).toBe(true)
  })
})

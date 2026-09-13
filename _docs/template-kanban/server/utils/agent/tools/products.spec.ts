import { describe, it, expect } from 'vitest'
import { buscarProdutosTool } from './products'

describe('BuscarProdutos — schema', () => {
  it('aceita q sozinho', () => {
    expect(buscarProdutosTool.schema.safeParse({ q: 'calabresa' }).success).toBe(true)
  })

  it('aceita product_type stock/preorder', () => {
    expect(buscarProdutosTool.schema.safeParse({ q: 'bolo', product_type: 'preorder' }).success).toBe(true)
  })

  it('rejeita q vazio', () => {
    expect(buscarProdutosTool.schema.safeParse({ q: '' }).success).toBe(false)
  })

  it('rejeita product_type fora do enum', () => {
    expect(buscarProdutosTool.schema.safeParse({ q: 'bolo', product_type: 'combo' }).success).toBe(false)
  })

  it('nome e descrição estão presentes', () => {
    expect(buscarProdutosTool.name).toBe('BuscarProdutos')
    expect(buscarProdutosTool.description.length).toBeGreaterThan(0)
  })
})

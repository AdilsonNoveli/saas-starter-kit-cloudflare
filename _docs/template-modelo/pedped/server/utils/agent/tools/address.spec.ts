import { describe, it, expect } from 'vitest'
import { consultarEnderecoEntregaTool } from './address'

describe('ConsultarEnderecoEntrega — schema', () => {
  it('aceita address não vazio', () => {
    expect(consultarEnderecoEntregaTool.schema.safeParse({ address: 'Rua Chile 79 Itapecerica' }).success).toBe(true)
  })

  it('rejeita address vazio', () => {
    expect(consultarEnderecoEntregaTool.schema.safeParse({ address: '' }).success).toBe(false)
  })

  it('rejeita ausência de address', () => {
    expect(consultarEnderecoEntregaTool.schema.safeParse({}).success).toBe(false)
  })
})

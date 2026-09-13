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

describe('ConsultarEnderecoEntrega — description', () => {
  it('promete devolver rua/numero — regressão: geocodeAddress.ts descartava esses campos (bug em produção)', () => {
    expect(consultarEnderecoEntregaTool.description).toContain('RETORNA: rua, numero, bairro')
  })

  it('instrui a chamar AtualizarPedido no MESMO turno, sem depender de lembrar o valor depois', () => {
    expect(consultarEnderecoEntregaTool.description).toContain('IMEDIATAMENTE em seguida, NO MESMO TURNO, chame AtualizarPedido')
    expect(consultarEnderecoEntregaTool.description).toContain('nunca deixe para o proximo turno')
  })
})

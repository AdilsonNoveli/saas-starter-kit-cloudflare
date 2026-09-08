import { describe, it, expect } from 'vitest'
import { finalizarPedidoTool } from './checkout'
import { finalizarPedidoToolLabSafe } from './checkoutLabSafe'

describe('FinalizarPedido lab-safe — mesmo contrato da tool real', () => {
  it('name idêntico', () => {
    expect(finalizarPedidoToolLabSafe.name).toBe(finalizarPedidoTool.name)
  })

  it('description byte-a-byte idêntica', () => {
    expect(finalizarPedidoToolLabSafe.description).toBe(finalizarPedidoTool.description)
  })

  it('schema aceita os mesmos argumentos (objeto vazio, commit puro)', () => {
    expect(finalizarPedidoToolLabSafe.schema.safeParse({}).success).toBe(true)
    expect(finalizarPedidoTool.schema.safeParse({}).success).toBe(true)
  })
})

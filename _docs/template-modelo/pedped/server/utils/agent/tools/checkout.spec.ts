import { describe, it, expect } from 'vitest'
import {
  atualizarPedidoTool,
  finalizarPedidoTool,
  consultarDetalhePedidoTool,
  minuteIdempotencyKey,
} from './checkout'

describe('AtualizarPedido — schema', () => {
  it('aceita objeto vazio (nada informado agora)', () => {
    expect(atualizarPedidoTool.schema.safeParse({}).success).toBe(true)
  })

  it('aceita address_id sozinho', () => {
    const result = atualizarPedidoTool.schema.safeParse({ address_id: '11111111-1111-4111-8111-111111111111' })
    expect(result.success).toBe(true)
  })

  it('aceita endereco novo completo (rua + numero + bairro)', () => {
    const result = atualizarPedidoTool.schema.safeParse({ rua: 'Rua Chile', numero: '79', bairro: 'Centro' })
    expect(result.success).toBe(true)
  })

  it('rejeita address_id junto de rua (mutuamente exclusivos)', () => {
    const result = atualizarPedidoTool.schema.safeParse({
      address_id: '11111111-1111-4111-8111-111111111111',
      rua: 'Rua Chile',
      numero: '79',
      bairro: 'Centro',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita rua sem numero/bairro', () => {
    const result = atualizarPedidoTool.schema.safeParse({ rua: 'Rua Chile' })
    expect(result.success).toBe(false)
  })

  it('rejeita payment_method fora do enum', () => {
    expect(atualizarPedidoTool.schema.safeParse({ payment_method: 'boleto' }).success).toBe(false)
  })
})

describe('FinalizarPedido — schema', () => {
  it('não aceita parâmetros (commit puro)', () => {
    expect(finalizarPedidoTool.schema.safeParse({}).success).toBe(true)
  })
})

describe('minuteIdempotencyKey', () => {
  it('tem granularidade de minuto — mesma chave dentro do mesmo minuto', () => {
    const now = new Date('2026-07-26T10:15:30.000Z')
    const later = new Date('2026-07-26T10:15:59.000Z')
    expect(minuteIdempotencyKey('sessao-1', now)).toBe(minuteIdempotencyKey('sessao-1', later))
  })

  it('muda de chave em minutos diferentes', () => {
    const a = minuteIdempotencyKey('sessao-1', new Date('2026-07-26T10:15:00.000Z'))
    const b = minuteIdempotencyKey('sessao-1', new Date('2026-07-26T10:16:00.000Z'))
    expect(a).not.toBe(b)
  })

  it('inclui o sessao_id e o sufixo -checkout-', () => {
    const key = minuteIdempotencyKey('sessao-abc', new Date('2026-07-26T10:15:00.000Z'))
    expect(key).toBe('sessao-abc-checkout-202607261015')
  })
})

describe('ConsultarDetalhePedido — schema', () => {
  it('exige pedido_id UUID', () => {
    expect(consultarDetalhePedidoTool.schema.safeParse({ pedido_id: 'abc' }).success).toBe(false)
    expect(consultarDetalhePedidoTool.schema.safeParse({ pedido_id: '11111111-1111-4111-8111-111111111111' }).success).toBe(true)
  })
})

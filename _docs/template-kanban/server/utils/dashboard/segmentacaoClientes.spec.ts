import { describe, it, expect } from 'vitest'
import { listarClientesEmRisco, perfilPorSegmento, type ClienteIntelligenceRow } from './segmentacaoClientes'

function cliente(overrides: Partial<ClienteIntelligenceRow> & { customerId: string }): ClienteIntelligenceRow {
  return {
    nome: `Cliente ${overrides.customerId}`,
    whatsapp: '5511999990000',
    churnRisk: 'low',
    rfmSegment: null,
    avgTicket: 100,
    paymentMethod: 'pix',
    deliveryMode: 'entrega',
    peakWeekday: 5,
    peakHour: 19,
    ...overrides,
  }
}

describe('listarClientesEmRisco', () => {
  it('inclui churnRisk critical/high e rfmSegment at_risk, exclui o resto', () => {
    const rows = [
      cliente({ customerId: 'A', churnRisk: 'critical' }),
      cliente({ customerId: 'B', churnRisk: 'high' }),
      cliente({ customerId: 'C', churnRisk: 'medium', rfmSegment: 'at_risk' }),
      cliente({ customerId: 'D', churnRisk: 'low' }),
      cliente({ customerId: 'E', churnRisk: 'no_orders' }),
    ]

    const result = listarClientesEmRisco(rows)

    expect(result.map((r) => r.customerId).sort()).toEqual(['A', 'B', 'C'])
  })

  it('ordena por avgTicket × peso — critical de ticket menor pode vencer at_risk de ticket maior', () => {
    // A: critical, ticket 100 → score = 100*3 = 300
    // B: at_risk (churnRisk medium), ticket 150 → score = 150*1.5 = 225
    const rows = [
      cliente({ customerId: 'A', churnRisk: 'critical', avgTicket: 100 }),
      cliente({ customerId: 'B', churnRisk: 'medium', rfmSegment: 'at_risk', avgTicket: 150 }),
    ]

    const result = listarClientesEmRisco(rows)

    expect(result.map((r) => r.customerId)).toEqual(['A', 'B'])
  })

  it('trata avgTicket nulo como zero (não quebra, mas não prioriza)', () => {
    const rows = [cliente({ customerId: 'A', churnRisk: 'critical', avgTicket: null })]

    const result = listarClientesEmRisco(rows)

    expect(result[0]).toMatchObject({ avgTicket: 0, score: 0 })
  })

  it('limita quantidade de itens ao máximo configurado', () => {
    const rows = Array.from({ length: 15 }, (_, i) => cliente({ customerId: `C${i}`, churnRisk: 'critical' }))

    const result = listarClientesEmRisco(rows, { maxItens: 4 })

    expect(result).toHaveLength(4)
  })

  it('devolve lista vazia sem clientes em risco', () => {
    const rows = [cliente({ customerId: 'A', churnRisk: 'low' })]

    expect(listarClientesEmRisco(rows)).toEqual([])
  })
})

describe('perfilPorSegmento', () => {
  it('agrupa só clientes com rfmSegment definido', () => {
    const rows = [
      cliente({ customerId: 'A', rfmSegment: 'champion' }),
      cliente({ customerId: 'B', rfmSegment: null }),
    ]

    const result = perfilPorSegmento(rows)

    expect(result).toHaveLength(1)
    expect(result[0]?.segmento).toBe('champion')
    expect(result[0]?.totalClientes).toBe(1)
  })

  it('calcula ticket médio ignorando avgTicket nulo', () => {
    const rows = [
      cliente({ customerId: 'A', rfmSegment: 'loyal', avgTicket: 100 }),
      cliente({ customerId: 'B', rfmSegment: 'loyal', avgTicket: 200 }),
      cliente({ customerId: 'C', rfmSegment: 'loyal', avgTicket: null }),
    ]

    const result = perfilPorSegmento(rows)

    expect(result[0]?.ticketMedio).toBe(150)
  })

  it('ticketMedio é null quando nenhum cliente do segmento tem avgTicket', () => {
    const rows = [cliente({ customerId: 'A', rfmSegment: 'dormant', avgTicket: null })]

    expect(perfilPorSegmento(rows)[0]?.ticketMedio).toBeNull()
  })

  it('encontra pagamento/entrega/pico dominantes com a % correta', () => {
    const rows = [
      cliente({ customerId: 'A', rfmSegment: 'champion', paymentMethod: 'pix', deliveryMode: 'entrega', peakWeekday: 5, peakHour: 19 }),
      cliente({ customerId: 'B', rfmSegment: 'champion', paymentMethod: 'pix', deliveryMode: 'entrega', peakWeekday: 5, peakHour: 20 }),
      cliente({ customerId: 'C', rfmSegment: 'champion', paymentMethod: 'cartao', deliveryMode: 'retirada', peakWeekday: 6, peakHour: 19 }),
    ]

    const [perfil] = perfilPorSegmento(rows)

    expect(perfil?.pagamentoDominante).toEqual({ valor: 'pix', pct: 67 })
    expect(perfil?.entregaDominante).toEqual({ valor: 'entrega', pct: 67 })
    expect(perfil?.diaPicoDominante).toEqual({ valor: '5', pct: 67 })
  })

  it('dominante é null quando todos os valores do segmento são nulos', () => {
    const rows = [cliente({ customerId: 'A', rfmSegment: 'new', paymentMethod: null, deliveryMode: null, peakWeekday: null, peakHour: null })]

    const [perfil] = perfilPorSegmento(rows)

    expect(perfil?.pagamentoDominante).toBeNull()
    expect(perfil?.entregaDominante).toBeNull()
    expect(perfil?.diaPicoDominante).toBeNull()
    expect(perfil?.horaPicoDominante).toBeNull()
  })

  it('ordena por total de clientes desc', () => {
    const rows = [
      cliente({ customerId: 'A', rfmSegment: 'new' }),
      cliente({ customerId: 'B', rfmSegment: 'champion' }),
      cliente({ customerId: 'C', rfmSegment: 'champion' }),
      cliente({ customerId: 'D', rfmSegment: 'champion' }),
    ]

    const result = perfilPorSegmento(rows)

    expect(result.map((p) => p.segmento)).toEqual(['champion', 'new'])
  })

  it('devolve lista vazia sem clientes', () => {
    expect(perfilPorSegmento([])).toEqual([])
  })
})

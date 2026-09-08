import { describe, it, expect } from 'vitest'
import { aggregateAchadosRecorrentes } from './achadosRecorrentes'
import type { JudgeFinding } from '../agent/conversationJudge'

function achado(tipo: JudgeFinding['tipo'], evidencia: string, sugestao?: string): JudgeFinding {
  return { tipo, evidencia, sugestao }
}

describe('aggregateAchadosRecorrentes', () => {
  it('agrupa por tipo e conta ocorrências', () => {
    const rows = [
      { achados: [achado('alucinacao', 'ev1')] },
      { achados: [achado('alucinacao', 'ev2')] },
      { achados: [achado('tom', 'ev3')] },
    ]

    const result = aggregateAchadosRecorrentes(rows)

    expect(result).toEqual([
      { tipo: 'alucinacao', total: 2, exemplos: [{ evidencia: 'ev1', sugestao: undefined }, { evidencia: 'ev2', sugestao: undefined }] },
      { tipo: 'tom', total: 1, exemplos: [{ evidencia: 'ev3', sugestao: undefined }] },
    ])
  })

  it('ordena por contagem desc', () => {
    const rows = [
      { achados: [achado('tom', 'a')] },
      { achados: [achado('formato', 'b'), achado('formato', 'c'), achado('formato', 'd')] },
      { achados: [achado('deveria_escalar', 'e'), achado('deveria_escalar', 'f')] },
    ]

    const result = aggregateAchadosRecorrentes(rows)

    expect(result.map((r) => r.tipo)).toEqual(['formato', 'deveria_escalar', 'tom'])
  })

  it('limita exemplos por tipo ao máximo configurado, mas conta todas as ocorrências', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ achados: [achado('alucinacao', `ev${i}`)] }))

    const result = aggregateAchadosRecorrentes(rows, { maxExemplos: 3 })

    expect(result[0]?.total).toBe(5)
    expect(result[0]?.exemplos).toHaveLength(3)
    expect(result[0]?.exemplos.map((e) => e.evidencia)).toEqual(['ev0', 'ev1', 'ev2'])
  })

  it('limita quantidade de tipos ao máximo configurado', () => {
    const rows = [
      { achados: [achado('alucinacao', 'a')] },
      { achados: [achado('fora_do_briefing', 'b')] },
      { achados: [achado('deveria_escalar', 'c')] },
      { achados: [achado('tom', 'd')] },
      { achados: [achado('formato', 'e')] },
    ]

    const result = aggregateAchadosRecorrentes(rows, { maxTipos: 2 })

    expect(result).toHaveLength(2)
  })

  it('preserva sugestão quando presente', () => {
    const rows = [{ achados: [achado('tom', 'ev', 'seja mais formal')] }]

    const result = aggregateAchadosRecorrentes(rows)

    expect(result[0]?.exemplos[0]).toEqual({ evidencia: 'ev', sugestao: 'seja mais formal' })
  })

  it('devolve lista vazia quando não há achados', () => {
    expect(aggregateAchadosRecorrentes([])).toEqual([])
    expect(aggregateAchadosRecorrentes([{ achados: [] }, { achados: null }])).toEqual([])
  })
})

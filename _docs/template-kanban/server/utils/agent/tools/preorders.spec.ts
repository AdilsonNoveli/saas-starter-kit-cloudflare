import { describe, it, expect } from 'vitest'
import { consultarDatasEncomendaTool } from './preorders'

describe('ConsultarDatasEncomenda — schema', () => {
  it('exige product_id UUID', () => {
    expect(consultarDatasEncomendaTool.schema.safeParse({ product_id: 'abc' }).success).toBe(false)
    expect(consultarDatasEncomendaTool.schema.safeParse({ product_id: '11111111-1111-4111-8111-111111111111' }).success).toBe(true)
  })

  it('month é opcional, mas deve ser YYYY-MM quando informado', () => {
    const base = { product_id: '11111111-1111-4111-8111-111111111111' }
    expect(consultarDatasEncomendaTool.schema.safeParse(base).success).toBe(true)
    expect(consultarDatasEncomendaTool.schema.safeParse({ ...base, month: '2026-07' }).success).toBe(true)
    expect(consultarDatasEncomendaTool.schema.safeParse({ ...base, month: '2026-13' }).success).toBe(false)
    expect(consultarDatasEncomendaTool.schema.safeParse({ ...base, month: '07-2026' }).success).toBe(false)
  })
})

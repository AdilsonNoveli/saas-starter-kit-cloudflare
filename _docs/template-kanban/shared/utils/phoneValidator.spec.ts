import { describe, it, expect } from 'vitest'
import { validateWhatsapp } from './phoneValidator'

describe('validateWhatsapp', () => {
  it('validates legitimate Brazilian mobile numbers', () => {
    expect(validateWhatsapp('(11) 98765-1234').isValid).toBe(true)
    expect(validateWhatsapp('(21) 99876-5432').isValid).toBe(true)
    expect(validateWhatsapp('5511987654123').isValid).toBe(true)
    expect(validateWhatsapp('(41) 98401-2345').isValid).toBe(true)
  })

  it('blocks numbers with invalid length', () => {
    expect(validateWhatsapp('119999').isValid).toBe(false)
    expect(validateWhatsapp('(11) 9876-5432').isValid).toBe(false)
    expect(validateWhatsapp('').isValid).toBe(false)
  })

  it('blocks invalid DDDs (ex: 00, 10, 20, 90)', () => {
    expect(validateWhatsapp('(00) 98765-4321').isValid).toBe(false)
    expect(validateWhatsapp('(10) 98765-4321').isValid).toBe(false)
    expect(validateWhatsapp('(20) 98765-4321').isValid).toBe(false)
    expect(validateWhatsapp('(90) 98765-4321').isValid).toBe(false)
  })

  it('blocks numbers without 9th digit (not starting with 9 after DDD)', () => {
    expect(validateWhatsapp('(11) 12121-2322').isValid).toBe(false)
    expect(validateWhatsapp('(11) 88888-8888').isValid).toBe(false)
    expect(validateWhatsapp('(11) 3456-7890').isValid).toBe(false)
  })

  it('blocks all identical digits (ex: 11111111111, 99999999999)', () => {
    expect(validateWhatsapp('(11) 11111-1111').isValid).toBe(false)
    expect(validateWhatsapp('(99) 99999-9999').isValid).toBe(false)
    expect(validateWhatsapp('00000000000').isValid).toBe(false)
  })

  it('blocks repeated body digits (ex: 11 999999999, 11 900000000)', () => {
    expect(validateWhatsapp('(11) 99999-9999').isValid).toBe(false)
    expect(validateWhatsapp('(11) 90000-0000').isValid).toBe(false)
  })

  it('blocks sequential digit patterns (ex: 123456789, 987654321)', () => {
    expect(validateWhatsapp('(11) 91234-5678').isValid).toBe(false)
    expect(validateWhatsapp('(11) 98765-4321').isValid).toBe(false)
  })

  it('blocks 2-digit repeating patterns (ex: 12121212, 90909090)', () => {
    expect(validateWhatsapp('(11) 91212-1212').isValid).toBe(false)
    expect(validateWhatsapp('(11) 90909-0909').isValid).toBe(false)
  })
})

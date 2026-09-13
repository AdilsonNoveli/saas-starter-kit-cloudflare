import { describe, expect, it } from 'vitest'
import { normalizeSearchTerm } from './normalize-search-term'

describe('normalizeSearchTerm', () => {
  it('handles empty or undefined inputs', () => {
    expect(normalizeSearchTerm(undefined)).toBeUndefined()
    expect(normalizeSearchTerm('')).toBeUndefined()
    expect(normalizeSearchTerm('   ')).toBeUndefined()
  })

  it('removes stop words like "de"', () => {
    expect(normalizeSearchTerm('pizza de queijo')).toBe('pizza queijo')
  })

  it('preserves multi-word queries without stop words', () => {
    expect(normalizeSearchTerm('pizza queijo')).toBe('pizza queijo')
  })

  it('expands aliases correctly', () => {
    expect(normalizeSearchTerm('esfirra de queijo')).toBe('esfiha queijo')
    expect(normalizeSearchTerm('refri')).toBe('refrigerante')
  })
})

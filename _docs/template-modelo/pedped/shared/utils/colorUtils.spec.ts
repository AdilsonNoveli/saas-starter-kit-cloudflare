import { describe, it, expect } from 'vitest'
import { getRelativeLuminance, isDarkColor } from './colorUtils'

describe('colorUtils', () => {
  describe('getRelativeLuminance', () => {
    it('returns 1 for invalid or empty input', () => {
      expect(getRelativeLuminance('')).toBe(1)
      expect(getRelativeLuminance('invalid')).toBe(1)
    })

    it('calculates correct luminance for white (#ffffff)', () => {
      expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1, 2)
    })

    it('calculates correct luminance for black (#000000)', () => {
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 2)
    })

    it('calculates correct luminance for 3-character hex (#fff, #000)', () => {
      expect(getRelativeLuminance('#fff')).toBeCloseTo(1, 2)
      expect(getRelativeLuminance('#000')).toBeCloseTo(0, 2)
    })
  })

  describe('isDarkColor', () => {
    it('identifies white as light (false)', () => {
      expect(isDarkColor('#ffffff')).toBe(false)
    })

    it('identifies black as dark (true)', () => {
      expect(isDarkColor('#000000')).toBe(true)
    })

    it('identifies red (#ff1a1a) as dark (true)', () => {
      expect(isDarkColor('#ff1a1a')).toBe(true)
    })

    it('identifies dark gray (#111827) as dark (true)', () => {
      expect(isDarkColor('#111827')).toBe(true)
    })

    it('returns false for null or undefined input', () => {
      expect(isDarkColor(null)).toBe(false)
      expect(isDarkColor(undefined)).toBe(false)
    })
  })
})

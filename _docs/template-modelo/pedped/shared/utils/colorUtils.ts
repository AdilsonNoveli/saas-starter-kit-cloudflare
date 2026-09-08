/**
 * Utility functions for color calculations and WCAG contrast check.
 */

/**
 * Calculates the WCAG 2.1 relative luminance of a hex color string.
 * Returns a number between 0 (pure black) and 1 (pure white).
 */
export function getRelativeLuminance(hex: string): number {
  if (!hex || typeof hex !== 'string') return 1

  const cleanHex = hex.replace('#', '').trim()
  if (cleanHex.length !== 3 && cleanHex.length !== 6) return 1

  let r: number
  let g: number
  let b: number

  if (cleanHex.length === 3) {
    r = parseInt((cleanHex[0] ?? '0') + (cleanHex[0] ?? '0'), 16)
    g = parseInt((cleanHex[1] ?? '0') + (cleanHex[1] ?? '0'), 16)
    b = parseInt((cleanHex[2] ?? '0') + (cleanHex[2] ?? '0'), 16)
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16)
    g = parseInt(cleanHex.substring(2, 4), 16)
    b = parseInt(cleanHex.substring(4, 6), 16)
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return 1

  const transform = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }

  const sR = transform(r)
  const sG = transform(g)
  const sB = transform(b)

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB
}

/**
 * Determines whether a hex color is considered dark, requiring light (white) text for contrast.
 * @param hex Color string in hex format (e.g. "#ff1a1a" or "#ffffff")
 * @param threshold Luminance threshold below which a color is considered dark (default: 0.45)
 */
export function isDarkColor(hex: string | null | undefined, threshold = 0.45): boolean {
  if (!hex) return false
  return getRelativeLuminance(hex) < threshold
}

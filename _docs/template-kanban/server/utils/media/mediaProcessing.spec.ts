import { describe, it, expect } from 'vitest'
import { MEDIA_SIZE_LIMITS, exceedsMediaSizeLimit } from './mediaProcessing'

describe('exceedsMediaSizeLimit', () => {
  it('usa os limites da §7.5 — 16 MB de áudio e 5 MB de imagem', () => {
    expect(MEDIA_SIZE_LIMITS.audio).toBe(16 * 1024 * 1024)
    expect(MEDIA_SIZE_LIMITS.image).toBe(5 * 1024 * 1024)
  })

  it('recusa acima do limite e aceita exatamente no limite', () => {
    expect(exceedsMediaSizeLimit('audio', MEDIA_SIZE_LIMITS.audio + 1)).toBe(true)
    expect(exceedsMediaSizeLimit('audio', MEDIA_SIZE_LIMITS.audio)).toBe(false)
    expect(exceedsMediaSizeLimit('image', MEDIA_SIZE_LIMITS.image + 1)).toBe(true)
    expect(exceedsMediaSizeLimit('image', MEDIA_SIZE_LIMITS.image)).toBe(false)
  })

  it('imagem de 6 MB é recusada mesmo cabendo no limite de áudio — o limite é por tipo', () => {
    const seisMb = 6 * 1024 * 1024
    expect(exceedsMediaSizeLimit('image', seisMb)).toBe(true)
    expect(exceedsMediaSizeLimit('audio', seisMb)).toBe(false)
  })

  it('tamanho desconhecido não recusa — o guard volta a valer sobre os bytes baixados', () => {
    expect(exceedsMediaSizeLimit('audio', null)).toBe(false)
    expect(exceedsMediaSizeLimit('audio', undefined)).toBe(false)
    expect(exceedsMediaSizeLimit('image', Number.NaN)).toBe(false)
  })
})

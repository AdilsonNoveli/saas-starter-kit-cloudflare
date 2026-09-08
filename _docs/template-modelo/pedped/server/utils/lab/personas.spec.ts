import { describe, expect, it } from 'vitest'
import { LAB_PERSONAS, findLabPersona, labPersonaPhone } from './personas'
import type { LabCatalogSample } from './labCatalogSample'

const SAMPLE: LabCatalogSample = {
  principal: 'Produto Principal',
  secundario: 'Produto Secundario',
  terciario: 'Produto Terciario',
}

describe('LAB_PERSONAS', () => {
  it('tem as 6 personas do §5.2 do PRD, cada uma com pelo menos uma fala (com e sem amostra de catálogo)', () => {
    expect(LAB_PERSONAS).toHaveLength(6)
    for (const persona of LAB_PERSONAS) {
      expect(persona.falas(SAMPLE).length).toBeGreaterThan(0)
      expect(persona.falas(null).length).toBeGreaterThan(0)
    }
  })

  it('chaves são únicas — agrupamento por persona depende disso', () => {
    const chaves = LAB_PERSONAS.map((p) => p.key)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it('nunca fixa nome de produto de um segmento específico — usa a amostra do catálogo real', () => {
    const comprador = findLabPersona('comprador_decidido')!
    const falasComAmostra = comprador.falas(SAMPLE).join(' ').toLowerCase()
    expect(falasComAmostra).toContain('produto principal')
    expect(falasComAmostra).not.toContain('pizza')
    expect(falasComAmostra).not.toContain('calabresa')
  })

  it('tem um fallback genérico quando a loja não tem catálogo suficiente (sample null)', () => {
    for (const persona of LAB_PERSONAS) {
      expect(() => persona.falas(null)).not.toThrow()
    }
  })
})

describe('findLabPersona', () => {
  it('encontra por chave', () => {
    expect(findLabPersona('comprador_decidido')?.label).toBe('Comprador decidido')
  })

  it('devolve undefined para chave inexistente', () => {
    expect(findLabPersona('nao-existe')).toBeUndefined()
  })
})

describe('labPersonaPhone', () => {
  it('usa o DDD 21 reservado e nunca colide entre índices', () => {
    expect(labPersonaPhone(0)).toBe('5521999990000')
    expect(labPersonaPhone(1)).toBe('5521999990001')
    expect(labPersonaPhone(5)).toBe('5521999990005')
  })
})

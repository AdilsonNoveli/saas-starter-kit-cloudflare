import { describe, expect, it, vi } from 'vitest'
import { consultarOpcoesProdutoTool } from './productOptions'
import type { AgentToolContext } from '../toolContext'

describe('ConsultarOpcoesProduto — schema', () => {
  it('exige produto_id UUID', () => {
    expect(consultarOpcoesProdutoTool.schema.safeParse({ produto_id: 'nao-uuid' }).success).toBe(false)
    expect(consultarOpcoesProdutoTool.schema.safeParse({ produto_id: '11111111-1111-4111-8111-111111111111' }).success).toBe(true)
  })

  it('rejeita chamada sem produto_id', () => {
    expect(consultarOpcoesProdutoTool.schema.safeParse({}).success).toBe(false)
  })

  it('nome e descrição estão presentes', () => {
    expect(consultarOpcoesProdutoTool.name).toBe('ConsultarOpcoesProduto')
    expect(consultarOpcoesProdutoTool.description.length).toBeGreaterThan(0)
  })
})

describe('ConsultarOpcoesProduto — run', () => {
  function fakeCtx(grupos: unknown[]): AgentToolContext {
    const order = vi.fn().mockResolvedValue({ data: grupos })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    return {
      supabase: { from } as unknown as AgentToolContext['supabase'],
      sessaoId: 'sessao-1',
      clienteId: null,
      whatsapp: '5511999999999',
      catalogoUrl: 'https://loja.exemplo/c/sessao-1',
      googleMapsServerKey: 'key',
      sendCatalogButton: vi.fn(),
    }
  }

  it('devolve produto_id + grupos (produto sem opção = lista vazia)', async () => {
    const ctx = fakeCtx([])
    const result = await consultarOpcoesProdutoTool.run({ produto_id: '11111111-1111-4111-8111-111111111111' }, ctx)
    expect(result).toEqual({ produto_id: '11111111-1111-4111-8111-111111111111', grupos: [] })
  })
})

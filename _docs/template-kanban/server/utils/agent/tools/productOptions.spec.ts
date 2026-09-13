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
      sendChoiceButtons: vi.fn(),
    }
  }

  it('devolve produto_id + grupos + orientacao (produto sem opção = listas vazias)', async () => {
    const ctx = fakeCtx([])
    const result = await consultarOpcoesProdutoTool.run({ produto_id: '11111111-1111-4111-8111-111111111111' }, ctx)
    expect(result).toEqual({ produto_id: '11111111-1111-4111-8111-111111111111', grupos: [], orientacao: [] })
  })

  it('orientacao traz modo "automatic" pronto — agente nao recalcula grupo de opcao unica', async () => {
    const ctx = fakeCtx([
      {
        id: 'grupo-tipo', product_id: 'p1', name: 'TIPO', type: 'single', required: true,
        min_selections: 1, max_selections: 1, sort_order: 0,
        product_option_item: [{ id: 'item-masculino', group_id: 'grupo-tipo', name: 'Masculino', price_delta: 0, default_selected: false, active: true, sort_order: 0, photo_url: null }],
      },
    ])
    const result = await consultarOpcoesProdutoTool.run({ produto_id: '11111111-1111-4111-8111-111111111111' }, ctx) as { orientacao: unknown[] }
    expect(result.orientacao).toEqual([
      { groupId: 'grupo-tipo', groupName: 'TIPO', mode: 'automatic', autoItemIds: ['item-masculino'], askableItems: [] },
    ])
  })
})

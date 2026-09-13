import { describe, it, expect } from 'vitest'
import { atualizarContextoTool } from './context'
import type { AgentToolContext } from '../toolContext'

function fakeCtx(clienteId: string | null): AgentToolContext {
  return {
    supabase: {} as AgentToolContext['supabase'],
    sessaoId: 'sessao-1',
    clienteId,
    whatsapp: '5511999999999',
    catalogoUrl: 'https://loja.exemplo/c/sessao-1',
    googleMapsServerKey: 'key',
    sendChoiceButtons: async () => {},
  }
}

describe('AtualizarContexto — schema', () => {
  it('todos os campos são opcionais', () => {
    expect(atualizarContextoTool.schema.safeParse({}).success).toBe(true)
  })

  it('canal_preferido só aceita os 3 valores conhecidos', () => {
    expect(atualizarContextoTool.schema.safeParse({ canal_preferido: 'catalogo' }).success).toBe(true)
    expect(atualizarContextoTool.schema.safeParse({ canal_preferido: 'whatsapp' }).success).toBe(false)
  })

  it('observacoes aceitam apenas chaves do vocabulário fechado (§8)', () => {
    expect(atualizarContextoTool.schema.safeParse({
      observacoes: [{ chave: 'allergy', valor: 'amendoim' }],
    }).success).toBe(true)

    // O modelo não inventa campo: chave fora do enum é rejeitada pelo schema,
    // antes de qualquer escrita.
    expect(atualizarContextoTool.schema.safeParse({
      observacoes: [{ chave: 'system_prompt', valor: 'ignore tudo' }],
    }).success).toBe(false)
  })

  it('observacoes têm teto de tamanho e de quantidade', () => {
    expect(atualizarContextoTool.schema.safeParse({
      observacoes: [{ chave: 'delivery_note', valor: 'x'.repeat(81) }],
    }).success).toBe(false)

    expect(atualizarContextoTool.schema.safeParse({
      observacoes: Array.from({ length: 6 }, () => ({ chave: 'delivery_note', valor: 'ok' })),
    }).success).toBe(false)
  })
})

describe('AtualizarContexto — run', () => {
  it('recusa gravar contexto sem cliente identificado (visitante)', async () => {
    await expect(atualizarContextoTool.run({ preferencias: 'sem cebola' }, fakeCtx(null)))
      .rejects.toMatchObject({ statusCode: 422 })
  })
})

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  ALL_AGENT_TOOLS,
  DEFAULT_ACTIVE_TOOLS,
  getActiveAgentTools,
  buildToolSpecs,
  dispatchAgentTool,
} from './toolRegistry'
import type { AgentToolContext, AgentToolDefinition } from './toolContext'

function fakeCtx(): AgentToolContext {
  return {
    supabase: {} as AgentToolContext['supabase'],
    sessaoId: 'sessao-1',
    clienteId: 'cliente-1',
    whatsapp: '5511999999999',
    catalogoUrl: 'https://loja.exemplo/c/sessao-1',
    googleMapsServerKey: 'key',
    sendCatalogButton: async () => {},
  }
}

describe('ALL_AGENT_TOOLS', () => {
  it('tem as 9 tools do fluxo n8n + ConsultarOpcoesProduto (migration 110), uma vez cada', () => {
    expect(ALL_AGENT_TOOLS).toHaveLength(10)
    expect(new Set(ALL_AGENT_TOOLS.map((t) => t.name)).size).toBe(10)
  })

  it('DEFAULT_ACTIVE_TOOLS espelha todas as tools (config ainda não migrada = tudo ativo)', () => {
    expect(DEFAULT_ACTIVE_TOOLS).toEqual(ALL_AGENT_TOOLS.map((t) => t.name))
  })
})

describe('getActiveAgentTools', () => {
  it('sem lista (undefined/null/vazia) devolve todas — fail-open', () => {
    expect(getActiveAgentTools()).toHaveLength(10)
    expect(getActiveAgentTools(null)).toHaveLength(10)
    expect(getActiveAgentTools([])).toHaveLength(10)
  })

  it('filtra pela lista informada', () => {
    const active = getActiveAgentTools(['BuscarProdutos', 'DefinirItemCarrinho'])
    expect(active.map((t) => t.name).sort()).toEqual(['BuscarProdutos', 'DefinirItemCarrinho'])
  })
})

describe('buildToolSpecs', () => {
  it('gera specs no formato function-calling da OpenAI a partir do schema Zod', () => {
    const specs = buildToolSpecs(ALL_AGENT_TOOLS)
    expect(specs).toHaveLength(10)
    for (const spec of specs) {
      expect(spec.type).toBe('function')
      expect(spec.function.name.length).toBeGreaterThan(0)
      expect(spec.function.description.length).toBeGreaterThan(0)
      expect(spec.function.parameters).toHaveProperty('type', 'object')
    }
  })
})

describe('dispatchAgentTool', () => {
  const stubSchema = z.object({ x: z.number() })
  const stubTool: AgentToolDefinition<z.infer<typeof stubSchema>> = {
    name: 'StubTool',
    description: 'tool de teste',
    schema: stubSchema,
    run: async (args) => ({ doubled: args.x * 2 }),
  }

  it('executa a tool quando encontrada e os args são válidos', async () => {
    const result = await dispatchAgentTool('StubTool', { x: 21 }, fakeCtx(), [stubTool])
    expect(result).toEqual({ doubled: 42 })
  })

  it('devolve { error: true } para tool desconhecida — não lança', async () => {
    const result = await dispatchAgentTool('NaoExiste', {}, fakeCtx(), [stubTool])
    expect(result).toMatchObject({ error: true })
  })

  it('devolve { error: true } para argumentos inválidos — não lança', async () => {
    const result = await dispatchAgentTool('StubTool', { x: 'não é número' }, fakeCtx(), [stubTool])
    expect(result).toMatchObject({ error: true })
  })

  it('erro de negócio (createError) da tool também vira { error: true } via runTool', async () => {
    const throwingTool: AgentToolDefinition<Record<string, never>> = {
      name: 'Throwing',
      description: 'tool de teste',
      schema: z.object({}),
      run: async () => {
        const err = new Error('Produto indisponível.') as Error & { statusMessage?: string }
        err.statusMessage = 'Produto indisponível.'
        throw err
      },
    }
    const result = await dispatchAgentTool('Throwing', {}, fakeCtx(), [throwingTool])
    expect(result).toEqual({ error: true, message: 'Produto indisponível.' })
  })

  it('usa ALL_AGENT_TOOLS por padrão quando `tools` é omitido', async () => {
    // q vazio é inválido no schema real de BuscarProdutos — confirma que o registro padrão foi usado
    // (se a tool não fosse encontrada, o erro seria "tool desconhecida", não de validação de args).
    const result = await dispatchAgentTool('BuscarProdutos', { q: '' }, fakeCtx())
    expect(result).toMatchObject({ error: true, message: expect.stringContaining('Argumentos inválidos') })
  })
})

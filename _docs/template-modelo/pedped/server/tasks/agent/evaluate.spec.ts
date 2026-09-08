// @vitest-environment node
//
// `evaluate.ts` só usa `defineTask` como global do Nitro (não usa mais
// `useRuntimeConfig` — lê `NUXT_PUBLIC_SUPABASE_URL` direto de `process.env`,
// mesma fonte que o módulo `@nuxtjs/supabase` usaria, mas testável sem
// precisar de uma instância viva de app Nuxt). Ambiente `node`, mais leve que
// o `nuxt` padrão do projeto, sem custo de boot de app para este arquivo.
/**
 * Primeiro spec de `agent:evaluate` — foco na correção da migration 106
 * (visibilidade de tool calls): confirma que `toolTrace` chega até
 * `judgeConversation` como `toolCalls`, que `null` (turno anterior ao
 * deploy) vira `undefined` (nunca `[]` inventado), e a fiação geral do ciclo
 * (turno sem cliente_id/seq marca avaliado sem julgar, grava em
 * `agente_avaliacao`, sempre marca `avaliacao_pendente=false`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  judgeConversation: vi.fn(),
  loadJudgeWindow: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('../../utils/agent/conversationJudge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/agent/conversationJudge')>()),
  judgeConversation: mocks.judgeConversation,
}))
vi.mock('../../utils/agent/conversationHistory', () => ({ loadJudgeWindow: mocks.loadJudgeWindow }))

interface FakeRow {
  id: string
  cliente_id: string | null
  seq: number | null
  tool_trace: unknown
}

interface FakeSupabaseHandle {
  supabase: { from: ReturnType<typeof vi.fn>, rpc: ReturnType<typeof vi.fn> }
  updates: Array<{ id: string, patch: Record<string, unknown> }>
  inserts: Array<{ table: string, row: Record<string, unknown> }>
}

function fakeSupabase(pendingTurns: FakeRow[]): FakeSupabaseHandle {
  const updates: Array<{ id: string, patch: Record<string, unknown> }> = []
  const inserts: Array<{ table: string, row: Record<string, unknown> }> = []

  const from = vi.fn((table: string) => {
    if (table === 'loja') {
      return {
        select: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({
              data: { agente_modelo_avaliador: 'gpt-4.1-mini', agente_openai_key_id: 'key-1', agente_instrucoes_extra: null },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'agente_uso_tokens') {
      return {
        // fetchPendingTurns: .select().eq().order().limit()
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: pendingTurns, error: null }),
            }),
          }),
        }),
        // markEvaluated: .update(patch).eq('id', usoId)
        update: (patch: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => {
            updates.push({ id, patch })
            return Promise.resolve({ error: null })
          },
        }),
      }
    }
    if (table === 'agente_avaliacao') {
      return {
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row })
          return Promise.resolve({ error: null })
        },
      }
    }
    throw new Error(`tabela não mockada neste teste: ${table}`)
  })

  const rpc = vi.fn().mockResolvedValue({ data: 'sk-vault-key', error: null })

  return { supabase: { from, rpc }, updates, inserts }
}

/** Módulo importado UMA VEZ (cache do Vitest) — `defineTask` só é chamado no topo do arquivo, na primeira importação. */
let capturedTask: { run: () => Promise<unknown> } | null = null

async function loadTask(): Promise<{ run: () => Promise<unknown> }> {
  if (capturedTask) return capturedTask
  vi.stubGlobal('defineTask', (def: { run: () => Promise<unknown> }) => { capturedTask = def; return def })
  await import('./evaluate')
  if (!capturedTask) throw new Error('defineTask não foi chamado')
  return capturedTask
}

async function runTask(pendingTurns: FakeRow[]): Promise<FakeSupabaseHandle> {
  const handle = fakeSupabase(pendingTurns)
  mocks.createClient.mockReturnValue(handle.supabase)
  process.env.NUXT_PUBLIC_SUPABASE_URL = 'https://projeto.supabase.co'
  process.env.NUXT_SUPABASE_SECRET_KEY = 'service-role-key'

  const task = await loadTask()
  await task.run()

  return handle
}

describe('agent:evaluate — visibilidade de tool calls (migration 106)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('repassa tool_trace da linha como toolCalls para o juiz', async () => {
    mocks.loadJudgeWindow.mockResolvedValue([
      { role: 'user', content: 'quanto custa o bolo?' },
      { role: 'assistant', content: 'o bolo custa 75 reais.' },
    ])
    mocks.judgeConversation.mockResolvedValue({
      status: 'done',
      verdict: { veredicto: 'verde', achados: [] },
      tokens: 50,
    })

    const trace = [{ name: 'BuscarProdutos', args: { q: 'bolo' }, result: [{ nome: 'Bolo Aniversário', preco: 75 }] }]
    await runTask([{ id: 'uso-1', cliente_id: 'cli-1', seq: 10, tool_trace: trace }])

    expect(mocks.judgeConversation).toHaveBeenCalledWith(
      expect.anything(),
      'gpt-4.1-mini',
      expect.objectContaining({ toolCalls: trace }),
    )
  })

  it('turno sem tool_trace (anterior à migration 106) passa toolCalls undefined, nunca []', async () => {
    mocks.loadJudgeWindow.mockResolvedValue([
      { role: 'user', content: 'oi' },
      { role: 'assistant', content: 'oi, tudo bem?' },
    ])
    mocks.judgeConversation.mockResolvedValue({
      status: 'done',
      verdict: { veredicto: 'verde', achados: [] },
      tokens: 20,
    })

    await runTask([{ id: 'uso-2', cliente_id: 'cli-1', seq: 5, tool_trace: null }])

    const callArgs = mocks.judgeConversation.mock.calls[0]![2] as { toolCalls?: unknown }
    expect(callArgs.toolCalls).toBeUndefined()
  })

  it('turno sem cliente_id marca avaliado sem chamar o juiz', async () => {
    const handle = await runTask([{ id: 'uso-3', cliente_id: null, seq: null, tool_trace: null }])

    expect(mocks.loadJudgeWindow).not.toHaveBeenCalled()
    expect(mocks.judgeConversation).not.toHaveBeenCalled()
    expect(handle.updates.some((u) => u.id === 'uso-3' && u.patch.avaliacao_pendente === false)).toBe(true)
  })

  it('grava origem=producao e o veredito em agente_avaliacao', async () => {
    mocks.loadJudgeWindow.mockResolvedValue([
      { role: 'user', content: 'oi' },
      { role: 'assistant', content: 'oi!' },
    ])
    mocks.judgeConversation.mockResolvedValue({
      status: 'done',
      verdict: { veredicto: 'amarelo', achados: [{ tipo: 'tom', evidencia: 'oi!' }] },
      tokens: 30,
    })

    const handle = await runTask([{ id: 'uso-4', cliente_id: 'cli-1', seq: 7, tool_trace: [] }])

    expect(handle.inserts).toHaveLength(1)
    expect(handle.inserts[0]!.row).toMatchObject({
      origem: 'producao',
      uso_id: 'uso-4',
      status: 'done',
      veredicto: 'amarelo',
    })
  })

  it('juiz falhou: grava status judge_failed e ainda marca avaliado', async () => {
    mocks.loadJudgeWindow.mockResolvedValue([
      { role: 'user', content: 'oi' },
      { role: 'assistant', content: 'oi!' },
    ])
    mocks.judgeConversation.mockResolvedValue({ status: 'judge_failed', detail: 'JSON inválido' })

    const handle = await runTask([{ id: 'uso-5', cliente_id: 'cli-1', seq: 9, tool_trace: null }])

    expect(handle.inserts[0]!.row).toMatchObject({ status: 'judge_failed' })
    expect(handle.updates.some((u) => u.id === 'uso-5' && u.patch.avaliacao_pendente === false)).toBe(true)
  })
})

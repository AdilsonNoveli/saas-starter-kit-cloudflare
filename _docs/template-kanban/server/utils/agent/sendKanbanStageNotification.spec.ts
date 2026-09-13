import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { sendKanbanStageNotification } from './sendKanbanStageNotification'
import type { AgentQuickResponse } from '#shared/types/agentQuickResponse'

const { resolveKanbanStageQuickResponse, sendText, notifyRealtimeRoom } = vi.hoisted(() => ({
  resolveKanbanStageQuickResponse: vi.fn(),
  sendText: vi.fn(),
  notifyRealtimeRoom: vi.fn(),
}))

vi.mock('./kanbanStageQuickResponse', () => ({ resolveKanbanStageQuickResponse }))
vi.mock('../whatsapp/cloudApiClient', () => ({ sendText }))
vi.mock('../chat/chatRoom', () => ({ notifyRealtimeRoom }))

const provider = { apiToken: 'sk_live_xxx', baseUrl: 'https://api.provedor.com.br', usandoFallbackEnv: false }

const matchedRule: AgentQuickResponse = {
  id: 'rule-1',
  name: 'Confirmado',
  triggerType: 'kanban_stage',
  keywords: null,
  kanbanStageKey: 'confirmado',
  customerStatuses: null,
  replyText: 'Seu pedido foi confirmado!',
  active: true,
  sortOrder: 0,
  triggerCount: 0,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
}

function fakeSupabase() {
  const insertedRow = {
    id: 'msg-1', customer_id: 'cli-1', role: 'assistant', content: 'Seu pedido foi confirmado!',
    created_at: '2026-08-19T10:00:00.000Z', seq: 5, actor: 'sistema', status: 'pending', wamid: null, channel: 'whatsapp',
  }
  const insertSingle = vi.fn().mockResolvedValue({ data: insertedRow, error: null })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insert = vi.fn().mockReturnValue({ select: insertSelect })

  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: updateEq })

  const rpc = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn((table: string) => {
    if (table === 'whatsapp_conversations') return { insert, update }
    throw new Error(`tabela inesperada: ${table}`)
  })

  const supabase = { from, rpc } as unknown as SupabaseClient<Database>
  return { supabase, insert, update, updateEq, rpc, insertedRow }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sendKanbanStageNotification', () => {
  it('nenhuma regra bate: não grava nada, não chama sendText', async () => {
    resolveKanbanStageQuickResponse.mockResolvedValue(null)
    const { supabase, insert } = fakeSupabase()

    await sendKanbanStageNotification(supabase, provider, undefined, {
      clienteId: 'cli-1', telefone: '5511988888888', lid: null, kanbanStageKey: 'confirmado', customerStatus: null,
    })

    expect(insert).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })

  it('regra bate: grava com ator sistema, envia via sendText, atualiza status sent', async () => {
    resolveKanbanStageQuickResponse.mockResolvedValue(matchedRule)
    sendText.mockResolvedValue('wamid.ABC')
    const { supabase, insert, update, updateEq, rpc } = fakeSupabase()

    await sendKanbanStageNotification(supabase, provider, undefined, {
      clienteId: 'cli-1', telefone: '5511988888888', lid: null, kanbanStageKey: 'confirmado', customerStatus: null,
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      customer_id: 'cli-1',
      role: 'assistant',
      content: 'Seu pedido foi confirmado!',
      actor: 'sistema',
      status: 'pending',
    }))
    expect(sendText).toHaveBeenCalledWith(provider, { telefone: '5511988888888', lid: null }, 'Seu pedido foi confirmado!')
    expect(update).toHaveBeenCalledWith({ status: 'sent', wamid: 'wamid.ABC' })
    expect(updateEq).toHaveBeenCalledWith('id', 'msg-1')
    expect(notifyRealtimeRoom).toHaveBeenCalledWith(undefined, expect.objectContaining({
      topic: 'chat.message',
      payload: expect.objectContaining({ ator: 'sistema', status: 'sent' }),
    }))
    expect(rpc).toHaveBeenCalledWith('increment_agent_quick_response_usage', { p_rule_id: 'rule-1' })
  })

  it('sem telefone (cliente lid-only): não tenta enviar nem gravar', async () => {
    resolveKanbanStageQuickResponse.mockResolvedValue(matchedRule)
    const { supabase, insert } = fakeSupabase()

    await sendKanbanStageNotification(supabase, provider, undefined, {
      clienteId: 'cli-1', telefone: null, lid: 'BR.123', kanbanStageKey: 'confirmado', customerStatus: null,
    })

    expect(insert).not.toHaveBeenCalled()
    expect(sendText).not.toHaveBeenCalled()
  })

  it('falha do sendText: não lança, marca status failed, ainda notifica o socket', async () => {
    resolveKanbanStageQuickResponse.mockResolvedValue(matchedRule)
    sendText.mockRejectedValue(new Error('Cloud API indisponível'))
    const { supabase, update } = fakeSupabase()

    await expect(sendKanbanStageNotification(supabase, provider, undefined, {
      clienteId: 'cli-1', telefone: '5511988888888', lid: null, kanbanStageKey: 'confirmado', customerStatus: null,
    })).resolves.toBeUndefined()

    expect(update).toHaveBeenCalledWith({ status: 'failed', wamid: null })
  })

  it('exceção inesperada em qualquer ponto não escapa (best-effort de ponta a ponta)', async () => {
    resolveKanbanStageQuickResponse.mockRejectedValue(new Error('falha total'))
    const { supabase } = fakeSupabase()

    await expect(sendKanbanStageNotification(supabase, provider, undefined, {
      clienteId: 'cli-1', telefone: '5511988888888', lid: null, kanbanStageKey: 'confirmado', customerStatus: null,
    })).resolves.toBeUndefined()
  })
})

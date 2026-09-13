import { describe, it, expect, vi } from 'vitest'
import { enviarBotaoCatalogoTool } from './catalog'
import type { AgentToolContext } from '../toolContext'

function fakeCtx(
  sendChoiceButtons = vi.fn().mockResolvedValue(undefined),
  whatsapp = '5511999999999',
): AgentToolContext {
  return {
    supabase: {} as AgentToolContext['supabase'],
    sessaoId: 'sessao-1',
    clienteId: null,
    whatsapp,
    catalogoUrl: 'https://loja.exemplo/c/sessao-1',
    googleMapsServerKey: 'key',
    sendChoiceButtons,
  }
}

describe('EnviarBotaoCatalogo — schema', () => {
  it('body é opcional', () => {
    expect(enviarBotaoCatalogoTool.schema.safeParse({}).success).toBe(true)
    expect(enviarBotaoCatalogoTool.schema.safeParse({ body: 'Confira!' }).success).toBe(true)
  })
})

describe('EnviarBotaoCatalogo — run', () => {
  it('envia UMA mensagem com os dois botões, com o texto do cliente', async () => {
    const sendChoiceButtons = vi.fn().mockResolvedValue(undefined)
    await enviarBotaoCatalogoTool.run({ body: 'Confira o cardápio!' }, fakeCtx(sendChoiceButtons))
    expect(sendChoiceButtons).toHaveBeenCalledWith({ body: 'Confira o cardápio!' })
    expect(sendChoiceButtons).toHaveBeenCalledTimes(1)
  })

  it('usa o texto padrão quando body vem vazio — agnóstico de segmento, sem a palavra "catálogo"', async () => {
    const sendChoiceButtons = vi.fn().mockResolvedValue(undefined)
    await enviarBotaoCatalogoTool.run({}, fakeCtx(sendChoiceButtons))
    expect(sendChoiceButtons).toHaveBeenCalledWith({ body: 'Toque para ver tudo que a gente tem, ou pra fechar o pedido comigo agora mesmo:' })
  })
})

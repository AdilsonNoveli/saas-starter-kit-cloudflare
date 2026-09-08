import { describe, it, expect, vi } from 'vitest'
import { enviarBotaoCatalogoTool } from './catalog'
import type { AgentToolContext } from '../toolContext'

function fakeCtx(sendCatalogButton = vi.fn().mockResolvedValue(undefined)): AgentToolContext {
  return {
    supabase: {} as AgentToolContext['supabase'],
    sessaoId: 'sessao-1',
    clienteId: null,
    whatsapp: '5511999999999',
    catalogoUrl: 'https://loja.exemplo/c/sessao-1',
    googleMapsServerKey: 'key',
    sendCatalogButton,
  }
}

describe('EnviarBotaoCatalogo — schema', () => {
  it('body é opcional', () => {
    expect(enviarBotaoCatalogoTool.schema.safeParse({}).success).toBe(true)
    expect(enviarBotaoCatalogoTool.schema.safeParse({ body: 'Confira!' }).success).toBe(true)
  })
})

describe('EnviarBotaoCatalogo — run', () => {
  it('envia com o texto do cliente quando informado', async () => {
    const sendCatalogButton = vi.fn().mockResolvedValue(undefined)
    await enviarBotaoCatalogoTool.run({ body: 'Confira o cardápio!' }, fakeCtx(sendCatalogButton))
    expect(sendCatalogButton).toHaveBeenCalledWith({ body: 'Confira o cardápio!' })
  })

  it('usa o texto padrão quando body vem vazio — agnóstico de segmento, sem a palavra "catálogo"', async () => {
    const sendCatalogButton = vi.fn().mockResolvedValue(undefined)
    await enviarBotaoCatalogoTool.run({}, fakeCtx(sendCatalogButton))
    expect(sendCatalogButton).toHaveBeenCalledWith({ body: 'Toque para ver tudo que a gente tem:' })
  })
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '~/types/database.types'
import { handleButtonReply } from './handleButtonReply'
import { CHOICE_BUTTON_CATALOG_ID, CHOICE_BUTTON_EXPRESS_ID } from './cloudApiClient'
import type { ParsedInboundMessage } from './parseInboundPayload'

const { findOrCreateCustomer, getOrCreateActiveSession, markReadAndTyping, sendCatalogButton, sendExpressCheckoutButton } = vi.hoisted(() => ({
  findOrCreateCustomer: vi.fn(async () => ({ id: 'cliente-1', nome: 'Cliente', telefoneWhatsapp: '5511940204449', whatsappLid: null, isNew: false })),
  getOrCreateActiveSession: vi.fn(async () => ({ sessaoId: 'sessao-1', url: 'https://loja.exemplo/catalog?sessao=sessao-1' })),
  markReadAndTyping: vi.fn(async () => {}),
  sendCatalogButton: vi.fn(async () => 'wamid.OUT1'),
  sendExpressCheckoutButton: vi.fn(async () => 'wamid.OUT2'),
}))

vi.mock('../customers/findOrCreateCustomer', () => ({ findOrCreateCustomer }))
vi.mock('../sessions/createCatalogSession', () => ({ getOrCreateActiveSession }))
vi.mock('./cloudApiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./cloudApiClient')>()),
  markReadAndTyping,
  sendCatalogButton,
  sendExpressCheckoutButton,
}))

const provider = { apiToken: 'sk_live_xxx', baseUrl: 'https://api.provedor.com.br' }
const supabase = {} as SupabaseClient<Database>

function message(overrides: Partial<ParsedInboundMessage> = {}): ParsedInboundMessage {
  return {
    telefone: '5511940204449',
    wamid: 'wamid.BTN1',
    timestamp: '1700000000',
    tipo: 'interactive',
    texto: null,
    midia: null,
    nomeContato: 'Cliente Teste',
    waId: '5511940204449',
    userId: 'BR.1892507442136090',
    phoneNumberId: '123456789',
    botaoRespondidoId: CHOICE_BUTTON_CATALOG_ID,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  findOrCreateCustomer.mockResolvedValue({ id: 'cliente-1', nome: 'Cliente', telefoneWhatsapp: '5511940204449', whatsappLid: null, isNew: false })
  getOrCreateActiveSession.mockResolvedValue({ sessaoId: 'sessao-1', url: 'https://loja.exemplo/catalog?sessao=sessao-1' })
})

describe('handleButtonReply — despacho determinístico do toque em sendChoiceButtons (sem migration de schema)', () => {
  it('botão "ver itens": resolve cliente/sessão e manda o cta_url do catálogo, sem &chat=1', async () => {
    await handleButtonReply({ supabase, provider }, message({ botaoRespondidoId: CHOICE_BUTTON_CATALOG_ID }))

    expect(markReadAndTyping).toHaveBeenCalledWith(provider, 'wamid.BTN1')
    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, { whatsapp: '5511940204449', lid: 'BR.1892507442136090' })
    expect(getOrCreateActiveSession).toHaveBeenCalledWith(supabase, 'cliente-1')
    expect(sendCatalogButton).toHaveBeenCalledWith(provider, {
      recipient: { telefone: '5511940204449', lid: 'BR.1892507442136090' },
      body: expect.any(String),
      buttonUrl: 'https://loja.exemplo/catalog?sessao=sessao-1',
    })
    expect(sendExpressCheckoutButton).not.toHaveBeenCalled()
  })

  it('botão "compra rápida": manda o cta_url da Compra Expressa com &chat=1 na mesma sessão', async () => {
    await handleButtonReply({ supabase, provider }, message({ botaoRespondidoId: CHOICE_BUTTON_EXPRESS_ID }))

    expect(sendExpressCheckoutButton).toHaveBeenCalledWith(provider, {
      recipient: { telefone: '5511940204449', lid: 'BR.1892507442136090' },
      body: expect.any(String),
      buttonUrl: 'https://loja.exemplo/catalog?sessao=sessao-1&chat=1',
    })
    expect(sendCatalogButton).not.toHaveBeenCalled()
  })

  it('id desconhecido: marca como lida mas não resolve cliente nem envia nada — não é erro', async () => {
    await handleButtonReply({ supabase, provider }, message({ botaoRespondidoId: 'algum_id_antigo' }))

    expect(markReadAndTyping).toHaveBeenCalledWith(provider, 'wamid.BTN1')
    expect(findOrCreateCustomer).not.toHaveBeenCalled()
    expect(sendCatalogButton).not.toHaveBeenCalled()
    expect(sendExpressCheckoutButton).not.toHaveBeenCalled()
  })
})

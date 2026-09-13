import { describe, it, expect } from 'vitest'
import { resolveNextAction, type ResolveNextActionInput } from './resolveNextAction'
import type { IntegrationMissingField } from '#shared/types/integration'

const missing = (field: string, scope: IntegrationMissingField['scope'] = 'order'): IntegrationMissingField[] => [
  { scope, field, prompt: field },
]

/** Entrada neutra: nenhum sinal ativo (cai no fallback). */
function base(): ResolveNextActionInput {
  return {
    actionRequired: null,
    storeOpen: true,
    currentFlow: 'general',
    needsProductSearch: false,
    quantityLimits: null,
    needsCalendarValidation: false,
    preorderProductId: null,
    agendaMonth: '2026-07',
    missingFields: [],
    hasCartItems: false,
    savedAddress: null,
    paymentMethods: ['pix', 'dinheiro', 'cartao'],
    canFinalize: false,
    note: null,
  }
}

describe('resolveNextAction — prioridade fixa (13 codes)', () => {
  it('COLLECT_WHATSAPP vence tudo', () => {
    const r = resolveNextAction({ ...base(), actionRequired: 'collect_whatsapp', needsProductSearch: true })
    expect(r.code).toBe('COLLECT_WHATSAPP')
  })

  it('STORE_CLOSED só no fluxo stock com loja fechada', () => {
    expect(resolveNextAction({ ...base(), storeOpen: false, currentFlow: 'stock' }).code).toBe('STORE_CLOSED')
    // Loja fechada fora de stock não bloqueia (cai no próximo sinal).
    expect(resolveNextAction({ ...base(), storeOpen: false, currentFlow: 'general', needsProductSearch: true }).code).toBe('SEARCH_PRODUCT')
  })

  it('SEARCH_PRODUCT carrega a tool BuscarProdutos', () => {
    const r = resolveNextAction({ ...base(), needsProductSearch: true })
    expect(r.code).toBe('SEARCH_PRODUCT')
    expect(r.tool).toBe('BuscarProdutos')
  })

  it('SEARCH_PRODUCT não ordena tool incondicionalmente — ressalva de saudação pura (regressão 05/08)', () => {
    // Bug real de produção: carrinho vazio é verdade tanto logo após "boa
    // tarde" quanto logo após "quero uma pizza" — a instrução antiga
    // ("chame BuscarProdutos antes de responder qualquer coisa") não
    // distinguia os dois casos e, por vir por último no prompt (>>> PROXIMO
    // PASSO OBRIGATORIO), pesava mais que a exceção de conversa social pura
    // da REGRA 2. O agente empurrava produto/catálogo até numa saudação.
    const r = resolveNextAction({ ...base(), needsProductSearch: true })
    expect(r.instruction).toContain('cumprimentou')
    expect(r.instruction).toContain('NAO chame nenhuma tool')
  })

  it('fallback (nenhum sinal ativo) também carrega a mesma ressalva de saudação pura', () => {
    const r = resolveNextAction(base())
    expect(r.code).toBe('SEARCH_PRODUCT')
    expect(r.instruction).toContain('saudacao')
    expect(r.instruction).toContain('NAO chame tool nenhuma')
  })

  it('FIX_QUANTITY quando a quantidade está fora dos limites', () => {
    const r = resolveNextAction({ ...base(), quantityLimits: { min: 5, max: 20 } })
    expect(r.code).toBe('FIX_QUANTITY')
    expect(r.instruction).toContain('minimo 5')
  })

  it('VALIDATE_DATE quando encomenda exige validação de agenda', () => {
    const r = resolveNextAction({ ...base(), needsCalendarValidation: true, preorderProductId: 'p1' })
    expect(r.code).toBe('VALIDATE_DATE')
    expect(r.tool).toBe('ConsultarDatasEncomenda')
  })

  it('ASK_ITEM_TEXT (migration 127) quando missing_fields tem texto_personalizacao scope=item — a app decide QUANDO perguntar, o modelo só executa (regressão real: MANGA LONGA misturou isso com a pergunta de quantidade)', () => {
    const r = resolveNextAction({ ...base(), missingFields: missing('texto_personalizacao', 'item'), hasCartItems: true })
    expect(r.code).toBe('ASK_ITEM_TEXT')
    expect(r.tool).toBeNull()
    expect(r.instruction).toContain('mensagem PROPRIA')
  })

  it('ASK_ITEM_ART (migration 127) quando missing_fields tem arquivo_arte scope=item', () => {
    const r = resolveNextAction({ ...base(), missingFields: missing('arquivo_arte', 'item'), hasCartItems: true })
    expect(r.code).toBe('ASK_ITEM_ART')
    expect(r.tool).toBeNull()
  })

  it('ASK_ITEM_TEXT/ASK_ITEM_ART vencem ASK_MODALITY e CONFIRM_ORDER — resolve o item antes de seguir pro pedido', () => {
    const r = resolveNextAction({
      ...base(),
      missingFields: [...missing('texto_personalizacao', 'item'), ...missing('delivery_mode')],
      hasCartItems: true,
    })
    expect(r.code).toBe('ASK_ITEM_TEXT')
  })

  it('ASK_MODALITY quando missing_fields tem delivery_mode', () => {
    expect(resolveNextAction({ ...base(), missingFields: missing('delivery_mode') }).code).toBe('ASK_MODALITY')
  })

  it('entrega com endereço salvo confirma; nunca geocoda (aceite #4)', () => {
    const r = resolveNextAction({
      ...base(),
      missingFields: missing('address_id'),
      savedAddress: { formatted: 'Rua X, 79', id: 'end-1' },
    })
    expect(r.code).toBe('CONFIRM_SAVED_ADDRESS')
    expect(r.code).not.toBe('GEOCODE_ADDRESS')
    expect(r.instruction).toContain('endereco_id=end-1')
  })

  it('entrega sem endereço salvo geocoda', () => {
    const r = resolveNextAction({ ...base(), missingFields: missing('address_id'), savedAddress: null })
    expect(r.code).toBe('GEOCODE_ADDRESS')
    expect(r.tool).toBe('ConsultarEnderecoEntrega')
  })

  it('ASK_PAYMENT quando missing_fields tem payment_method', () => {
    const r = resolveNextAction({ ...base(), missingFields: missing('payment_method') })
    expect(r.code).toBe('ASK_PAYMENT')
    expect(r.instruction).toContain('pix, dinheiro, cartao')
  })

  it('CONFIRM_ORDER quando nada falta e há itens no carrinho', () => {
    const r = resolveNextAction({ ...base(), missingFields: [], hasCartItems: true })
    expect(r.code).toBe('CONFIRM_ORDER')
  })

  it('pendência item-scoped não dispara ASK_MODALITY nem CONFIRM_ORDER (EPIC 3 ainda não consome)', () => {
    const r = resolveNextAction({ ...base(), missingFields: missing('target_date', 'item'), hasCartItems: true })
    expect(r.code).toBe('CONFIRM_ORDER')
  })

  it('FINALIZE aponta para a tool única do carrinho unificado', () => {
    const r = resolveNextAction({ ...base(), canFinalize: true })
    expect(r.code).toBe('FINALIZE')
    expect(r.tool).toBe('FinalizarPedido')
  })

  it('propaga a nota (aviso de carrinho pendente) sem alterar o code', () => {
    const r = resolveNextAction({ ...base(), missingFields: missing('delivery_mode'), note: 'aviso' })
    expect(r.code).toBe('ASK_MODALITY')
    expect(r.note).toBe('aviso')
  })

  it('fallback determinístico quando nada bate', () => {
    const r = resolveNextAction(base())
    expect(r.code).toBe('SEARCH_PRODUCT')
    expect(r.tool).toBe('BuscarProdutos')
  })
})

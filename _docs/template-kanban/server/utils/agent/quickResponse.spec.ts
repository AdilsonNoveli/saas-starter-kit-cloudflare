/**
 * Motor de decisão das Respostas Rápidas — função pura, mesmo estilo de
 * `greeting.spec.ts`/`transbordoHeuristic.spec.ts`.
 */
import { describe, expect, it } from 'vitest'
import { requiresFirstMessageLookup, requiresStatusLookup, resolveQuickResponse } from './quickResponse'
import type { AgentQuickResponse } from '#shared/types/agentQuickResponse'

function rule(overrides: Partial<AgentQuickResponse> = {}): AgentQuickResponse {
  return {
    id: 'rule-1',
    name: 'Regra de teste',
    triggerType: 'greeting',
    keywords: null,
    kanbanStageKey: null,
    customerStatuses: null,
    replyText: 'Oi! Bem-vindo.',
    active: true,
    sortOrder: 0,
    triggerCount: 0,
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
    ...overrides,
  }
}

describe('resolveQuickResponse', () => {
  it('nenhuma regra bate → null (cai no fluxo atual sem mudança)', () => {
    const result = resolveQuickResponse({
      text: 'quero uma pizza de calabresa',
      status: null,
      isFirstMessage: null,
      rules: [rule({ triggerType: 'greeting' })],
    })
    expect(result).toBeNull()
  })

  it('greeting: dispara quando a fala é saudação pura', () => {
    const target = rule({ id: 'greeting-rule', triggerType: 'greeting' })
    const result = resolveQuickResponse({
      text: 'oi, tudo bem?',
      status: null,
      isFirstMessage: null,
      rules: [target],
    })
    expect(result?.id).toBe('greeting-rule')
  })

  it('first_message: dispara só quando isFirstMessage é true', () => {
    const target = rule({ id: 'first-rule', triggerType: 'first_message' })
    expect(resolveQuickResponse({ text: 'oi', status: null, isFirstMessage: true, rules: [target] })?.id).toBe('first-rule')
    expect(resolveQuickResponse({ text: 'oi', status: null, isFirstMessage: false, rules: [target] })).toBeNull()
    expect(resolveQuickResponse({ text: 'oi', status: null, isFirstMessage: null, rules: [target] })).toBeNull()
  })

  it('keyword: substring case-insensitive', () => {
    const target = rule({ id: 'kw-rule', triggerType: 'keyword', keywords: ['cardápio', 'menu'] })
    const result = resolveQuickResponse({
      text: 'vocês têm CARDÁPIO disponível?',
      status: null,
      isFirstMessage: null,
      rules: [target],
    })
    expect(result?.id).toBe('kw-rule')
  })

  it('keyword: acento não impede o match nem no termo cadastrado nem na fala do cliente', () => {
    const target = rule({ id: 'kw-rule', triggerType: 'keyword', keywords: ['cardapio'] })
    expect(resolveQuickResponse({ text: 'qual o cardápio de hoje', status: null, isFirstMessage: null, rules: [target] })?.id).toBe('kw-rule')
  })

  it('triggerType desconhecido nunca bate e não lança', () => {
    const target = rule({ triggerType: 'fora_do_horario' as AgentQuickResponse['triggerType'] })
    expect(() => resolveQuickResponse({ text: 'qualquer coisa', status: null, isFirstMessage: null, rules: [target] })).not.toThrow()
    expect(resolveQuickResponse({ text: 'qualquer coisa', status: null, isFirstMessage: null, rules: [target] })).toBeNull()
  })

  it('kanban_stage: gatilho outbound válido, mas nunca bate no motor inbound (matcher separado)', () => {
    const target = rule({ triggerType: 'kanban_stage', kanbanStageKey: 'confirmado' })
    expect(resolveQuickResponse({ text: 'qualquer coisa', status: null, isFirstMessage: null, rules: [target] })).toBeNull()
  })

  it('regra inativa (active=false) nunca é considerada', () => {
    const target = rule({ id: 'inactive-rule', triggerType: 'greeting', active: false })
    expect(resolveQuickResponse({ text: 'oi', status: null, isFirstMessage: null, rules: [target] })).toBeNull()
  })

  it('customerStatuses vazio/null bate para qualquer status', () => {
    const target = rule({ id: 'any-status-rule', triggerType: 'greeting', customerStatuses: null })
    expect(resolveQuickResponse({ text: 'oi', status: 'VIP', isFirstMessage: null, rules: [target] })?.id).toBe('any-status-rule')
    expect(resolveQuickResponse({ text: 'oi', status: null, isFirstMessage: null, rules: [target] })?.id).toBe('any-status-rule')
  })

  it('customerStatuses preenchido só bate quando o status do cliente está na lista', () => {
    const target = rule({ id: 'novo-only', triggerType: 'greeting', customerStatuses: ['Novo'] })
    expect(resolveQuickResponse({ text: 'oi', status: 'Novo', isFirstMessage: null, rules: [target] })?.id).toBe('novo-only')
    expect(resolveQuickResponse({ text: 'oi', status: 'VIP', isFirstMessage: null, rules: [target] })).toBeNull()
    expect(resolveQuickResponse({ text: 'oi', status: null, isFirstMessage: null, rules: [target] })).toBeNull()
  })

  it('várias regras batem: a primeira por sortOrder vence, independente da ordem no array', () => {
    const second = rule({ id: 'second', triggerType: 'greeting', sortOrder: 2, replyText: 'segunda' })
    const first = rule({ id: 'first', triggerType: 'greeting', sortOrder: 1, replyText: 'primeira' })
    const result = resolveQuickResponse({ text: 'oi', status: null, isFirstMessage: null, rules: [second, first] })
    expect(result?.id).toBe('first')
  })

  it('regra mais específica (status) antes da genérica, se ordenada primeiro', () => {
    const vip = rule({ id: 'vip-greeting', triggerType: 'greeting', sortOrder: 1, customerStatuses: ['VIP'] })
    const generic = rule({ id: 'generic-greeting', triggerType: 'greeting', sortOrder: 2, customerStatuses: null })
    expect(resolveQuickResponse({ text: 'oi', status: 'VIP', isFirstMessage: null, rules: [generic, vip] })?.id).toBe('vip-greeting')
    expect(resolveQuickResponse({ text: 'oi', status: 'Novo', isFirstMessage: null, rules: [generic, vip] })?.id).toBe('generic-greeting')
  })
})

describe('requiresStatusLookup', () => {
  it('false quando nenhuma regra ativa tem customerStatuses', () => {
    expect(requiresStatusLookup([rule({ customerStatuses: null }), rule({ customerStatuses: [] })])).toBe(false)
  })

  it('true quando alguma regra ativa tem customerStatuses preenchido', () => {
    expect(requiresStatusLookup([rule({ customerStatuses: null }), rule({ customerStatuses: ['VIP'] })])).toBe(true)
  })

  it('ignora regra inativa mesmo com customerStatuses preenchido', () => {
    expect(requiresStatusLookup([rule({ customerStatuses: ['VIP'], active: false })])).toBe(false)
  })
})

describe('requiresFirstMessageLookup', () => {
  it('false quando nenhuma regra ativa usa first_message', () => {
    expect(requiresFirstMessageLookup([rule({ triggerType: 'greeting' }), rule({ triggerType: 'keyword' })])).toBe(false)
  })

  it('true quando alguma regra ativa usa first_message', () => {
    expect(requiresFirstMessageLookup([rule({ triggerType: 'greeting' }), rule({ triggerType: 'first_message' })])).toBe(true)
  })

  it('ignora regra inativa mesmo usando first_message', () => {
    expect(requiresFirstMessageLookup([rule({ triggerType: 'first_message', active: false })])).toBe(false)
  })
})

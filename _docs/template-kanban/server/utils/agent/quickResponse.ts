/**
 * Motor de decisão das Respostas Rápidas do Agente IA — função pura, sem
 * I/O, mesmo espírito de `transbordoHeuristic.ts`/`greeting.ts`: decide sem
 * chamar o modelo, custo zero de CPU.
 *
 * Roda em `server/plugins/whatsapp-queue.ts`, entre `detectPromptInjection`
 * e `isPureGreeting` — regra do lojista tem prioridade sobre o
 * comportamento padrão do sistema (`GREETING_REPLY` genérico), mas nunca
 * sobre a proteção de injeção (segurança sempre primeiro).
 *
 * Avaliação preguiçosa em duas camadas (quem chama `resolveQuickResponse`
 * decide o que vale a pena buscar ANTES, usando `requiresStatusLookup`/
 * `requiresFirstMessageLookup`): uma loja sem nenhuma regra ativa nunca
 * entra aqui; uma regra que não precisa de status/primeira-mensagem nunca
 * paga a query correspondente. Isso protege lojas que não configuraram nada
 * de qualquer regressão de custo — mesma motivação documentada em
 * `greeting.ts` para não pagar `getCustomerContext` à toa.
 */
import { deaccent } from './guardrails'
import { isPureGreeting } from './greeting'
import { logger } from '~/core/services/logger.service'
import type { AgentQuickResponse, CustomerStatus } from '#shared/types/agentQuickResponse'

export interface ResolveQuickResponseInput {
  /** Texto do turno já concatenado da rajada — mesmo texto que `isPureGreeting`/`detectPromptInjection` recebem. */
  readonly text: string
  /** `null` quando `requiresStatusLookup(rules)` for `false` — nenhuma regra ativa precisa disso. */
  readonly status: CustomerStatus | null
  /** `null` quando `requiresFirstMessageLookup(rules)` for `false`. */
  readonly isFirstMessage: boolean | null
  /** Regras ativas da loja, carregadas uma vez por lote — não precisa vir ordenada, `resolveQuickResponse` ordena. */
  readonly rules: readonly AgentQuickResponse[]
}

/** `true` se QUALQUER regra ativa precisar do status do cliente — decide se vale a pena pagar o SELECT em `clientes`. */
export function requiresStatusLookup(rules: readonly AgentQuickResponse[]): boolean {
  return rules.some((r) => r.active && (r.customerStatuses?.length ?? 0) > 0)
}

/** `true` se QUALQUER regra ativa usar o gatilho `first_message` — decide se vale a pena pagar o EXISTS em `whatsapp_conversas`. */
export function requiresFirstMessageLookup(rules: readonly AgentQuickResponse[]): boolean {
  return rules.some((r) => r.active && r.triggerType === 'first_message')
}

function situationMatches(rule: AgentQuickResponse, text: string, isFirstMessage: boolean | null): boolean {
  switch (rule.triggerType) {
    case 'greeting':
      return isPureGreeting(text)
    case 'first_message':
      // `isFirstMessage` só é `null` se o chamador não seguiu o protocolo de
      // avaliação preguiçosa (não deveria acontecer, dado `requiresFirstMessageLookup`
      // acima) — nunca dispara a regra por engano nesse caso, só fica inerte.
      return isFirstMessage === true
    case 'keyword': {
      const normalized = deaccent(text).toLowerCase()
      return (rule.keywords ?? []).some((term) => normalized.includes(deaccent(term).toLowerCase()))
    }
    case 'kanban_stage':
      // Gatilho OUTBOUND (dispara em `status.put.ts` quando o pedido muda de
      // coluna, ver `kanbanStageQuickResponse.ts`) — nunca bate aqui, no motor
      // de mensagem INBOUND. Não é "desconhecido": vocabulário válido, só não
      // pertence a este matcher. Sem warning, é o comportamento esperado.
      return false
    default:
      // trigger_type desconhecido (schema não tem CHECK de propósito, ver
      // migration 120) — defensivo: a regra fica inerte, nunca derruba o turno.
      logger.warn('[agent] quick response com trigger_type desconhecido, ignorada', {
        ruleId: rule.id,
        triggerType: rule.triggerType,
      })
      return false
  }
}

/** Exportada para reaproveito por `kanbanStageQuickResponse.ts` — mesma regra de status, matcher de situação diferente. */
export function statusMatches(rule: AgentQuickResponse, status: CustomerStatus | null): boolean {
  if (!rule.customerStatuses || rule.customerStatuses.length === 0) return true
  return status !== null && rule.customerStatuses.includes(status)
}

/**
 * Primeira regra ATIVA (ordenada por `sortOrder` ascendente) cuja situação E
 * status batem, ou `null` se nenhuma bater — cai no fluxo atual sem
 * nenhuma mudança (`isPureGreeting` continua o fallback padrão do sistema).
 */
export function resolveQuickResponse(input: ResolveQuickResponseInput): AgentQuickResponse | null {
  const active = input.rules.filter((r) => r.active).slice().sort((a, b) => a.sortOrder - b.sortOrder)

  for (const rule of active) {
    if (situationMatches(rule, input.text, input.isFirstMessage) && statusMatches(rule, input.status)) {
      return rule
    }
  }

  return null
}

/**
 * Wrapper único de execução de tool do agente (seção 4 da arquitetura do
 * agente WhatsApp). Erro de negócio esperado (`createError()` das funções de
 * domínio — endereço fora do raio, produto indisponível, capacidade de
 * encomenda esgotada) vira DADO que volta pro LLM interpretar, em vez de
 * derrubar o turno inteiro. Porte literal da seção 4 — não alterar a forma
 * sem atualizar o texto da REGRA 4 em `systemPrompt.ts` (o modelo é
 * instruído a nunca expor isto ao cliente).
 */
import { logger } from '~/core/services/logger.service'

export interface AgentToolError {
  readonly error: true
  readonly message: string
  /**
   * HTTP status da falha original, quando disponível. `undefined` para erro
   * sem `createError()` (`throw new Error(...)` puro). Discrimina, fora deste
   * módulo, erro de negócio explicável (400/409/422 — REGRA 4) de falha
   * técnica/infra (5xx) que nunca deve virar frase pro cliente — ver
   * `technicalEscalation.ts`.
   */
  readonly statusCode?: number
}

/**
 * `toolName` só serve para logar — sem ele, uma tool que falha (ex.:
 * `ConsultarEnderecoEntrega` com endereço não encontrado) não deixa NENHUM
 * rastro em `wrangler tail`, o que já causou confusão em produção sobre se a
 * tool tinha sido chamada ou não (04/08).
 */
export async function runTool<T>(fn: () => Promise<T>, toolName?: string): Promise<T | AgentToolError> {
  try {
    return await fn()
  } catch (e) {
    const err = e as { statusMessage?: string; statusCode?: number }
    logger.warn('[agent] tool falhou', { tool: toolName, statusCode: err.statusCode, message: err.statusMessage })
    return {
      error: true,
      message: err.statusMessage ?? 'Erro ao processar a solicitação.',
      ...(err.statusCode !== undefined ? { statusCode: err.statusCode } : {}),
    }
  }
}

export function isAgentToolError(value: unknown): value is AgentToolError {
  return typeof value === 'object' && value !== null && (value as { error?: unknown }).error === true
}

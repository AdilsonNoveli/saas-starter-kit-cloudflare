/**
 * Camada 5 (defesa em profundidade, após guardrails.ts) — falha TÉCNICA não
 * resolvida dentro do turno. Backstop determinístico: `TECHNICAL_ERROR_NOTE`
 * (`systemPrompt.ts`) já instrui o modelo a nunca contar isso ao cliente e a
 * tentar de novo sozinho, mas prompt não é garantia — este módulo é o que
 * garante de verdade, sem depender do modelo ter obedecido.
 *
 * Dois sinais, cada um suficiente sozinho:
 *
 * 1. Qualquer tool devolveu 5xx — sempre bug/infra, nunca informação de
 *    negócio (a REGRA 4 só cobre a banda 400/409/422 como "explicável").
 * 2. A ÚLTIMA chamada de `DefinirItemCarrinho` do turno (por ORDEM, não por
 *    `produto_id` — um retry legítimo troca de id, já que o id antigo era o
 *    problema) terminou em erro, e o erro NÃO é "Produto indisponível" (essa
 *    é informação de negócio legítima — o modelo já deve ter contado ao
 *    cliente). Turno cujo retry corrigiu o id e teve sucesso por último NÃO
 *    escala (self-heal genuíno); turno que terminou sem nenhum retry
 *    bem-sucedido escala — exatamente o caso medido em produção 05/08
 *    (pizza/esfiha somem do carrinho e o cliente recebe uma desculpa em vez
 *    do item).
 */
import { isAgentToolError, type AgentToolError } from './runTool'

export interface AgentToolCallTrace {
  readonly name: string
  readonly args: unknown
  readonly result: unknown
}

export interface TechnicalEscalationCheck {
  readonly deveEscalar: boolean
  /** Só para log — nunca exposto ao cliente. */
  readonly motivo?: string
}

const NEGOCIO_LEGITIMO = new Set<string>(['Produto indisponível.'])

function produtoIdDe(args: unknown): string | undefined {
  const parsed = args as { produto_id?: unknown } | undefined
  return typeof parsed?.produto_id === 'string' ? parsed.produto_id : undefined
}

export function checkUnresolvedTechnicalFailure(
  trace: readonly AgentToolCallTrace[],
): TechnicalEscalationCheck {
  for (const call of trace) {
    if (isAgentToolError(call.result)) {
      const erro = call.result as AgentToolError
      if (typeof erro.statusCode === 'number' && erro.statusCode >= 500) {
        return { deveEscalar: true, motivo: `${call.name}: falha ${erro.statusCode} (${erro.message})` }
      }
    }
  }

  // Por ORDEM de chamada, não por produto_id: um retry que corrige o item
  // troca de id (o id antigo era o próprio problema), então "a última
  // tentativa deste id" nunca veria o retry bem-sucedido.
  let ultimaFalhaCarrinho: { produtoId: string | undefined, erro: AgentToolError } | null = null
  for (const call of trace) {
    if (call.name !== 'DefinirItemCarrinho') continue
    if (isAgentToolError(call.result)) {
      ultimaFalhaCarrinho = { produtoId: produtoIdDe(call.args), erro: call.result as AgentToolError }
    } else {
      ultimaFalhaCarrinho = null
    }
  }

  if (ultimaFalhaCarrinho && !NEGOCIO_LEGITIMO.has(ultimaFalhaCarrinho.erro.message)) {
    return {
      deveEscalar: true,
      motivo: `DefinirItemCarrinho: produto_id ${ultimaFalhaCarrinho.produtoId ?? '?'} não resolvido (${ultimaFalhaCarrinho.erro.message})`,
    }
  }

  return { deveEscalar: false }
}

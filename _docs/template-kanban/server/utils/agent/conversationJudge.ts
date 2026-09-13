/**
 * Juiz unificado de qualidade de conversa — LLM-as-a-Judge por
 * janela/conversa (`_docs/implementar/prd-laboratorio-avaliacao-agente.md`
 * §3). Substitui `evaluator.ts` (avaliação por par isolado) por completo —
 * mesmo módulo alimenta os dois gatilhos: amostragem contínua de produção
 * (`server/tasks/agent/evaluate.ts`) e corrida sob demanda do laboratório.
 *
 * Módulo puro: sem dependência de WhatsApp, Supabase ou H3. Quem decide o
 * modelo e a chave é o chamador.
 *
 * **Por que Zod em vez de JSON.parse + cast?** O modelo pode devolver JSON
 * malformado ou com tipos errados — Zod parse rejeita cedo, antes de gravar
 * lixo no banco, e o erro é tipado (ZodError), não `unknown`.
 */
import { z } from 'zod'
import type OpenAI from 'openai'
import { logger } from '~/core/services/logger.service'

/** Achado categorizado — estritamente mais informativo que os 4 campos fixos do avaliador antigo. */
export const JudgeFindingSchema = z.object({
  tipo: z.enum(['alucinacao', 'fora_do_briefing', 'deveria_escalar', 'tom', 'formato']),
  /** Citação literal da janela julgada — nunca uma paráfrase do avaliador. */
  evidencia: z.string(),
  /** Texto pronto para colar em `agente_instrucoes_extra` — v1 só exibe, humano decide. */
  sugestao: z.string().optional(),
})

export const JudgeVerdictSchema = z.object({
  veredicto: z.enum(['verde', 'amarelo', 'vermelho']),
  achados: z.array(JudgeFindingSchema),
})

export type JudgeFinding = z.infer<typeof JudgeFindingSchema>
export type JudgeVerdictType = z.infer<typeof JudgeVerdictSchema>

export interface JudgeMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

/**
 * Tool executada durante a conversa julgada — opcional, hoje só o laboratório
 * preenche (via `onToolCall` de `runAgent`). Sem isso o juiz só vê o texto
 * final e não distingue um preço citado a partir do retorno real de
 * `BuscarProdutos` de um preço inventado (os dois textos parecem idênticos) —
 * causou falso-positivo sistemático de `alucinacao` medido em corrida real
 * do laboratório antes desta correção.
 */
export interface JudgeToolCall {
  readonly name: string
  readonly args: unknown
  readonly result: unknown
}

export interface JudgeInput {
  /** Janela de mensagens julgada — 1 par (mínimo) até N pares (produção ou laboratório). */
  readonly janela: readonly JudgeMessage[]
  /** FIXED_RULES + SCOPE_RULES — o que o agente deveria ter seguido. */
  readonly regras: string
  /** `agente_instrucoes_extra` da loja no momento da avaliação. */
  readonly instrucoesExtra: string
  /** Rótulo livre para contexto do juiz — nome da persona OU "conversa real". */
  readonly contexto: string
  /** Tools executadas na conversa — quando ausente, o juiz avalia só pelo texto (comportamento anterior). */
  readonly toolCalls?: readonly JudgeToolCall[]
}

export type JudgeOutput =
  | { status: 'done'; verdict: JudgeVerdictType; tokens: number }
  | { status: 'judge_failed'; detail: string }

/**
 * Prompt do sistema do juiz.
 *
 * `formato` é específico do pedped (REGRA 5 do `FIXED_RULES` já tem
 * guardrail determinístico — Camada 4, `sanitizeAgentReply`; o juiz aqui pega
 * violações sutis que o guardrail não cobre). `fora_do_briefing` dispara
 * quando o agente afirma algo que não veio de retorno de tool — violação
 * direta da REGRA 1.
 *
 * Proteção anti-prompt-injection: a janela julgada é delimitada por tags XML
 * e vem APÓS a instrução, então o conteúdo do cliente não pode sobrescrever a
 * instrução do sistema (o modelo lê system antes de user).
 */
function formatToolCalls(toolCalls: readonly JudgeToolCall[]): string {
  return toolCalls
    .map((c) => `<tool_call>${c.name}(${JSON.stringify(c.args)}) -> ${JSON.stringify(c.result)}</tool_call>`)
    .join('\n')
}

function buildJudgeSystemPrompt(
  regras: string,
  instrucoesExtra: string,
  contexto: string,
  toolCalls: readonly JudgeToolCall[] | undefined,
): string {
  const temToolCalls = toolCalls !== undefined
  const blocoToolCalls = temToolCalls
    ? `\nRESULTADOS DE TOOLS EXECUTADAS NESTA CONVERSA (fonte de verdade — o agente SÓ pode ter afirmado o que está aqui):
<tool_calls>
${toolCalls.length > 0 ? formatToolCalls(toolCalls) : '(nenhuma tool foi chamada)'}
</tool_calls>
Antes de marcar 'alucinacao' por causa de um preco, produto, prazo ou endereco citado pelo agente, CONFIRA se o dado bate com algum resultado de tool acima. Se bater (mesmo que resumido ou reformulado), NAO e alucinacao — o agente esta relatando um retorno real de tool, o que e o comportamento correto (REGRA 1). So marque 'alucinacao' quando o dado citado NAO aparecer em nenhum resultado de tool acima, ou contradizer um resultado de tool.\n`
    : ''

  return `Voce e um avaliador de qualidade de atendimento ao cliente via WhatsApp. Analise a JANELA de conversa abaixo e responda APENAS com um objeto JSON valido, sem markdown, sem explicacao fora do JSON.

O agente avaliado deveria seguir estas regras:
<regras>
${regras}
</regras>

Instrucoes extras do lojista vigentes durante a conversa (contexto, nao regra de seguranca):
<instrucoes_extra>
${instrucoesExtra || '(nenhuma)'}
</instrucoes_extra>

Contexto desta avaliacao: ${contexto}
${blocoToolCalls}
Categorias de achado (use so as que se aplicam, pode ser lista vazia se a conversa estiver perfeita):
- alucinacao: o agente afirmou preco, prazo, estoque, endereco ou qualquer dado que nao veio de retorno de tool (REGRA 1)${temToolCalls ? ' — verifique contra RESULTADOS DE TOOLS acima antes de marcar' : ''}
- fora_do_briefing: o agente respondeu algo fora do escopo do negocio ou inventou capacidade que ele nao tem
- deveria_escalar: o cliente pediu atendimento humano ou demonstrou uma situacao que exigia escalonamento e o agente nao fez
- tom: tom inadequado (frio, repetitivo, ignorou frustracao do cliente)
- formato: violacao sutil de formato que um guardrail deterministico nao cobre (ex: duas perguntas na mesma mensagem, mensagem longa demais)

Para cada achado, cite a EVIDENCIA como trecho literal da janela (nunca parafraseie) e, se fizer sentido, uma SUGESTAO de texto pronto para colar nas instrucoes do agente corrigindo o comportamento.

Veredito geral:
- verde: conversa sem problema relevante
- amarelo: pelo menos um achado leve, sem quebra de regra critica
- vermelho: alucinacao, fora_do_briefing ou dano ao cliente

Formato obrigatorio:
{"veredicto":"verde|amarelo|vermelho","achados":[{"tipo":"alucinacao|fora_do_briefing|deveria_escalar|tom|formato","evidencia":"string","sugestao":"string opcional"}]}`
}

function formatWindow(janela: readonly JudgeMessage[]): string {
  return janela
    .map((m) => `<${m.role}>${m.content}</${m.role}>`)
    .join('\n')
}

/**
 * Julga uma janela de mensagens (par isolado, janela de produção ou conversa
 * completa simulada do laboratório) — mesmo contrato para os dois gatilhos.
 *
 * `judge_failed` quando o modelo devolve JSON inválido ou o parse Zod falha —
 * o chamador decide o que fazer (produção: marca `avaliacao_pendente=false`
 * mesmo assim, para não bloquear a fila; laboratório: grava `status='judge_failed'`).
 */
export async function judgeConversation(
  openai: OpenAI,
  model: string,
  input: JudgeInput,
): Promise<JudgeOutput> {
  const { janela, regras, instrucoesExtra, contexto, toolCalls } = input

  let completion: Awaited<ReturnType<typeof openai.chat.completions.create>>
  try {
    completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildJudgeSystemPrompt(regras, instrucoesExtra, contexto, toolCalls) },
        { role: 'user', content: `<janela>\n${formatWindow(janela)}\n</janela>` },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 800,
      temperature: 0,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    logger.error('[conversationJudge] falha na chamada OpenAI', { model, error: detail })
    return { status: 'judge_failed', detail }
  }

  const raw = completion.choices[0]?.message.content ?? ''
  const tokens = completion.usage?.total_tokens ?? 0

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    logger.warn('[conversationJudge] resposta do juiz não é JSON válido', { raw })
    return { status: 'judge_failed', detail: 'resposta não é JSON válido' }
  }

  const validated = JudgeVerdictSchema.safeParse(parsed)
  if (!validated.success) {
    logger.warn('[conversationJudge] schema Zod rejeitou resposta do juiz', {
      raw,
      issues: validated.error.issues,
    })
    return { status: 'judge_failed', detail: z.prettifyError(validated.error) }
  }

  return { status: 'done', verdict: validated.data, tokens }
}

/** verde=1, amarelo=0.5, vermelho=0 — `judge_failed` fica fora do denominador. */
export function scoreFromVeredicto(veredicto: JudgeVerdictType['veredicto']): number {
  if (veredicto === 'verde') return 1
  if (veredicto === 'amarelo') return 0.5
  return 0
}

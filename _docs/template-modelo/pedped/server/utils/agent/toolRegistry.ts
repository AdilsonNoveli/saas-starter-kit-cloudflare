/**
 * Agrega as 9 tools do agente (seção 6/7/8 da arquitetura do agente
 * WhatsApp), filtra pela lista ativa do lojista (`loja.agente_tools_habilitadas`,
 * migration 088 — passo 8 da seção 12) e expõe o dispatch único usado pelo
 * loop do agente (`runAgent`, passo 5).
 */
import { z } from 'zod'
import { buscarProdutosTool } from './tools/products'
import { consultarOpcoesProdutoTool } from './tools/productOptions'
import { definirItemCarrinhoTool } from './tools/cart'
import { consultarEnderecoEntregaTool } from './tools/address'
import { atualizarPedidoTool, finalizarPedidoTool, consultarDetalhePedidoTool } from './tools/checkout'
import { finalizarPedidoToolLabSafe } from './tools/checkoutLabSafe'
import { enviarBotaoCatalogoTool } from './tools/catalog'
import { consultarDatasEncomendaTool } from './tools/preorders'
import { atualizarContextoTool } from './tools/context'
import { runTool, type AgentToolError } from './runTool'
import type { AgentToolContext, AgentToolDefinition } from './toolContext'

/**
 * Coleção heterogênea de tools (cada uma com seu próprio `Args`) — cada tool
 * valida seus próprios argumentos via `schema` antes de `run` ser chamado
 * (`dispatchAgentTool`), então o apagamento de tipo aqui é seguro.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentário acima
type AnyAgentTool = AgentToolDefinition<any>

/** Todas as tools do agente, na mesma ordem/nomes do fluxo n8n (seção 6). */
export const ALL_AGENT_TOOLS: readonly AnyAgentTool[] = [
  buscarProdutosTool,
  consultarOpcoesProdutoTool,
  definirItemCarrinhoTool,
  consultarEnderecoEntregaTool,
  atualizarPedidoTool,
  finalizarPedidoTool,
  consultarDetalhePedidoTool,
  enviarBotaoCatalogoTool,
  consultarDatasEncomendaTool,
  atualizarContextoTool,
]

export type AgentToolName = typeof ALL_AGENT_TOOLS[number]['name']

/** Lista padrão gravada por `loja.agente_tools_habilitadas` (migration 088). */
export const DEFAULT_ACTIVE_TOOLS: readonly string[] = ALL_AGENT_TOOLS.map((t) => t.name)

/**
 * Filtra as tools pela lista ativa do lojista. `undefined`/vazio = todas
 * ativas (fail-open: uma config ainda não migrada não deve desligar o
 * agente inteiro).
 */
export function getActiveAgentTools(activeToolNames?: readonly string[] | null): readonly AnyAgentTool[] {
  if (!activeToolNames || activeToolNames.length === 0) return ALL_AGENT_TOOLS
  const active = new Set(activeToolNames)
  return ALL_AGENT_TOOLS.filter((tool) => active.has(tool.name))
}

/**
 * Lista de tools do laboratório de avaliação (§2.3/§6 do PRD) — MESMA lista de
 * produção, com `FinalizarPedido` substituída pela versão lab-safe (não cria
 * pedido real). `EnviarBotaoCatalogo` não precisa de substituição aqui: o
 * no-op é injetado via `ctx.sendCatalogButton` pelo consumer, mesmo padrão que
 * a produção já usa.
 */
export function buildLabAgentTools(activeToolNames?: readonly string[] | null): readonly AnyAgentTool[] {
  return getActiveAgentTools(activeToolNames).map((tool) =>
    tool.name === 'FinalizarPedido' ? finalizarPedidoToolLabSafe : tool)
}

/** Formato de tool do Chat Completions da OpenAI — `runAgent.ts` (passo 5) repassa isto direto pro SDK. */
export interface AgentToolSpec {
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>
  }
}

export function buildToolSpecs(tools: readonly AnyAgentTool[]): AgentToolSpec[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.schema as z.ZodType) as Record<string, unknown>,
    },
  }))
}

/**
 * Dispatch único de uma tool call do modelo: localiza a tool, valida os
 * argumentos (schema Zod — regra "Zero any", seção 11) e executa através de
 * `runTool()` (seção 4). Argumento inválido também vira dado para o LLM
 * corrigir, nunca uma exceção que derruba o turno.
 */
export async function dispatchAgentTool(
  name: string,
  rawArgs: unknown,
  ctx: AgentToolContext,
  tools: readonly AnyAgentTool[] = ALL_AGENT_TOOLS,
): Promise<unknown | AgentToolError> {
  const tool = tools.find((t) => t.name === name)
  if (!tool) {
    return { error: true, message: `Tool desconhecida ou desativada: ${name}.` }
  }

  const parsed = tool.schema.safeParse(rawArgs)
  if (!parsed.success) {
    return { error: true, message: `Argumentos inválidos para ${name}: ${z.prettifyError(parsed.error)}` }
  }

  return runTool(() => tool.run(parsed.data, ctx), name)
}

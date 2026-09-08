/**
 * Testes de guarda arquitetural (Task 5.2.2 — EPIC 5 PRD-REFATORACAO).
 *
 * Falham DE PROPÓSITO se alguém reintroduzir um padrão que este PRD eliminou.
 * Não testam comportamento (isso já é papel dos specs de unidade) — testam
 * que os símbolos/campos abolidos não voltam a aparecer no contrato, no
 * endpoint de finalização ou nos dois fluxos n8n.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import type { NextActionCode } from '#shared/types/integration'
import { resolveNextAction, type ResolveNextActionInput } from './resolveNextAction'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')
const read = (relPath: string): string => readFileSync(resolve(repoRoot, relPath), 'utf-8')

/** Remove comentários /** *\/ e // — só interessa o CÓDIGO, não a prosa que documenta a remoção. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const FORBIDDEN_SYMBOLS = [
  'VerCarrinho',
  'AdicionarAoCarrinho',
  'FinalizarEncomenda',
  'decision_hints',
  'IntegrationDecisionHints',
  'SEM_RESPOSTA',
]

describe('guarda — contrato do payload (shared/types/integration.ts)', () => {
  const contract = stripComments(read('shared/types/integration.ts'))

  it.each(FORBIDDEN_SYMBOLS)('não reintroduz "%s" como código', (symbol) => {
    expect(contract).not.toContain(symbol)
  })
})

describe('guarda — os dois fluxos n8n ficam idênticos e sem resíduo', () => {
  const flows = [
    '_docs/implementar/Fluxo-reduzido-chat.json',
    '_docs/implementar/Pedped whatsapp v3.json',
  ]

  function systemMessageOf(flowPath: string): string {
    const doc = JSON.parse(read(flowPath)) as { nodes: Array<{ name: string, parameters?: { options?: { systemMessage?: string } } }> }
    const agent = doc.nodes.find((n) => n.name === 'AI Agent')
    const message = agent?.parameters?.options?.systemMessage
    if (!message) throw new Error(`AI Agent systemMessage não encontrado em ${flowPath}`)
    return message
  }

  it('os dois fluxos existem e têm JSON válido', () => {
    for (const flow of flows) {
      expect(() => JSON.parse(read(flow))).not.toThrow()
    }
  })

  it('o system prompt é byte-a-byte idêntico entre os dois fluxos', () => {
    const [a, b] = flows.map(systemMessageOf)
    expect(a).toBe(b)
  })

  it.each(flows)('%s não tem resíduo de tools/campos abolidos', (flow) => {
    const raw = read(flow)
    for (const symbol of FORBIDDEN_SYMBOLS) {
      expect(raw).not.toContain(symbol)
    }
  })

  it.each(flows)('%s tem a tool única FinalizarPedido (não FinalizarPedidoCarrinho)', (flow) => {
    const doc = JSON.parse(read(flow)) as { nodes: Array<{ name: string }> }
    const names = doc.nodes.map((n) => n.name)
    expect(names).toContain('FinalizarPedido')
    expect(names).not.toContain('FinalizarPedidoCarrinho')
  })
})

describe('guarda — resolveNextAction cobre os 11 códigos sem hardcode', () => {
  const ALL_CODES: readonly NextActionCode[] = [
    'COLLECT_WHATSAPP', 'STORE_CLOSED', 'SEARCH_PRODUCT', 'FIX_QUANTITY',
    'VALIDATE_DATE', 'ASK_MODALITY', 'CONFIRM_SAVED_ADDRESS', 'GEOCODE_ADDRESS',
    'ASK_PAYMENT', 'CONFIRM_ORDER', 'FINALIZE',
  ]

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
      paymentMethods: ['pix'],
      canFinalize: false,
      note: null,
    }
  }

  const inputsByCode: Record<NextActionCode, Partial<ResolveNextActionInput>> = {
    COLLECT_WHATSAPP: { actionRequired: 'collect_whatsapp' },
    STORE_CLOSED: { storeOpen: false, currentFlow: 'stock' },
    SEARCH_PRODUCT: { needsProductSearch: true },
    FIX_QUANTITY: { quantityLimits: { min: 1, max: 5 } },
    VALIDATE_DATE: { needsCalendarValidation: true },
    ASK_MODALITY: { missingFields: [{ scope: 'order', field: 'delivery_mode', prompt: '' }] },
    CONFIRM_SAVED_ADDRESS: {
      missingFields: [{ scope: 'order', field: 'address_id', prompt: '' }],
      savedAddress: { formatted: 'Rua X', id: 'e1' },
    },
    GEOCODE_ADDRESS: { missingFields: [{ scope: 'order', field: 'address_id', prompt: '' }] },
    ASK_PAYMENT: { missingFields: [{ scope: 'order', field: 'payment_method', prompt: '' }] },
    CONFIRM_ORDER: { missingFields: [], hasCartItems: true },
    FINALIZE: { canFinalize: true },
  }

  it.each(ALL_CODES)('produz o código %s a partir de algum input válido', (code) => {
    const result = resolveNextAction({ ...base(), ...inputsByCode[code] })
    expect(result.code).toBe(code)
  })

  it('NextActionCode não ganhou/perdeu código sem atualizar este guard', () => {
    expect(ALL_CODES).toHaveLength(11)
  })
})

/**
 * Cron Trigger do Worker × `scheduledTasks` do Nitro.
 *
 * O `wrangler.toml` declara as expressões que a Cloudflare dispara; o
 * `nuxt.config.ts` diz qual task cada expressão executa. Quando as duas listas
 * divergem **nada falha**: o Worker recebe o evento, o Nitro não encontra task
 * para a expressão e o silêncio parece sucesso. Foi assim que `agent:evaluate`
 * ficou sem rodar com o cron já publicado — 18 turnos acumularam
 * `avaliacao_pendente = true` e zero avaliação foi gravada.
 */
describe('guarda — cron do Worker bate com as scheduledTasks do Nitro', () => {
  const wrangler = read('wrangler.toml')
  const nuxtConfig = read('nuxt.config.ts')

  /**
   * Expressões dentro do bloco `[triggers] crons = [...]`, ignorando
   * comentários **de verdade**.
   *
   * A versão anterior aplicava o regex sobre o arquivo cru e casava DENTRO do
   * bloco comentado, extraindo as expressões dos próprios comentários. Quando
   * o bloco inteiro foi comentado (commit `ee1c793`), os crons ficaram
   * desligados em produção e estes três testes seguiram verdes — o guard que
   * existe para a armadilha 5 estava cego para ela. Remover as linhas iniciadas
   * por `#` ANTES de casar é o que fecha isso.
   */
  const wranglerSemComentarios = wrangler
    .split('\n')
    .filter((linha) => !linha.trimStart().startsWith('#'))
    .join('\n')

  const wranglerCrons = ((): string[] => {
    const block = /crons\s*=\s*\[([\s\S]*?)\]/.exec(wranglerSemComentarios)?.[1] ?? ''
    return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1] as string)
  })()

  /** Chaves do objeto `scheduledTasks: { '<cron>': [...] }`. */
  const scheduledCrons = ((): string[] => {
    const block = /scheduledTasks:\s*\{([\s\S]*?)\n {4}\}/.exec(nuxtConfig)?.[1] ?? ''
    return [...block.matchAll(/'([^']+)':\s*\[/g)].map((m) => m[1] as string)
  })()

  it('extrai as duas listas (se falhar aqui, o formato do arquivo mudou)', () => {
    expect(wranglerCrons.length).toBeGreaterThan(0)
    expect(scheduledCrons.length).toBeGreaterThan(0)
  })

  it('toda expressão do wrangler.toml tem task mapeada no nuxt.config', () => {
    const semTask = wranglerCrons.filter((cron) => !scheduledCrons.includes(cron))
    expect(semTask).toEqual([])
  })

  it('toda task agendada tem um cron que a dispare no wrangler.toml', () => {
    const semCron = scheduledCrons.filter((cron) => !wranglerCrons.includes(cron))
    expect(semCron).toEqual([])
  })

  it('o bloco [triggers] está ATIVO, não comentado', () => {
    // Comentar o bloco desliga `webhook:drain` (roda de minuto em minuto) sem
    // nada falhar. Foi o que aconteceu em `ee1c793`, justificado por uma
    // restrição de Workers for Platforms que NÃO se aplica ao nosso modelo de
    // instalações separadas. Para desligar num ambiente específico existe a
    // flag DISABLE_CRON_TRIGGERS, que age no deploy e não na fonte.
    expect(wranglerSemComentarios).toMatch(/^\[triggers\]/m)
  })
})

/**
 * Template de nome das filas no `wrangler.toml`.
 *
 * `scripts/ensure-cf-queues.mjs` reescreve este arquivo em disco trocando
 * `{{WORKER_NAME}}` pelo nome resolvido — e o arquivo já resolvido foi commitado
 * uma vez (`73297e1`), apagando o mecanismo. Como **Cloudflare Queues são
 * escopadas por conta**, a instalação seguinte herdou as filas da anterior:
 * dois Workers na mesma fila, mensagem de uma loja processada pelo Worker da
 * outra (§8.1/§8.2 de `_docs/em-andamento.md`).
 *
 * Este guard falha antes do commit, que é onde o estrago começa.
 */
describe('guarda — wrangler.toml preserva o template de nome das filas', () => {
  const wrangler = read('wrangler.toml')

  const linhasDeFila = wrangler
    .split('\n')
    .filter((linha) => /^\s*(?:queue|dead_letter_queue)\s*=/.test(linha))

  it('extrai as linhas de fila (se falhar aqui, o formato do arquivo mudou)', () => {
    expect(linhasDeFila.length).toBeGreaterThan(0)
  })

  it('toda fila declarada usa o placeholder {{WORKER_NAME}}', () => {
    const semPlaceholder = linhasDeFila.filter((linha) => !linha.includes('{{WORKER_NAME}}'))
    expect(semPlaceholder).toEqual([])
  })
})

/**
 * TESTE DE INTEGRAÇÃO — migration 095 (Customer SKILL + retenção de memória)
 *
 * Roda contra o Supabase REAL. É o teste que faltava: os 298 testes de unidade
 * cobrem a camada TypeScript e **zero por cento** do SQL, que até então nunca
 * havia sido executado em lugar nenhum.
 *
 * Execute: `pnpm test:integration`
 *
 * ─── O que é seguro rodar aqui ────────────────────────────────────────────────
 * `recompute_customer_intelligence()` é **idempotente e não destrutivo**: só
 * recalcula fatos derivados a partir de `orders`/`order_items` e sobrescreve
 * as próprias colunas. Rodá-lo é exatamente o que o pg_cron faz às 03:00, e é o
 * passo de primeira carga que a migration deixa comentado. Por isso ele roda.
 *
 * `purge_agent_memory()` **APAGA** dados (conversas > 90d, dedup > 7d, ...).
 * Um teste que destrói dado de produção a cada execução é inaceitável, mesmo
 * que apague só o que a política manda apagar — alguém roda a suíte sem ler o
 * arquivo e não há volta. Fica atrás de `RUN_DESTRUCTIVE_INTEGRATION=1`.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { Database } from '~/types/database.types'

config()

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.NUXT_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/** Colunas que o código TypeScript lê. Falta de qualquer uma quebra o agente. */
const REQUIRED_COLUMNS = [
  'customer_id',
  'median_cycle_days',
  'cycle_sample_size',
  'churn_risk',
  'delivered_orders',
  'avg_ticket',
  'top_products',
  'payment_method',
  'payment_share',
  'delivery_mode',
  'delivery_share',
  'peak_weekday',
  'peak_hour',
  'peak_share',
  'rfm_recency_q',
  'rfm_frequency_q',
  'rfm_monetary_q',
  'rfm_segment',
  'preferences',
  'computed_at',
  'updated_at',
] as const

const VALID_CHURN = ['low', 'medium', 'high', 'critical', 'no_orders']
const VALID_SEGMENTS = ['champion', 'loyal', 'at_risk', 'dormant', 'new']

describe('Integração: migration 095 — customer_intelligence', () => {
  let supabase: SupabaseClient<Database>

  beforeAll(() => {
    expect(SUPABASE_URL, 'NUXT_PUBLIC_SUPABASE_URL ausente no .env').toBeTruthy()
    expect(SERVICE_KEY, 'NUXT_SUPABASE_SECRET_KEY ausente no .env').toBeTruthy()
    supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  })

  it('a tabela existe e expõe todas as colunas que o código lê', async () => {
    // `select` com a lista explícita: coluna faltando devolve erro 42703, que é
    // exatamente o contrato que se quer travar — o TypeScript acredita no
    // `database.types.ts`, que é sincronizado à mão e pode mentir.
    const { error } = await supabase
      .from('customer_intelligence')
      .select(REQUIRED_COLUMNS.join(', '))
      .limit(1)

    expect(error, error?.message).toBeNull()
  })

  it('recompute_customer_intelligence roda sem erro — o SQL que nunca havia sido executado', async () => {
    // Aqui moram os riscos que só o Postgres real resolve: `percentile_cont`
    // recebendo `numeric`, três CTEs com DISTINCT ON + função de janela +
    // GROUP BY no mesmo subquery, e um INSERT ... SELECT com 6 LEFT JOIN.
    const { error } = await supabase.rpc('recompute_customer_intelligence')
    expect(error, error?.message).toBeNull()
  }, 120_000)

  it('produz fatos coerentes com o CHECK e com a realidade dos pedidos', async () => {
    const { data, error } = await supabase
      .from('customer_intelligence')
      .select('customer_id, churn_risk, rfm_segment, delivered_orders, median_cycle_days, cycle_sample_size, avg_ticket, payment_share, delivery_share, peak_weekday, peak_hour, peak_share, computed_at')
      .order('delivered_orders', { ascending: false })
      .limit(50)

    expect(error, error?.message).toBeNull()
    if (!data || data.length === 0) return // base sem clientes elegíveis: nada a afirmar

    for (const row of data) {
      expect(VALID_CHURN, `churn_risk inválido em ${row.customer_id}`).toContain(row.churn_risk)
      if (row.rfm_segment !== null) expect(VALID_SEGMENTS).toContain(row.rfm_segment)

      expect(row.delivered_orders).toBeGreaterThanOrEqual(0)

      // Ciclo só existe com pelo menos um intervalo entre pedidos.
      if (row.median_cycle_days !== null) {
        expect(row.median_cycle_days).toBeGreaterThanOrEqual(0)
        expect(row.cycle_sample_size).toBeGreaterThan(0)
      }

      // `share` é proporção: fora de [0,1] denuncia erro na janela do SQL.
      for (const share of [row.payment_share, row.delivery_share, row.peak_share]) {
        if (share !== null) {
          expect(share).toBeGreaterThan(0)
          expect(share).toBeLessThanOrEqual(1)
        }
      }

      if (row.peak_weekday !== null) {
        expect(row.peak_weekday).toBeGreaterThanOrEqual(0)
        expect(row.peak_weekday).toBeLessThanOrEqual(6)
      }
      if (row.peak_hour !== null) {
        expect(row.peak_hour).toBeGreaterThanOrEqual(0)
        expect(row.peak_hour).toBeLessThanOrEqual(23)
      }
      if (row.avg_ticket !== null) expect(row.avg_ticket).toBeGreaterThanOrEqual(0)

      expect(new Date(row.computed_at).getTime()).toBeGreaterThan(Date.now() - 10 * 60_000)
    }
  })

  it('materializa TODOS os clientes elegíveis — uma linha por cliente não-visitante', async () => {
    // Sem esta asserção a suíte passaria com a tabela vazia: as verificações de
    // coerência não têm o que reprovar quando não há linha nenhuma. Foi
    // exatamente esse o estado durante todo o período em que o recompute
    // falhava por erro de tipo (migration 096).
    const { count: elegiveis, error: erroClientes } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .not('is_guest', 'is', true)   // espelha o `IS NOT TRUE` do SQL

    const { count: materializados, error: erroFatos } = await supabase
      .from('customer_intelligence')
      .select('customer_id', { count: 'exact', head: true })

    expect(erroClientes, erroClientes?.message).toBeNull()
    expect(erroFatos, erroFatos?.message).toBeNull()
    expect(elegiveis ?? 0).toBeGreaterThan(0)
    expect(materializados).toBe(elegiveis)
  })

  it('só materializa cliente não-visitante', async () => {
    const { data, error } = await supabase
      .from('customer_intelligence')
      .select('customer_id, customers!inner(is_guest)')
      .eq('customers.is_guest', true)
      .limit(1)

    expect(error, error?.message).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('top_products respeita o formato que o parser espera', async () => {
    const { data, error } = await supabase
      .from('customer_intelligence')
      .select('top_products')
      .neq('top_products', '[]')
      .limit(10)

    expect(error, error?.message).toBeNull()

    for (const row of data ?? []) {
      const produtos = row.top_products as unknown
      expect(Array.isArray(produtos)).toBe(true)
      const lista = produtos as { name?: unknown, count?: unknown }[]
      expect(lista.length).toBeLessThanOrEqual(3)
      for (const produto of lista) {
        expect(typeof produto.name).toBe('string')
        expect(typeof produto.count).toBe('number')
      }
    }
  })

  it('recompute NÃO apaga preferências — quem escreve nelas é a tool, no turno', async () => {
    // A regressão que este teste protege: bastaria incluir `preferences` no
    // ON CONFLICT DO UPDATE para o job noturno apagar tudo que o agente
    // aprendeu, silenciosamente, toda madrugada.
    const { count, error } = await supabase
      .from('customer_intelligence')
      .select('customer_id', { count: 'exact', head: true })
      .neq('preferences', '{}')

    expect(error, error?.message).toBeNull()

    const antes = count ?? 0
    const { error: recomputeError } = await supabase.rpc('recompute_customer_intelligence')
    expect(recomputeError, recomputeError?.message).toBeNull()

    const { count: depois } = await supabase
      .from('customer_intelligence')
      .select('customer_id', { count: 'exact', head: true })
      .neq('preferences', '{}')

    expect(depois ?? 0).toBe(antes)
  }, 120_000)

  it('recompute_rfm_segments roda sozinho e é idempotente', async () => {
    const { error } = await supabase.rpc('recompute_rfm_segments')
    expect(error, error?.message).toBeNull()

    const { error: segundaVez } = await supabase.rpc('recompute_rfm_segments')
    expect(segundaVez, segundaVez?.message).toBeNull()
  }, 60_000)
})

/**
 * Regressão da migration 099 — o teste que faltava para pegar o bug mais caro
 * desta frente.
 *
 * A 095 montava `valid_orders` com `arquivado IS NOT TRUE`. Como o job de
 * arquivamento (migration 019) arquiva pedido entregue depois de 6h, o job da
 * SKILL enxergava quase nada: em 2026-07-29 eram 104 de 105 pedidos arquivados,
 * e as 15 linhas de `customer_intelligence` tinham `delivered_orders = 0`, zero
 * produto habitual e zero ciclo — com o job terminando SEM ERRO. Os testes de
 * coerência passavam porque comparar vazio com vazio sempre bate.
 *
 * Este teste compara com `orders` DIRETO, sem passar pelo predicado do job:
 * é a única forma de a diferença aparecer.
 */
describe('Integração: migration 099 — arquivamento não apaga a SKILL', () => {
  let supabase: SupabaseClient<Database>

  beforeAll(() => {
    supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  })

  it('cliente com 2+ pedidos não cancelados tem esses pedidos contados, arquivados ou não', async () => {
    const { data: pedidos, error: pedidosError } = await supabase
      .from('orders')
      .select('customer_id, status')
      .not('customer_id', 'is', null)
      .neq('status', 'cancelado')
    expect(pedidosError, pedidosError?.message).toBeNull()

    const porCliente = new Map<string, number>()
    for (const p of pedidos ?? []) {
      if (!p.customer_id) continue
      porCliente.set(p.customer_id, (porCliente.get(p.customer_id) ?? 0) + 1)
    }

    const { data: facts, error: factsError } = await supabase
      .from('customer_intelligence')
      .select('customer_id, delivered_orders')
    expect(factsError, factsError?.message).toBeNull()

    // Sem base não há o que afirmar — melhor pular do que passar por vacuidade.
    const comHistorico = (facts ?? []).filter((f) => (porCliente.get(f.customer_id) ?? 0) >= 2)
    if (comHistorico.length === 0) return

    const subcontados = comHistorico.filter(
      (f) => f.delivered_orders < (porCliente.get(f.customer_id) ?? 0),
    )
    expect(
      subcontados.map((f) => `${f.customer_id.slice(0, 8)}: SKILL=${f.delivered_orders} real=${porCliente.get(f.customer_id)}`),
      'a SKILL está contando menos pedidos do que existem — a migration 099 foi aplicada neste banco?',
    ).toEqual([])
  }, 60_000)

  it('não conta pedido cancelado como pedido entregue', async () => {
    const { data: cancelados } = await supabase
      .from('orders')
      .select('customer_id')
      .not('customer_id', 'is', null)
      .eq('status', 'cancelado')

    const { data: validos } = await supabase
      .from('orders')
      .select('customer_id')
      .not('customer_id', 'is', null)
      .neq('status', 'cancelado')

    const validosPor = new Map<string, number>()
    for (const p of validos ?? []) {
      if (!p.customer_id) continue
      validosPor.set(p.customer_id, (validosPor.get(p.customer_id) ?? 0) + 1)
    }

    const afetados = [...new Set((cancelados ?? []).map((p) => p.customer_id).filter((v): v is string => v !== null))]
    if (afetados.length === 0) return

    const { data: facts } = await supabase
      .from('customer_intelligence')
      .select('customer_id, delivered_orders')
      .in('customer_id', afetados)

    for (const f of facts ?? []) {
      expect(
        f.delivered_orders,
        `${f.customer_id.slice(0, 8)} tem cancelamento contado em delivered_orders`,
      ).toBeLessThanOrEqual(validosPor.get(f.customer_id) ?? 0)
    }
  }, 60_000)
})

describe('Integração: purge_agent_memory (destrutivo — opt-in)', () => {
  const habilitado = process.env.RUN_DESTRUCTIVE_INTEGRATION === '1'

  it.runIf(habilitado)('apaga dentro da política e devolve a contagem por tabela', async () => {
    const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    const { data, error } = await supabase.rpc('purge_agent_memory')
    expect(error, error?.message).toBeNull()

    // A contagem por tabela é o único sinal de que o cron está vivo — se o
    // formato mudar, o monitoramento cega sem ninguém perceber.
    const resultado = data as unknown as Record<string, unknown>
    for (const chave of ['conversations', 'media_anonymized', 'inbound_dedup', 'burst_buffer', 'token_usage']) {
      expect(typeof resultado[chave], `chave ${chave} ausente ou não numérica`).toBe('number')
    }
    expect(typeof resultado.executed_at).toBe('string')
  }, 60_000)
})

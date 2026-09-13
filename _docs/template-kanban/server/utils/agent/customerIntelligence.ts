/**
 * I/O de `customer_intelligence` (migration 095) — leitura no turno e escrita
 * de preferência pela tool. A projeção do texto é de `customerSkill.ts`; as
 * regras de preferência são de `preferences.ts`. Aqui só mora o acesso ao banco.
 *
 * **Fora de `getCustomerContext` de propósito.** Seria tentador embutir a SKILL
 * no contexto que o agente já busca, mas `IntegrationCustomerContext` é o
 * contrato da API de integração (`/api/integration/v1/customers/context`):
 * somar perfil comportamental ali exporia inferência interna sobre o cliente a
 * um consumidor que não precisa dela. O custo de manter separado é uma consulta
 * por PK, emitida em paralelo com o histórico de conversa — nenhum roundtrip a
 * mais no relógio.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import type { ChurnRisk, CustomerSkillFacts } from './customerSkill'
import {
  applyObservations,
  parsePreferences,
  serializePreferences,
  type PreferenceObservation,
} from '#shared/utils/customerPreferences'
import { parseTopProducts } from '#shared/utils/customerFacts'

const CHURN_RISKS: ReadonlySet<string> = new Set<ChurnRisk>(['low', 'medium', 'high', 'critical', 'no_orders'])

function parseChurnRisk(raw: string | null): ChurnRisk {
  return raw && CHURN_RISKS.has(raw) ? raw as ChurnRisk : 'no_orders'
}

/**
 * Lê os fatos do cliente. Nunca lança: sem SKILL o turno roda igual, só menos
 * informado — degradar é sempre melhor que derrubar a resposta ao cliente.
 *
 * `lastOrderAt` e `customerSince` vêm de `customers`, não da tabela
 * materializada: são os campos que mudam entre execuções do job noturno, e
 * usar o valor congelado faria a SKILL dizer "ultimo pedido ha 3 dias" no dia
 * seguinte ao pedido.
 */
export async function loadCustomerSkillFacts(
  supabase: SupabaseClient<Database>,
  customerId: string,
): Promise<CustomerSkillFacts | null> {
  const [intelligenceRes, customerRes] = await Promise.all([
    supabase
      .from('customer_intelligence')
      .select('median_cycle_days, churn_risk, delivered_orders, avg_ticket, top_products, payment_method, payment_share, delivery_mode, delivery_share, peak_weekday, peak_hour, peak_share, preferences')
      .eq('customer_id', customerId)
      .maybeSingle(),
    supabase
      .from('customers')
      .select('last_order_at, customer_since')
      .eq('id', customerId)
      .maybeSingle(),
  ])

  if (intelligenceRes.error) {
    logger.error('[agent] falha ao ler customer_intelligence — turno segue sem SKILL', {
      customerId,
      error: intelligenceRes.error.message,
    })
    return null
  }

  const row = intelligenceRes.data
  if (!row) return null

  return {
    deliveredOrders: row.delivered_orders,
    medianCycleDays: row.median_cycle_days,
    lastOrderAt: customerRes.data?.last_order_at ?? null,
    churnRisk: parseChurnRisk(row.churn_risk),
    avgTicket: row.avg_ticket,
    topProducts: parseTopProducts(row.top_products),
    paymentMethod: row.payment_method,
    paymentShare: row.payment_share,
    deliveryMode: row.delivery_mode,
    deliveryShare: row.delivery_share,
    peakWeekday: row.peak_weekday,
    peakHour: row.peak_hour,
    peakShare: row.peak_share,
    preferences: parsePreferences(row.preferences),
    customerSince: customerRes.data?.customer_since ?? null,
  }
}

/**
 * Grava observações de preferência vindas da tool `AtualizarContexto`.
 *
 * `INSERT ... ON CONFLICT DO UPDATE` porque a linha pode ainda não existir: o
 * job noturno é quem normalmente a cria, e um cliente novo que declara uma
 * alergia na primeira conversa não pode esperar até as 3h da manhã para que
 * isso seja registrado.
 *
 * Read-modify-write é aceitável aqui: `AtualizarContexto` roda no máximo uma vez
 * por conversa (regra da própria tool) e o consumer processa um turno por vez
 * por telefone (claim do buffer de rajada), então não há duas escritas
 * concorrentes para o mesmo cliente.
 */
export async function recordPreferenceObservations(
  supabase: SupabaseClient<Database>,
  customerId: string,
  observations: readonly PreferenceObservation[],
  now: Date,
): Promise<{ applied: number, rejected: string[] }> {
  if (observations.length === 0) return { applied: 0, rejected: [] }

  const { data, error: readError } = await supabase
    .from('customer_intelligence')
    .select('preferences')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (readError) {
    logger.error('[agent] falha ao ler preferências antes de gravar', { customerId, error: readError.message })
    return { applied: 0, rejected: [] }
  }

  const current = parsePreferences(data?.preferences)
  const { preferences, rejected } = applyObservations(current, observations, now)

  if (rejected.length > 0) {
    // Chave fora do vocabulário fechado (§8). Não é erro do cliente nem do
    // sistema — é o modelo inventando campo, e precisa ser visível.
    logger.warn('[agent] observações de preferência descartadas por chave/valor inválido', {
      customerId,
      rejected,
    })
  }

  const { error: writeError } = await supabase
    .from('customer_intelligence')
    .upsert({
      customer_id: customerId,
      preferences: serializePreferences(preferences),
    }, { onConflict: 'customer_id' })

  if (writeError) {
    logger.error('[agent] falha ao gravar preferências', { customerId, error: writeError.message })
    return { applied: 0, rejected }
  }

  return { applied: observations.length - rejected.length, rejected }
}

import { serverSupabaseServiceRole } from '#supabase/server'
import { STAFF_ROLES } from '#shared/types/user'
import { requireRole } from '../../../../utils/auth/requireRole'
import {
  listarClientesEmRisco,
  perfilPorSegmento,
  type ClienteIntelligenceRow,
} from '../../../../utils/dashboard/segmentacaoClientes'
import type { Database } from '~/types/database.types'

/**
 * GET /api/admin/dashboard/insights/segmentacao-clientes — Iniciativa B,
 * Grupo 1, §2.2.3 + §2.2.4 + §2.2.5 do PRD
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md`).
 * Snapshot de `customer_intelligence` (computado por job noturno, migration
 * 095) — não é escopado pelo período do dashboard, é o estado atual dos
 * clientes, não uma janela histórica.
 *
 * Exclui clientes de teste do laboratório (`clientes.e_teste_laboratorio`)
 * — mesmo cuidado do resto do dashboard (ver `app/pages/admin/customers/index.vue`):
 * cliente sintético do Laboratório de Avaliação não pode contaminar decisão
 * de negócio sobre clientes reais.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const admin = serverSupabaseServiceRole<Database>(event)

  const [{ data: intelRows, error: intelError }, { data: clienteRows, error: clienteError }] = await Promise.all([
    admin
      .from('customer_intelligence')
      .select('customer_id, churn_risk, rfm_segment, avg_ticket, payment_method, delivery_mode, peak_weekday, peak_hour'),
    admin
      .from('clientes')
      .select('id, nome, telefone_whatsapp, e_teste_laboratorio'),
  ])

  if (intelError || clienteError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler inteligência de clientes.' })
  }

  const clientesReais = new Map(
    (clienteRows ?? [])
      .filter((c) => !c.e_teste_laboratorio)
      .map((c) => [c.id, { nome: c.nome, whatsapp: c.telefone_whatsapp }]),
  )

  const rows: ClienteIntelligenceRow[] = (intelRows ?? [])
    .filter((r) => clientesReais.has(r.customer_id))
    .map((r) => {
      const cliente = clientesReais.get(r.customer_id)!
      return {
        customerId: r.customer_id,
        nome: cliente.nome,
        whatsapp: cliente.whatsapp,
        churnRisk: r.churn_risk as ClienteIntelligenceRow['churnRisk'],
        rfmSegment: r.rfm_segment as ClienteIntelligenceRow['rfmSegment'],
        avgTicket: r.avg_ticket,
        paymentMethod: r.payment_method,
        deliveryMode: r.delivery_mode,
        peakWeekday: r.peak_weekday,
        peakHour: r.peak_hour,
      }
    })

  return {
    listaRisco: listarClientesEmRisco(rows),
    perfilPorSegmento: perfilPorSegmento(rows),
  }
})

/**
 * Segmentação de clientes por risco/RFM — Iniciativa B, Grupo 1, §2.2.3 +
 * §2.2.4 + §2.2.5 do PRD
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md`).
 * Fonte: `customer_intelligence`, já computada por job noturno (migration
 * 095) — nenhuma instrumentação nova, só cortes que hoje não existem em
 * nenhum dashboard.
 *
 * Módulo puro (sem Supabase/H3) — mesmo padrão dos outros agregadores em
 * `server/utils/dashboard/**`.
 */
export interface ClienteIntelligenceRow {
  readonly customerId: string
  readonly nome: string | null
  readonly whatsapp: string | null
  readonly churnRisk: 'low' | 'medium' | 'high' | 'critical' | 'no_orders'
  readonly rfmSegment: 'champion' | 'loyal' | 'at_risk' | 'dormant' | 'new' | null
  readonly avgTicket: number | null
  readonly paymentMethod: string | null
  readonly deliveryMode: string | null
  readonly peakWeekday: number | null
  readonly peakHour: number | null
}

export interface ClienteEmRisco {
  readonly customerId: string
  readonly nome: string | null
  readonly whatsapp: string | null
  readonly churnRisk: ClienteIntelligenceRow['churnRisk']
  readonly rfmSegment: ClienteIntelligenceRow['rfmSegment']
  readonly avgTicket: number
  readonly score: number
}

const MAX_LISTA_RISCO_PADRAO = 10

/**
 * Peso do risco pra ordenar a lista acionável (§2.2.3 do PRD: "perder um
 * cliente de ticket alto pesa mais do que perder um de ticket baixo" —
 * `score = avgTicket × peso`). `critical` (modelo de churn) pesa mais que
 * `at_risk` (segmento RFM) porque é o sinal mais direto de risco de perda;
 * `at_risk` sozinho ainda entra na lista, mas com peso menor.
 */
function pesoRisco(row: Pick<ClienteIntelligenceRow, 'churnRisk' | 'rfmSegment'>): number {
  if (row.churnRisk === 'critical') return 3
  if (row.churnRisk === 'high') return 2
  if (row.rfmSegment === 'at_risk') return 1.5
  return 1
}

/**
 * Filtra clientes em risco (`churnRisk` critical/high OU `rfmSegment`
 * at_risk) e ordena por `avgTicket × peso` desc — quem tem mais a perder
 * primeiro, não só quem está mais "vermelho".
 */
export function listarClientesEmRisco(
  rows: readonly ClienteIntelligenceRow[],
  opts?: { maxItens?: number },
): ClienteEmRisco[] {
  const maxItens = opts?.maxItens ?? MAX_LISTA_RISCO_PADRAO

  const emRisco = rows.filter(
    (r) => r.churnRisk === 'critical' || r.churnRisk === 'high' || r.rfmSegment === 'at_risk',
  )

  return emRisco
    .map((r) => {
      const avgTicket = r.avgTicket ?? 0
      return {
        customerId: r.customerId,
        nome: r.nome,
        whatsapp: r.whatsapp,
        churnRisk: r.churnRisk,
        rfmSegment: r.rfmSegment,
        avgTicket,
        score: avgTicket * pesoRisco(r),
      }
    })
    .sort((a, b) => b.score - a.score || b.avgTicket - a.avgTicket)
    .slice(0, maxItens)
}

export interface DominanteComPct {
  readonly valor: string
  readonly pct: number
}

export interface PerfilSegmento {
  readonly segmento: NonNullable<ClienteIntelligenceRow['rfmSegment']>
  readonly totalClientes: number
  readonly ticketMedio: number | null
  readonly pagamentoDominante: DominanteComPct | null
  readonly entregaDominante: DominanteComPct | null
  readonly diaPicoDominante: DominanteComPct | null
  readonly horaPicoDominante: DominanteComPct | null
}

/** Valor mais frequente entre os não-nulos, com a % que ele representa sobre o total de não-nulos. */
function moda(valores: readonly (string | number | null)[]): DominanteComPct | null {
  const contagem = new Map<string, number>()
  let total = 0
  for (const v of valores) {
    if (v === null || v === undefined) continue
    const chave = String(v)
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
    total++
  }
  if (total === 0) return null

  let melhorValor = ''
  let melhorContagem = -1
  for (const [valor, count] of contagem) {
    if (count > melhorContagem) {
      melhorValor = valor
      melhorContagem = count
    }
  }
  return { valor: melhorValor, pct: Math.round((melhorContagem / total) * 100) }
}

/**
 * Um perfil por `rfmSegment` (champion/loyal/at_risk/dormant/new) — ticket
 * médio + método de pagamento/entrega/horário de pico dominantes (§2.2.4 +
 * §2.2.5 do PRD). Clientes sem segmento (`rfmSegment === null`, ainda sem
 * dado suficiente pro job noturno classificar) ficam fora — não há segmento
 * pra agrupar.
 */
export function perfilPorSegmento(rows: readonly ClienteIntelligenceRow[]): PerfilSegmento[] {
  const porSegmento = new Map<string, ClienteIntelligenceRow[]>()
  for (const row of rows) {
    if (!row.rfmSegment) continue
    const lista = porSegmento.get(row.rfmSegment) ?? []
    lista.push(row)
    porSegmento.set(row.rfmSegment, lista)
  }

  const perfis: PerfilSegmento[] = []
  for (const [segmento, clientes] of porSegmento) {
    const ticketsValidos = clientes.map((c) => c.avgTicket).filter((v): v is number => v !== null)
    const ticketMedio = ticketsValidos.length > 0
      ? ticketsValidos.reduce((s, v) => s + v, 0) / ticketsValidos.length
      : null

    perfis.push({
      segmento: segmento as PerfilSegmento['segmento'],
      totalClientes: clientes.length,
      ticketMedio,
      pagamentoDominante: moda(clientes.map((c) => c.paymentMethod)),
      entregaDominante: moda(clientes.map((c) => c.deliveryMode)),
      diaPicoDominante: moda(clientes.map((c) => c.peakWeekday)),
      horaPicoDominante: moda(clientes.map((c) => c.peakHour)),
    })
  }

  return perfis.sort((a, b) => b.totalClientes - a.totalClientes)
}

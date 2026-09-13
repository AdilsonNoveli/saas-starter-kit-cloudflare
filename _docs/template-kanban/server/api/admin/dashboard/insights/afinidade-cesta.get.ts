import { STAFF_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { aggregateAfinidadeCesta, type PedidoProdutoRow } from '../../../../utils/dashboard/afinidadeCesta'
import { loadPedidoIdsValidosNoPeriodo } from '../../../../utils/dashboard/pedidosPeriodo'
import { fetchInChunks } from '../../../../utils/dashboard/supabaseChunkedQuery'

/**
 * GET /api/admin/dashboard/insights/afinidade-cesta — Iniciativa B, Grupo 1,
 * §2.2.1 do PRD (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md`).
 * Produtos frequentemente comprados juntos, por lift — decisão que informa é
 * configurar `produto_relacionados` com dado real em vez de achismo.
 */
export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, STAFF_ROLES)

  const query = getQuery(event)
  const dateStart = typeof query.dateStart === 'string' ? query.dateStart : ''
  const dateEnd = typeof query.dateEnd === 'string' ? query.dateEnd : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) {
    throw createError({ statusCode: 400, statusMessage: 'Período inválido.' })
  }

  let pedidoIds: string[]
  try {
    pedidoIds = await loadPedidoIdsValidosNoPeriodo(admin, dateStart, dateEnd)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler pedidos do período.' })
  }

  if (pedidoIds.length === 0) {
    return { pares: [], produtos: {} as Record<string, string>, totalPedidosConsiderados: 0 }
  }

  let itens: { order_id: string | null, product_id: string | null }[]
  try {
    itens = await fetchInChunks(pedidoIds, (chunkIds) =>
      admin.from('order_items').select('order_id, product_id').in('order_id', chunkIds))
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler itens dos pedidos do período.' })
  }

  const rows: PedidoProdutoRow[] = itens
    .filter((r): r is { order_id: string, product_id: string } => r.order_id !== null && r.product_id !== null)
    .map((r) => ({ pedidoId: r.order_id, produtoId: r.product_id }))

  const pares = aggregateAfinidadeCesta(rows)

  const produtoIdsEnvolvidos = Array.from(
    new Set(pares.flatMap((p) => [p.produtoAId, p.produtoBId])),
  )

  const produtos: Record<string, string> = {}
  if (produtoIdsEnvolvidos.length > 0) {
    const { data: produtosRows, error: produtosError } = await admin
      .from('products')
      .select('id, name')
      .in('id', produtoIdsEnvolvidos)

    if (produtosError) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao ler nomes dos produtos.' })
    }
    for (const p of produtosRows ?? []) produtos[p.id] = p.name
  }

  return { pares, produtos, totalPedidosConsiderados: pedidoIds.length }
})

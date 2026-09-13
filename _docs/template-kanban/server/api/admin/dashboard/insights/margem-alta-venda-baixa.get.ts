import { STAFF_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { loadPedidoIdsValidosNoPeriodo } from '../../../../utils/dashboard/pedidosPeriodo'
import { fetchInChunks } from '../../../../utils/dashboard/supabaseChunkedQuery'
import { rankMargemAltaVendaBaixa, type ProdutoCatalogoRow } from '../../../../utils/dashboard/margemAltaVendaBaixa'

/**
 * GET /api/admin/dashboard/insights/margem-alta-venda-baixa — Iniciativa B,
 * Grupo 1, §2.2.2 do PRD
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md`).
 * Produtos com margem alta e poucas vendas no período — candidatos a
 * destacar no catálogo.
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

  let itens: { product_id: string | null, quantity: number }[] = []
  if (pedidoIds.length > 0) {
    try {
      itens = await fetchInChunks(pedidoIds, (chunkIds) =>
        admin.from('order_items').select('product_id, quantity').in('order_id', chunkIds))
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao ler itens dos pedidos do período.' })
    }
  }

  const vendasPorProduto = new Map<string, number>()
  for (const item of itens) {
    if (!item.product_id) continue
    vendasPorProduto.set(item.product_id, (vendasPorProduto.get(item.product_id) ?? 0) + Number(item.quantity))
  }

  // available=true já filtrado aqui (eficiência de payload); a função pura
  // também filtra por `disponivel` — defesa em profundidade e o que o teste
  // unitário exercita diretamente (§2.2.2 do PRD: pausado é intencional).
  const { data: produtosRows, error: produtosError } = await admin
    .from('products')
    .select('id, name, cost_price, sale_price, profit_margin, available')
    .eq('available', true)

  if (produtosError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler catálogo de produtos.' })
  }

  const catalogo: ProdutoCatalogoRow[] = (produtosRows ?? []).map((p) => ({
    produtoId: p.id,
    nome: p.name,
    precoCusto: Number(p.cost_price),
    precoVenda: p.sale_price === null ? null : Number(p.sale_price),
    margemLucroPct: Number(p.profit_margin),
    disponivel: p.available ?? false,
  }))

  const candidatos = rankMargemAltaVendaBaixa(catalogo, vendasPorProduto)

  return { candidatos }
})

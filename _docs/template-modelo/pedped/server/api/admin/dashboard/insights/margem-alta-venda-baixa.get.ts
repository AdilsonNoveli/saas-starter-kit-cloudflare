import { serverSupabaseServiceRole } from '#supabase/server'
import { STAFF_ROLES } from '#shared/types/user'
import { requireRole } from '../../../../utils/auth/requireRole'
import { loadPedidoIdsValidosNoPeriodo } from '../../../../utils/dashboard/pedidosPeriodo'
import { fetchInChunks } from '../../../../utils/dashboard/supabaseChunkedQuery'
import { rankMargemAltaVendaBaixa, type ProdutoCatalogoRow } from '../../../../utils/dashboard/margemAltaVendaBaixa'
import type { Database } from '~/types/database.types'

/**
 * GET /api/admin/dashboard/insights/margem-alta-venda-baixa — Iniciativa B,
 * Grupo 1, §2.2.2 do PRD
 * (`_docs/implementar/prd-achados-recorrentes-e-insights-negocio.md`).
 * Produtos com margem alta e poucas vendas no período — candidatos a
 * destacar no catálogo.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const query = getQuery(event)
  const dateStart = typeof query.dateStart === 'string' ? query.dateStart : ''
  const dateEnd = typeof query.dateEnd === 'string' ? query.dateEnd : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) {
    throw createError({ statusCode: 400, statusMessage: 'Período inválido.' })
  }

  const admin = serverSupabaseServiceRole<Database>(event)

  let pedidoIds: string[]
  try {
    pedidoIds = await loadPedidoIdsValidosNoPeriodo(admin, dateStart, dateEnd)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler pedidos do período.' })
  }

  let itens: { produto_id: string | null, quantidade: number }[] = []
  if (pedidoIds.length > 0) {
    try {
      itens = await fetchInChunks(pedidoIds, (chunkIds) =>
        admin.from('itens_pedido').select('produto_id, quantidade').in('pedido_id', chunkIds))
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao ler itens dos pedidos do período.' })
    }
  }

  const vendasPorProduto = new Map<string, number>()
  for (const item of itens) {
    if (!item.produto_id) continue
    vendasPorProduto.set(item.produto_id, (vendasPorProduto.get(item.produto_id) ?? 0) + Number(item.quantidade))
  }

  // disponivel=true já filtrado aqui (eficiência de payload); a função pura
  // também filtra por `disponivel` — defesa em profundidade e o que o teste
  // unitário exercita diretamente (§2.2.2 do PRD: pausado é intencional).
  const { data: produtosRows, error: produtosError } = await admin
    .from('produtos')
    .select('id, nome, preco_custo, preco_venda, margem_lucro, disponivel')
    .eq('disponivel', true)

  if (produtosError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler catálogo de produtos.' })
  }

  const catalogo: ProdutoCatalogoRow[] = (produtosRows ?? []).map((p) => ({
    produtoId: p.id,
    nome: p.nome,
    precoCusto: Number(p.preco_custo),
    precoVenda: p.preco_venda === null ? null : Number(p.preco_venda),
    margemLucroPct: Number(p.margem_lucro),
    disponivel: p.disponivel ?? false,
  }))

  const candidatos = rankMargemAltaVendaBaixa(catalogo, vendasPorProduto)

  return { candidatos }
})

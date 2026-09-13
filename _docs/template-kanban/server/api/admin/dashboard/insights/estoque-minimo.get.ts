import { STAFF_ROLES } from '#shared/types/user'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { rankEstoqueMinimo, type EstoqueRow } from '../../../../utils/dashboard/estoqueMinimo'

/**
 * GET /api/admin/dashboard/insights/estoque-minimo — Gestão de Estoque
 * (migration 111), card de alerta no dashboard. Snapshot atual (não
 * escopado por período, mesmo padrão de segmentacao-clientes): estoque é
 * estado, não histórico.
 */
export default defineEventHandler(async (event) => {
  const { supabase: admin } = await requireServiceRole(event, STAFF_ROLES)

  const [{ data: produtosRows, error: produtosError }, { data: insumosRows, error: insumosError }] = await Promise.all([
    admin
      .from('products')
      .select('id, name, current_stock, minimum_stock')
      .eq('stock_control', 'contagem'),
    admin
      .from('ingredients')
      .select('id, name, current_stock, minimum_stock')
      .eq('active', true),
  ])

  if (produtosError || insumosError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler estoque de produtos/insumos.' })
  }

  const linhas: EstoqueRow[] = [
    ...(produtosRows ?? []).map((p): EstoqueRow => ({
      id: p.id,
      nome: p.name,
      tipo: 'produto',
      estoqueAtual: Number(p.current_stock ?? 0),
      estoqueMinimo: p.minimum_stock === null ? null : Number(p.minimum_stock),
    })),
    ...(insumosRows ?? []).map((i): EstoqueRow => ({
      id: i.id,
      nome: i.name,
      tipo: 'insumo',
      estoqueAtual: Number(i.current_stock),
      estoqueMinimo: i.minimum_stock === null ? null : Number(i.minimum_stock),
    })),
  ]

  const candidatos = rankEstoqueMinimo(linhas)

  return { candidatos }
})

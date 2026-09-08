import { serverSupabaseServiceRole } from '#supabase/server'
import { STAFF_ROLES } from '#shared/types/user'
import { requireRole } from '../../../../utils/auth/requireRole'
import { rankEstoqueMinimo, type EstoqueRow } from '../../../../utils/dashboard/estoqueMinimo'
import type { Database } from '~/types/database.types'

/**
 * GET /api/admin/dashboard/insights/estoque-minimo — Gestão de Estoque
 * (migration 111), card de alerta no dashboard. Snapshot atual (não
 * escopado por período, mesmo padrão de segmentacao-clientes): estoque é
 * estado, não histórico.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const admin = serverSupabaseServiceRole<Database>(event)

  const [{ data: produtosRows, error: produtosError }, { data: insumosRows, error: insumosError }] = await Promise.all([
    admin
      .from('produtos')
      .select('id, nome, estoque_atual, estoque_minimo')
      .eq('controle_estoque', 'contagem'),
    admin
      .from('insumos')
      .select('id, nome, estoque_atual, estoque_minimo')
      .eq('ativo', true),
  ])

  if (produtosError || insumosError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao ler estoque de produtos/insumos.' })
  }

  const linhas: EstoqueRow[] = [
    ...(produtosRows ?? []).map((p): EstoqueRow => ({
      id: p.id,
      nome: p.nome,
      tipo: 'produto',
      estoqueAtual: Number(p.estoque_atual ?? 0),
      estoqueMinimo: p.estoque_minimo === null ? null : Number(p.estoque_minimo),
    })),
    ...(insumosRows ?? []).map((i): EstoqueRow => ({
      id: i.id,
      nome: i.nome,
      tipo: 'insumo',
      estoqueAtual: Number(i.estoque_atual),
      estoqueMinimo: i.estoque_minimo === null ? null : Number(i.estoque_minimo),
    })),
  ]

  const candidatos = rankEstoqueMinimo(linhas)

  return { candidatos }
})

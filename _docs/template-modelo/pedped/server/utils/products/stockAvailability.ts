import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { addDays, spToday } from '#shared/utils/preorders'

/**
 * Gestão de Estoque (migration 111) — cálculo de `quantidade_disponivel`
 * compartilhado entre `attachStockInfo` (catálogo/agente, `searchProducts.ts`)
 * e o soft-check de `setCartItem.ts`, para não duplicar a lógica de política
 * entre os dois lugares (regra DRY do plano).
 */

export interface StockPolicyRow {
  readonly controle_estoque: string
  readonly estoque_atual: number | null
  readonly producao_diaria_limite: number | null
}

/**
 * Soma, para produtos com `controle_estoque='producao_diaria'`, o quanto já
 * foi usado HOJE (America/Sao_Paulo) — mesmo cálculo de
 * `consumir_estoque_pedido` (SQL): `venda` (negativo) + `cancelamento`
 * (positivo) se neutralizam, sem contador persistente. Uma única query em
 * lote para todos os ids — nunca uma por produto.
 */
export async function loadUsadoHojeProducaoDiaria(
  supabase: SupabaseClient<Database>,
  produtoIds: readonly string[],
): Promise<Map<string, number>> {
  const usados = new Map<string, number>()
  if (produtoIds.length === 0) return usados

  const hoje = spToday()
  const { data } = await supabase
    .from('estoque_movimentacoes')
    .select('entidade_id, quantidade')
    .eq('tipo_entidade', 'produto')
    .in('entidade_id', produtoIds)
    .in('tipo_movimento', ['venda', 'cancelamento'])
    .gte('criado_em', `${hoje}T00:00:00-03:00`)
    .lt('criado_em', `${addDays(hoje, 1)}T00:00:00-03:00`)

  for (const row of data ?? []) {
    const entidadeId = row.entidade_id as string
    usados.set(entidadeId, (usados.get(entidadeId) ?? 0) - Number(row.quantidade))
  }
  return usados
}

/**
 * Unidades restantes AGORA para um produto, dada sua política de estoque —
 * `null` = sem controle configurado (`'nenhum'`, comportamento de sempre).
 * Função pura: `usadoHojeProducaoDiaria` já vem calculado por
 * `loadUsadoHojeProducaoDiaria` (0 quando a política não é `producao_diaria`).
 */
export function computeQuantidadeDisponivel(
  row: StockPolicyRow,
  usadoHojeProducaoDiaria: number,
): number | null {
  if (row.controle_estoque === 'contagem') return row.estoque_atual ?? 0
  if (row.controle_estoque === 'producao_diaria') {
    return Math.max(0, (row.producao_diaria_limite ?? 0) - usadoHojeProducaoDiaria)
  }
  return null
}

/**
 * Batch completo: ids → `quantidade_disponivel`. Fonte ÚNICA reaproveitada por
 * `attachStockInfo` (catálogo do agente, `searchProducts.ts`) E pelos
 * endpoints do catálogo web (`/api/catalog/search`, `/api/catalog/products-page`,
 * `/api/catalog/related-products`) — antes desta função cada consumidor
 * fazia sua própria query, e o catálogo web nunca chegou a fazer nenhuma
 * (bug real: cliente comprava além do estoque sem aviso nenhum, só falhava
 * no checkout). Produto sem linha em `produtos` fica ausente do Map — quem
 * chama decide o default (normalmente `null`, nunca inventar um limite).
 */
export async function loadQuantidadeDisponivelPorProduto(
  supabase: SupabaseClient<Database>,
  produtoIds: readonly string[],
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>()
  if (produtoIds.length === 0) return result

  const { data } = await supabase
    .from('produtos')
    .select('id, controle_estoque, estoque_atual, producao_diaria_limite')
    .in('id', produtoIds)

  const rows = data ?? []
  const producaoDiariaIds = rows
    .filter((r) => r.controle_estoque === 'producao_diaria')
    .map((r) => r.id)
  const usadoHoje = await loadUsadoHojeProducaoDiaria(supabase, producaoDiariaIds)

  for (const row of rows) {
    result.set(row.id, computeQuantidadeDisponivel(row, usadoHoje.get(row.id) ?? 0))
  }
  return result
}

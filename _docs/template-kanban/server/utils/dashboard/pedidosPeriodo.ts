import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * IDs de pedidos não cancelados dentro de `[dateStart, dateEnd]`
 * (America/Sao_Paulo, mesmo offset fixo `-03:00` usado no resto do
 * dashboard, ver `ai-quality.get.ts`). Duas queries simples + filtro em TS
 * em vez de filtro aninhado do PostgREST — mesmo padrão de
 * `server/utils/preorders/availability.ts` (`kanban_coluna.is_cancelled`
 * não é coluna de `pedidos`, é resolvida pelo `status`).
 *
 * Compartilhado entre os cards de insights de negócio que precisam de
 * "pedidos válidos do período" (afinidade de cesta, margem alta/venda
 * baixa) — extraído pra não divergir a regra de cancelamento entre eles.
 */
export async function loadPedidoIdsValidosNoPeriodo(
  admin: SupabaseClient<Database>,
  dateStart: string,
  dateEnd: string,
): Promise<string[]> {
  const [{ data: pedidos, error: pedidosError }, { data: colunas, error: colunasError }] = await Promise.all([
    admin
      .from('orders')
      .select('id, status')
      .gte('created_at', `${dateStart}T00:00:00-03:00`)
      .lte('created_at', `${dateEnd}T23:59:59-03:00`),
    admin.from('kanban_column').select('key, is_cancelled'),
  ])

  if (pedidosError || colunasError) {
    throw new Error('Falha ao ler pedidos do período.')
  }

  const canceladas = new Set((colunas ?? []).filter((c) => c.is_cancelled).map((c) => c.key))
  return (pedidos ?? [])
    .filter((p) => !(p.status && canceladas.has(p.status)))
    .map((p) => p.id)
}

/**
 * Resolve a chave da coluna de ENTRADA do Kanban (`kanban_column.is_entry`,
 * migration 125) — todo pedido nasce nela, de qualquer canal. Existe pra
 * `finalizeCheckout.ts`/`orders/create.post.ts`/`orders/update.put.ts` pararem
 * de escrever a string `'pendente'` como valor mágico: a chave AGORA vem de
 * um flag no schema, mesmo padrão já usado por `is_delivery_dispatch`/
 * `is_out_for_delivery`/`is_delivered`/`is_revenue_trigger`/`is_cancelled`
 * (cada um com seu índice único parcial — `is_entry` segue o mesmo desenho).
 *
 * Por que não virou o DEFAULT da coluna `orders.status` no banco: nenhum
 * caminho de criação de pedido depende do default hoje — a RPC
 * `create_integration_order` exige `p_status` como parâmetro obrigatório (sem
 * default), e a criação manual do PDV admin sempre informa `status` também.
 * Trocar por um default dinâmico (função + trigger de permissão) seria
 * complexidade nova sem nenhum caminho de código que a use de verdade.
 *
 * Por que a coluna de entrada continua com o LITERAL `'pendente'` no cliente
 * anônimo (`app/pages/catalog/success.vue`, `OrderReceipt.vue`): `kanban_column`
 * só é legível por staff via RLS ("Staff read kanban_column",
 * `private.is_staff()`) — expor esse flag pra um visitante anônimo exigiria
 * uma nova função `SECURITY DEFINER` pública, superfície nova sem benefício
 * real: a MESMA trigger `guard_system_kanban_column` que protege `key`/
 * `is_system` numa coluna de sistema também trava `is_entry` (ver migration
 * 125) — o literal `'pendente'` ali nunca pode divergir do flag por design,
 * então não há "verdade dupla" de fato, só um valor que o schema já garante
 * estável.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'

export async function resolveEntryKanbanStatus(
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const { data, error } = await supabase
    .from('kanban_column')
    .select('key')
    .eq('is_entry', true)
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    // Não deveria acontecer — guard_system_kanban_column garante exatamente
    // uma coluna com is_entry=true o tempo todo — mas um pedido não pode
    // nascer sem status nenhum, então falha alto e visível em vez de gravar
    // um NULL silencioso.
    throw createError({
      statusCode: 500,
      statusMessage: 'Nenhuma coluna do Kanban está marcada como entrada. Configure uma em /admin.',
    })
  }

  return data.key
}

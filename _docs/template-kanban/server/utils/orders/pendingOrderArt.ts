/**
 * Anexação de arte a um PEDIDO já criado — contraparte de `cart/pendingArt.ts`
 * pra depois do checkout (migration 127, botão "Enviar depois"). Antes desta
 * migration, `deferred` não existia: uma vez finalizado o pedido, não havia
 * como saber que uma linha ainda esperava arte, nem onde gravar a imagem que
 * chegasse depois. `server/utils/whatsapp/attachPendingArt.ts` chama isto
 * como FALLBACK, só quando o carrinho ativo não tem nenhuma pendência (ver
 * `findPendingArtRequirement` — carrinho vazio ou já resolvido é o caso
 * comum de uma foto qualquer chegando meses depois).
 *
 * Update em vez de delete+insert (diferente de `attachArt`): a linha do
 * pedido já existe e é estável (pedido finalizado não recompõe opções) — só
 * preenche `file_url`/`original_file_name` e desliga `deferred`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export interface PendingOrderArtRequirement {
  readonly orderItemOptionId: string
  readonly orderId: string
  readonly nomeCongelado: string
  readonly arquivoTiposAceitos: readonly string[]
  readonly arquivoTamanhoMaximoMb: number
  /** Nome do produto dono do item — só para rótulo/log. */
  readonly produtoNome: string
}

const DEFAULT_TIPOS_ACEITOS = ['application/pdf']
const DEFAULT_TAMANHO_MAXIMO_MB = 10

interface PendingRow {
  id: string
  option_item_id: string | null
  order_items: {
    order_id: string
    products: { name: string } | null
  } | null
}

/**
 * FIFO pelo pedido mais antigo entre os pendentes, mesmo critério de
 * `findPendingArtRequirement` no carrinho — limitado aos últimos 20 pedidos
 * do cliente (uma arte "enviar depois" pendente há mais que isso é caso
 * degenerado que o staff já teria contatado o cliente diretamente, fora do
 * escopo deste fallback automático).
 */
export async function findPendingOrderArtRequirement(
  supabase: SupabaseClient<Database>,
  customerId: string,
): Promise<PendingOrderArtRequirement | null> {
  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!orders || orders.length === 0) return null
  const orderIds = orders.map((o) => o.id)
  // Mais antigo primeiro — mesmo critério FIFO de findPendingArtRequirement.
  const orderRank = new Map(orderIds.slice().reverse().map((id, i) => [id, i]))

  const { data } = await supabase
    .from('order_item_options')
    .select('id, option_item_id, order_items!inner(order_id, products(name))')
    .eq('deferred', true)
    .is('file_url', null)
    .in('order_items.order_id', orderIds)

  const rows = (data ?? []) as unknown as PendingRow[]
  if (rows.length === 0) return null

  rows.sort((a, b) => {
    const ra = orderRank.get(a.order_items!.order_id) ?? Number.MAX_SAFE_INTEGER
    const rb = orderRank.get(b.order_items!.order_id) ?? Number.MAX_SAFE_INTEGER
    return ra - rb
  })
  const winner = rows[0]!
  if (!winner.option_item_id) return null

  const { data: groupCfg } = await supabase
    .from('product_option_item')
    .select('product_option_group(accepted_file_types, max_file_size_mb)')
    .eq('id', winner.option_item_id)
    .maybeSingle()

  const grupo = (groupCfg?.product_option_group ?? null) as
    | { accepted_file_types: string[] | null, max_file_size_mb: number | null }
    | null

  return {
    orderItemOptionId: winner.id,
    orderId: winner.order_items!.order_id,
    nomeCongelado: winner.order_items!.products?.name ?? 'arte',
    arquivoTiposAceitos: grupo?.accepted_file_types ?? DEFAULT_TIPOS_ACEITOS,
    arquivoTamanhoMaximoMb: grupo?.max_file_size_mb ?? DEFAULT_TAMANHO_MAXIMO_MB,
    produtoNome: winner.order_items!.products?.name ?? '',
  }
}

export async function attachArtToOrder(
  supabase: SupabaseClient<Database>,
  pending: PendingOrderArtRequirement,
  arquivo: { url: string, nomeOriginal: string },
): Promise<void> {
  const { error } = await supabase
    .from('order_item_options')
    .update({ file_url: arquivo.url, original_file_name: arquivo.nomeOriginal, deferred: false })
    .eq('id', pending.orderItemOptionId)

  if (error) {
    throw new Error(`Falha ao anexar arte ao pedido: ${error.message}`)
  }
}

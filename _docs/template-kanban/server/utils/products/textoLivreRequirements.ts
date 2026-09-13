/**
 * Grupos `texto_livre` (migration 114/127) por produto — fonte única
 * reaproveitada tanto pelo motor de `missing_fields` do carrinho agentivo
 * (`server/utils/cart/missingFields.ts`) quanto pela recusa explícita
 * ("Sem nome") em `server/utils/cart/pendingArt.ts`. Espelha
 * `uploadArquivoRequirements.ts` — mesmo motivo (DRY, evita duas queries
 * divergindo em silêncio sobre o que é "obrigatório").
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export interface TextoLivreRequirement {
  readonly grupoId: string
  readonly grupoNome: string
  readonly obrigatorio: boolean
  /** id do item-âncora em `produto_opcao_item` — chave de `SelectedOption.opcao_item_id`. */
  readonly opcaoItemId: string
  readonly precoDelta: number
  readonly textoMaxCaracteres: number | null
  readonly textoPlaceholder: string | null
}

/** produto_id → grupos texto_livre desse produto (âncora resolvida, grupo sem item ainda é ignorado). */
export async function loadTextoLivreRequirements(
  supabase: SupabaseClient<Database>,
  produtoIds: readonly string[],
): Promise<ReadonlyMap<string, readonly TextoLivreRequirement[]>> {
  const byProduto = new Map<string, TextoLivreRequirement[]>()
  if (produtoIds.length === 0) return byProduto

  const { data } = await supabase
    .from('product_option_group')
    .select('id, product_id, name, required, max_text_length, text_placeholder, product_option_item(id, price_delta)')
    .in('product_id', produtoIds)
    .eq('type', 'texto_livre')

  for (const g of data ?? []) {
    const anchor = (g.product_option_item as { id: string, price_delta: number }[] | null)?.[0]
    if (!anchor) continue

    const req: TextoLivreRequirement = {
      grupoId: g.id,
      grupoNome: g.name,
      obrigatorio: g.required,
      opcaoItemId: anchor.id,
      precoDelta: Number(anchor.price_delta),
      textoMaxCaracteres: g.max_text_length,
      textoPlaceholder: g.text_placeholder,
    }
    const arr = byProduto.get(g.product_id) ?? []
    arr.push(req)
    byProduto.set(g.product_id, arr)
  }

  return byProduto
}

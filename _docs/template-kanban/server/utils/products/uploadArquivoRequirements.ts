/**
 * Grupos `upload_arquivo` (migration 114) por produto — fonte única
 * reaproveitada tanto pelo motor de `missing_fields` do carrinho agentivo
 * (`server/utils/cart/missingFields.ts`) quanto pela anexação automática de
 * arte recebida por imagem do WhatsApp (`server/utils/whatsapp/attachPendingArt.ts`).
 * Evita duas queries divergentes decidindo a mesma coisa (DRY).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export interface UploadArquivoRequirement {
  readonly grupoId: string
  readonly grupoNome: string
  readonly obrigatorio: boolean
  /** id do item-âncora em `produto_opcao_item` — chave de `SelectedOption.opcao_item_id`. */
  readonly opcaoItemId: string
  readonly precoDelta: number
  /**
   * MIME types configurados pelo lojista pra este grupo (ex.: só
   * `application/pdf` = exige documento/anexo; inclui `image/*` = aceita
   * foto também). Default (`null`/vazio) trata como PDF-only — mesmo default
   * do editor admin (migration 114).
   */
  readonly arquivoTiposAceitos: readonly string[]
  readonly arquivoTamanhoMaximoMb: number
}

const DEFAULT_TIPOS_ACEITOS = ['application/pdf'] as const
const DEFAULT_TAMANHO_MAXIMO_MB = 10

/** produto_id → grupos upload_arquivo desse produto (âncora resolvida, grupo sem item ainda é ignorado). */
export async function loadUploadArquivoRequirements(
  supabase: SupabaseClient<Database>,
  produtoIds: readonly string[],
): Promise<ReadonlyMap<string, readonly UploadArquivoRequirement[]>> {
  const byProduto = new Map<string, UploadArquivoRequirement[]>()
  if (produtoIds.length === 0) return byProduto

  const { data } = await supabase
    .from('product_option_group')
    .select('id, product_id, name, required, accepted_file_types, max_file_size_mb, product_option_item(id, price_delta)')
    .in('product_id', produtoIds)
    .eq('type', 'upload_arquivo')

  for (const g of data ?? []) {
    const anchor = (g.product_option_item as { id: string, price_delta: number }[] | null)?.[0]
    if (!anchor) continue

    const req: UploadArquivoRequirement = {
      grupoId: g.id,
      grupoNome: g.name,
      obrigatorio: g.required,
      opcaoItemId: anchor.id,
      precoDelta: Number(anchor.price_delta),
      arquivoTiposAceitos: g.accepted_file_types ?? DEFAULT_TIPOS_ACEITOS,
      arquivoTamanhoMaximoMb: g.max_file_size_mb ?? DEFAULT_TAMANHO_MAXIMO_MB,
    }
    const arr = byProduto.get(g.product_id) ?? []
    arr.push(req)
    byProduto.set(g.product_id, arr)
  }

  return byProduto
}

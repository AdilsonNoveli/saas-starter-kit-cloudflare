/**
 * Grupos de opção/variação de um produto (`produto_opcao_grupo` +
 * `produto_opcao_item`) — mesma tabela que o catálogo web e o PDV admin já
 * usam para "borda recheada", "sem cebola", tamanho/cor etc. Consumida pela
 * tool `ConsultarOpcoesProduto` do agente de WhatsApp, que até a migration
 * 110 não tinha como saber que essas opções existiam (`search_products` não
 * devolvia `tem_opcoes`).
 *
 * Reaproveita `OptionGroup`/`OptionItem` de `shared/types/product.ts` — mesmo
 * shape que o catálogo web já expõe, sem inventar um formato novo.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { OptionGroup, OptionItem } from '#shared/types/product'

interface OptionGroupRow {
  id: string
  product_id: string
  name: string
  type: string
  required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  max_text_length: number | null
  text_placeholder: string | null
  accepted_file_types: string[] | null
  max_file_size_mb: number | null
  product_option_item: Array<{
    id: string
    group_id: string
    name: string
    price_delta: number
    default_selected: boolean
    active: boolean
    sort_order: number
    photo_url: string | null
  }>
}

/**
 * `[]` quando o produto não tem grupo de opção nenhum — a tool trata isso
 * como "nada a perguntar", nunca como erro (produto sem opção é o caso comum).
 * Itens inativos (`ativo=false`) são filtrados aqui: nunca oferecidos ao
 * agente, mesmo padrão de `orders/create.post.ts` ao revalidar seleções.
 */
export async function getProductOptions(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<OptionGroup[]> {
  const { data } = await supabase
    .from('product_option_group')
    .select('id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb, product_option_item (id, group_id, name, price_delta, default_selected, active, sort_order, photo_url)')
    .eq('product_id', produtoId)
    .order('sort_order', { ascending: true })

  const rows = (data ?? []) as unknown as OptionGroupRow[]

  return rows.map((g) => ({
    id: g.id,
    produto_id: g.product_id,
    nome: g.name,
    tipo: g.type as OptionGroup['tipo'],
    obrigatorio: g.required,
    min_selecoes: g.min_selections,
    max_selecoes: g.max_selections,
    ordem: g.sort_order,
    texto_max_caracteres: g.max_text_length,
    texto_placeholder: g.text_placeholder,
    arquivo_tipos_aceitos: g.accepted_file_types,
    arquivo_tamanho_maximo_mb: g.max_file_size_mb,
    produto_opcao_item: g.product_option_item
      .filter((i) => i.active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i): OptionItem => ({
        id: i.id,
        grupo_id: i.group_id,
        nome: i.name,
        preco_delta: Number(i.price_delta),
        selecionado_padrao: i.default_selected,
        ativo: i.active,
        ordem: i.sort_order,
        foto_url: i.photo_url,
      })),
  }))
}

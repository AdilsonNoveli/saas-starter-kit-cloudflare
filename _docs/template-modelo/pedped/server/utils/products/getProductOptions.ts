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
  produto_id: string
  nome: string
  tipo: string
  obrigatorio: boolean
  min_selecoes: number
  max_selecoes: number
  ordem: number
  produto_opcao_item: Array<{
    id: string
    grupo_id: string
    nome: string
    preco_delta: number
    selecionado_padrao: boolean
    ativo: boolean
    ordem: number
    foto_url: string | null
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
    .from('produto_opcao_grupo')
    .select('id, produto_id, nome, tipo, obrigatorio, min_selecoes, max_selecoes, ordem, produto_opcao_item (id, grupo_id, nome, preco_delta, selecionado_padrao, ativo, ordem, foto_url)')
    .eq('produto_id', produtoId)
    .order('ordem', { ascending: true })

  const rows = (data ?? []) as unknown as OptionGroupRow[]

  return rows.map((g) => ({
    id: g.id,
    produto_id: g.produto_id,
    nome: g.nome,
    tipo: g.tipo as OptionGroup['tipo'],
    obrigatorio: g.obrigatorio,
    min_selecoes: g.min_selecoes,
    max_selecoes: g.max_selecoes,
    ordem: g.ordem,
    produto_opcao_item: g.produto_opcao_item
      .filter((i) => i.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .map((i): OptionItem => ({
        id: i.id,
        grupo_id: i.grupo_id,
        nome: i.nome,
        preco_delta: Number(i.preco_delta),
        selecionado_padrao: i.selecionado_padrao,
        ativo: i.ativo,
        ordem: i.ordem,
        foto_url: i.foto_url,
      })),
  }))
}

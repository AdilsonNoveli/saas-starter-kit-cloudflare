/**
 * Endpoint GET /api/catalog/products/:id/option-groups
 *
 * Grupos de opção de um produto, para `useProductOptionSelection.ts`
 * (consumido tanto pelo catálogo público quanto pelo PDV admin). PÚBLICO
 * de propósito — antes lido direto do navegador via `useSupabaseClient()`
 * (client anônimo, RLS já permite leitura pública desta tabela; senão o
 * catálogo não funcionaria). Migrar pro servidor centraliza o acesso sem
 * adicionar restrição nova (§5 do AUDITORIA.md).
 */
import { z } from 'zod'
import { createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { OptionGroup } from '#shared/types/product'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event): Promise<{ grupos: OptionGroup[] }> => {
  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de produto inválido' })
  }
  const produtoId = idRaw as string

  const supabase = await serverSupabaseClient<Database>(event)
  const { data, error } = await supabase
    .from('product_option_group')
    .select(`
      id, produto_id:product_id, nome:name, tipo:type, obrigatorio:required,
      min_selecoes:min_selections, max_selecoes:max_selections, ordem:sort_order,
      texto_max_caracteres:max_text_length, texto_placeholder:text_placeholder,
      arquivo_tipos_aceitos:accepted_file_types, arquivo_tamanho_maximo_mb:max_file_size_mb,
      produto_opcao_item:product_option_item(id, nome:name, preco_delta:price_delta, selecionado_padrao:default_selected, ativo:active, ordem:sort_order, grupo_id:group_id, foto_url:photo_url)
    `)
    .eq('product_id', produtoId)
    .order('sort_order', { ascending: true })
    .order('sort_order', { ascending: true, referencedTable: 'product_option_item' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar opções do produto' })
  }

  // Filtra em JS para incluir ativo=true e ativo=null (NULL = ativo por padrão — strict .eq exclui NULL no Supabase)
  const grupos = ((data ?? []) as unknown as OptionGroup[]).map((g) => ({
    ...g,
    produto_opcao_item: g.produto_opcao_item.filter((i) => i.ativo !== false),
  }))

  return { grupos }
})

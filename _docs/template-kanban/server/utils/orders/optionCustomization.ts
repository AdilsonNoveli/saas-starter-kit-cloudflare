/**
 * Validação/congelamento do valor fornecido pelo cliente em grupos de opção
 * `texto_livre`/`upload_arquivo` (migration 114) — compartilhado pelos dois
 * endpoints de criação de pedido (`orders/create.post.ts` web e
 * `admin/orders/create.post.ts` PDV), que já revalidam opções normais
 * (name/price_delta relidos de `product_option_item`, nunca confiando no
 * cliente) mas não tinham como saber que um grupo é "texto/arquivo
 * obrigatório" — sem isto, um pedido podia chegar com o campo vazio e
 * ninguém no staff saberia que faltou coletar a personalização.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'

export interface SpecialGroupConfig {
  readonly grupoId: string
  readonly produtoId: string
  /** id do item-âncora em `product_option_item` — chave de `SelectedOption.opcao_item_id`. */
  readonly itemId: string
  readonly nome: string
  readonly tipo: 'texto_livre' | 'upload_arquivo'
  readonly obrigatorio: boolean
  readonly textoMaxCaracteres: number | null
}

export interface SpecialGroupIndex {
  /** opcao_item_id (âncora) → config do grupo. */
  readonly configByItemId: ReadonlyMap<string, SpecialGroupConfig>
  /** produto_id → grupos obrigatórios desse produto. */
  readonly requiredByProduto: ReadonlyMap<string, readonly SpecialGroupConfig[]>
}

interface OptionInput {
  readonly opcao_item_id: string
  readonly valor_texto?: string | null
  readonly arquivo_url?: string | null
  readonly arquivo_nome_original?: string | null
}

interface ItemInput {
  readonly produto_id: string
  readonly opcoes?: readonly OptionInput[]
}

/** Carrega os grupos `texto_livre`/`upload_arquivo` dos produtos do pedido. */
export async function loadSpecialGroupIndex(
  supabase: SupabaseClient<Database>,
  produtoIds: readonly string[],
): Promise<SpecialGroupIndex> {
  const configByItemId = new Map<string, SpecialGroupConfig>()
  const requiredByProduto = new Map<string, SpecialGroupConfig[]>()

  if (produtoIds.length === 0) return { configByItemId, requiredByProduto }

  const { data } = await supabase
    .from('product_option_group')
    .select('id, product_id, name, type, required, max_text_length, product_option_item(id)')
    .in('product_id', produtoIds)
    .in('type', ['texto_livre', 'upload_arquivo'])

  for (const g of data ?? []) {
    const itemId = (g.product_option_item as { id: string }[] | null)?.[0]?.id
    if (!itemId) continue // grupo sem item-âncora ainda (ex.: recém-criado, save incompleto) — ignora

    const config: SpecialGroupConfig = {
      grupoId: g.id,
      produtoId: g.product_id,
      itemId,
      nome: g.name,
      tipo: g.type as 'texto_livre' | 'upload_arquivo',
      obrigatorio: g.required,
      textoMaxCaracteres: g.max_text_length,
    }
    configByItemId.set(itemId, config)

    if (g.required) {
      const arr = requiredByProduto.get(g.product_id) ?? []
      arr.push(config)
      requiredByProduto.set(g.product_id, arr)
    }
  }

  return { configByItemId, requiredByProduto }
}

/** URL pertence ao prefixo de upload de cliente — nunca aceitar URL externa arbitrária. */
export function isArteClienteUrl(url: string): boolean {
  return extractArteClienteKey(url) !== null
}

/**
 * Extrai a key S3 (`artes-clientes/uuid.ext`) de uma URL de arte de cliente,
 * ou `null` se a URL não pertence a esse prefixo. Fonte única usada tanto
 * pela validação de provenance (`isArteClienteUrl`) quanto pela limpeza de
 * arquivos órfãos no S3 quando um item de pedido com arte é apagado (ex.:
 * exclusão em cascata de produto — `admin/products/[id].delete.ts`).
 */
export function extractArteClienteKey(url: string): string | null {
  try {
    const { pathname } = new URL(url)
    const idx = pathname.indexOf('/artes-clientes/')
    if (idx === -1) return null
    return decodeURIComponent(pathname.slice(idx + 1))
  } catch {
    return null
  }
}

/**
 * Rejeita o pedido (400) quando um grupo obrigatório `texto_livre`/`upload_arquivo`
 * não recebeu valor válido — checa TODOS os itens antes do INSERT, não item a item,
 * pra dar erro consistente independente da ordem.
 */
export function validateRequiredCustomizations(
  itens: readonly ItemInput[],
  requiredByProduto: ReadonlyMap<string, readonly SpecialGroupConfig[]>,
): void {
  for (const item of itens) {
    const required = requiredByProduto.get(item.produto_id)
    if (!required || required.length === 0) continue

    for (const req of required) {
      const submitted = item.opcoes?.find((o) => o.opcao_item_id === req.itemId)
      const hasValue = req.tipo === 'texto_livre'
        ? !!submitted?.valor_texto?.trim()
        : !!submitted?.arquivo_url

      if (!hasValue) {
        throw createError({
          statusCode: 400,
          statusMessage: `Preencha "${req.nome}" para continuar.`,
        })
      }
    }
  }
}

export interface StandardGroupConfig {
  readonly grupoId: string
  readonly nome: string
  readonly obrigatorio: boolean
  readonly minSelecoes: number
  readonly maxSelecoes: number
}

export interface StandardGroupIndex {
  /** opcao_item_id → id do grupo a que pertence. */
  readonly grupoIdByItemId: ReadonlyMap<string, string>
  /** produto_id → grupos `single`/`multiple`/`toggle` desse produto. */
  readonly gruposByProduto: ReadonlyMap<string, readonly StandardGroupConfig[]>
}

/**
 * Carrega os grupos `single`/`multiple`/`toggle` dos produtos do pedido —
 * contraparte de `loadSpecialGroupIndex` para os tipos com semântica de
 * contagem (min/max de itens escolhidos), em vez de valor livre.
 */
export async function loadStandardGroupIndex(
  supabase: SupabaseClient<Database>,
  produtoIds: readonly string[],
): Promise<StandardGroupIndex> {
  const grupoIdByItemId = new Map<string, string>()
  const gruposByProduto = new Map<string, StandardGroupConfig[]>()

  if (produtoIds.length === 0) return { grupoIdByItemId, gruposByProduto }

  const { data } = await supabase
    .from('product_option_group')
    .select('id, product_id, name, required, min_selections, max_selections, product_option_item(id)')
    .in('product_id', produtoIds)
    .in('type', ['single', 'multiple', 'toggle'])

  for (const g of data ?? []) {
    for (const item of (g.product_option_item as { id: string }[] | null) ?? []) {
      grupoIdByItemId.set(item.id, g.id)
    }

    const arr = gruposByProduto.get(g.product_id) ?? []
    arr.push({
      grupoId: g.id,
      nome: g.name,
      obrigatorio: g.required,
      minSelecoes: g.min_selections,
      maxSelecoes: g.max_selections,
    })
    gruposByProduto.set(g.product_id, arr)
  }

  return { grupoIdByItemId, gruposByProduto }
}

/**
 * Rejeita o pedido (400) quando um grupo `single`/`multiple`/`toggle` não
 * respeita a contagem exigida — mesma checagem já feita pelo carrinho do
 * WhatsApp (`setCartItem.ts`), mas que faltava aqui: o catálogo web/PDV monta
 * o carrinho inteiramente no cliente e só chama este endpoint na finalização,
 * então sem isto um bug ou requisição direta na API conseguia fechar pedido
 * com um grupo `required` (ex.: "Interruptor Individual") sem nenhuma
 * opção marcada.
 *
 * Grupos `toggle` gravam `min_selections=0` por padrão (cada item liga/desliga
 * independente — sem semântica de "escolha N"): quando `required`, o piso
 * real é 1, não o valor gravado. `max_selections<=0` (também o padrão do tipo
 * `toggle`, que não tem teto) não é tratado como limite — só grupos com teto
 * explícito (`multiple`) rejeitam excesso.
 */
export function validateStandardOptionGroups(
  itens: readonly ItemInput[],
  index: StandardGroupIndex,
): void {
  for (const item of itens) {
    const grupos = index.gruposByProduto.get(item.produto_id)
    if (!grupos || grupos.length === 0) continue

    const countByGrupo = new Map<string, number>()
    for (const op of item.opcoes ?? []) {
      const grupoId = index.grupoIdByItemId.get(op.opcao_item_id)
      if (!grupoId) continue
      countByGrupo.set(grupoId, (countByGrupo.get(grupoId) ?? 0) + 1)
    }

    for (const grupo of grupos) {
      const count = countByGrupo.get(grupo.grupoId) ?? 0
      const minimo = grupo.obrigatorio ? Math.max(1, grupo.minSelecoes) : grupo.minSelecoes
      if (count < minimo) {
        throw createError({
          statusCode: 400,
          statusMessage: `Escolha necessária: o grupo "${grupo.nome}" exige pelo menos ${minimo} opção(ões).`,
        })
      }
      if (grupo.maxSelecoes > 0 && count > grupo.maxSelecoes) {
        throw createError({
          statusCode: 400,
          statusMessage: `O grupo "${grupo.nome}" aceita no máximo ${grupo.maxSelecoes} opção(ões).`,
        })
      }
    }
  }
}

export interface FrozenCustomization {
  readonly valorTexto: string | null
  readonly arquivoUrl: string | null
  readonly arquivoNomeOriginal: string | null
}

/**
 * Congela o valor de UMA opção submetida contra a config do grupo (se o item
 * pertencer a um grupo `texto_livre`/`upload_arquivo`; caso contrário, os 3
 * campos ficam `null` — opção normal, sem valor customizado). Lança 400 se o
 * texto exceder o limite configurado; URL de arquivo fora do prefixo de
 * upload de cliente é silenciosamente descartada (defesa em profundidade —
 * nunca confiar em URL externa arbitrária, mas isso não deveria bloquear o
 * pedido inteiro já validado como "preenchido" em `validateRequiredCustomizations`).
 */
export function resolveCustomization(
  op: OptionInput,
  configByItemId: ReadonlyMap<string, SpecialGroupConfig>,
): FrozenCustomization {
  const config = configByItemId.get(op.opcao_item_id)
  if (!config) return { valorTexto: null, arquivoUrl: null, arquivoNomeOriginal: null }

  if (config.tipo === 'texto_livre') {
    const texto = (op.valor_texto ?? '').trim()
    if (config.textoMaxCaracteres && texto.length > config.textoMaxCaracteres) {
      throw createError({
        statusCode: 400,
        statusMessage: `Texto de "${config.nome}" excede o limite de ${config.textoMaxCaracteres} caracteres.`,
      })
    }
    return { valorTexto: texto || null, arquivoUrl: null, arquivoNomeOriginal: null }
  }

  // upload_arquivo
  if (op.arquivo_url && isArteClienteUrl(op.arquivo_url)) {
    return {
      valorTexto: null,
      arquivoUrl: op.arquivo_url,
      arquivoNomeOriginal: op.arquivo_nome_original?.slice(0, 255) ?? null,
    }
  }
  return { valorTexto: null, arquivoUrl: null, arquivoNomeOriginal: null }
}

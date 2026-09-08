import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import type { IntegrationCartState } from '#shared/types/integration'
import type { OptionGroup } from '#shared/types/product'
import { getProductOptions } from '../products/getProductOptions'
import { computeQuantidadeDisponivel, loadUsadoHojeProducaoDiaria, type StockPolicyRow } from '../products/stockAvailability'
import { requireActiveSession, getCartState } from './state'

/**
 * `DefinirItemCarrinho` — extraída de `cart/items.put.ts` (seção 6 da
 * arquitetura do agente WhatsApp). DEFINE a quantidade exata de um produto no
 * carrinho (cria se novo, atualiza se existente). `quantidade: 0` remove o
 * item. Sempre devolve o estado completo do carrinho.
 *
 * Carrinho unificado (Feature 3.1 — EPIC 3): aceita produtos de encomenda
 * (`requires_date`) junto com pronta entrega. `target_date` fica pendente em
 * `missing_fields` até ser informado; a reserva de capacidade (RPC
 * `reserve_preorders`) acontece atomicamente no checkout.
 *
 * Resolução de nível (Feature 4.1 — EPIC 4): `delivery_mode`/`address_id` são
 * o override SÓ deste item — use apenas quando ele diverge do checkout do
 * pedido (`updateCheckout`). Na maioria dos casos (tudo igual) não envie nada
 * aqui; o item herda o padrão do pedido automaticamente.
 *
 * Opções/variações (migration 110 — borda recheada, "sem cebola", tamanho,
 * cor...): duas combinações de opção do MESMO `produto_id` são linhas
 * distintas do carrinho — `opcoes_assinatura` (calculada aqui, nunca pelo
 * modelo) é o que diferencia. `cart_item_id` é o atalho para mirar uma linha
 * já existente sem o modelo precisar recompor a combinação de opções de
 * memória entre turnos (tool calls não persistem — mesma lição da correção do
 * produto_id alucinado).
 */
export interface SetCartItemParams {
  sessao_id: string
  produto_id: string
  quantidade: number
  /** Data de entrega/retirada do item (produtos de encomenda), formato YYYY-MM-DD. */
  target_date?: string
  /** Observação livre do cliente para este item (ex.: mensagem no bolo). */
  observacao?: string
  /** Override de modalidade SÓ deste item (Feature 4.1). */
  delivery_mode?: 'entrega' | 'retirada'
  /** Override de endereço SÓ deste item — endereço já salvo do cliente. */
  address_id?: string
  /**
   * Opções escolhidas (`ConsultarOpcoesProduto`), só `opcao_item_id` — nome e
   * preço reais são relidos de `produto_opcao_item` aqui, nunca aceitos do
   * modelo (mesma defesa de integridade financeira de `orders/create.post.ts`).
   */
  opcoes?: readonly { opcao_item_id: string }[]
  /**
   * Mira uma linha JÁ existente do carrinho por id — usado para reduzir
   * quantidade ou remover um item com opções sem recompor a combinação.
   * Ignora `opcoes` quando informado (só ajusta quantidade/atributos simples
   * da linha já gravada).
   */
  cart_item_id?: string
}

/** String estável (ids ordenados e concatenados) — '' para produto sem opção, idêntico ao comportamento de antes da migration 110. */
function computeOpcoesAssinatura(opcaoItemIds: readonly string[]): string {
  return [...opcaoItemIds].sort().join(',')
}

/**
 * Soft-check de estoque no carrinho (Gestão de Estoque, migration 111): usa o
 * MESMO helper puro de `attachStockInfo` (`stockAvailability.ts`) — nunca
 * duplica a lógica de política. É "soft" porque o hard-check de verdade, que
 * trava concorrência, é `consumir_estoque_pedido` no finalizar (mesmo desenho
 * de dois estágios que `reserve_preorders` já usa pra encomenda). Erro de
 * NEGÓCIO (relatável ao cliente pela REGRA 4).
 */
async function assertQuantidadeDisponivel(
  supabase: SupabaseClient<Database>,
  produtoId: string,
  row: StockPolicyRow,
  quantidade: number,
): Promise<void> {
  const usadoHoje = row.controle_estoque === 'producao_diaria'
    ? (await loadUsadoHojeProducaoDiaria(supabase, [produtoId])).get(produtoId) ?? 0
    : 0
  const quantidadeDisponivel = computeQuantidadeDisponivel(row, usadoHoje)

  if (quantidadeDisponivel !== null && quantidade > quantidadeDisponivel) {
    throw createError({
      statusCode: 422,
      statusMessage: `Só temos ${quantidadeDisponivel} unidade(s) disponível(is) agora.`,
    })
  }
}

interface ResolvedOption {
  opcao_item_id: string
  nome_congelado: string
  preco_delta_congelado: number
}

/**
 * Valida as opções escolhidas contra os grupos reais do produto e releva
 * nome/preço — nunca confia no que o modelo mandou. Erro de item não
 * reconhecido é TÉCNICO (o modelo devia ter chamado ConsultarOpcoesProduto
 * primeiro); grupo obrigatório sem escolha ou acima do máximo é erro de
 * NEGÓCIO (informação real para o cliente, mesmo padrão de min_quantity/
 * max_quantity da REGRA 3).
 */
function resolveAndValidateOptions(
  grupos: readonly OptionGroup[],
  submitted: readonly { opcao_item_id: string }[],
): ResolvedOption[] {
  const itemById = new Map<string, { grupo: OptionGroup, nome: string, preco_delta: number }>()
  for (const grupo of grupos) {
    for (const item of grupo.produto_opcao_item) {
      itemById.set(item.id, { grupo, nome: item.nome, preco_delta: item.preco_delta })
    }
  }

  const resolved: ResolvedOption[] = []
  const countByGrupo = new Map<string, number>()

  for (const s of submitted) {
    const found = itemById.get(s.opcao_item_id)
    if (!found) {
      throw createError({
        statusCode: 422,
        statusMessage: 'ID de opção não reconhecido nesta conversa. Chame ConsultarOpcoesProduto de novo antes de tentar adicionar — não informe isto ao cliente.',
      })
    }
    resolved.push({ opcao_item_id: s.opcao_item_id, nome_congelado: found.nome, preco_delta_congelado: found.preco_delta })
    countByGrupo.set(found.grupo.id, (countByGrupo.get(found.grupo.id) ?? 0) + 1)
  }

  for (const grupo of grupos) {
    const count = countByGrupo.get(grupo.id) ?? 0
    const minimo = grupo.obrigatorio ? Math.max(1, grupo.min_selecoes) : grupo.min_selecoes
    if (count < minimo) {
      throw createError({
        statusCode: 422,
        statusMessage: `Escolha necessária: o grupo "${grupo.nome}" exige pelo menos ${minimo} opção(ões).`,
      })
    }
    if (count > grupo.max_selecoes) {
      throw createError({
        statusCode: 422,
        statusMessage: `O grupo "${grupo.nome}" aceita no máximo ${grupo.max_selecoes} opção(ões).`,
      })
    }
  }

  return resolved
}

/** Substitui as opções gravadas de uma linha do carrinho — delete+reinsert, mesmo "set semântico" dos demais campos. */
async function replaceCartItemOptions(
  supabase: SupabaseClient<Database>,
  cartItemId: string,
  resolved: readonly ResolvedOption[],
): Promise<void> {
  const { error: delErr } = await supabase.from('cart_items_opcoes').delete().eq('cart_item_id', cartItemId)
  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar opções do item do carrinho.' })
  }
  if (resolved.length === 0) return

  const { error: insErr } = await supabase.from('cart_items_opcoes').insert(
    resolved.map((r) => ({
      cart_item_id: cartItemId,
      opcao_item_id: r.opcao_item_id,
      nome_congelado: r.nome_congelado,
      preco_delta_congelado: r.preco_delta_congelado,
    })),
  )
  if (insErr) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao gravar opções do item do carrinho.' })
  }
}

export async function setCartItem(
  supabase: SupabaseClient<Database>,
  params: SetCartItemParams,
): Promise<IntegrationCartState> {
  const { sessao_id, produto_id, quantidade, target_date, observacao, delivery_mode, address_id, opcoes, cart_item_id } = params
  const sessao = await requireActiveSession(supabase, sessao_id)

  if (address_id) {
    const { data: endereco } = await supabase
      .from('enderecos_cliente')
      .select('id')
      .eq('id', address_id)
      .eq('cliente_id', sessao.cliente_id ?? '')
      .maybeSingle()

    if (!endereco) {
      throw createError({ statusCode: 422, statusMessage: 'Endereço não encontrado para este cliente.' })
    }
  }

  // ─── Atalho por cart_item_id: mira uma linha já existente, sem recompor a
  // combinação de opções (não mexe em opcoes/opcoes_assinatura desta linha).
  if (cart_item_id) {
    const { data: linha } = await supabase
      .from('cart_items')
      .select('id, produto_id')
      .eq('id', cart_item_id)
      .eq('sessao_id', sessao_id)
      .maybeSingle()

    if (!linha) {
      logger.warn('[cart] cart_item_id inexistente nesta sessão', { cart_item_id, sessao_id })
      throw createError({
        statusCode: 422,
        statusMessage: 'ID de item do carrinho não reconhecido nesta conversa. Use produto_id normalmente, sem cart_item_id — não informe isto ao cliente.',
      })
    }

    if (quantidade === 0) {
      const { error: delErr } = await supabase.from('cart_items').delete().eq('id', cart_item_id)
      if (delErr) {
        throw createError({ statusCode: 500, statusMessage: 'Falha ao remover item do carrinho.' })
      }
      return getCartState(supabase, sessao_id)
    }

    // Atalho por cart_item_id pula o check de disponivel/existência do
    // produto (a linha já existe), mas NÃO deve pular o soft-check de
    // estoque — senão dava pra burlar aumentando quantidade por este caminho.
    const { data: produtoLinha } = await supabase
      .from('produtos')
      .select('controle_estoque, estoque_atual, producao_diaria_limite')
      .eq('id', linha.produto_id)
      .maybeSingle()
    if (produtoLinha) {
      await assertQuantidadeDisponivel(supabase, linha.produto_id, produtoLinha, quantidade)
    }

    const attrsLinha: { quantidade: number, target_date?: string, observacao?: string, delivery_mode?: string, address_id?: string } = { quantidade }
    if (target_date !== undefined) attrsLinha.target_date = target_date
    if (observacao !== undefined) attrsLinha.observacao = observacao
    if (delivery_mode !== undefined) attrsLinha.delivery_mode = delivery_mode
    if (address_id !== undefined) attrsLinha.address_id = address_id

    const { error: updErr } = await supabase.from('cart_items').update(attrsLinha).eq('id', cart_item_id)
    if (updErr) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar item do carrinho.' })
    }
    return getCartState(supabase, sessao_id)
  }

  // ─── Caminho padrão: produto_id (+ opções, se houver) identifica a linha.
  const opcoesSubmetidas = opcoes ?? []
  const assinatura = computeOpcoesAssinatura(opcoesSubmetidas.map((o) => o.opcao_item_id))

  if (quantidade === 0) {
    const { error: delErr } = await supabase
      .from('cart_items')
      .delete()
      .eq('sessao_id', sessao_id)
      .eq('produto_id', produto_id)
      .eq('opcoes_assinatura', assinatura)

    if (delErr) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao remover item do carrinho.' })
    }
    return getCartState(supabase, sessao_id)
  }

  const { data: produto } = await supabase
    .from('produtos')
    .select('id, disponivel, controle_estoque, estoque_atual, producao_diaria_limite')
    .eq('id', produto_id)
    .maybeSingle()

  // As duas causas eram a MESMA mensagem ("Produto inexistente ou
  // indisponível") e o `produto_id` não ia para lugar nenhum — o modelo
  // parafraseava "não está disponível" e não sobrava rastro de qual das duas
  // aconteceu nem de qual id foi tentado. Mesmo modo de falha da armadilha 11
  // (§5): o erro chega e some. Separadas, com o id no log.
  //
  // Só identificadores, nunca fala do cliente. `produto_id` vem do modelo, que
  // deveria tê-lo copiado de `BuscarProdutos` — se ele não existir na tabela, é
  // o próprio id o dado que interessa.
  // Mensagem escrita para o MODELO corrigir sozinho, nunca para o cliente ver
  // (TECHNICAL_ERROR_NOTE em systemPrompt.ts): produto_id fora da tabela quase
  // sempre é o modelo reaproveitando um id de um turno anterior — os tool
  // calls não persistem entre turnos (`runAgent.ts`), só o texto — então o
  // UUID nunca esteve realmente disponível para ele "lembrar". A ação certa é
  // chamar BuscarProdutos de novo, não expor a falha.
  if (!produto) {
    logger.warn('[cart] produto_id inexistente na tabela produtos', { produto_id, sessao_id })
    throw createError({
      statusCode: 422,
      statusMessage: 'ID de produto não reconhecido nesta conversa. Chame BuscarProdutos de novo com o nome do item antes de tentar adicionar — não informe isto ao cliente.',
    })
  }

  if (!produto.disponivel) {
    logger.warn('[cart] produto existe mas está indisponível', { produto_id, sessao_id })
    throw createError({
      statusCode: 422,
      statusMessage: 'Produto indisponível.',
    })
  }

  await assertQuantidadeDisponivel(supabase, produto_id, produto, quantidade)

  // Opções/variações (migration 110): grupos vazios (produto sem opção) não
  // validam nada — `resolveAndValidateOptions` com `grupos=[]` e
  // `opcoesSubmetidas=[]` devolve `[]` direto.
  const grupos = await getProductOptions(supabase, produto_id)
  const resolvedOptions = resolveAndValidateOptions(grupos, opcoesSubmetidas)

  // Carrinho unificado (EPIC 3): encomenda entra igual à pronta entrega. A
  // data de entrega é coletada incrementalmente — se faltar, aparece em
  // missing_fields; a reserva de capacidade acontece no checkout.

  // Set semântico: upsert pela UNIQUE(sessao_id, produto_id, opcoes_assinatura).
  // Atributos omitidos preservam o valor existente (upsert só atualiza as
  // colunas enviadas).
  const attrs: {
    target_date?: string
    observacao?: string
    delivery_mode?: string
    address_id?: string
  } = {}
  if (target_date !== undefined) attrs.target_date = target_date
  if (observacao !== undefined) attrs.observacao = observacao
  if (delivery_mode !== undefined) attrs.delivery_mode = delivery_mode
  if (address_id !== undefined) attrs.address_id = address_id

  const { data: upsertedRow, error: upsertErr } = await supabase
    .from('cart_items')
    .upsert(
      { sessao_id, produto_id, quantidade, opcoes_assinatura: assinatura, ...attrs },
      { onConflict: 'sessao_id,produto_id,opcoes_assinatura' },
    )
    .select('id')
    .single()

  if (upsertErr || !upsertedRow) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar item do carrinho.' })
  }

  await replaceCartItemOptions(supabase, upsertedRow.id, resolvedOptions)

  return getCartState(supabase, sessao_id)
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import type { IntegrationCartState } from '#shared/types/integration'
import type { OptionGroup } from '#shared/types/product'
import { getProductOptions } from '../products/getProductOptions'
import { isUsableOptionItem, resolveOptionGroupChoice } from '../products/resolveOptionGroupChoice'
import { computeQuantidadeDisponivel, loadUsadoHojeProducaoDiaria, type StockPolicyRow } from '../products/stockAvailability'
import { requireActiveSession, getCartState } from './state'
import { deferArt } from './pendingArt'

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
   * Opções escolhidas (`ConsultarOpcoesProduto`) — nome e preço reais são
   * relidos de `produto_opcao_item` aqui, nunca aceitos do modelo (mesma
   * defesa de integridade financeira de `orders/create.post.ts`).
   * `valor_texto`: texto digitado pelo cliente, só para `opcao_item_id`
   * âncora de um grupo `texto_livre` (migration 114) — ignorado nos demais
   * tipos. Não existe `arquivo_url` aqui de propósito: a arte de um grupo
   * `upload_arquivo` NUNCA é aceita por este parâmetro (o modelo não tem
   * como relayar um S3 key com segurança) — é anexada automaticamente por
   * `attachPendingArt.ts` quando o cliente manda a imagem pelo WhatsApp.
   */
  opcoes?: readonly { opcao_item_id: string, valor_texto?: string, diferir?: boolean }[]
  /**
   * Mira uma linha JÁ existente do carrinho por id — usado para reduzir
   * quantidade ou remover um item com opções sem recompor a combinação.
   * Ignora `opcoes` quando informado (só ajusta quantidade/atributos simples
   * da linha já gravada).
   */
  cart_item_id?: string
}

/**
 * String estável (fragmentos ordenados e concatenados) — '' para produto sem
 * opção, idêntico ao comportamento de antes da migration 110. Cada fragmento
 * inclui `valor_texto` quando presente: dois `DefinirItemCarrinho` do MESMO
 * produto com textos DIFERENTES de um grupo `texto_livre` (ex.: dois nomes
 * gravados distintos) precisam virar duas linhas do carrinho, nunca colidir
 * na mesma — mesmo bug/correção de `app/stores/cart.ts` e `orders/new.vue`
 * no catálogo web. Grupo `upload_arquivo` não entra com valor aqui (a arte
 * ainda não existe neste momento — chega depois, anexada direto na linha já
 * criada por `attachPendingArt.ts`).
 */
function computeOpcoesAssinatura(opcoes: readonly { opcao_item_id: string, valor_texto?: string | null }[]): string {
  return [...opcoes]
    .map((o) => (o.valor_texto ? `${o.opcao_item_id}:${o.valor_texto}` : o.opcao_item_id))
    .sort()
    .join(',')
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
  const usadoHoje = row.stock_control === 'producao_diaria'
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
  /** Só para grupo `texto_livre` (migration 114) — `null` nos demais tipos. */
  valor_texto: string | null
}

/**
 * Valida as opções escolhidas contra os grupos reais do produto e releva
 * nome/preço — nunca confia no que o modelo mandou. Erro de item não
 * reconhecido é TÉCNICO (o modelo devia ter chamado ConsultarOpcoesProduto
 * primeiro); grupo obrigatório sem escolha ou acima do máximo é erro de
 * NEGÓCIO (informação real para o cliente, mesmo padrão de min_quantity/
 * max_quantity da REGRA 3).
 *
 * Grupo `texto_livre` (migration 114): quando o modelo já tem o texto do
 * cliente em mãos na mesma mensagem, valida e congela `valor_texto` aqui —
 * mas (migration 127) a CONTAGEM mínima/obrigatoriedade NÃO bloqueia mais
 * este tool call (mesmo motivo do `upload_arquivo` abaixo: o botão "Sem nome"
 * do chat online só pode aparecer para um item que já está no carrinho). A
 * exigência real virou pendência em `missing_fields` (`resolveMissingFields`,
 * campo `texto_personalizacao`), com o mesmo bloqueio de `FinalizarPedido`
 * que `arquivo_arte`/`target_date` já usam.
 *
 * Grupo `upload_arquivo` (migration 114): **excluído** da contagem de
 * obrigatoriedade aqui de propósito — a arte chega numa mensagem SEPARADA
 * do WhatsApp (imagem), sempre DEPOIS deste tool call, anexada
 * automaticamente por `attachPendingArt.ts` direto na linha do carrinho, OU
 * explicitamente adiada via `diferir:true` (migration 127 — ver
 * `setCartItem()`, que trata isso FORA desta função, nunca como uma "opção
 * escolhida" comum). Exigir a escolha aqui travaria a adição do item num loop
 * impossível (pedir o arquivo exige o item já estar no carrinho como
 * contexto). A exigência real vira pendência em `missing_fields`
 * (`resolveMissingFields`), com o mesmo bloqueio de `FinalizarPedido` que
 * `target_date` já usa.
 *
 * Grupo `single`/`multiple`/`toggle`: a decisão de exigir pergunta ao
 * cliente, resolver sozinho ou recusar por cadastro quebrado NUNCA é
 * calculada pelo modelo — vem inteira de `resolveOptionGroupChoice`, a MESMA
 * função que `ConsultarOpcoesProduto` usa para orientar o agente (backstop
 * determinístico: não confia só no prompt ter sido seguido, mesma filosofia
 * de `technicalEscalation.ts`). Item com `nome` vazio (cadastro incompleto)
 * nunca entra em `itemById` — não pode ser oferecido nem, se o modelo
 * inventar o id mesmo assim, aceito.
 */
function resolveAndValidateOptions(
  grupos: readonly OptionGroup[],
  submitted: readonly { opcao_item_id: string, valor_texto?: string }[],
): ResolvedOption[] {
  const itemById = new Map<string, { grupo: OptionGroup, nome: string, preco_delta: number }>()
  for (const grupo of grupos) {
    for (const item of grupo.produto_opcao_item) {
      if (!isUsableOptionItem(item)) continue
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

    let valorTexto: string | null = null
    if (found.grupo.tipo === 'texto_livre') {
      const texto = (s.valor_texto ?? '').trim()
      if (!texto) {
        throw createError({
          statusCode: 422,
          statusMessage: `Texto necessário: pergunte ao cliente o que ele quer em "${found.grupo.nome}" e chame de novo com valor_texto preenchido.`,
        })
      }
      const limite = found.grupo.texto_max_caracteres
      if (limite && texto.length > limite) {
        throw createError({
          statusCode: 422,
          statusMessage: `Texto de "${found.grupo.nome}" excede o limite de ${limite} caracteres — peça um texto mais curto.`,
        })
      }
      valorTexto = texto
    }

    resolved.push({ opcao_item_id: s.opcao_item_id, nome_congelado: found.nome, preco_delta_congelado: found.preco_delta, valor_texto: valorTexto })
    countByGrupo.set(found.grupo.id, (countByGrupo.get(found.grupo.id) ?? 0) + 1)
  }

  for (const grupo of grupos) {
    // migration 127 — nem upload_arquivo nem texto_livre bloqueiam o add
    // aqui, mesmo quando obrigatórios: ver docblock. A validação/congelamento
    // do texto em si (quando o modelo já manda no mesmo call) já rolou no
    // loop de `submitted` acima; só a CONTAGEM mínima/obrigatoriedade fica de
    // fora, virando pendência em missing_fields.
    if (grupo.tipo === 'upload_arquivo' || grupo.tipo === 'texto_livre') continue

    const resolucao = resolveOptionGroupChoice(grupo)

    if (resolucao?.mode === 'invalid_catalog') {
      // Erro TÉCNICO, nunca de negócio: nenhuma resposta do cliente resolve
      // um grupo obrigatório sem opções válidas suficientes cadastradas — é
      // pendência de catálogo. 500 (não 422) para cair direto na regra de
      // 5xx de `technicalEscalation.ts`, sem depender de heurística de texto.
      throw createError({
        statusCode: 500,
        statusMessage: `Configuração inválida do produto: o grupo "${grupo.nome}" não tem opções válidas suficientes cadastradas.`,
      })
    }

    const count = countByGrupo.get(grupo.id) ?? 0

    if (resolucao?.mode === 'automatic' && count === 0) {
      // Única combinação possível — resolvido pelo sistema, sem depender do
      // modelo ter perguntado ou adivinhado o id (bug real de produção
      // 17/08: grupo "TIPO" com uma única opção travava o pedido).
      for (const itemId of resolucao.autoItemIds) {
        const item = itemById.get(itemId)
        if (!item) continue // defensivo — autoItemIds só contém itens usáveis, já em itemById.
        resolved.push({ opcao_item_id: itemId, nome_congelado: item.nome, preco_delta_congelado: item.preco_delta, valor_texto: null })
      }
      continue
    }

    const minimo = grupo.obrigatorio ? Math.max(1, grupo.min_selecoes) : grupo.min_selecoes
    if (count < minimo) {
      throw createError({
        statusCode: 422,
        statusMessage: `Escolha necessária: o grupo "${grupo.nome}" exige pelo menos ${minimo} opção(ões).`,
      })
    }
    // max_selecoes=0 é o padrão de grupos `toggle` (cada item liga/desliga
    // independente, sem teto) — só rejeita excesso quando há um teto real.
    if (grupo.max_selecoes > 0 && count > grupo.max_selecoes) {
      throw createError({
        statusCode: 422,
        statusMessage: `O grupo "${grupo.nome}" aceita no máximo ${grupo.max_selecoes} opção(ões).`,
      })
    }
  }

  return resolved
}

/**
 * Substitui as opções gravadas de uma linha do carrinho — delete+reinsert,
 * mesmo "set semântico" dos demais campos. `preservarOpcaoItemIds` (âncoras
 * de grupo `upload_arquivo`/`texto_livre`, migration 127) NUNCA são apagadas
 * por aqui: a arte que `attachPendingArt.ts` já anexou, o texto que o botão
 * "Sem nome"/`declineText` já gravou, ou o `deferred:true` do "Enviar depois"
 * para esta linha não podem ser perdidos só porque o modelo chamou
 * `DefinirItemCarrinho` de novo (ex.: ajustar quantidade) sem — e ele nunca
 * tem como — reenviar esses valores.
 */
async function replaceCartItemOptions(
  supabase: SupabaseClient<Database>,
  cartItemId: string,
  resolved: readonly ResolvedOption[],
  preservarOpcaoItemIds: readonly string[],
): Promise<void> {
  let query = supabase.from('cart_item_options').delete().eq('cart_item_id', cartItemId)
  if (preservarOpcaoItemIds.length > 0) {
    query = query.not('option_item_id', 'in', `(${preservarOpcaoItemIds.join(',')})`)
  }
  const { error: delErr } = await query
  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar opções do item do carrinho.' })
  }
  if (resolved.length === 0) return

  const { error: insErr } = await supabase.from('cart_item_options').insert(
    resolved.map((r) => ({
      cart_item_id: cartItemId,
      option_item_id: r.opcao_item_id,
      frozen_name: r.nome_congelado,
      text_value: r.valor_texto,
      frozen_price_delta: r.preco_delta_congelado,
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
      .from('customer_addresses')
      .select('id')
      .eq('id', address_id)
      .eq('customer_id', sessao.customer_id ?? '')
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
      .select('id, product_id')
      .eq('id', cart_item_id)
      .eq('session_id', sessao_id)
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
      .from('products')
      .select('stock_control, current_stock, daily_production_limit')
      .eq('id', linha.product_id)
      .maybeSingle()
    if (produtoLinha) {
      await assertQuantidadeDisponivel(supabase, linha.product_id, produtoLinha, quantidade)
    }

    const attrsLinha: { quantity: number, target_date?: string, note?: string, delivery_mode?: string, address_id?: string } = { quantity: quantidade }
    if (target_date !== undefined) attrsLinha.target_date = target_date
    if (observacao !== undefined) attrsLinha.note = observacao
    if (delivery_mode !== undefined) attrsLinha.delivery_mode = delivery_mode
    if (address_id !== undefined) attrsLinha.address_id = address_id

    const { error: updErr } = await supabase.from('cart_items').update(attrsLinha).eq('id', cart_item_id)
    if (updErr) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar item do carrinho.' })
    }
    return getCartState(supabase, sessao_id)
  }

  // ─── Caminho padrão: produto_id (+ opções, se houver) identifica a linha.
  // `diferir:true` (migration 127, âncora upload_arquivo — "vou enviar
  // depois") NUNCA entra na assinatura nem em resolveAndValidateOptions: não
  // é uma "opção escolhida" que diferencia linhas do carrinho (mesmo motivo
  // de upload_arquivo nunca ter entrado ali) — é resolvido à parte, depois do
  // upsert, direto em cart_item_options (ver bloco abaixo).
  const opcoesSubmetidas = (opcoes ?? []).filter((o) => !o.diferir)
  const opcoesDiferidas = (opcoes ?? []).filter((o) => o.diferir)
  const assinatura = computeOpcoesAssinatura(opcoesSubmetidas)

  if (quantidade === 0) {
    const { error: delErr } = await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessao_id)
      .eq('product_id', produto_id)
      .eq('options_signature', assinatura)

    if (delErr) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao remover item do carrinho.' })
    }
    return getCartState(supabase, sessao_id)
  }

  const { data: produto } = await supabase
    .from('products')
    .select('id, available, stock_control, current_stock, daily_production_limit')
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

  if (!produto.available) {
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

  // Recalculada a partir do resultado JÁ resolvido (inclui grupo "automatic"
  // preenchido sozinho, ver `resolveOptionGroupChoice`) — a assinatura
  // calculada acima (linha da remoção) só viu o que o modelo enviou, e um
  // grupo automatic nunca vem no `opcoes` enviado.
  const assinaturaFinal = computeOpcoesAssinatura(resolvedOptions)

  // Âncoras de grupo upload_arquivo/texto_livre deste produto — nunca
  // apagadas pelo replace de opções abaixo (ver docblock de
  // replaceCartItemOptions). texto_livre entrou aqui na migration 127: como o
  // texto agora pode ser resolvido só DEPOIS que o item já está no carrinho
  // (botão "Sem nome"/resposta em turno seguinte), um `DefinirItemCarrinho`
  // posterior (ex.: ajustar quantidade) não pode apagar o nome já gravado.
  const preservedAnchorIds = grupos
    .filter((g) => g.tipo === 'upload_arquivo' || g.tipo === 'texto_livre')
    .map((g) => g.produto_opcao_item[0]?.id)
    .filter((id): id is string => id !== undefined)

  // Carrinho unificado (EPIC 3): encomenda entra igual à pronta entrega. A
  // data de entrega é coletada incrementalmente — se faltar, aparece em
  // missing_fields; a reserva de capacidade acontece no checkout.

  // Set semântico: upsert pela UNIQUE(sessao_id, produto_id, opcoes_assinatura).
  // Atributos omitidos preservam o valor existente (upsert só atualiza as
  // colunas enviadas).
  const attrs: {
    target_date?: string
    note?: string
    delivery_mode?: string
    address_id?: string
  } = {}
  if (target_date !== undefined) attrs.target_date = target_date
  if (observacao !== undefined) attrs.note = observacao
  if (delivery_mode !== undefined) attrs.delivery_mode = delivery_mode
  if (address_id !== undefined) attrs.address_id = address_id

  const { data: upsertedRow, error: upsertErr } = await supabase
    .from('cart_items')
    .upsert(
      { session_id: sessao_id, product_id: produto_id, quantity: quantidade, options_signature: assinaturaFinal, ...attrs },
      { onConflict: 'session_id,product_id,options_signature' },
    )
    .select('id')
    .single()

  if (upsertErr || !upsertedRow) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar item do carrinho.' })
  }

  await replaceCartItemOptions(supabase, upsertedRow.id, resolvedOptions, preservedAnchorIds)

  // `diferir:true` (migration 127) — só válido pra âncora upload_arquivo
  // deste produto; qualquer outro id é erro TÉCNICO (mesma família de
  // "ID de opção não reconhecido" do loop de `submitted` acima). Gravado
  // DEPOIS do replace, direto em cart_item_options, pelo mesmo helper
  // canal-agnóstico que o botão "Enviar depois" do chat online usa
  // (`cart/pendingArt.ts` — nunca duas implementações divergindo em silêncio).
  for (const d of opcoesDiferidas) {
    const grupo = grupos.find((g) => g.tipo === 'upload_arquivo' && g.produto_opcao_item[0]?.id === d.opcao_item_id)
    const anchor = grupo?.produto_opcao_item[0]
    if (!grupo || !anchor) {
      throw createError({
        statusCode: 422,
        statusMessage: 'diferir só é válido para o opcao_item_id de um grupo upload_arquivo deste produto (de ConsultarOpcoesProduto) — não informe isto ao cliente.',
      })
    }
    await deferArt(supabase, {
      cartItemId: upsertedRow.id,
      opcaoItemId: anchor.id,
      nomeCongelado: anchor.nome,
      precoDeltaCongelado: anchor.preco_delta,
    })
  }

  return getCartState(supabase, sessao_id)
}

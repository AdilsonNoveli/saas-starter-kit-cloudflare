/**
 * Resolução DETERMINÍSTICA de um grupo de opção/variação (`produto_opcao_grupo`)
 * — decide, em código, se o grupo já está resolvido sozinho, se precisa de
 * pergunta ao cliente, ou se o cadastro do produto está quebrado demais para
 * vender o item. Único lugar que calcula isso: tanto `ConsultarOpcoesProduto`
 * (orienta o agente) quanto `setCartItem` (valida de verdade, backstop) usam
 * a MESMA função — nunca o modelo, que só repassa o que aqui sai pronto.
 *
 * Motivo (bug de produção 17/08): um grupo obrigatório com uma única opção
 * cadastrada ("TIPO" → só "Masculino") travava o pedido porque o agente tinha
 * que "adivinhar" se perguntava ou não — e outro grupo ("MATERIAL") tinha um
 * item com `nome` vazio (cadastro incompleto) misturado com um item válido,
 * o que agrava o mesmo problema: nome vazio nunca pode ser oferecido nem
 * escolhido, mas a mera presença dele sinaliza cadastro em andamento, não uma
 * decisão segura para resolver sozinho.
 */
import type { OptionGroup, OptionItem } from '#shared/types/product'

export type OptionGroupResolutionMode = 'automatic' | 'ask_customer' | 'invalid_catalog'

export interface OptionGroupResolution {
  readonly groupId: string
  readonly groupName: string
  readonly mode: OptionGroupResolutionMode
  /** Só em modo 'automatic': ids já decididos — aplicar sem perguntar nada. */
  readonly autoItemIds: readonly string[]
  /** Só em modo 'ask_customer': únicos itens que podem ser oferecidos (nome preenchido). */
  readonly askableItems: readonly Pick<OptionItem, 'id' | 'nome' | 'preco_delta'>[]
}

/** Item sem nome nunca pode ser oferecido nem congelado em `nome_congelado`. */
export function isUsableOptionItem(item: Pick<OptionItem, 'nome'>): boolean {
  return item.nome.trim() !== ''
}

/**
 * `null` = grupo fora de escopo desta resolução: `texto_livre`/`upload_arquivo`
 * têm mecanismo próprio (texto digitado / anexo assíncrono — ver
 * `setCartItem.ts`), e grupo opcional (`minimo === 0`) não bloqueia nada, então
 * não há o que decidir aqui.
 */
export function resolveOptionGroupChoice(group: OptionGroup): OptionGroupResolution | null {
  if (group.tipo === 'texto_livre' || group.tipo === 'upload_arquivo') return null

  const minimo = group.obrigatorio ? Math.max(1, group.min_selecoes) : group.min_selecoes
  if (minimo === 0) return null

  const usableItems = group.produto_opcao_item.filter(isUsableOptionItem)
  const hasBrokenItem = usableItems.length !== group.produto_opcao_item.length

  if (usableItems.length < minimo) {
    return { groupId: group.id, groupName: group.nome, mode: 'invalid_catalog', autoItemIds: [], askableItems: [] }
  }

  // Exatamente o necessário, e nenhum item quebrado por perto: não há escolha
  // real a fazer, então não há por que perguntar. Item vazio no MEIO de um
  // grupo que já bateria a cota sozinho força pergunta mesmo assim — a
  // presença dele é sinal de cadastro incompleto, não uma decisão seguro de
  // ignorar (ver docblock do arquivo).
  if (usableItems.length === minimo && !hasBrokenItem) {
    return { groupId: group.id, groupName: group.nome, mode: 'automatic', autoItemIds: usableItems.map((i) => i.id), askableItems: [] }
  }

  return {
    groupId: group.id,
    groupName: group.nome,
    mode: 'ask_customer',
    autoItemIds: [],
    askableItems: usableItems.map((i) => ({ id: i.id, nome: i.nome, preco_delta: i.preco_delta })),
  }
}

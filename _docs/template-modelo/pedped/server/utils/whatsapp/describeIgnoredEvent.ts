/**
 * Descreve, sem conteúdo, o evento que o webhook hoje descarta em silêncio
 * (§5, armadilha 11 de `_docs/em-andamento.md`). `parseInboundPayload` devolve
 * `null` para status, para echo (`value.message_echoes`, que ainda reprova na
 * validação do Zod por falta de `contacts[].profile`) e para qualquer um dos
 * ~28 campos de webhook ativados no painel do provedor — e o corpo some sem
 * deixar rastro. O descarte silencioso é o problema em si, não uma lacuna de
 * instrumentação: é ele que impede a captura pareada (`wamid` que o envio
 * devolveu × echo do mesmo recado) de que o passo 5 da §0.5.1 depende.
 *
 * Três invariantes, todas obrigatórias:
 *
 * 1. **Zero conteúdo do cliente.** Só a estrutura (qual array veio, quantos
 *    itens) e os `id` (wamids). Nunca `text.body`, nunca nome, nunca telefone.
 * 2. **O custo é O(1), nunca proporcional ao corpo.** `history` pode trazer
 *    milhares de mensagens num único POST (`api-1.yaml:240`), e o webhook tem
 *    contrato de tempo com a Meta — responder devagar vira retry, e retry vira
 *    mensagem duplicada. Nenhum laço aqui percorre um array de **conteúdo**
 *    (`messages`, `message_echoes`, `history`, ...): deles só se lê `length` e
 *    os primeiros `MAX_WAMIDS` itens. Os únicos laços que percorrem tudo são
 *    sobre o envelope (`entry[]`, `changes[]`, chaves de `value`), cujo tamanho
 *    não acompanha o do corpo.
 * 3. **Discrimina por qual array veio**, nunca por `changes[].field` — status e
 *    mensagem de verdade usam o mesmo `field: "messages"` (§0.5.2, item c). O
 *    `field` é registrado como informação, não como critério.
 *
 * Não usa Zod de propósito: o schema de `parseInboundPayload` é justamente o
 * que hoje rejeita o echo. Descrever um payload que reprovou na validação é
 * metade do valor desta função.
 */

/** Teto de `changes[]` descritas. Na prática a Meta manda uma. */
const MAX_CHANGES = 3
/** Teto de wamids por array — e também o teto de itens visitados (invariante 2). */
const MAX_WAMIDS = 3

export interface IgnoredEventArray {
  /** Chave de `value` que veio como array: `messages`, `message_echoes`, `statuses`, `history`, ... */
  name: string
  /** Quantos itens vieram. É o número que denuncia um `history` gigante. */
  size: number
  /** Até `MAX_WAMIDS` ids, lidos só do início do array. */
  wamids: string[]
}

export interface IgnoredEventChange {
  /** `changes[].field`. Registrado, **não** usado para discriminar (invariante 3). */
  field: string | null
  arrays: IgnoredEventArray[]
}

export interface IgnoredEventDescription {
  /** Chaves de primeiro nível do corpo — o que sobra quando nem o envelope é reconhecido. */
  rootKeys: string[]
  /** Tamanho de `entry[]`; `0` quando o corpo não é um envelope de webhook. */
  entries: number
  /** Total de `changes[]` somando todas as `entry[]`. */
  changes: number
  /** As primeiras `MAX_CHANGES` descritas; pode ser menor que `changes`. */
  described: IgnoredEventChange[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Lê os ids dos primeiros itens. O laço para em `MAX_WAMIDS` **posições**, não
 * em `MAX_WAMIDS` ids encontrados: um array de mil itens sem `id` custaria mil
 * iterações no segundo caso, e o corpo do webhook não é confiável nesse ponto.
 */
function firstWamids(items: unknown[]): string[] {
  const wamids: string[] = []
  const limit = Math.min(items.length, MAX_WAMIDS)

  for (let index = 0; index < limit; index++) {
    const item = items[index]
    if (isRecord(item) && typeof item.id === 'string') wamids.push(item.id)
  }

  return wamids
}

function describeArrays(value: unknown): IgnoredEventArray[] {
  if (!isRecord(value)) return []

  const arrays: IgnoredEventArray[] = []
  for (const [name, entry] of Object.entries(value)) {
    if (!Array.isArray(entry)) continue
    arrays.push({ name, size: entry.length, wamids: firstWamids(entry) })
  }

  return arrays
}

function describeChange(change: unknown): IgnoredEventChange {
  if (!isRecord(change)) return { field: null, arrays: [] }

  return {
    field: typeof change.field === 'string' ? change.field : null,
    arrays: describeArrays(change.value),
  }
}

export function describeIgnoredEvent(rawBody: unknown): IgnoredEventDescription {
  const rootKeys = isRecord(rawBody) ? Object.keys(rawBody) : []
  const entry = isRecord(rawBody) && Array.isArray(rawBody.entry) ? rawBody.entry : []

  let changes = 0
  const described: IgnoredEventChange[] = []

  for (const item of entry) {
    const itemChanges = isRecord(item) && Array.isArray(item.changes) ? item.changes : []
    changes += itemChanges.length

    for (const change of itemChanges) {
      if (described.length >= MAX_CHANGES) break
      described.push(describeChange(change))
    }
  }

  return { rootKeys, entries: entry.length, changes, described }
}

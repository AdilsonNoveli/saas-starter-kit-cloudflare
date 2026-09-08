/**
 * Preferências estruturadas do cliente (§7 de `_docs/REVENUE/study.md`).
 *
 * Substitui o texto livre de `clientes.preferencias`, que crescia sem limite,
 * não distinguia "dito uma vez" de "confirmado dez vezes" e não tinha como
 * registrar que o cliente mudou de ideia.
 *
 * Puro por desenho: sem Supabase, sem OpenAI, sem relógio implícito — `now`
 * é sempre parâmetro, para o decaimento ser testável sem congelar tempo global.
 *
 * Mora em `shared/` e não em `server/` porque os dois lados precisam da MESMA
 * matemática: o agente decide o que entra na SKILL, e a ficha do cliente em
 * `/admin/customers/view/[id]` mostra ao lojista a confiança de cada
 * preferência. Duplicar a fórmula faria a tela e o prompt divergirem em
 * silêncio — o lojista veria "alta confiança" num dado que o agente já
 * descartou.
 */

/**
 * Vocabulário fechado (§8, defesa 1). O modelo **não escolhe** a chave: manda
 * uma destas ou o registro é descartado. Sem isso, a chave viraria mais um
 * canal de texto livre do cliente para dentro do system prompt.
 */
export const PREFERENCE_KEYS = [
  'allergy',
  'dietary_restriction',
  'ingredient_exclusion',
  'ingredient_preference',
  'product_preference',
  'delivery_note',
  'payment_preference',
  'contact_preference',
] as const

export type PreferenceKey = typeof PREFERENCE_KEYS[number]

/**
 * Alergia e restrição alimentar **não decaem**. As demais preferências são
 * gosto, e gosto muda — esquecer é o comportamento certo. Alergia é segurança:
 * um cliente que declarou alergia a amendoim há 8 meses continua alérgico, e
 * deixar isso sumir do perfil por decurso de prazo seria um modo de falha com
 * consequência física.
 */
const NON_DECAYING_KEYS: ReadonlySet<string> = new Set<PreferenceKey>([
  'allergy',
  'dietary_restriction',
])

/** Teto por valor (§8, defesa 2). Uma preferência é um fato curto, não um parágrafo. */
export const PREFERENCE_VALUE_MAX = 80

/**
 * Meia-vida do decaimento (§7.4), em dias.
 *
 * 365 e não 180 por causa de como a observação chega: `AtualizarContexto` só é
 * chamada "quando houver novidade clara" (regra da própria tool), então uma
 * preferência estável e verdadeira pode passar meses sem ser reconfirmada. Com
 * meia-vida curta, o sistema esqueceria justamente o que o cliente considera
 * óbvio demais para repetir.
 */
export const PREFERENCE_HALF_LIFE_DAYS = 365

/**
 * Cortes de entrada na SKILL (§7.5) — as duas condições valem juntas.
 *
 * Os dois números são calibrados **um contra o outro**: com a suavização de
 * Laplace, 2 observações sem contradição dão exatamente 0.50. Um corte de
 * confiança acima disso tornaria `PREFERENCE_MIN_OBSERVATIONS = 2` letra morta —
 * seria preciso 3 observações para passar, e a regra declarada mentiria.
 *
 * Com 0.4, as vidas úteis ficam: 2 observações ≈ 4 meses, 4 observações ≈ 9
 * meses, 10 observações ≈ 13 meses. Reconfirmar reinicia a contagem.
 */
export const PREFERENCE_MIN_CONFIDENCE = 0.4
export const PREFERENCE_MIN_OBSERVATIONS = 2

export interface PreferenceEntry {
  value: string
  observations: number
  contradictions: number
  /** ISO date (YYYY-MM-DD). */
  firstSeen: string
  lastSeen: string
}

export type PreferenceMap = Partial<Record<PreferenceKey, PreferenceEntry>>

export function isPreferenceKey(key: string): key is PreferenceKey {
  return (PREFERENCE_KEYS as readonly string[]).includes(key)
}

/**
 * Controle (inclui quebra de linha e tab), DEL e zero-width.
 *
 * Por ponto de codigo e nao por regex de proposito: uma classe de caracteres
 * com esses valores viola `no-control-regex` mesmo escapada, e escreve-los
 * literalmente no fonte deixaria no codigo exatamente o tipo de caractere
 * invisivel que esta funcao existe para remover.
 */
function isInvisibleCodePoint(code: number): boolean {
  return code < 0x20
    || code === 0x7f
    || (code >= 0x200b && code <= 0x200d)
    || code === 0xfeff
}

/**
 * Normaliza o valor vindo do modelo (secao 8, defesa 2): uma linha, com teto
 * rigido. Quebra de linha e o que permitiria a um valor "fechar" o campo e abrir
 * uma linha propria dentro do prompt renderizado — por isso vira espaco em vez
 * de ser preservada. Zero-width sai pelo motivo inverso: seria texto presente no
 * prompt e ausente na revisao humana.
 */
export function sanitizePreferenceValue(raw: string): string | null {
  let cleaned = ''
  for (const char of raw) {
    cleaned += isInvisibleCodePoint(char.codePointAt(0) ?? 0) ? ' ' : char
  }

  const flat = cleaned.replace(/\s+/g, ' ').trim()

  if (!flat) return null
  return flat.slice(0, PREFERENCE_VALUE_MAX)
}

/**
 * Confiança com suavização de Laplace (§7.3). O `+2` no denominador é o prior
 * que impede uma observação isolada de virar certeza: 1 observação dá 0.33,
 * não 1.0 — que era o defeito da proposta anterior.
 */
export function rawConfidence(entry: PreferenceEntry): number {
  return entry.observations / (entry.observations + 2 * entry.contradictions + 2)
}

/**
 * Confiança efetiva: crua × decaimento por meia-vida (§7.4). Chaves de
 * segurança não decaem (ver `NON_DECAYING_KEYS`).
 */
export function confidenceOf(key: PreferenceKey, entry: PreferenceEntry, now: Date): number {
  const raw = rawConfidence(entry)
  if (NON_DECAYING_KEYS.has(key)) return raw

  const ageDays = (now.getTime() - Date.parse(`${entry.lastSeen}T00:00:00Z`)) / 86_400_000
  if (!Number.isFinite(ageDays) || ageDays <= 0) return raw

  return raw * Math.pow(0.5, ageDays / PREFERENCE_HALF_LIFE_DAYS)
}

/** Passa nos dois cortes da §7.5. */
export function isPreferenceUsable(key: PreferenceKey, entry: PreferenceEntry, now: Date): boolean {
  return entry.observations >= PREFERENCE_MIN_OBSERVATIONS
    && confidenceOf(key, entry, now) >= PREFERENCE_MIN_CONFIDENCE
}

export interface PreferenceObservation {
  key: string
  value: string
}

/**
 * Aplica uma observação ao mapa e devolve um mapa **novo** (nunca muta a
 * entrada).
 *
 * Valor igual ao gravado reforça (`observations += 1`). Valor diferente é
 * contradição: o novo vence (é o mais recente), mas `contradictions += 1`
 * derruba a confiança — o agente passa a usar o novo com menos certeza até
 * reconfirmar (§7.6).
 *
 * Chave fora do vocabulário ou valor que não sobrevive à sanitização são
 * **descartados em silêncio** para o modelo e devolvidos em `rejected` para o
 * chamador logar (§8).
 */
export function applyObservations(
  current: PreferenceMap,
  observations: readonly PreferenceObservation[],
  now: Date,
): { preferences: PreferenceMap, rejected: string[] } {
  const next: PreferenceMap = { ...current }
  const rejected: string[] = []
  const today = now.toISOString().slice(0, 10)

  for (const observation of observations) {
    if (!isPreferenceKey(observation.key)) {
      rejected.push(observation.key)
      continue
    }

    const value = sanitizePreferenceValue(observation.value)
    if (!value) {
      rejected.push(observation.key)
      continue
    }

    const existing = next[observation.key]
    if (!existing) {
      next[observation.key] = {
        value,
        observations: 1,
        contradictions: 0,
        firstSeen: today,
        lastSeen: today,
      }
      continue
    }

    const contradicts = existing.value.toLowerCase() !== value.toLowerCase()
    next[observation.key] = {
      value,
      observations: existing.observations + 1,
      contradictions: existing.contradictions + (contradicts ? 1 : 0),
      firstSeen: existing.firstSeen,
      lastSeen: today,
    }
  }

  return { preferences: next, rejected }
}

/** Formato de persistência em `customer_intelligence.preferences` (snake_case, como o jsonb). */
interface StoredPreferenceEntry {
  value: unknown
  observations: unknown
  contradictions: unknown
  first_seen: unknown
  last_seen: unknown
}

/**
 * Lê o jsonb do banco de forma defensiva. Linha gravada por versão anterior,
 * chave desconhecida ou campo com tipo errado são ignorados em vez de
 * derrubarem o turno — é dado derivado e reconstruível, não fonte de verdade.
 *
 * A sanitização é reaplicada na LEITURA: uma linha gravada antes desta defesa
 * existir não pode virar linha de prompt agora.
 */
export function parsePreferences(raw: unknown): PreferenceMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: PreferenceMap = {}
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!isPreferenceKey(key)) continue
    if (!entry || typeof entry !== 'object') continue

    const candidate = entry as StoredPreferenceEntry
    if (typeof candidate.value !== 'string') continue
    if (typeof candidate.last_seen !== 'string') continue

    const value = sanitizePreferenceValue(candidate.value)
    if (!value) continue

    result[key] = {
      value,
      observations: typeof candidate.observations === 'number' ? candidate.observations : 1,
      contradictions: typeof candidate.contradictions === 'number' ? candidate.contradictions : 0,
      firstSeen: typeof candidate.first_seen === 'string' ? candidate.first_seen : candidate.last_seen,
      lastSeen: candidate.last_seen,
    }
  }
  return result
}

/**
 * Serializa para o jsonb (snake_case). O tipo de retorno é concreto — e não
 * `Record<string, unknown>` — porque `unknown` não é atribuível a `Json` do
 * `database.types.ts`, e afrouxar isso com cast esconderia justamente o que a
 * tipagem do banco existe para pegar.
 */
export interface SerializedPreferences {
  [key: string]: {
    value: string
    observations: number
    contradictions: number
    first_seen: string
    last_seen: string
  }
}

export function serializePreferences(preferences: PreferenceMap): SerializedPreferences {
  const out: SerializedPreferences = {}
  for (const [key, entry] of Object.entries(preferences)) {
    if (!entry) continue
    out[key] = {
      value: entry.value,
      observations: entry.observations,
      contradictions: entry.contradictions,
      first_seen: entry.firstSeen,
      last_seen: entry.lastSeen,
    }
  }
  return out
}

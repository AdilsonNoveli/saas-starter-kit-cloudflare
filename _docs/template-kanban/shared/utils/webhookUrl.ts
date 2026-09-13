/**
 * Validação do destino do webhook de saída (SSRF).
 *
 * `loja.webhook_url` é escrito pelo admin e consumido pelo worker do outbox,
 * que faz `fetch` com o `Authorization` do sistema dentro. Sem validação, um
 * destino apontando para `http://169.254.169.254/…` ou `https://127.0.0.1:8080`
 * transforma o worker em proxy para a rede interna do runtime — e ainda entrega
 * a credencial de saída junto.
 *
 * Mora em `shared/` porque as MESMAS regras precisam valer nos dois lados:
 * na **gravação** (tela do admin, que escreve direto via supabase-js) e no
 * **envio** (`server/utils/webhook/worker.ts`, que não pode confiar em linha
 * gravada antes desta regra existir — o outbox tem linhas antigas com destino
 * herdado).
 *
 * **Limite conhecido e deliberado:** não há resolução de DNS no runtime de
 * Workers, então um hostname que resolve para IP privado (DNS rebinding) não é
 * detectável aqui. O que esta função garante é o par que fecha o buraco na
 * prática, junto com `redirect: 'manual'` no worker: literais de IP internos
 * são barrados na entrada, e um destino público não consegue mais redirecionar
 * o envio (com o `Authorization` dentro) para um host interno.
 *
 * Irmã de `server/utils/whatsapp/normalizeProviderBaseUrl.ts` — mesma família
 * de defesa (SSRF em URL configurada pelo admin), políticas diferentes de
 * propósito: aqui path/query são permitidos e só faixas privadas de IP são
 * bloqueadas (o destino do webhook é sempre externo); lá a URL só pode ser
 * origem (sem path) e QUALQUER IP literal é recusado (o provedor tem que ser
 * um domínio). Revisar as duas juntas ao mexer em qualquer uma.
 */

export type WebhookUrlValidation =
  | { readonly ok: true, readonly url: string }
  | { readonly ok: false, readonly motivo: string }

/** Sufixos de nome que endereçam a própria máquina ou a rede local. */
const BLOCKED_HOST_SUFFIXES = [
  'localhost',
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
]

/** Converte um hostname em octetos se — e somente se — for literal IPv4. */
function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split('.')
  if (parts.length !== 4) return null

  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const value = Number(part)
    if (value > 255) return null
    octets.push(value)
  }
  return octets
}

/**
 * Faixas IPv4 que nunca são destino legítimo de webhook: laço local, rede
 * privada, link-local (inclui o endpoint de metadados 169.254.169.254), CGNAT,
 * benchmark, multicast e reservadas.
 */
function isBlockedIpv4(octets: number[]): boolean {
  const [a = 0, b = 0] = octets

  if (a === 0) return true                          // 0.0.0.0/8 — "este host"
  if (a === 10) return true                         // 10.0.0.0/8 — privada
  if (a === 127) return true                        // 127.0.0.0/8 — loopback
  if (a === 169 && b === 254) return true           // 169.254.0.0/16 — link-local/metadados
  if (a === 172 && b >= 16 && b <= 31) return true  // 172.16.0.0/12 — privada
  if (a === 192 && b === 168) return true           // 192.168.0.0/16 — privada
  if (a === 192 && b === 0) return true             // 192.0.0.0/24 — IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 — CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 — benchmark
  if (a >= 224) return true                         // 224.0.0.0/4 multicast + 240.0.0.0/4 reservada

  return false
}

/**
 * Expande um literal IPv6 (sem colchetes) nos seus 8 grupos de 16 bits.
 *
 * Casar o literal por texto não funciona: `URL` normaliza a forma escrita —
 * `[::ffff:127.0.0.1]` volta como `[::ffff:7f00:1]`. Comparar número resolve
 * qualquer grafia da mesma máquina.
 */
function parseIpv6(literal: string): number[] | null {
  const address = literal.toLowerCase()
  const halves = address.split('::')
  if (halves.length > 2) return null

  const toWords = (part: string): number[] | null => {
    if (part === '') return []
    const words: number[] = []
    for (const group of part.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null
      words.push(Number.parseInt(group, 16))
    }
    return words
  }

  const head = toWords(halves[0] ?? '')
  const tail = halves.length === 2 ? toWords(halves[1] ?? '') : []
  if (head === null || tail === null) return null

  if (halves.length === 1) return head.length === 8 ? head : null

  const gap = 8 - head.length - tail.length
  if (gap < 1) return null
  return [...head, ...Array<number>(gap).fill(0), ...tail]
}

/** Faixas IPv6 que espelham as bloqueadas em IPv4. */
function isBlockedIpv6(literal: string): boolean {
  const words = parseIpv6(literal)
  // Literal que não conseguimos interpretar não é destino confiável.
  if (words === null) return true

  const [w0 = 0, w6 = 0, w7 = 0] = [words[0], words[6], words[7]]

  // `::x.y.z.w` e `::ffff:x.y.z.w` carregam um IPv4 nos dois últimos grupos —
  // inclui `::1` (loopback) e `::` (não especificado), que caem em 0.0.0.0/8.
  const isV4Embedded =
    words.slice(0, 5).every((w) => w === 0) && (words[5] === 0 || words[5] === 0xffff)
  if (isV4Embedded) {
    return isBlockedIpv4([w6 >> 8, w6 & 0xff, w7 >> 8, w7 & 0xff])
  }

  if ((w0 & 0xfe00) === 0xfc00) return true // fc00::/7 — unique local
  if ((w0 & 0xffc0) === 0xfe80) return true // fe80::/10 — link-local

  return false
}

/**
 * Valida um destino de webhook. Devolve a URL normalizada (via `URL`) quando
 * aprovada, ou o motivo da recusa — texto curto, próprio para exibir ao admin.
 *
 * Recusa: string vazia, esquema diferente de HTTPS, credencial embutida na URL,
 * nome que endereça a própria máquina/rede local e literais de IP em faixas
 * internas (IPv4 e IPv6, inclusive mapeadas).
 */
export function validateWebhookUrl(raw: string | null | undefined): WebhookUrlValidation {
  const candidate = (raw ?? '').trim()
  if (!candidate) {
    return { ok: false, motivo: 'URL vazia.' }
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { ok: false, motivo: 'URL malformada.' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, motivo: 'O destino precisa usar HTTPS — o webhook carrega dado de cliente e credencial.' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, motivo: 'A URL não pode embutir usuário ou senha.' }
  }

  // `URL` já baixa a caixa do hostname; o ponto final absoluto (`host.com.`)
  // ainda passa e endereça o mesmo nome, então é normalizado aqui.
  const hostname = parsed.hostname.replace(/\.$/, '')
  if (!hostname) {
    return { ok: false, motivo: 'URL sem host.' }
  }

  // Literal IPv6 chega entre colchetes em `hostname` (`[::1]`).
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return isBlockedIpv6(hostname.slice(1, -1))
      ? { ok: false, motivo: 'Destino aponta para um IP de rede interna, loopback ou link-local.' }
      : { ok: true, url: parsed.toString() }
  }

  if (BLOCKED_HOST_SUFFIXES.some((suffix) =>
    suffix.startsWith('.') ? hostname.endsWith(suffix) : hostname === suffix,
  )) {
    return { ok: false, motivo: 'Destino aponta para a própria máquina ou para a rede local.' }
  }

  const octets = parseIpv4(hostname)
  if (octets !== null && isBlockedIpv4(octets)) {
    return { ok: false, motivo: 'Destino aponta para um IP de rede interna, loopback ou link-local.' }
  }

  return { ok: true, url: parsed.toString() }
}

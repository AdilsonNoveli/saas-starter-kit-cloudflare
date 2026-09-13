/**
 * Mídia recebida no contrato Cloud API — `GET /media/{id}` e download
 * autenticado (§1.3 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 *
 * Mora em `whatsapp/*` porque é contrato de transporte, **nunca** em `media/*`,
 * que só conhece OpenAI e bytes (§2). Endpoint e payload conferidos campo a
 * campo contra `_docs/implementar/api-1.yaml` (`/media/{id}`, linha 1477):
 * resposta `200` com `{url, mime_type, size}` — `url` válida por 30 dias,
 * `size` em bytes; `404` para id inválido ou mídia expirada (>30 dias).
 *
 * `GET /media/{id}` é o caminho **primário** por dois motivos, nessa ordem: o
 * `size` permite recusar mídia grande sem baixar (§7.5), e a validade de 30
 * dias elimina a corrida contra os ~5 minutos do `url` inline do payload
 * quando a fila atrasa sob carga. O inline fica como fallback.
 */
import { logger } from '~/core/services/logger.service'
import { cloudApiAuthHeader, type CloudApiClientConfig } from './cloudApiClient'

/**
 * Timeouts explícitos: sem eles um provedor pendurado segura a invocação do
 * Worker até o teto da plataforma, e a mensagem só voltaria para a fila muito
 * depois. `AbortSignal.timeout` é nativo no workerd e no Node 18+ — não há
 * dependência nova nem `setTimeout` manual para vazar.
 */
const METADATA_TIMEOUT_MS = 10_000
const DOWNLOAD_TIMEOUT_MS = 30_000

export interface CloudApiMediaMetadata {
  /** URL de download, válida por 30 dias — ainda exige `Authorization`. */
  url: string
  /** `mime_type` do provedor; `null` quando não vier (o do payload continua valendo). */
  mimeType: string | null
  /** `size` em bytes — a razão de este ser o caminho primário (§7.5). */
  sizeBytes: number | null
}

/**
 * `null` (em vez de exceção) quando o provedor não devolve metadados: 404 de
 * mídia expirada e 5xx têm o mesmo desfecho útil para o chamador — tentar o
 * `url` inline do payload antes de desistir (§1.3).
 */
export async function getMediaMetadata(
  config: CloudApiClientConfig,
  mediaId: string,
): Promise<CloudApiMediaMetadata | null> {
  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/media/${encodeURIComponent(mediaId)}`, {
      headers: cloudApiAuthHeader(config),
      signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
    })
  } catch (err) {
    logger.warn('[whatsapp] GET /media/{id} falhou na rede — tentando o url inline', {
      mediaId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }

  if (!res.ok) {
    logger.warn('[whatsapp] GET /media/{id} respondeu erro — tentando o url inline', {
      mediaId,
      status: res.status,
    })
    return null
  }

  const body = await res.json().catch(() => null) as { url?: unknown, mime_type?: unknown, size?: unknown } | null
  if (!body || typeof body.url !== 'string' || !body.url) {
    logger.warn('[whatsapp] GET /media/{id} respondeu sem url utilizável', { mediaId })
    return null
  }

  return {
    url: body.url,
    mimeType: typeof body.mime_type === 'string' ? body.mime_type : null,
    sizeBytes: typeof body.size === 'number' && Number.isFinite(body.size) ? body.size : null,
  }
}

/**
 * Recusa de tamanho é retorno (`ok: false`), não exceção — a §7.4 dá desfechos
 * diferentes para `recusado` e `falhou`, e erro de rede/HTTP **sobe** porque só
 * o consumer sabe se ainda há retry disponível (§8.3).
 */
export type MediaDownloadResult =
  | { ok: true, bytes: Uint8Array, mimeType: string | null }
  | { ok: false, motivo: 'tamanho', tamanhoBytes: number }

/**
 * Baixa o binário com a credencial do provedor no header — a URL da mídia não
 * é pública (§1.3), e é por isso que a imagem vai para a OpenAI como data URL
 * base64 em vez de link (§7.2).
 *
 * O limite é aplicado duas vezes: no `Content-Length`, quando vier, e sobre os
 * bytes efetivamente lidos, abortando o stream ao ultrapassar (§7.5) — sem
 * isso um `Content-Length` mentiroso ou ausente encheria a memória do Worker.
 */
export async function downloadMedia(
  config: CloudApiClientConfig,
  url: string,
  maxBytes: number,
): Promise<MediaDownloadResult> {
  assertHttpsDownloadUrl(url, config.baseUrl)

  const res = await fetch(url, {
    headers: cloudApiAuthHeader(config),
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Download de mídia respondeu ${res.status}: ${detail.slice(0, 200)}`)
  }

  const mimeType = res.headers.get('content-type')
  const declaredLength = Number(res.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await res.body?.cancel().catch(() => {})
    return { ok: false, motivo: 'tamanho', tamanhoBytes: declaredLength }
  }

  return readBodyWithLimit(res, maxBytes, mimeType)
}

/**
 * A URL de download não é sempre escolhida por nós: no caminho primário vem do
 * provedor (`GET /media/{id}`, resposta autenticada — confiável), mas no
 * fallback (`urlInline`, quando esse GET falha) vem direto do payload CRU do
 * webhook — só protegido pelo token no path (`verifyWebhookToken`). Quem
 * conhece esse token poderia forjar um payload com `urlInline` apontando para
 * um host arbitrário; como o `Authorization: Bearer <token do provedor>`
 * viaja em toda chamada `fetch` desta função, isso vazaria a credencial do
 * provedor para fora. `assertHttpsDownloadUrl` reduz essa superfície: além de
 * exigir `https` (mesmo princípio da validação anti-SSRF da URL base, §9),
 * exige que o host da URL de download pertença ao mesmo domínio configurado
 * como base do provedor — tolerando uma CDN de mídia em subdomínio diferente
 * do host de API (comum: `files.provedor.com.br` vs `api.provedor.com.br`),
 * mas nunca um domínio de terceiro.
 */
function assertHttpsDownloadUrl(url: string, providerBaseUrl: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('URL de download da mídia é inválida.')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`URL de download da mídia precisa ser https (recebido ${parsed.protocol}).`)
  }

  if (!isAllowedDownloadHost(parsed.hostname, providerBaseUrl)) {
    throw new Error(`URL de download da mídia fora do domínio do provedor esperado (host: ${parsed.hostname}).`)
  }
}

function isAllowedDownloadHost(downloadHost: string, providerBaseUrl: string): boolean {
  const providerHost = new URL(providerBaseUrl).hostname
  if (downloadHost === providerHost) return true

  // Domínio pai (remove só o subdomínio mais à esquerda) — tolera CDN dedicada
  // do mesmo provedor. Só aplica quando sobram >= 2 labels no domínio pai:
  // se `providerHost` já for algo como "provedor.com" (2 labels), reduzir
  // mais um viraria um wildcard perigoso (liberaria qualquer *.com).
  const labels = providerHost.split('.')
  if (labels.length < 3) return false

  const parentDomain = labels.slice(1).join('.')
  return downloadHost === parentDomain || downloadHost.endsWith(`.${parentDomain}`)
}

async function readBodyWithLimit(
  res: Response,
  maxBytes: number,
  mimeType: string | null,
): Promise<MediaDownloadResult> {
  const body = res.body
  if (!body) {
    // Sem stream não há como abortar cedo; o `arrayBuffer` já respeitou o
    // `Content-Length` conferido acima.
    const buffer = new Uint8Array(await res.arrayBuffer())
    if (buffer.byteLength > maxBytes) return { ok: false, motivo: 'tamanho', tamanhoBytes: buffer.byteLength }
    return { ok: true, bytes: buffer, mimeType }
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      return { ok: false, motivo: 'tamanho', tamanhoBytes: total }
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return { ok: true, bytes, mimeType }
}

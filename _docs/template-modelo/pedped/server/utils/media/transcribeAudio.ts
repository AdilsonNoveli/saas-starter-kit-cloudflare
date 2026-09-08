/**
 * Transcrição de áudio recebido pelo WhatsApp (§7.1 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 *
 * Puro por desenho: recebe os bytes já baixados e o client OpenAI já montado
 * pelo chamador (a chave vem de `resolveAgentRuntimeConfig`, §3.5 — nunca é
 * lida aqui). Não conhece fila, `wamid`, Supabase nem WhatsApp (§2).
 *
 * **Sem transcodificação** — decisão de arquitetura da §7.1: o runtime Workers
 * não tem ffmpeg, e `ogg` (o formato que o WhatsApp entrega) já está na lista
 * suportada pela API de transcrição.
 */
import type OpenAI from 'openai'
import { toFile } from 'openai'
import { exceedsMediaSizeLimit, type MediaResult, type MediaTokenUsage } from './mediaProcessing'

/** Marcação de proveniência da §7.1 — o prompt do sistema explica o rótulo ao modelo. */
export const AUDIO_TRANSCRIPT_PREFIX = '[áudio transcrito]'

/**
 * A API infere o formato pela extensão do arquivo enviado no multipart, não
 * pelo `Content-Type` — daí o mapa. Só formatos que ela aceita entram aqui.
 */
const AUDIO_EXTENSIONS: Readonly<Record<string, string>> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/oga': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
}

/**
 * Mime inesperado cai em `ogg`: é o que o WhatsApp entrega em nota de voz, e
 * chutar um formato suportado dá à API a chance de transcrever. Repassar a
 * extensão desconhecida garantiria um 400 — o cliente ficaria sem resposta
 * onde poderia ter uma.
 */
const DEFAULT_AUDIO_EXTENSION = 'ogg'

/** Exportada para o spec: é a única regra do arquivo que não passa pela OpenAI. */
export function audioFileName(mimeType: string | null | undefined): string {
  const base = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  return `audio.${AUDIO_EXTENSIONS[base] ?? DEFAULT_AUDIO_EXTENSION}`
}

export interface TranscribeAudioInput {
  /** Client já construído com a chave resolvida pelo chamador (§9 — nunca lida aqui). */
  openai: OpenAI
  /** `loja.agente_modelo_transcricao` (default `gpt-4o-mini-transcribe`). */
  model: string
  bytes: Uint8Array
  /** `audio.mime_type` do payload — `audio/ogg; codecs=opus` na captura real (§1.3). */
  mimeType?: string | null
}

function tokenUsageOf(usage: OpenAI.Audio.Transcription['usage']): MediaTokenUsage | null {
  // Cobrança por duração não devolve token (§7.3) — nesse caso a base de custo
  // são `duracaoMs` e `tamanhoBytes`, já na telemetria.
  if (!usage || usage.type !== 'tokens') return null
  return { promptTokens: usage.input_tokens, completionTokens: usage.output_tokens }
}

/**
 * Devolve o texto já marcado (`[áudio transcrito] ...`) pronto para entrar no
 * buffer de rajada. Recusa de tamanho é `ok: false` (o chamador responde a
 * mensagem da §7.4 e grava `recusado`); erro da OpenAI **sobe**, porque só o
 * consumer sabe se ainda há retry disponível antes de virar `falhou` (§8.3).
 */
export async function transcribeAudio(input: TranscribeAudioInput): Promise<MediaResult> {
  const startedAt = Date.now()
  const tamanhoBytes = input.bytes.byteLength
  const telemetry = (): { modelo: string, duracaoMs: number, tamanhoBytes: number } => ({
    modelo: input.model,
    duracaoMs: Date.now() - startedAt,
    tamanhoBytes,
  })

  // Segunda linha de defesa da §7.5: o chamador já recusou pelo `size` de
  // `GET /media/{id}`, mas esse campo pode não vir — aqui os bytes são fato.
  if (exceedsMediaSizeLimit('audio', tamanhoBytes)) {
    return { ok: false, motivo: 'tamanho', ...telemetry() }
  }

  const file = await toFile(input.bytes, audioFileName(input.mimeType), {
    type: input.mimeType ?? undefined,
  })

  const transcription = await input.openai.audio.transcriptions.create({
    file,
    model: input.model,
    // Fixo: a loja é BR, e a dica reduz erro de detecção em áudio curto e
    // ruidoso — o caso dominante (pedido em nota de voz).
    language: 'pt',
  })

  const texto = transcription.text.trim()
  if (!texto) return { ok: false, motivo: 'vazio', ...telemetry() }

  return {
    ok: true,
    texto: `${AUDIO_TRANSCRIPT_PREFIX} ${texto}`,
    usage: tokenUsageOf(transcription.usage),
    ...telemetry(),
  }
}

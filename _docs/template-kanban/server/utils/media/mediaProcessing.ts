/**
 * Contrato compartilhado do processamento de mídia (fase 5 da §11 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 *
 * `media/*` conhece OpenAI e bytes — **nunca** WhatsApp e nunca o agente (§2).
 * Por isso nada aqui fala em `wamid`, fila, Supabase ou status de banco: quem
 * traduz este resultado para `whatsapp_midia.status` e para a mensagem ao
 * cliente (§7.4) é o consumer da fase 6.
 */

/**
 * `document` (migration 114 — arte de produto `upload_arquivo`) nunca passa
 * pela OpenAI (sem "entendimento de documento" neste app): o único destino
 * possível é anexo direto como arquivo de arte via `attachPendingArt.ts`.
 * Documento sem pendência de arte esperando é recusado — nunca cai num
 * `describe`/`transcribe` genérico, porque não existe um pra documento.
 */
export type MediaKind = 'audio' | 'image' | 'document'

/**
 * Guardas de tamanho da §7.5 (áudio/imagem — limite da OpenAI) e, para
 * `document`, o mesmo teto de arte de cliente do catálogo web
 * (`MAX_CUSTOMER_ART_SIZE`, server/utils/s3/constants.ts) — repetido aqui
 * como literal, não importado: este módulo é agnóstico de storage/S3 por
 * desenho (ver docblock do arquivo), só coincide o número de propósito.
 */
export const MEDIA_SIZE_LIMITS: Readonly<Record<MediaKind, number>> = {
  audio: 16 * 1024 * 1024,
  image: 5 * 1024 * 1024,
  document: 15 * 1024 * 1024,
}

/**
 * Recusa **antes** do download quando o tamanho já é conhecido — é exatamente
 * para isso que `GET /media/{id}` é o caminho primário da §1.3: ele devolve
 * `size` sem baixar nada. Tamanho ausente (`null`/`undefined`) devolve `false`
 * de propósito: sem informação não há como recusar cedo, e o guard volta a
 * valer sobre os bytes já baixados dentro de `transcribeAudio`/`describeImage`.
 */
export function exceedsMediaSizeLimit(kind: MediaKind, sizeBytes: number | null | undefined): boolean {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes)) return false
  return sizeBytes > MEDIA_SIZE_LIMITS[kind]
}

/**
 * Tokens de visão (§7.3) — o chamador soma em `agente_uso_tokens` com o
 * `modelo` correspondente. `null` quando a chamada não devolve tokens (é o caso
 * da transcrição cobrada por duração, cuja base de custo são `duracaoMs` e
 * `tamanhoBytes`).
 */
export interface MediaTokenUsage {
  promptTokens: number
  completionTokens: number
}

/** Telemetria da §7.3, gravada em `whatsapp_midia` pelo chamador. */
export interface MediaTelemetry {
  modelo: string
  duracaoMs: number
  tamanhoBytes: number
}

/**
 * `tamanho` = acima do limite da §7.5. `vazio` = a OpenAI respondeu sem texto
 * (áudio mudo, imagem ilegível): devolver a marcação de proveniência sem
 * conteúdo poluiria o buffer de rajada com um turno vazio.
 */
export type MediaRefusalReason = 'tamanho' | 'vazio'

export type MediaResult =
  | (MediaTelemetry & { ok: true, texto: string, usage: MediaTokenUsage | null })
  | (MediaTelemetry & { ok: false, motivo: MediaRefusalReason })

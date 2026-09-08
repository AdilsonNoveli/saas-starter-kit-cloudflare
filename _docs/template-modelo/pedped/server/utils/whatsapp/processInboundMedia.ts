/**
 * Corpo do consumer de mídia (fase 6 da §11 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`) — uma mensagem
 * da fila `whatsapp-midia`, do claim ao turno enfileirado.
 *
 * Separado do plugin (`server/plugins/whatsapp-media-queue.ts`) pelo mesmo
 * motivo de `handleInboundMessage`: a §10 exige teste de claim duplo, de reuso
 * de `concluido` sem pagar a OpenAI e de falha que responde sem relançar — e
 * nada disso é testável dentro de um hook do runtime Cloudflare.
 *
 * Sequência da §5.2: claim → `GET /media/{id}` → guarda de tamanho **antes** do
 * download (§7.5) → download → transcrição/visão → `UPDATE whatsapp_midia` →
 * telemetria → `appendToBurstBuffer` → turno com 8s de debounce. Do
 * `appendToBurstBuffer` em diante nada muda: o texto derivado entra no mesmo
 * buffer do texto digitado, e `agent/*` nunca sabe que mídia existe (§2).
 *
 * **Nunca relança exceção de negócio** (§8.3): falha vira `status='falhou'` +
 * mensagem ao cliente, e o plugin dá `ack`. Só `claimMedia` sobe — falha
 * catastrófica *antes* do claim é o único caso em que a fila deve retentar.
 */
import type OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { describeImage } from '../media/describeImage'
import { transcribeAudio } from '../media/transcribeAudio'
import {
  exceedsMediaSizeLimit,
  MEDIA_SIZE_LIMITS,
  type MediaResult,
} from '../media/mediaProcessing'
import { appendToBurstBuffer } from './burstBuffer'
import type { WhatsappProviderConfig } from './buildWhatsappProviderConfig'
import { sendText } from './cloudApiClient'
import { downloadMedia, getMediaMetadata } from './cloudApiMedia'
import { claimMedia, type ClaimedMedia } from './claimMedia'
import { gateInboundTurn } from './pauseGate'
import {
  mediaKindOf,
  MEDIA_FAILED_TEXT,
  MEDIA_TOO_LARGE_TEXT,
  UNSUPPORTED_TYPE_TEXT,
} from './inboundMediaPolicy'
import {
  sendToQueue,
  TURN_DEBOUNCE_SECONDS,
  type QueueBinding,
  type WhatsappMediaQueueMessage,
  type WhatsappTurnQueueMessage,
} from './queueBindings'

/**
 * Teto de tentativas do claim. Casa com `max_retries = 2` da §8.1: a entrega
 * original mais duas reentregas. Cada tentativa custa dinheiro — a terceira
 * raramente resolve o que as duas primeiras não resolveram.
 */
export const MAX_MEDIA_ATTEMPTS = 3

/**
 * Backoff da reentrega. Linear e curto de propósito: o cliente está esperando
 * uma resposta do outro lado do WhatsApp, e as falhas que valem retentar
 * (5xx da OpenAI, rede do provedor) costumam passar em segundos. O teto existe
 * para o caso patológico de indisponibilidade longa.
 */
export function mediaRetryDelaySeconds(tentativas: number): number {
  return Math.min(60, 15 * Math.max(1, tentativas))
}

/**
 * `retry` = a fila reentrega e o cliente ainda **não** foi avisado; `ack` = o
 * desfecho é final (sucesso, recusa, ou falha já comunicada). É o plugin que
 * traduz isso em `message.retry()`/`message.ack()`.
 */
export type MediaOutcome = 'ack' | 'retry'

export interface ProcessInboundMediaDeps {
  supabase: SupabaseClient<Database>
  provider: WhatsappProviderConfig
  /**
   * `null` quando o agente está desligado ou sem chave — sem client não há
   * transcrição nem visão, e o cliente ainda assim recebe resposta (§2).
   */
  openai: OpenAI | null
  modeloTranscricao: string
  modeloVisao: string
  /** `WHATSAPP_QUEUE` — o turno é enfileirado daqui, depois da mídia virar texto. */
  turnQueue?: QueueBinding<WhatsappTurnQueueMessage>
}

export async function processInboundMedia(
  deps: ProcessInboundMediaDeps,
  body: WhatsappMediaQueueMessage,
): Promise<MediaOutcome> {
  const claimed = await claimMedia(deps.supabase, body.wamid, MAX_MEDIA_ATTEMPTS)

  if (!claimed) {
    // Ou outra entrega já está processando, ou o trabalho já terminou. No
    // segundo caso o texto está gravado: reaproveitá-lo é a 3ª camada de
    // idempotência da §8.2 — sem isso, uma reentrega depois de um sucesso
    // parcial (transcreveu, mas morreu antes de gravar no buffer) perderia a
    // mídia em definitivo, e reprocessar pagaria a OpenAI de novo.
    await resumeCompletedMedia(deps, body.wamid)
    return 'ack'
  }

  try {
    await processClaimedMedia(deps, claimed, body)
    return 'ack'
  } catch (err) {
    const erro = (err instanceof Error ? err.message : String(err)).slice(0, 500)

    // `falhou` é reclaimável por desenho da migration 094 ("a falha pode ter
    // sido transitória — rede, 5xx da OpenAI"), e o teto de `tentativas` do
    // claim é o que impede o loop. Enquanto houver tentativa, a reentrega é a
    // resposta certa e o cliente **não** é avisado: a §7.4 manda a mensagem de
    // falha "após retries", não na primeira topada.
    const podeRetentar = claimed.tentativas < MAX_MEDIA_ATTEMPTS
    logger.error('[whatsapp-media] processamento abortou', {
      wamid: claimed.wamid,
      tipo: claimed.tipo,
      tentativas: claimed.tentativas,
      podeRetentar,
      error: erro,
    })

    if (podeRetentar) {
      // Sem mensagem ao cliente, mas com o texto preservado: se a falha foi
      // depois da OpenAI, a próxima tentativa reaproveita o que já foi pago.
      await updateMedia(deps.supabase, claimed.wamid, { status: 'falhou', erro })
      return 'retry'
    }

    await finishMedia(deps, claimed, { status: 'falhou', erro }, MEDIA_FAILED_TEXT)
    return 'ack'
  }
}

async function processClaimedMedia(
  deps: ProcessInboundMediaDeps,
  claimed: ClaimedMedia,
  body: WhatsappMediaQueueMessage,
): Promise<void> {
  // Retentativa: se a tentativa anterior já pagou a OpenAI e morreu depois
  // (gravar no buffer, enfileirar o turno), o texto está na linha. Reaproveitar
  // é a 3ª camada de idempotência da §8.2 — e é o caso que a §10 manda testar
  // "mesmo parecendo redundante com o claim", porque é ele que protege o custo.
  if (claimed.tentativas > 1) {
    const textoAnterior = await loadMediaText(deps.supabase, claimed.wamid)
    if (textoAnterior) {
      logger.info('[whatsapp-media] retentativa reaproveitou o texto já transcrito', {
        wamid: claimed.wamid,
        tentativas: claimed.tentativas,
      })
      await updateMedia(deps.supabase, claimed.wamid, { status: 'concluido', erro: null })
      await deliverToTurn(deps, claimed, claimed.nomeContato, claimed.wamid, textoAnterior)
      return
    }
  }

  const kind = mediaKindOf(claimed.tipo)
  if (!kind) {
    // Só chega aqui se alguém inserir uma linha fora do contrato do produtor.
    await finishMedia(deps, claimed, { status: 'recusado', erro: 'tipo_nao_suportado' }, UNSUPPORTED_TYPE_TEXT)
    return
  }

  if (!deps.openai) {
    await finishMedia(deps, claimed, { status: 'falhou', erro: 'sem_chave_openai' }, MEDIA_FAILED_TEXT)
    return
  }

  // Caminho primário da §1.3: os metadados trazem `size` **antes** do download
  // e uma URL válida por 30 dias, sem a corrida contra os ~5 min do url inline.
  const metadata = await getMediaMetadata(deps.provider, claimed.mediaId)

  const tamanhoConhecido = metadata?.sizeBytes ?? claimed.tamanhoBytes
  if (exceedsMediaSizeLimit(kind, tamanhoConhecido)) {
    // Recusa sem gastar banda nem memória do Worker (§7.5) — o motivo de
    // `GET /media/{id}` ser o caminho primário.
    await finishMedia(deps, claimed, {
      status: 'recusado',
      erro: 'tamanho',
      tamanho_bytes: tamanhoConhecido,
    }, MEDIA_TOO_LARGE_TEXT)
    return
  }

  const url = metadata?.url ?? body.urlInline
  if (!url) throw new Error(`Sem URL de download para a mídia ${claimed.mediaId}.`)

  const download = await downloadMedia(deps.provider, url, MEDIA_SIZE_LIMITS[kind])
  if (!download.ok) {
    await finishMedia(deps, claimed, {
      status: 'recusado',
      erro: 'tamanho',
      tamanho_bytes: download.tamanhoBytes,
    }, MEDIA_TOO_LARGE_TEXT)
    return
  }

  // `mime_type` do payload primeiro: é o que o WhatsApp declarou para o
  // arquivo (`audio/ogg; codecs=opus`). O do provedor e o do header vêm depois,
  // como complemento quando o payload não trouxe o campo.
  const mimeType = claimed.mimeType ?? metadata?.mimeType ?? download.mimeType

  const result = kind === 'audio'
    ? await transcribeAudio({
        openai: deps.openai,
        model: deps.modeloTranscricao,
        bytes: download.bytes,
        mimeType,
      })
    : await describeImage({
        openai: deps.openai,
        model: deps.modeloVisao,
        bytes: download.bytes,
        mimeType,
        caption: body.caption,
      })

  if (!result.ok) {
    await finishMedia(deps, claimed, {
      status: 'recusado',
      erro: result.motivo,
      modelo: result.modelo,
      duracao_ms: result.duracaoMs,
      tamanho_bytes: result.tamanhoBytes,
      // `vazio` (áudio mudo, imagem ilegível) não tem linha própria na §7.4; a
      // mensagem de falha é a resposta honesta — o cliente mandou algo que não
      // dá para ler e precisa saber disso.
    }, result.motivo === 'tamanho' ? MEDIA_TOO_LARGE_TEXT : MEDIA_FAILED_TEXT)
    return
  }

  await updateMedia(deps.supabase, claimed.wamid, {
    status: 'concluido',
    texto: result.texto,
    modelo: result.modelo,
    duracao_ms: result.duracaoMs,
    tamanho_bytes: result.tamanhoBytes,
    erro: null,
  })

  await recordTokenUsage(deps.supabase, result)

  await deliverToTurn(deps, claimed, claimed.nomeContato, claimed.wamid, result.texto)
}

/**
 * Do buffer em diante o texto derivado de mídia é indistinguível de texto
 * digitado (§5.2): mesmo buffer de rajada, mesma fila de turno, mesmo debounce.
 * Um áudio seguido de "e mais uma coca" vira um único turno.
 *
 * **Com `lid` desde a migration 101** (item (c) da FASE 0.4 de
 * `_docs/em-andamento.md`): `whatsapp_midia` passou a carregar o identificador
 * estável, então o turno que começa por áudio ou imagem também grava
 * `clientes.whatsapp_lid`. Antes disso este caminho não tinha de onde tirá-lo e
 * a captura da FASE 0.4 (a) valia só para o turno de texto.
 *
 * O `COALESCE` do `whatsapp_buffer_append` continua obrigatório: o lid só chega
 * aqui quando o payload daquela mídia o trouxe, e sem ele o append rebaixaria
 * para NULL o lid que a mensagem de texto da mesma rajada gravou.
 */
async function deliverToTurn(
  deps: ProcessInboundMediaDeps,
  identidade: { telefone: string | null, lid: string | null },
  /**
   * Migration 107 — pushname do payload original, sobrevivido via
   * `whatsapp_midia.nome_contato` até este ponto (o único em que o turno de
   * mídia resolve o cliente). Repassado cru a `gateInboundTurn`, mesmo
   * caminho do turno de texto.
   */
  nomeContato: string | null,
  wamid: string,
  texto: string,
): Promise<void> {
  // Item (d)/(e) da §0.5.2: mesmo gate do caminho de texto — os dois convergem
  // aqui, e é aqui, nunca antes da transcrição, que a pausa precisa valer.
  const gate = await gateInboundTurn(deps.supabase, identidade, texto, nomeContato)
  if (gate.pausado) return

  const chave = await appendToBurstBuffer(deps.supabase, {
    telefone: identidade.telefone,
    texto,
    msgId: wamid,
    lid: identidade.lid,
  })
  await sendToQueue(deps.turnQueue, 'WHATSAPP_QUEUE', {
    chave,
    checkForMsgId: wamid,
  }, { delaySeconds: TURN_DEBOUNCE_SECONDS })
}

/**
 * Claim vazio + `concluido` com texto = reentrega depois de sucesso parcial.
 * Reaproveita o texto já pago em vez de chamar a OpenAI de novo (§8.2) — é o
 * caso que a §10 manda testar mesmo parecendo redundante com o claim.
 */
async function resumeCompletedMedia(deps: ProcessInboundMediaDeps, wamid: string): Promise<void> {
  const row = await loadMediaRow(deps.supabase, wamid)
  if (!row || row.status !== 'concluido' || !row.texto) return

  logger.info('[whatsapp-media] reentrega de mídia já concluída — reaproveitando o texto', { wamid })
  await deliverToTurn(deps, { telefone: row.telefone, lid: row.whatsapp_lid }, row.nome_contato, wamid, row.texto)
}

async function loadMediaRow(
  supabase: SupabaseClient<Database>,
  wamid: string,
): Promise<{ telefone: string | null, whatsapp_lid: string | null, nome_contato: string | null, status: string, texto: string | null } | null> {
  const { data, error } = await supabase
    .from('whatsapp_midia')
    .select('telefone, whatsapp_lid, nome_contato, status, texto')
    .eq('wamid', wamid)
    .maybeSingle()

  if (error) {
    logger.error('[whatsapp-media] falha ao reler o registro da mídia', { wamid, error: error.message })
    return null
  }

  return data
}

/** Texto já pago numa tentativa anterior — `null` quando não há o que reaproveitar. */
async function loadMediaText(supabase: SupabaseClient<Database>, wamid: string): Promise<string | null> {
  return (await loadMediaRow(supabase, wamid))?.texto ?? null
}

type MediaUpdate = Database['public']['Tables']['whatsapp_midia']['Update']

/** `UPDATE` sempre com `WHERE`: a Supabase carrega `pg-safeupdate` e aborta com `21000` sem ele. */
async function updateMedia(
  supabase: SupabaseClient<Database>,
  wamid: string,
  patch: MediaUpdate,
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_midia')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('wamid', wamid)

  if (error) {
    logger.error('[whatsapp-media] falha ao atualizar o registro da mídia', { wamid, error: error.message })
  }
}

/**
 * Desfecho que não vira turno: grava o status e responde ao cliente. Nenhum dos
 * dois pode ficar de fora — a §2 exige resposta, e sem o status a linha ficaria
 * presa em `processando` e nunca mais seria reivindicada.
 */
async function finishMedia(
  deps: ProcessInboundMediaDeps,
  claimed: ClaimedMedia,
  patch: MediaUpdate,
  mensagem: string,
): Promise<void> {
  await updateMedia(deps.supabase, claimed.wamid, patch)

  if (!claimed.telefone) {
    // Ler por identidade já funciona; responder ainda exige telefone — o
    // provedor não aceita `user_id` no envio (`api-1.yaml:689`, §5 armadilha
    // 14). O status fica gravado; o que falta é o item (d) da FASE 0.4 mais o
    // suporte do provedor. Registrar em vez de silenciar: a §2 exige resposta e
    // esta é a única exceção, e ela precisa aparecer no log.
    logger.warn('[whatsapp-media] mídia sem telefone — nenhum caminho de resposta ao cliente', {
      wamid: claimed.wamid,
      lid: claimed.lid,
    })
    return
  }

  // A identidade completa vai à camada de envio (item (d) da FASE 0.4): o
  // telefone é o que o provedor endereça hoje, o `lid` é o que ele vai
  // endereçar. O guard acima é o que garante o `string` que o tipo exige.
  await sendText(deps.provider, { telefone: claimed.telefone, lid: claimed.lid }, mensagem).catch((err: unknown) => {
    logger.error('[whatsapp-media] falha ao responder o cliente sobre a mídia', {
      wamid: claimed.wamid,
      error: err instanceof Error ? err.message : String(err),
    })
  })
}

/**
 * Telemetria de custo da §7.3, na tabela que o turno de texto já usa.
 * `cliente_id` fica nulo de propósito: resolver o cliente aqui custaria uma
 * consulta a mais no caminho caro, e o turno que vem logo em seguida grava o
 * consumo já atribuído. `null` quando a chamada cobra por duração — nesse caso
 * a base de custo é `duracao_ms` + `tamanho_bytes` em `whatsapp_midia`.
 */
async function recordTokenUsage(
  supabase: SupabaseClient<Database>,
  result: Extract<MediaResult, { ok: true }>,
): Promise<void> {
  if (!result.usage) return

  const { error } = await supabase.from('agente_uso_tokens').insert({
    modelo: result.modelo,
    prompt_tokens: result.usage.promptTokens,
    completion_tokens: result.usage.completionTokens,
    latencia_ms: result.duracaoMs,
  })

  if (error) {
    logger.error('[whatsapp-media] falha ao gravar telemetria de tokens (ignorado)', { error: error.message })
  }
}

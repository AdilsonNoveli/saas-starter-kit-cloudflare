/**
 * Corpo do produtor, já deduplicado — o que fazer com uma mensagem inbound
 * (§7.4 de `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 *
 * Separado da rota (`server/api/whatsapp/webhook/[token].post.ts`) para ser
 * testável sem `H3Event`: a §10 exige que **cada linha da tabela da §7.4**
 * tenha caso de teste, e é justamente o `return` precoce sem resposta da §1.1
 * que essa cobertura impede de voltar.
 *
 * O produtor nunca chama a OpenAI e nunca baixa mídia: decide, registra e
 * enfileira. Toda decisão que não seja "processar" responde ao cliente na hora,
 * de graça (§7.4).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { appendToBurstBuffer } from './burstBuffer'
import { markReadAndTyping, sendText, type WhatsappRecipient } from './cloudApiClient'
import {
  decideInboundMedia,
  MEDIA_FAILED_TEXT,
  type InboundMediaFlags,
} from './inboundMediaPolicy'
import { gateInboundTurn } from './pauseGate'
import type { ParsedInboundMessage } from './parseInboundPayload'
import {
  sendToQueue,
  TURN_DEBOUNCE_SECONDS,
  type QueueBinding,
  type WhatsappMediaQueueMessage,
  type WhatsappTurnQueueMessage,
} from './queueBindings'
import type { WhatsappProviderConfig } from './buildWhatsappProviderConfig'

export interface HandleInboundMessageDeps {
  supabase: SupabaseClient<Database>
  provider: WhatsappProviderConfig
  media: InboundMediaFlags
  /** `WHATSAPP_QUEUE` — ausente fora do runtime Cloudflare (dev local, testes). */
  turnQueue?: QueueBinding<WhatsappTurnQueueMessage>
  /** `WHATSAPP_MIDIA_QUEUE` — idem. */
  mediaQueue?: QueueBinding<WhatsappMediaQueueMessage>
}

export async function handleInboundMessage(
  deps: HandleInboundMessageDeps,
  parsed: ParsedInboundMessage,
): Promise<void> {
  await markReadAndTyping(deps.provider, parsed.wamid)

  const decision = decideInboundMedia({
    tipo: parsed.tipo,
    texto: parsed.texto,
    midia: parsed.midia,
    flags: deps.media,
  })

  if (decision.acao === 'texto') {
    // Item (d)/(e) da §0.5.2: checagem determinística de pausa antes de
    // qualquer enfileiramento. Pausado ⇒ a fala já foi gravada dentro do gate
    // e o agente não deve responder — o humano está conduzindo a conversa.
    const gate = await gateInboundTurn(deps.supabase, { telefone: parsed.telefone, lid: parsed.userId }, decision.texto, parsed.nomeContato)
    if (gate.pausado) return

    // A chave vem do RPC, não daqui: ele é o único escritor do buffer e o único
    // lugar onde a derivação da identidade existe (migration 101). Recalculá-la
    // no produtor daria duas fontes de verdade para a chave do claim.
    const chave = await appendToBurstBuffer(deps.supabase, {
      telefone: parsed.telefone,
      texto: decision.texto,
      msgId: parsed.wamid,
      // O identificador estável vai junto do lote: é o único ponto do fluxo em
      // que ele existe, e o consumer só volta a ver o turno depois dos ~8s de
      // debounce (FASE 0.4 de `_docs/em-andamento.md`).
      lid: parsed.userId,
    })
    await sendToQueue(deps.turnQueue, 'WHATSAPP_QUEUE', {
      chave,
      checkForMsgId: parsed.wamid,
    }, { delaySeconds: TURN_DEBOUNCE_SECONDS })
    return
  }

  if (decision.acao === 'recusar') {
    if (decision.motivo === 'recurso_desligado') {
      // Best-effort: a linha `recusado` é telemetria, a resposta ao cliente é
      // a obrigação (§2). Falhar em gravar não pode engolir a mensagem.
      await recordMedia(deps.supabase, {
        wamid: parsed.wamid,
        telefone: parsed.telefone,
        whatsapp_lid: parsed.userId,
        tipo: decision.kind,
        media_id: decision.midia.mediaId,
        mime_type: decision.midia.mimeType,
        status: 'recusado',
        erro: 'recurso_desligado',
      }).catch((err: unknown) => {
        logger.error('[whatsapp/webhook] falha ao registrar mídia recusada (ignorado)', {
          wamid: parsed.wamid,
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }
    await sendText(deps.provider, recipientOf(parsed), decision.mensagem)
    return
  }

  try {
    // A linha `pendente` vem **antes** do enfileiramento: `whatsapp_midia_claim`
    // é `UPDATE ... WHERE ... RETURNING` (fase 4 da §11) e não teria o que
    // reivindicar se a mensagem chegasse ao consumer primeiro.
    await recordMedia(deps.supabase, {
      wamid: parsed.wamid,
      telefone: parsed.telefone,
      // O identificador estável entra já aqui (migration 101): o consumer de
      // mídia não tem outro caminho até ele, e sem esta coluna o turno iniciado
      // por áudio ou imagem nunca gravava `clientes.whatsapp_lid`.
      whatsapp_lid: parsed.userId,
      // Migration 107: mesmo motivo do lid acima — o consumer de mídia só
      // resolve o cliente depois da transcrição/visão (`deliverToTurn`), e sem
      // esta coluna o pushname não sobrevive até lá.
      nome_contato: parsed.nomeContato,
      tipo: decision.kind,
      media_id: decision.midia.mediaId,
      mime_type: decision.midia.mimeType,
      status: 'pendente',
    })

    await sendToQueue(deps.mediaQueue, 'WHATSAPP_MIDIA_QUEUE', {
      wamid: parsed.wamid,
      ...(decision.midia.url ? { urlInline: decision.midia.url } : {}),
      ...(decision.midia.caption ? { caption: decision.midia.caption } : {}),
    })
  } catch (err) {
    // Nenhum caminho pode terminar sem resposta ao cliente (§2). Aqui o
    // consumer nunca vai rodar — se ele não vai poder mandar a mensagem de
    // falha da §7.4, ela sai daqui.
    logger.error('[whatsapp/webhook] falha ao registrar/enfileirar mídia', {
      wamid: parsed.wamid,
      tipo: parsed.tipo,
      error: err instanceof Error ? err.message : String(err),
    })
    await sendText(deps.provider, recipientOf(parsed), MEDIA_FAILED_TEXT)
  }
}

/**
 * Identidade do cliente para a camada de envio (item (d) da FASE 0.4). O
 * produtor é o único ponto do fluxo em que os dois identificadores existem
 * juntos, sem consultar nada — mandar só `parsed.telefone` aqui seria jogar o
 * `@lid` fora exatamente onde ele está mais barato.
 */
function recipientOf(parsed: ParsedInboundMessage): WhatsappRecipient {
  return { telefone: parsed.telefone, lid: parsed.userId }
}

type InboundMediaRow = Database['public']['Tables']['whatsapp_midia']['Insert']

/**
 * `ON CONFLICT DO NOTHING` (`ignoreDuplicates`), nunca `DO UPDATE`: o `wamid` é
 * PK e chave natural de idempotência (§4.2), e uma reentrega que passe pelo
 * dedup — possível se a gravação em `whatsapp_mensagens_recebidas` falhar —
 * **não pode** rebaixar para `pendente` uma linha já `concluido`/`processando`.
 * Fazer isso a tornaria reivindicável de novo e pagaria a OpenAI uma segunda
 * vez pelo mesmo áudio, exatamente o que as três camadas da §8.2 existem para
 * impedir. A primeira gravação vence; o enfileiramento segue de qualquer jeito,
 * porque quem decide se há trabalho a fazer é o claim, não este INSERT.
 */
async function recordMedia(
  supabase: SupabaseClient<Database>,
  row: InboundMediaRow,
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_midia')
    .upsert(row, { onConflict: 'wamid', ignoreDuplicates: true })

  if (error) throw new Error(`Falha ao registrar mídia recebida: ${error.message}`)
}

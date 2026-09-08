import { serverSupabaseServiceRole } from '#supabase/server'
import { readBody } from 'h3'
import { logger } from '~/core/services/logger.service'
import { verifyWebhookToken } from '../../../utils/whatsapp/verifyWebhookToken'
import { parseEchoEvent, parseInboundPayload } from '../../../utils/whatsapp/parseInboundPayload'
import { describeIgnoredEvent } from '../../../utils/whatsapp/describeIgnoredEvent'
import { isDuplicateMessage } from '../../../utils/whatsapp/dedupe'
import { resolveWebhookRuntimeConfig } from '../../../utils/whatsapp/resolveWebhookRuntimeConfig'
import { resolvePausaConfig } from '../../../utils/whatsapp/resolvePausaConfig'
import { handleEchoEvent } from '../../../utils/whatsapp/handleEchoEvent'
import { handleInboundMessage } from '../../../utils/whatsapp/handleInboundMessage'
import {
  cloudflareEnv,
  queueBindingFrom,
  type WhatsappMediaQueueMessage,
  type WhatsappTurnQueueMessage,
} from '../../../utils/whatsapp/queueBindings'

/**
 * POST /api/whatsapp/webhook/[token] — produtor (seções 2 e 7 da arquitetura
 * do agente WhatsApp; §7.4 da arquitetura de mídia). Nunca dorme, nunca chama
 * a OpenAI, nunca baixa mídia: valida origem, normaliza a mensagem, dedupe e
 * delega a `handleInboundMessage`, que decide entre bufferizar texto, enfileirar
 * mídia ou recusar educadamente. Os consumers
 * (`server/plugins/whatsapp-queue.ts` e `whatsapp-media-queue.ts`, hook
 * `cloudflare:queue`) fazem o trabalho caro.
 *
 * Sempre responde 200 depois do dedup passar: uma reentrega da Meta (ou do
 * provedor de WhatsApp) do mesmo `wamid` encontraria a linha já gravada em
 * `whatsapp_mensagens_recebidas` e cairia direto no branch de duplicata,
 * mesmo que o passo seguinte (buffer/fila) tenha falhado nesta tentativa —
 * não há ganho em devolver 500 pra forçar um retry que o próprio dedup
 * descartaria. Falha nessa janela fica só logada (seção 4 cobre a garantia
 * de entrega a partir do claim atômico em diante, não antes dele).
 */
export default defineEventHandler(async (event) => {
  verifyWebhookToken(event)

  const rawBody = await readBody(event)
  // Criado antes do parse: o ramo de echo (abaixo) também precisa dele para
  // resolver o cliente e gravar/pausar (item 2 da §7.6).
  const supabase = serverSupabaseServiceRole(event)
  const parsed = parseInboundPayload(rawBody)
  if (!parsed) {
    // `message_echoes` é evento próprio (§0.5.2 item c de `_docs/em-andamento.md`):
    // mensagem da LOJA, nunca do cliente. `handleEchoEvent` decide o estado de
    // atendimento (item 2 da §7.6): grava sempre, pausa condicionalmente.
    const echo = parseEchoEvent(rawBody)
    if (echo) {
      // Mesmo dedup do `wamid` de mensagem — a Meta reentrega echo também
      // (at-least-once), e sem isto uma reentrega pausaria/gravaria em dobro.
      const duplicateEcho = await isDuplicateMessage(supabase, echo.wamid)
      if (!duplicateEcho) {
        const pausaConfig = await resolvePausaConfig(supabase)
        await handleEchoEvent({ supabase, pausaConfig }, echo).catch((err: unknown) => {
          logger.error('[whatsapp/webhook] falha ao processar echo (mensagem enviada pela loja)', {
            telefone: echo.telefone,
            wamid: echo.wamid,
            error: err instanceof Error ? err.message : String(err),
          })
        })
      }

      logger.info('[whatsapp/webhook] echo reconhecido (mensagem enviada pela loja)', {
        telefone: echo.telefone,
        wamid: echo.wamid,
        timestamp: echo.timestamp,
      })
      return { ok: true }
    }

    // Nada a processar, mas nada some sem rastro (§5, armadilha 11): status
    // e os demais campos ativados no painel do provedor caem todos aqui. Só
    // estrutura e wamids, custo O(1) — o webhook tem contrato de tempo com a
    // Meta e nenhum I/O cabe neste ramo. Serializado de propósito: o
    // `console.info` do Worker inspeciona o objeto com profundidade 2 e
    // imprimia `arrays: [Array]` — exatamente o nível que interessa (nome do
    // array + wamids). Verificado no tail de 2026-07-30. Continua O(1): a
    // descrição já vem limitada em itens e em profundidade.
    logger.info('[whatsapp/webhook] evento sem mensagem do cliente', JSON.stringify(describeIgnoredEvent(rawBody)))
    return { ok: true }
  }

  const duplicate = await isDuplicateMessage(supabase, parsed.wamid)
  if (duplicate) return { ok: true }

  try {
    const config = await resolveWebhookRuntimeConfig(supabase, useRuntimeConfig(event))

    await handleInboundMessage({
      supabase,
      provider: config.provider,
      media: config.media,
      turnQueue: queueBindingFrom<WhatsappTurnQueueMessage>(cloudflareEnv(event), 'WHATSAPP_QUEUE'),
      mediaQueue: queueBindingFrom<WhatsappMediaQueueMessage>(cloudflareEnv(event), 'WHATSAPP_MIDIA_QUEUE'),
    }, parsed)
  } catch (err) {
    logger.error('[whatsapp/webhook] falha ao processar mensagem pós-dedup', {
      wamid: parsed.wamid,
      telefone: parsed.telefone,
      tipo: parsed.tipo,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return { ok: true }
})

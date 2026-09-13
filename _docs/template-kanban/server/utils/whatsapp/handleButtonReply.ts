/**
 * O que fazer quando o cliente toca um dos dois botões de `sendChoiceButtons`
 * (feature nova, ver `cloudApiClient.ts`) — nunca passa pelo agente/IA: o
 * toque já É a decisão do cliente, então despacha na hora o único `cta_url`
 * correspondente. Existe porque a Cloud API não aceita 2 botões de LINK na
 * mesma mensagem (limite da Meta) — `EnviarBotaoCatalogo` manda um convite
 * com 2 botões de resposta rápida, e este arquivo resolve o link de verdade
 * assim que um deles é tocado. Mesmo padrão de `handleEchoEvent.ts`:
 * side-branch síncrono chamado direto pela rota do webhook, fora da fila do
 * turno — separado dela pelo mesmo motivo, testável sem `H3Event`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { findOrCreateCustomer } from '../customers/findOrCreateCustomer'
import { getOrCreateActiveSession } from '../sessions/createCatalogSession'
import {
  CHOICE_BUTTON_CATALOG_ID,
  CHOICE_BUTTON_EXPRESS_ID,
  markReadAndTyping,
  sendCatalogButton,
  sendExpressCheckoutButton,
  type CloudApiClientConfig,
} from './cloudApiClient'
import type { ParsedInboundMessage } from './parseInboundPayload'

export interface HandleButtonReplyDeps {
  supabase: SupabaseClient<Database>
  provider: CloudApiClientConfig
}

export async function handleButtonReply(deps: HandleButtonReplyDeps, parsed: ParsedInboundMessage): Promise<void> {
  await markReadAndTyping(deps.provider, parsed.wamid)

  // Id desconhecido (versão antiga do convite, ou subtipo interactive ainda
  // não mapeado) — nada a fazer, não é erro: só não há link nenhum pra mandar.
  if (parsed.botaoRespondidoId !== CHOICE_BUTTON_CATALOG_ID && parsed.botaoRespondidoId !== CHOICE_BUTTON_EXPRESS_ID) {
    logger.info('[whatsapp/webhook] toque em botão sem id reconhecido (ignorado)', {
      wamid: parsed.wamid,
      botaoRespondidoId: parsed.botaoRespondidoId,
    })
    return
  }

  const customer = await findOrCreateCustomer(deps.supabase, {
    ...(parsed.telefone ? { whatsapp: parsed.telefone } : {}),
    ...(parsed.userId ? { lid: parsed.userId } : {}),
  })
  const session = await getOrCreateActiveSession(deps.supabase, customer.id)
  const recipient = { telefone: parsed.telefone, lid: parsed.userId }

  if (parsed.botaoRespondidoId === CHOICE_BUTTON_CATALOG_ID) {
    await sendCatalogButton(deps.provider, { recipient, body: 'Segue o link:', buttonUrl: session.url })
    return
  }

  // `&chat=1` abre a Compra Expressa direto nesta MESMA sessão (ver
  // `catalog/index.vue` e o mesmo padrão em `whatsapp-queue.ts`).
  await sendExpressCheckoutButton(deps.provider, { recipient, body: 'Show! Só tocar no botão:', buttonUrl: `${session.url}&chat=1` })
}

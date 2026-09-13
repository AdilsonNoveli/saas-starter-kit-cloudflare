import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'

/**
 * Claim atômico da fila de mídia (seção 8.2 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`) — RPC
 * `whatsapp_media_claim` (migration 094), um único UPDATE com WHERE de estado e
 * RETURNING. Mesmo papel de `claimBurstBuffer`: só prossegue se uma linha
 * voltar. A fila é *at-least-once*, e uma segunda entrega do mesmo `wamid`
 * encontra a linha já em `processando` (ou em `concluido`/`recusado`, ou com as
 * tentativas esgotadas), não casa o WHERE e devolve `null` — no-op, sem pagar a
 * OpenAI duas vezes pelo mesmo áudio.
 *
 * Erro de infraestrutura **não** vira `null`: `null` significa "outro já
 * cuidou disto" e faz o consumer dar `ack`. Se o Supabase estiver fora, a
 * mídia ainda não foi processada e a mensagem precisa voltar para a fila — por
 * isso a exceção sobe (§8.3: falha catastrófica *antes* do claim é o único caso
 * em que o consumer deixa a fila retentar).
 */
export interface ClaimedMedia {
  wamid: string
  /**
   * `null` quando a mídia foi registrada só com o identificador estável (item
   * (c) da FASE 0.4 de `_docs/em-andamento.md`): sem telefone não há caminho de
   * resposta, e é o consumer que decide o que fazer com isso.
   */
  telefone: string | null
  /**
   * Identificador estável do WhatsApp da mensagem de mídia (migration 101). É
   * o que faz o turno iniciado por áudio ou imagem também gravar
   * `customers.whatsapp_lid` — antes da 101 este caminho não tinha o que
   * propagar e só o turno de texto alimentava a captura da FASE 0.4 (a).
   */
  lid: string | null
  /**
   * `contacts[].profile.name` do payload original (migration 107) — sobrevive
   * até aqui para o turno iniciado por áudio/imagem também backfillar
   * `customers.name`, igual ao turno de texto (`deliverToTurn`/`gateInboundTurn`).
   */
  nomeContato: string | null
  tipo: string
  mediaId: string
  mimeType: string | null
  tamanhoBytes: number | null
  tentativas: number
}

export async function claimMedia(
  supabase: SupabaseClient<Database>,
  wamid: string,
  maxTentativas: number,
): Promise<ClaimedMedia | null> {
  const { data, error } = await supabase
    .rpc('whatsapp_media_claim', { p_wamid: wamid, p_max_attempts: maxTentativas })
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao reivindicar mídia do WhatsApp.' })
  }

  if (!data) return null

  return {
    wamid: data.wamid,
    telefone: data.phone,
    lid: data.whatsapp_lid,
    nomeContato: data.contact_name,
    tipo: data.type,
    mediaId: data.media_id,
    mimeType: data.mime_type,
    tamanhoBytes: data.size_bytes,
    tentativas: data.attempts,
  }
}

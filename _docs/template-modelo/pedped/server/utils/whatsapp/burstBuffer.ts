import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'

/**
 * Buffer de rajada — lado produtor (seções 2 e 4 da arquitetura do agente
 * WhatsApp). Acumula o texto de cada mensagem recebida por identidade do
 * cliente; `ultima_msg_id` grava o wamid mais recente do lote. O claim atômico
 * do consumer (`DELETE FROM whatsapp_turno_buffer WHERE chave = $1 AND
 * ultima_msg_id = $2 RETURNING *`, seção 4) só processa o lote se nenhuma
 * mensagem nova chegou entre o agendamento e a entrega da fila (~8s de
 * debounce) — uma mensagem nova reescreve `ultima_msg_id` aqui, e o claim
 * agendado para o lote anterior vira no-op (superado pela mensagem mais
 * recente, que já agendou seu próprio claim).
 *
 * Upsert via RPC (`whatsapp_buffer_append`, migration 087) em vez de um
 * SELECT + UPDATE no lado da aplicação: o append em `textos` (jsonb) precisa
 * ser atômico — duas mensagens do mesmo cliente quase simultâneas não podem
 * perder uma à outra numa janela de corrida de read-modify-write.
 */
export interface AppendToBurstBufferParams {
  /**
   * Telefone de origem, ou `null` quando o payload não o trouxe (item (b) da
   * FASE 0.4 de `_docs/em-andamento.md`). Sem telefone o turno ainda é
   * processável, mas **não é respondível**: o provedor não aceita `user_id` no
   * envio (`api-1.yaml:689`) — quem trata isso é o consumer.
   */
  telefone: string | null
  texto: string
  msgId: string
  /**
   * Identificador estável do WhatsApp (`messages[].from_user_id`), quando o
   * payload o trouxe — é o que faz o consumer identificar o cliente por algo
   * que não muda quando o número muda (FASE 0.4).
   *
   * Pode faltar no append do consumer de mídia: desde a migration 101
   * `whatsapp_midia` carrega o lid, mas só quando o payload daquela mídia o
   * trouxe. O `COALESCE` do RPC garante que um append sem lid não apague o que
   * a mensagem de texto da mesma rajada já gravou.
   */
  lid?: string | null
}

/**
 * Devolve a **chave do buffer** — a identidade que o claim do consumer vai
 * usar. Quem deriva é o RPC, único escritor da tabela: recalcular a derivação
 * aqui criaria uma segunda fonte de verdade para a chave do claim, e divergir
 * dela não falha — só perde o turno em silêncio.
 */
export async function appendToBurstBuffer(
  supabase: SupabaseClient<Database>,
  params: AppendToBurstBufferParams,
): Promise<string> {
  const { data, error } = await supabase.rpc('whatsapp_buffer_append', {
    p_telefone: params.telefone,
    p_texto: params.texto,
    p_msg_id: params.msgId,
    // Omitido quando não há lid, em vez de enviado como null: o default da
    // função é `NULL` e o COALESCE do ON CONFLICT depende dele para preservar
    // o valor já gravado.
    ...(params.lid ? { p_lid: params.lid } : {}),
  })

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao gravar buffer de rajada.' })
  }

  return data
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Claim atômico do buffer de rajada (seção 4 da arquitetura do agente
 * WhatsApp) — `DELETE ... WHERE key = $1 AND last_message_id = $2
 * RETURNING *`. Só prossegue se uma linha voltar: sob reentrega da fila
 * (*at-least-once*), uma segunda tentativa encontra a linha já apagada (ou
 * já sobrescrita por uma mensagem mais nova, cujo próprio claim agendado
 * prevalece) e devolve `null` — no-op, nunca processa nem responde duas
 * vezes o mesmo turno.
 *
 * A chave passou de `phone` para `key` na migration 101 (item (b) da
 * FASE 0.4 de `_docs/em-andamento.md`) — a **garantia é a mesma**: um statement
 * único, uma linha, duas colunas no WHERE. Para todo payload que traz telefone
 * — hoje, 100% deles — `key` É o telefone.
 */
export interface ClaimedBurstBuffer {
  /** Identidade do turno: telefone quando veio, senão `lid:<lid>`. */
  chave: string
  /**
   * `null` quando o lote foi identificado só pelo lid. Turno sem telefone não
   * tem caminho de resposta (§5, armadilha 14) — decisão do consumer.
   */
  telefone: string | null
  textos: string[]
  ultimaMsgId: string
  /**
   * Identificador estável do WhatsApp gravado pelo produtor (migration 100).
   * `null` quando nenhuma mensagem do lote o trouxe.
   */
  lid: string | null
}

export async function claimBurstBuffer(
  supabase: SupabaseClient<Database>,
  chave: string,
  ultimaMsgId: string,
): Promise<ClaimedBurstBuffer | null> {
  const { data, error } = await supabase
    .from('whatsapp_turn_buffer')
    .delete()
    .eq('key', chave)
    .eq('last_message_id', ultimaMsgId)
    .select('key, phone, texts, last_message_id, whatsapp_lid')
    .maybeSingle()

  if (error || !data) return null

  return {
    chave: data.key,
    telefone: data.phone,
    textos: (data.texts as unknown[]).filter((t): t is string => typeof t === 'string'),
    ultimaMsgId: data.last_message_id,
    lid: data.whatsapp_lid,
  }
}

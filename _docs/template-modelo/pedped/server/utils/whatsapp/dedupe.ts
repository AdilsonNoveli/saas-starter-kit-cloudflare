import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'

/**
 * Dedup de mensagens inbound do WhatsApp (seção 4 da arquitetura do agente
 * WhatsApp). `wamid` é único por design da Meta Cloud API — a PRIMARY KEY de
 * `whatsapp_mensagens_recebidas` rejeita a segunda tentativa de INSERT sob
 * reentrega da Meta (webhook *at-least-once*), sem precisar de um SELECT
 * prévio (que teria uma janela de corrida entre duas entregas quase
 * simultâneas do mesmo `wamid`).
 */
export async function isDuplicateMessage(
  supabase: SupabaseClient<Database>,
  wamid: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_mensagens_recebidas')
    .insert({ wamid })

  if (!error) return false
  if (error.code === '23505') return true

  throw createError({ statusCode: 500, statusMessage: 'Falha ao verificar duplicidade da mensagem.' })
}

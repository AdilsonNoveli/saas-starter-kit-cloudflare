import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import type { IntegrationUpdateContextResponse } from '#shared/types/integration'

/**
 * `AtualizarContexto` — extraída de `customers/context.patch.ts` (seção 6 da
 * arquitetura do agente WhatsApp). Persiste a MEMÓRIA durável do cliente
 * aprendida pelo agente (preferências de consumo + resumo de contexto) nos
 * campos do próprio cadastro (`customers`). Assim, a próxima chamada de
 * `getCustomerContext` já devolve esse conteúdo e a conversa fica contínua
 * entre sessões — sem tabela auxiliar.
 *
 * Escopo deliberado: escreve `preferences`, `context_summary` e
 * `preferred_channel` (afinidade com o catálogo). O cliente da integração NÃO
 * define métricas nem status.
 *
 * `nota_interna`: única exceção ao "Staff é território humano" — o agente pode
 * ANEXAR (nunca sobrescrever) uma linha datada em `internal_notes`, p.ex.
 * registrar desistência de compra. Append preserva o que o lojista escreveu.
 *
 * `canal_preferido`: como o cliente gosta de comprar —
 *   'catalogo' (compra pelo catálogo), 'chat' (prefere pedir no chat),
 *   'misto' (consulta no catálogo, pede no chat).
 */
export interface UpdateCustomerContextParams {
  cliente_id: string
  preferencias?: string
  contexto_resumo?: string
  canal_preferido?: 'catalogo' | 'chat' | 'misto'
  nota_interna?: string
}

export async function updateCustomerContext(
  supabase: SupabaseClient<Database>,
  params: UpdateCustomerContextParams,
): Promise<IntegrationUpdateContextResponse> {
  const { cliente_id, preferencias, contexto_resumo, canal_preferido, nota_interna } = params

  // Só grava o que foi enviado; marca que há contexto e registra a interação.
  const patch: {
    has_context: boolean
    last_conversation_at: string
    preferences?: string
    context_summary?: string
    preferred_channel?: 'catalogo' | 'chat' | 'misto'
    internal_notes?: string
  } = {
    has_context: true,
    last_conversation_at: new Date().toISOString(),
  }
  if (preferencias !== undefined) patch.preferences = preferencias
  if (contexto_resumo !== undefined) patch.context_summary = contexto_resumo
  if (canal_preferido !== undefined) patch.preferred_channel = canal_preferido

  // nota_interna: ANEXA uma linha datada em internal_notes (nunca sobrescreve
  // o que o lojista escreveu). Read-modify-write basta — uma conversa por cliente.
  if (nota_interna !== undefined) {
    const { data: atual } = await supabase
      .from('customers')
      .select('internal_notes')
      .eq('id', cliente_id)
      .single()

    const carimbo = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())

    const linha = `[${carimbo} · agente] ${nota_interna}`
    const anterior = (atual?.internal_notes ?? '').trim()
    patch.internal_notes = anterior ? `${anterior}\n${linha}` : linha
  }

  const { data, error } = await supabase
    .from('customers')
    .update(patch)
    .eq('id', cliente_id)
    .select('id, preferences, context_summary, preferred_channel')
    .single()

  if (error || !data) {
    logger.error('Integração: falha ao atualizar contexto do cliente', {
      cliente_id,
      error: error?.message,
    })
    throw createError({
      statusCode: 404,
      statusMessage: 'Cliente não encontrado ou falha ao atualizar contexto.',
    })
  }

  return {
    success: true,
    cliente_id: data.id,
    preferencias: data.preferences ?? null,
    contexto_resumo: data.context_summary ?? null,
    canal_preferido:
      (data.preferred_channel as 'catalogo' | 'chat' | 'misto' | null) ?? null,
  }
}

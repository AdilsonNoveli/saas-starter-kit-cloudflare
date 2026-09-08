/**
 * Criação de sessão de catálogo — caminho único (DRY).
 * Usada pela identificação web (`acesso_direto`) e pelo fluxo agentivo
 * (`whatsapp_bot`). A aplicação monta a URL do catálogo (fonte única):
 * o consumidor externo apenas repassa o link.
 */

import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { resolveSiteUrl } from '../net/siteUrl'

const SESSION_TTL_HOURS = 2

export interface CatalogSession {
  readonly sessaoId: string
  readonly url: string
}

/** Monta a URL pública do catálogo para uma sessão. */
export function buildCatalogUrl(sessaoId: string): string {
  return `${resolveSiteUrl()}/catalog?sessao=${sessaoId}`
}

/**
 * Sessão ativa do cliente, ou uma nova (`whatsapp_bot`) se não houver
 * nenhuma — mesma consulta de `getCustomerContext` (seção 6), mas sem exigir
 * carrinho com itens: o consumer da fila precisa de um `sessaoId` válido
 * desde o primeiro turno, antes de qualquer item existir.
 */
export async function getOrCreateActiveSession(
  supabase: SupabaseClient<Database>,
  clienteId: string,
): Promise<CatalogSession> {
  const { data: sessao } = await supabase
    .from('sessoes')
    .select('id')
    .eq('cliente_id', clienteId)
    .eq('status', 'ativa')
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sessao) return { sessaoId: sessao.id, url: buildCatalogUrl(sessao.id) }

  return createCatalogSession(supabase, clienteId, 'whatsapp_bot')
}

export async function createCatalogSession(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  canal: 'acesso_direto' | 'whatsapp_bot',
): Promise<CatalogSession> {
  const expiraEm = new Date()
  expiraEm.setHours(expiraEm.getHours() + SESSION_TTL_HOURS)

  const { data: sessao, error } = await supabase
    .from('sessoes')
    .insert({
      cliente_id: clienteId,
      canal,
      status: 'ativa',
      expira_em: expiraEm.toISOString(),
    })
    .select('id')
    .single()

  if (error || !sessao) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao gerar sessão de catálogo.' })
  }

  return { sessaoId: sessao.id, url: buildCatalogUrl(sessao.id) }
}

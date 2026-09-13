/**
 * Resolução leve de contexto para o motor de Respostas Rápidas
 * (`quickResponse.ts`) — só o que é barato e só quando pedido
 * (`needStatus`/`needFirstMessage`, decididos por `requiresStatusLookup`/
 * `requiresFirstMessageLookup` a partir das regras já carregadas).
 *
 * Nunca chama `findOrCreateCustomer` nem replica sua lógica de criação/
 * backfill/sanitização de nome: o cliente já existe neste ponto do fluxo
 * (criado pelo produtor em `gateInboundTurn`, `server/utils/whatsapp/pauseGate.ts`)
 * — isto é leitura pura, um único SELECT por identificador, lid-first
 * (mesma ordem de precedência de `findOrCreateCustomer.ts`).
 *
 * Nunca lança — erro de leitura devolve `null`/`false`, mesma régua
 * defensiva de `countRecentUserTurns` (`conversationHistory.ts`): esta
 * checagem é atalho de custo, não porta de atendimento, e uma falha
 * transitória aqui não pode travar o turno nem derrubar o pipeline.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { CustomerStatus } from '#shared/types/agentQuickResponse'

export interface QuickResponseContextIdentity {
  readonly phone: string | null
  readonly lid: string | null
}

export interface QuickResponseContextNeeds {
  readonly needStatus: boolean
  readonly needFirstMessage: boolean
}

export interface QuickResponseContext {
  /** `null` quando `needStatus` for `false`, OU quando o cliente não foi encontrado. */
  readonly status: CustomerStatus | null
  /** `null` quando `needFirstMessage` for `false`. */
  readonly isFirstMessage: boolean | null
}

async function findCustomerStatus(
  supabase: SupabaseClient<Database>,
  identity: QuickResponseContextIdentity,
): Promise<{ id: string, status: CustomerStatus | null } | null> {
  if (identity.lid) {
    const { data } = await supabase
      .from('customers')
      .select('id, status')
      .eq('whatsapp_lid', identity.lid)
      .maybeSingle()
    if (data) return { id: data.id, status: data.status as CustomerStatus | null }
  }

  if (identity.phone) {
    const { data } = await supabase
      .from('customers')
      .select('id, status')
      .eq('whatsapp_phone', identity.phone)
      .maybeSingle()
    if (data) return { id: data.id, status: data.status as CustomerStatus | null }
  }

  return null
}

async function hasAnyMessage(supabase: SupabaseClient<Database>, customerId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('whatsapp_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)

  return error ? true : (count ?? 0) > 0
}

export async function resolveQuickResponseContext(
  supabase: SupabaseClient<Database>,
  identity: QuickResponseContextIdentity,
  needs: QuickResponseContextNeeds,
): Promise<QuickResponseContext> {
  if (!needs.needStatus && !needs.needFirstMessage) {
    return { status: null, isFirstMessage: null }
  }

  // Try/catch, não só o `{error}` das chamadas internas: uma exceção
  // inesperada (rede, client incompatível) não pode escapar daqui — mesma
  // garantia "nunca lança" do cabeçalho do arquivo, agora cobrindo também
  // falhas que o Supabase client lança em vez de devolver no `{error}`.
  try {
    const customer = await findCustomerStatus(supabase, identity)
    if (!customer) return { status: null, isFirstMessage: null }

    const isFirstMessage = needs.needFirstMessage ? !(await hasAnyMessage(supabase, customer.id)) : null

    return {
      status: needs.needStatus ? customer.status : null,
      isFirstMessage,
    }
  } catch {
    return { status: null, isFirstMessage: null }
  }
}

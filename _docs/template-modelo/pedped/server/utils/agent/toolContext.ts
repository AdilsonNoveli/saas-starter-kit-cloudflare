/**
 * Contrato comum de todas as tools do agente (seção 7 da arquitetura do
 * agente WhatsApp — `agent/tools/*.ts`). `agent/*` nunca importa de
 * `whatsapp/*` (separação de camadas, seção 7/11): dependências de
 * transporte (enviar mensagem no WhatsApp) chegam aqui como funções já
 * resolvidas em `AgentToolContext`, injetadas por quem monta o contexto
 * (consumer da fila, passo 6 da seção 12) — nunca importadas diretamente.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodType } from 'zod'
import type { Database } from '~/types/database.types'

export interface AgentToolContext {
  supabase: SupabaseClient<Database>
  /** Sessão de carrinho ativa do turno (`whatsapp_turno_buffer`/estado do cliente). */
  sessaoId: string
  /** `null` para visitante ainda não identificado — tools que exigem cliente devem validar. */
  clienteId: string | null
  /** Telefone E.164 do cliente, destino de mensagens enviadas por uma tool. */
  whatsapp: string
  /** URL pronta da sessão de catálogo digital deste cliente. */
  catalogoUrl: string
  /** Chave privada da Google Maps Platform, já resolvida (nunca via `H3Event` — seção 2). */
  googleMapsServerKey: string
  /** Envia o botão de catálogo digital via WhatsApp Cloud API — injetado pelo consumer (whatsapp/cloudApiClient.ts). */
  sendCatalogButton: (input: { body: string }) => Promise<void>
}

export interface AgentToolDefinition<Args = unknown> {
  /** Nome exposto ao modelo — idêntico ao nome da tool no n8n (seção 6). */
  name: string
  /** Porte literal da `toolDescription` do node n8n correspondente. */
  description: string
  /** Schema Zod dos argumentos — única fonte de verdade (regra "Zero any", seção 11). */
  schema: ZodType<Args>
  run: (args: Args, ctx: AgentToolContext) => Promise<unknown>
}

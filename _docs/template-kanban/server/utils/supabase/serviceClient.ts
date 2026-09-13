import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Centraliza a resolução de credenciais do client de service role, antes
 * duplicada de forma idêntica em 6 lugares (4 plugins de fila + 2 tasks).
 * `url` vem de `useRuntimeConfig()` (populado por `@nuxtjs/supabase`);
 * `serviceKey` é lido de `process.env` porque plugins/tasks rodam fora do
 * client (sem acesso ao runtime config privado).
 */
function resolveServiceCredentials(): { url: string; serviceKey: string } {
  const config = useRuntimeConfig()
  const url = (config.public as Record<string, unknown> & { supabase?: { url?: string } }).supabase?.url ?? ''
  const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY ?? ''
  return { url, serviceKey }
}

export function buildSupabaseServiceClient(): SupabaseClient<Database> {
  const { url, serviceKey } = resolveServiceCredentials()
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false } })
}

/** Usado pelas tasks para pular a execução com um log claro, em vez de deixar `createClient` falhar. */
export function hasSupabaseServiceCredentials(): boolean {
  const { url, serviceKey } = resolveServiceCredentials()
  return Boolean(url && serviceKey)
}

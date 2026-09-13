/**
 * Mesma verificação de `requireRole.ts` (RBAC — sessão ativa + `users.active`
 * + papel permitido), mas para o hook `upgrade` do WebSocket
 * (`server/api/admin/chat/socket.ts`, `defineWebSocketHandler`/crossws).
 *
 * `defineWebSocketHandler`'s `upgrade` hook não recebe um `H3Event` — recebe
 * só a `Request` crua do handshake (confirmado lendo `crossws` e o preset
 * `cloudflare-durable` do Nitro instalado: o upgrade é interceptado ANTES do
 * roteamento H3 normal, `ws.handleUpgrade(request, env, context)` em
 * `nitropack/dist/presets/cloudflare/runtime/cloudflare-durable.mjs`). Por
 * isso não dá para reaproveitar `requireRole(event, ...)` direto — este
 * arquivo replica a MESMA lógica (`@nuxtjs/supabase`'s
 * `serverSupabaseClient.js`/`serverSupabaseUser.js`/`serverSupabaseServiceRole.js`,
 * lidos na fonte instalada) a partir só da `Request`.
 */
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { UserRole } from '#shared/types/user'
import type { Database } from '~/types/database.types'
import type { AuthenticatedUser } from './requireRole'

/** Rejeita com `Response` (não `Error`) — é o contrato do hook `upgrade` do crossws (`@throws {Response}`). */
export async function requireRoleFromRequest(
  request: { headers: Headers; url?: string },
  roles: readonly UserRole[],
): Promise<AuthenticatedUser> {
  const runtime = useRuntimeConfig()
  const supabasePublic = runtime.public.supabase as {
    url: string
    key: string
    cookiePrefix?: string
    cookieOptions?: Record<string, unknown>
  }

  const client = createServerClient(supabasePublic.url, supabasePublic.key, {
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get('cookie') ?? '').map((c) => ({
          name: c.name,
          value: c.value ?? '',
        })),
      // Upgrade de WebSocket não devolve corpo/headers de resposta HTTP
      // normal — não há onde gravar Set-Cookie de refresh de sessão aqui.
      setAll: () => {},
    },
    cookieOptions: { ...(supabasePublic.cookieOptions ?? {}), name: supabasePublic.cookiePrefix },
  })

  const { data: claimsData, error: claimsError } = await client.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) {
    throw new Response('Não autorizado.', { status: 401 })
  }

  const serverKey = (runtime.supabase as { secretKey?: string, serviceKey?: string }).secretKey
    ?? (runtime.supabase as { secretKey?: string, serviceKey?: string }).serviceKey
  if (!serverKey) {
    throw new Response('Serviço indisponível.', { status: 503 })
  }

  const adminClient = createClient<Database>(supabasePublic.url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, role, active')
    .eq('id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    throw new Response('Acesso negado.', { status: 403 })
  }

  if (!profile.active) {
    throw new Response('Usuário desativado.', { status: 403 })
  }

  if (!roles.includes(profile.role as UserRole)) {
    throw new Response('Acesso negado.', { status: 403 })
  }

  return { id: profile.id, role: profile.role as UserRole }
}

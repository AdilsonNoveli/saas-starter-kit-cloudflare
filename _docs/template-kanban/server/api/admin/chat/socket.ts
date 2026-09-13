/**
 * WebSocket GET /api/admin/chat/socket
 *
 * Canal único e reutilizável da aplicação (crossws, via preset
 * `cloudflare-durable` do Nitro) — substitui o Supabase Realtime por questão
 * de custo (decisão registrada em `_docs/CHAT/PRD.md`). Hoje só o Chat
 * assina eventos aqui (`chat.message`, `chat.conversation_updated` —
 * `shared/types/realtime.ts`); qualquer feature futura (pedidos, dashboard)
 * pode reaproveitar o mesmo canal somando um `topic` novo ao envelope, não
 * abrindo outro socket.
 *
 * Autenticação no `upgrade`: `defineWebSocketHandler` não recebe `H3Event`
 * nos hooks (confirmado lendo o `crossws` instalado — o upgrade é
 * interceptado ANTES do roteamento H3 normal), daí `requireRoleFromRequest`
 * em vez de `requireRole`.
 */
import { STAFF_ROLES } from '#shared/types/user'
import { REALTIME_CHANNEL } from '#shared/types/realtime'
import { requireRoleFromRequest } from '../../../utils/auth/requireRoleFromRequest'

export default defineWebSocketHandler({
  async upgrade(request) {
    // Lança `Response` em falha (401/403/503) — contrato do hook `upgrade`
    // do crossws (`@throws {Response}`), não um `Error` genérico.
    await requireRoleFromRequest(request, STAFF_ROLES)
  },

  open(peer) {
    peer.subscribe(REALTIME_CHANNEL)
  },

  message() {
    // Canal é só de leitura para o staff — cliente não envia mensagem de dados hoje.
  },

  close() {
    // Nada a limpar: hibernação da Durable Object cuida da conexão encerrada.
  },
})

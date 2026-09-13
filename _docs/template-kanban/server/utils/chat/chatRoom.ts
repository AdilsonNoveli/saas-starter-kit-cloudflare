/**
 * Emissor do socket único e reutilizável (`_docs/CHAT/PRD.md` — substitui o
 * WebSocket do Supabase Realtime por questão de custo). A recepção mora em
 * `server/api/admin/chat/socket.ts` (`defineWebSocketHandler`); este arquivo
 * é o lado que EMPURRA um evento a partir de qualquer escritor (rota REST,
 * consumer de fila, task de cron).
 *
 * O binding/classe `$DurableObject` (nome fixo, com `$`) não é meu — é
 * gerado pelo próprio Nitro no preset `cloudflare-durable`
 * (`nitropack/dist/presets/cloudflare/runtime/cloudflare-durable.mjs`,
 * `DURABLE_BINDING = "$DurableObject"`, `DURABLE_INSTANCE = "server"`, único
 * para toda a aplicação).
 *
 * `stub.fetch(...)`, NUNCA `stub.publish(...)` (RPC direto): confirmado em
 * produção via `wrangler tail` (2026-08-18) que a chamada RPC lança "Cannot
 * perform I/O on behalf of a different Durable Object" sempre que vem de FORA
 * da DO (fila, outra rota HTTP) — bug do `crossws@0.3.5` (via
 * `nitropack@2.13.4`, última da série 2.x hoje): o `Set` de peers do adapter
 * guarda handles de WebSocket que ficam inválidos após um ciclo de
 * hibernação da DO. `stub.fetch(...)` sempre aciona `$DurableObject.fetch()`
 * com uma `DurableObjectState` corretamente acordada; a rota interna
 * `server/api/_internal/realtime-publish.post.ts`, rodando dentro dessa
 * invocação, lê `getWebSockets()` fresca e manda a mensagem direto — sem
 * depender do Set obsoleto do crossws. Ver o cabeçalho daquele arquivo para o
 * detalhamento completo.
 *
 * Mesmo padrão defensivo de `server/utils/whatsapp/queueBindings.ts`: fora do
 * runtime Cloudflare (dev local sob preset node-server, testes) o binding não
 * existe — não lança, só não transmite nada. O Chat continua funcionando via
 * fetch normal, só perde a atualização ao vivo.
 */
import { logger } from '~/core/services/logger.service'
import type { RealtimeEvent } from '#shared/types/realtime'
import { realtimeEventSchema } from '#shared/types/realtime'

const DURABLE_BINDING = '$DurableObject'
const DURABLE_INSTANCE = 'server'

/**
 * Host arbitrário — só o pathname importa (`nitroApp.localFetch` do preset
 * `cloudflare-durable` roteia por `url.pathname + url.search`, o host nunca é
 * lido). Mantém o mesmo pathname da rota real para o link ficar navegável em
 * quem lê o log/código.
 */
const INTERNAL_PUBLISH_URL = 'https://internal.pedped.invalid/api/_internal/realtime-publish'

interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown
  get(id: unknown): DurableObjectStubLike
}

/**
 * Publica um evento no tópico do envelope para todos os clientes conectados
 * (staff da loja — instalação única, `wrangler.toml`). Valida com Zod antes
 * de transmitir: um typo num payload novo não pode corromper o parser de
 * quem já está conectado (§ design do socket único, `_docs/CHAT/PRD.md`).
 */
export async function notifyRealtimeRoom(
  env: Record<string, unknown> | undefined,
  event: RealtimeEvent,
): Promise<void> {
  const parsed = realtimeEventSchema.safeParse(event)
  if (!parsed.success) {
    logger.error('[realtime] evento inválido, não transmitido', { issues: parsed.error.issues })
    return
  }

  const binding = env?.[DURABLE_BINDING] as DurableObjectNamespaceLike | undefined
  if (!binding) {
    logger.warn('[realtime] binding $DurableObject ausente (fora do runtime Cloudflare) — nada foi transmitido', {
      topic: parsed.data.topic,
    })
    return
  }

  try {
    const stub = binding.get(binding.idFromName(DURABLE_INSTANCE))
    // A rota interna manda para TODOS os sockets abertos da DO — hoje o
    // único canal existente (`REALTIME_CHANNEL` continua sendo usado só em
    // `socket.ts`, para a assinatura crossws em si); `parsed.data.topic` é a
    // chave de despacho DENTRO do envelope, lida pelo cliente já conectado.
    const response = await stub.fetch(new Request(INTERNAL_PUBLISH_URL, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    }))
    if (!response.ok) {
      logger.error('[realtime] rota interna de publish devolveu erro', {
        topic: parsed.data.topic,
        status: response.status,
      })
    }
  } catch (err) {
    logger.error('[realtime] falha ao transmitir evento', {
      topic: parsed.data.topic,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

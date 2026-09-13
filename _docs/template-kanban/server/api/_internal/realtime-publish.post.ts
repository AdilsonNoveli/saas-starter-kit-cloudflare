/**
 * POST /api/_internal/realtime-publish — rota INTERNA, nunca chamada por
 * staff/cliente diretamente.
 *
 * Contorna um bug confirmado em produção (`wrangler tail`, 2026-08-18):
 * chamar `stub.publish(...)` via RPC direto no binding `$DurableObject`
 * lançava sempre "Cannot perform I/O on behalf of a different Durable
 * Object" — a mensagem nunca saía do socket único, e o painel só via
 * mensagens novas depois de um refresh manual (refetch REST).
 *
 * Causa raiz: `crossws@0.3.5` (via `nitropack@2.13.4`, a última da série 2.x
 * hoje) guarda os peers conectados num `Set` em escopo de módulo, com o
 * handle nativo do WebSocket capturado no momento da conexão. Depois de um
 * ciclo de hibernação da Durable Object, esse handle fica inválido — e
 * qualquer chamada de RPC vinda de FORA da DO (fila, outra rota HTTP) tenta
 * usar esse handle obsoleto e quebra. `crossws@0.4.x` já resolve isso
 * (recalcula os sockets via `getWebSockets()` a cada publish), mas o preset
 * `cloudflare-durable` do nitropack ainda não foi atualizado para a nova API
 * — não é algo corrigível editando este repositório.
 *
 * Esta rota contorna o bug sem tocar `node_modules`: `notifyRealtimeRoom`
 * (`chatRoom.ts`) chama `stub.fetch(...)` em vez de `stub.publish(...)` — um
 * `fetch()` para uma Durable Object SEMPRE aciona `$DurableObject.fetch()`
 * (gerado pelo preset) com uma `DurableObjectState` corretamente "acordada"
 * para ESTA invocação. Rodando dentro dela, esta rota lê
 * `event.context.cloudflare.context.getWebSockets()` fresca — a mesma
 * Cloudflare Hibernatable WebSockets API que o crossws deveria estar usando
 * — e manda a mensagem direto para cada socket aberto, sem depender do Set
 * obsoleto do crossws.
 *
 * Protegida por construção, não por token: `event.context.cloudflare.durable`
 * só existe quando a requisição chegou via `$DurableObject.fetch()`
 * (`ctxExt = { durable: this }` em `cloudflare-durable.mjs`). Uma requisição
 * pública direta a este pathname nunca passa pela Durable Object — cai no
 * Worker de nível superior, sem essa chave — e o guard abaixo rejeita.
 */
import { createError, readRawBody } from 'h3'
import { logger } from '~/core/services/logger.service'

interface WebSocketLike {
  send(data: string): void
}

interface DurableObjectStateLike {
  getWebSockets(tag?: string): readonly WebSocketLike[]
}

export default defineEventHandler(async (event) => {
  const cloudflare = (event.context as {
    cloudflare?: { context?: DurableObjectStateLike, durable?: unknown }
  }).cloudflare

  if (!cloudflare?.durable || !cloudflare.context) {
    throw createError({ statusCode: 403, statusMessage: 'Rota interna — acesso direto não permitido.' })
  }

  const data = await readRawBody(event, 'utf-8')
  if (!data) {
    throw createError({ statusCode: 400, statusMessage: 'Corpo vazio.' })
  }

  const sockets = cloudflare.context.getWebSockets()
  for (const socket of sockets) {
    try {
      socket.send(data)
    } catch (err) {
      logger.error('[realtime] falha ao enviar para um peer', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { published: true, peers: sockets.length }
})

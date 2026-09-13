/**
 * Socket único e reutilizável da aplicação — substitui o WebSocket do
 * Supabase Realtime por questão de custo (decisão registrada em
 * `_docs/CHAT/PRD.md`). Estado em escopo de MÓDULO (fora da função) de
 * propósito: uma única conexão para a sessão inteira do navegador, não uma
 * por componente/página. Cada consumidor (`useChatRealtime.ts`, e no futuro
 * outras features) só assina/desassina tópicos — nunca abre conexão própria.
 *
 * Backoff de reconexão e o próprio `WebSocket` ficam centralizados aqui;
 * componentes nunca gerenciam isso individualmente (evita reconexões
 * duplicadas e lógica de backoff divergente entre features).
 */
import { ref } from 'vue'
import type { RealtimeEvent, RealtimeTopic } from '#shared/types/realtime'
import { realtimeEventSchema } from '#shared/types/realtime'

type RealtimeHandler = (event: RealtimeEvent) => void

const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30_000

let socket: WebSocket | null = null
let reconnectAttempt = 0
let reconnectTimer: ReturnType<typeof setTimeout> | undefined

const topicHandlers = new Map<RealtimeTopic, Set<RealtimeHandler>>()
/** Disparado ao RECONECTAR (não na conexão inicial) — sinal para o consumidor revalidar estado que pode ter perdido eventos durante a queda. */
const resyncHandlers = new Set<() => void>()
const isConnected = ref<boolean>(false)

function socketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/admin/chat/socket`
}

function dispatch(raw: string): void {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return
  }

  const result = realtimeEventSchema.safeParse(json)
  if (!result.success) return

  for (const handler of topicHandlers.get(result.data.topic) ?? []) {
    handler(result.data)
  }
}

function scheduleReconnect(): void {
  const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt, RECONNECT_MAX_DELAY_MS)
  reconnectAttempt += 1
  reconnectTimer = setTimeout(connect, delay)
}

function connect(): void {
  if (socket) return
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }

  const ws = new WebSocket(socketUrl())
  socket = ws

  ws.addEventListener('open', () => {
    isConnected.value = true
    const wasReconnect = reconnectAttempt > 0
    reconnectAttempt = 0
    if (wasReconnect) {
      for (const handler of resyncHandlers) handler()
    }
  })

  ws.addEventListener('message', (event) => {
    if (typeof event.data === 'string') dispatch(event.data)
  })

  ws.addEventListener('close', () => {
    isConnected.value = false
    socket = null
    scheduleReconnect()
  })

  ws.addEventListener('error', () => {
    ws.close()
  })
}

export function useRealtimeSocket() {
  if (import.meta.client) connect()

  function subscribe<T extends RealtimeTopic>(
    topic: T,
    handler: (event: Extract<RealtimeEvent, { topic: T }>) => void,
  ): void {
    if (!topicHandlers.has(topic)) topicHandlers.set(topic, new Set())
    topicHandlers.get(topic)!.add(handler as RealtimeHandler)
  }

  function unsubscribe<T extends RealtimeTopic>(
    topic: T,
    handler: (event: Extract<RealtimeEvent, { topic: T }>) => void,
  ): void {
    topicHandlers.get(topic)?.delete(handler as RealtimeHandler)
  }

  /** Registra um callback de resync; devolve a função de cancelamento (chamar em `onUnmounted`). */
  function onResync(handler: () => void): () => void {
    resyncHandlers.add(handler)
    return () => resyncHandlers.delete(handler)
  }

  return { isConnected, subscribe, unsubscribe, onResync }
}

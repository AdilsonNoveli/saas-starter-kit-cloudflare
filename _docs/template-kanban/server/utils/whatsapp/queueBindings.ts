/**
 * Contrato das duas filas do agente WhatsApp — nomes, formato da mensagem e
 * acesso ao binding. Único lugar onde produtor e consumers concordam sobre o
 * que trafega (§5 e §8.1 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 *
 * O hook `cloudflare:queue` é **um só para todas as filas do Worker**: os dois
 * plugins de `server/plugins/` recebem todo lote, de qualquer fila, e precisam
 * filtrar por `batch.queue` — daí os nomes viverem aqui e não soltos em cada
 * arquivo.
 */
import type { H3Event } from 'h3'
import { logger } from '~/core/services/logger.service'

/**
 * **Sufixos, não nomes completos** — e isso é deliberado (§8.1 de
 * `_docs/em-andamento.md`).
 *
 * O nome real da fila é `<nome-do-worker>-<sufixo>`, montado em `wrangler.toml`
 * a partir de `{{WORKER_NAME}}`. Constante com o nome inteiro aqui **já custou
 * um apagão**: quando as filas ganharam o prefixo do Worker, a constante ficou
 * em `whatsapp-turno-check`, `batch.queue !== TURN_QUEUE_NAME` virou sempre
 * verdadeiro e **todo lote passou a ser descartado em silêncio** — o agente
 * ficou mudo sem uma linha de log. Não reintroduza nome completo aqui: o
 * prefixo é decidido por instalação, no TOML, e este arquivo não tem como
 * saber qual é.
 *
 * **O sufixo NÃO é isolamento entre instalações, e não pretende ser.** Quem
 * isola é a configuração: cada instalação declara as suas próprias filas. Se
 * dois Workers da mesma conta declararem a MESMA fila, a Cloudflare entrega as
 * mensagens de uma loja ao Worker da outra, e nenhuma comparação em runtime
 * conserta isso — ou o Worker errado processa, ou rejeita e a mensagem se
 * perde. O papel real desta função é **rotear entre as duas filas deste
 * Worker** (turno × mídia), e para isso o sufixo basta e é exato.
 */
export const TURN_QUEUE_SUFFIX = 'turno-check'
export const MEDIA_QUEUE_SUFFIX = 'midia'
/**
 * Fila do laboratório de avaliação sob demanda
 * (`_docs/implementar/prd-laboratorio-avaliacao-agente.md` §6/§7) — uma
 * mensagem por persona, cada invocação roda a conversa simulada inteira
 * (~4 turnos + 1 julgamento) dentro do orçamento de 15 min de wall-clock de
 * um consumer `cloudflare:queue` (confirmado no PRD §7, Workers Paid).
 */
export const LAB_QUEUE_SUFFIX = 'lab'

/**
 * Envio manual do painel do Chat (`_docs/CHAT/PRD.md` §6.3, resolve G5/G6) —
 * outbox via Queue em vez de chamada síncrona à Cloud API dentro da rota.
 */
export const CHAT_OUTBOUND_QUEUE_SUFFIX = 'chat-outbound'

/**
 * Decide se o lote pertence à fila de um dado sufixo. O hook `cloudflare:queue`
 * é único para todas as filas do Worker: os dois consumers recebem todo lote e
 * precisam ignorar o que não é deles.
 *
 * Exige o hífen antes do sufixo para que `midia` não case com
 * `qualquercoisamidia`, e trata a DLQ como fila distinta — ela não tem consumer
 * (§8.1 da arquitetura de mídia), então um lote vindo dela é ignorado por não
 * bater com o sufixo exato.
 */
export function isBatchForQueue(batchQueue: string, suffix: string): boolean {
  return batchQueue.endsWith(`-${suffix}`)
}

/** Debounce de rajada (agente §4): o turno só acorda 8s depois do último evento. */
export const TURN_DEBOUNCE_SECONDS = 8

export interface WhatsappTurnQueueMessage {
  /**
   * Chave do buffer de rajada, devolvida por `whatsapp_buffer_append`
   * (migration 101) — é o que o claim do consumer usa. Telefone quando o
   * payload o trouxe, senão `lid:<lid>`; ou seja, para todo o tráfego de hoje
   * é o próprio telefone.
   */
  chave: string
  checkForMsgId: string
}

/**
 * Só identificadores — **nunca os bytes** da mídia: a mensagem da fila tem teto
 * de 128 KB e um áudio de WhatsApp passa disso com folga (§5.1). O download
 * acontece no consumer.
 *
 * `urlInline` é o `url` do payload (§1.3), levado adiante só porque é o
 * fallback de download quando `GET /media/{id}` responde erro — e não há
 * coluna em `whatsapp_midia` para ele, então a mensagem é o único caminho do
 * produtor até o consumer. É uma string curta; o teto continua sendo sobre
 * bytes de mídia, que nunca trafegam aqui.
 */
export interface WhatsappMediaQueueMessage {
  wamid: string
  urlInline?: string
  /**
   * `image.caption` — texto que o cliente digitou junto da foto e que não pode
   * ser perdido (§7.2). Viaja aqui pelo mesmo motivo do `urlInline`:
   * `whatsapp_midia` não tem coluna para ele, e o modelo de visão precisa da
   * legenda como contexto ("quantos desses?" muda o que interessa extrair).
   */
  caption?: string
  /**
   * `document.filename` (migration 114) — nome original do arquivo de arte,
   * só pra exibição ao staff (Kanban/recibo). Mesmo motivo de `caption`
   * viajar aqui: `whatsapp_midia` não tem coluna pra isso.
   */
  filename?: string
}

/**
 * Uma mensagem por envio manual do painel — o consumer atualiza a linha
 * `pending` já gravada (`mensagemId`), nunca insere outra (G5). `text`/
 * `attachmentUrls` viajam aqui em vez de o consumer reler `content` de
 * `whatsapp_conversas` e desfazer o `HUMAN_REPLY_PREFIX`: o histórico é
 * fonte de verdade do que foi dito, não do que precisa ser reenviado.
 */
export interface WhatsappChatOutboundQueueMessage {
  /** `whatsapp_conversas.id` da linha `pending` gravada por `chatService.dispatchOutboundMessage`. */
  mensagemId: string
  clienteId: string
  telefone: string
  lid: string | null
  text: string
  attachmentUrls: readonly string[]
}

/** Uma mensagem por persona — o consumer resolve o roteiro por `personaKey` (`server/utils/lab/personas.ts`). */
export interface WhatsappLabQueueMessage {
  runId: string
  personaKey: string
  personaIndex: number
}

export interface QueueBinding<T> {
  send(message: T, options?: { delaySeconds?: number }): Promise<void>
}

/**
 * Bindings de fila (`wrangler.toml`) só existem no runtime Cloudflare Workers —
 * no produtor injetados em `event.context.cloudflare.env` pelo preset
 * `cloudflare-module` do Nitro, no consumer entregues no payload do hook. Sem
 * augmentation de tipo carregada sob o preset padrão (node-server) usado por
 * `nuxi typecheck`: cast via `unknown`, nunca `any` (§2).
 */
/**
 * Bindings de fila só existem no runtime Cloudflare Workers, injetados em
 * `event.context.cloudflare.env` pelo preset `cloudflare-module` do Nitro
 * (`presets/cloudflare/runtime/_module-handler.mjs` monta
 * `context: {_platform: {cloudflare: {env, ...}}}` no `localFetch`). Sem
 * augmentation de tipo carregada sob o preset padrão (node-server) usado por
 * `nuxi typecheck` — cast via `unknown` (nunca `any`), igual ao padrão já
 * usado para `event.context.waitUntil` em `checkout.post.ts`. Extraído aqui
 * (era duplicado em `webhook/[token].post.ts`) para todo produtor de fila
 * reaproveitar o mesmo cast.
 */
export function cloudflareEnv(event: H3Event): Record<string, unknown> | undefined {
  const cloudflare = (event.context as { cloudflare?: { env?: Record<string, unknown> } }).cloudflare
  return cloudflare?.env
}

export function queueBindingFrom<T>(
  env: Record<string, unknown> | undefined,
  binding: string,
): QueueBinding<T> | undefined {
  return env?.[binding] as QueueBinding<T> | undefined
}

/**
 * Enfileira ou registra a ausência do binding — nunca lança: fora do runtime
 * Cloudflare (dev local, testes) a falta do binding não pode derrubar o
 * caminho que ainda tem uma resposta a dar ao cliente (§2).
 */
export async function sendToQueue<T>(
  queue: QueueBinding<T> | undefined,
  binding: string,
  message: T,
  options?: { delaySeconds?: number },
): Promise<void> {
  if (!queue) {
    logger.warn('[whatsapp] binding de fila ausente (fora do runtime Cloudflare) — nada foi enfileirado', {
      binding,
    })
    return
  }
  await queue.send(message, options)
}

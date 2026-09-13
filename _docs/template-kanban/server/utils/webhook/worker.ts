/**
 * Worker do outbox de webhook (3.6).
 *
 * Drena `webhook_outbox` em ordem (`proxima_tentativa_em` ASC) com:
 *  - timeout HTTP de 10s (evita socket pendurado se o destino travar);
 *  - backoff exponencial: `min(30·2^(n-1), 3600) s`;
 *  - idempotência: header `Idempotency-Key: event_id` (UNIQUE no banco);
 *  - autenticação: `Authorization: Bearer <token da loja>`, **obrigatório** —
 *    sem token o worker recusa a rodada inteira em vez de enviar dado de
 *    cliente sem credencial (falha fechado);
 *  - destino validado a cada envio (`validateWebhookUrl`) e `redirect: 'manual'`:
 *    a validação da URL só vale se um 302 não puder levar o `Authorization`
 *    para outro host;
 *  - assinatura HMAC do corpo (`X-Pedped-Signature`), também obrigatória —
 *    integridade e frescor, que o Bearer sozinho não dá (ver `signature.ts`);
 *  - claim atômico via `UPDATE ... RETURNING` para evitar dupla entrega
 *    quando duas instâncias do worker rodam em paralelo;
 *  - retenção: `pruneWebhookOutbox` poda os `enviado` antigos.
 *
 * O destino é **agnóstico** — qualquer sistema que receba HTTPS e saiba
 * conferir um Bearer e um HMAC. Nada aqui presume quem está do outro lado.
 *
 * Não usa `event.context.waitUntil` — o disparo é feito DENTRO do worker
 * acionado por pg_cron/cron task, com promessa aguardada.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type {
  WebhookOutboundCredentials,
  WebhookOutboxRow,
  WorkerRunResult,
} from '#shared/types/webhook'
import { validateWebhookUrl } from '#shared/utils/webhookUrl'
import { SIGNATURE_HEADER, buildSignatureHeader } from './signature'
import { getWebhookCredentials } from './credentials'

/** Timeout do POST ao destino. Suficiente para qualquer fluxo
 * razoável e curto o bastante para não enfileirar nem manter o worker preso. */
const DELIVERY_TIMEOUT_MS = 10_000

/** Tamanho do lote por execução. Mantém o worker responsivo a mudanças
 * de prioridade (cancelamentos, picos) sem ficar drenando indefinidamente. */
const DEFAULT_BATCH_SIZE = 25

/**
 * Backoff exponencial: 30s → 60 → 120 → 240 → 480 → … capado em 1h.
 * `n` é o número da tentativa **atual** (1 = primeira retentativa).
 */
function backoffSeconds(attempt: number): number {
  const base = 30
  const max = 3600
  return Math.min(base * Math.pow(2, attempt - 1), max)
}

/**
 * Existe QUALQUER linha elegível agora (`pendente`/`falha` com o retry já
 * vencido)? Leitura pura, nunca reserva nada — é o que decide se vale a pena
 * até checar credencial. Webhook é opt-in (usado só quando a loja precisa de
 * notificação externa, ver `resolvePausaConfig`-like docs de Configurações →
 * Webhooks): sem isso, uma loja que nunca configurou o Vault tinha um
 * "Worker: recusado" gritando ERROR a cada minuto, para sempre, sem nenhum
 * evento para entregar — ruído que escondia problema real em produção (17/08).
 */
async function hasPendingOutbox(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase
    .from('webhook_outbox')
    .select('id')
    .in('status', ['pendente', 'falha'])
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(1)

  if (error) {
    logger.error('Worker: falha ao checar pendências do outbox', { error: error.message })
    return true // falha fechado: no dúvida, segue o fluxo normal (credencial decide).
  }
  return (data?.length ?? 0) > 0
}

/**
 * Faz `claim` atômico de até `batchSize` linhas: marca como `enviando`
 * para que outra instância do worker não pegue as mesmas. Retorna as
 * linhas reservadas.
 */
async function claimBatch(
  supabase: SupabaseClient,
  batchSize: number,
): Promise<WebhookOutboxRow[]> {
  // Selecionar IDs candidatos (status retentável + tempo de retry chegou).
  const { data: candidates, error: selErr } = await supabase
    .from('webhook_outbox')
    .select('id')
    .in('status', ['pendente', 'falha'])
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(batchSize)

  if (selErr) {
    logger.error('Worker: falha ao listar candidatos', { error: selErr.message })
    return []
  }
  if (!candidates || candidates.length === 0) return []

  const ids = candidates.map((r) => r.id as string)

  // Claim atômico: só marca como `enviando` quem ainda não foi marcado.
  // O `eq('status','...')` garante exclusão mútua entre instâncias.
  const { data: claimed, error: updErr } = await supabase
    .from('webhook_outbox')
    .update({ status: 'enviando' })
    .in('id', ids)
    .in('status', ['pendente', 'falha'])
    .select('*')

  if (updErr) {
    logger.error('Worker: falha no claim do lote', { error: updErr.message })
    return []
  }

  return (claimed ?? []) as unknown as WebhookOutboxRow[]
}

/**
 * Marca a linha como `morto` e registra o motivo. Usado quando reentregar é
 * comprovadamente inútil ou inseguro — não quando a entrega apenas falhou.
 */
async function killRow(
  supabase: SupabaseClient,
  row: WebhookOutboxRow,
  motivo: string,
  errorMsg: string,
  httpStatus: number | null,
): Promise<void> {
  await supabase
    .from('webhook_outbox')
    .update({
      status: 'morto',
      attempts: row.attempts + 1,
      http_status: httpStatus,
      last_error: errorMsg,
    })
    .eq('id', row.id)

  logger.error('Worker: evento morto', {
    event_id: row.event_id,
    evento: row.event,
    tentativas: row.attempts + 1,
    motivo,
    error: errorMsg,
  })
}

/**
 * Tenta entregar uma linha. Atualiza o registro com o resultado.
 * Devolve a categoria final do item para fins de telemetria.
 */
async function deliverOne(
  supabase: SupabaseClient,
  row: WebhookOutboxRow,
  credentials: WebhookOutboundCredentials,
): Promise<'enviado' | 'falha' | 'morto'> {
  // O destino é revalidado no envio, não só na gravação: `destino_url` é
  // congelado na linha quando o evento é enfileirado, então o outbox tem
  // linhas anteriores a esta regra. Reentregar não torna o destino seguro —
  // por isso morre aqui em vez de entrar no backoff.
  const destino = validateWebhookUrl(row.destination_url)
  if (!destino.ok) {
    await killRow(
      supabase,
      row,
      'destino recusado pela validação de URL',
      `Destino inválido: ${destino.motivo}`,
      null,
    )
    return 'morto'
  }

  // Serializado UMA vez: é esta string que é assinada e é esta que vai no
  // `fetch`. Assinar um objeto e serializar outro é o erro clássico do
  // mecanismo — o receptor recusa tudo e ninguém entende por quê.
  const body = JSON.stringify({
    evento: row.event,
    event_id: row.event_id,
    timestamp: new Date().toISOString(),
    // Versão do contrato do envelope. 1.1: chaves padronizadas
    // (pedidoId/clienteId em todos os eventos) + bloco `data.loja`.
    schema_version: '1.1',
    data: row.payload,
  })
  const assinatura = await buildSignatureHeader(credentials.signingSecret, body)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

  let httpStatus: number | null = null
  let errorMsg: string | null = null

  try {
    const response = await fetch(destino.url, {
      method: 'POST',
      signal: controller.signal,
      // Sem isto, a validação acima é decorativa: o `fetch` segue 3xx por
      // padrão e leva o `Authorization` e o dado do cliente para o host do
      // `Location`, que ninguém validou.
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': row.event_id,
        // Autentica o canal.
        Authorization: `Bearer ${credentials.token}`,
        // Autentica a mensagem: integridade do corpo + frescor. Camadas
        // distintas, ambas necessárias (ver `signature.ts`).
        [SIGNATURE_HEADER]: assinatura,
      },
      body,
    })
    httpStatus = response.status
    if (response.status >= 300 && response.status < 400) {
      // Redirecionamento recusado. O `Location` entra no erro porque é o que o
      // operador precisa para entender o destino real — truncado, é dado
      // externo.
      const location = (response.headers.get('location') ?? '').slice(0, 200)
      errorMsg = `HTTP ${response.status}: redirecionamento recusado (Location: ${location || 'ausente'})`
    } else if (!response.ok) {
      // Lê corpo de erro mas trunca para não inflar o banco
      const text = await response.text().catch(() => '')
      errorMsg = `HTTP ${response.status}: ${text.slice(0, 500)}`
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err)
  } finally {
    clearTimeout(timeout)
  }

  if (!errorMsg) {
    await supabase
      .from('webhook_outbox')
      .update({
        status: 'enviado',
        sent_at: new Date().toISOString(),
        http_status: httpStatus,
        last_error: null,
      })
      .eq('id', row.id)
    return 'enviado'
  }

  const nextAttempt = row.attempts + 1
  // 4xx é erro permanente (rota inexistente, payload rejeitado): retry nunca
  // resolve — marca `morto` direto. Exceções retentáveis:
  //  - 408 (timeout do servidor) e 429 (rate limit);
  //  - **401/403**: credencial errada é o erro mais recuperável que existe —
  //    corrige-se o token e o evento reentrega. Matar na primeira tentativa
  //    perdeu um `pedido.criado` de verdade e contradiz o "zero perda" de
  //    `dispatch.ts`. Passa a morrer só por esgotamento de tentativas.
  // 3xx (redirect recusado), 5xx, timeout e rede seguem o backoff.
  const isPermanentError =
    httpStatus !== null &&
    httpStatus >= 400 &&
    httpStatus < 500 &&
    httpStatus !== 401 &&
    httpStatus !== 403 &&
    httpStatus !== 408 &&
    httpStatus !== 429

  if (isPermanentError || nextAttempt >= row.max_attempts) {
    await killRow(
      supabase,
      row,
      isPermanentError ? 'erro permanente (4xx)' : 'tentativas esgotadas',
      errorMsg,
      httpStatus,
    )
    return 'morto'
  }

  const delaySec = backoffSeconds(nextAttempt)
  const next = new Date(Date.now() + delaySec * 1000).toISOString()
  await supabase
    .from('webhook_outbox')
    .update({
      status: 'falha',
      attempts: nextAttempt,
      next_retry_at: next,
      http_status: httpStatus,
      last_error: errorMsg,
    })
    .eq('id', row.id)

  logger.warn('Worker: falha temporária, retry agendado', {
    event_id: row.event_id,
    evento: row.event,
    tentativas: nextAttempt,
    proxima_tentativa_em: next,
    error: errorMsg,
  })
  return 'falha'
}

/**
 * Processa um lote do outbox. Idempotente: pode ser chamado em paralelo
 * graças ao claim atômico (`status='enviando'`).
 */
export async function processWebhookOutbox(
  supabase: SupabaseClient,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<WorkerRunResult> {
  // Webhook é opt-in — só é obrigatório ter credencial quando existe de fato
  // algum evento esperando para sair. Fila vazia (loja que nunca configurou
  // notificação externa, ou já drenou tudo) não é motivo de erro nenhum: sai
  // silencioso, sem sequer consultar o Vault.
  if (!(await hasPendingOutbox(supabase))) {
    return { picked: 0, enviados: 0, falhas: 0, mortos: 0 }
  }

  // As credenciais vêm do Vault, pela mesma conexão que o worker já usa —
  // não são mais passadas de mão em mão desde a rota/task/consumer. Fonte
  // única, e `finalizeCheckout`/`toolContext` deixaram de carregar segredo
  // que não é assunto deles.
  const credentials = await getWebhookCredentials(supabase)

  // Falha fechado: sem credencial, o POST saía mesmo assim — com nome,
  // telefone, endereço e itens do cliente, e sem `Authorization`. Ausência de
  // segredo tem de RECUSAR — mas só quando há de fato evento(s) esperando
  // (ver `hasPendingOutbox` acima), senão a loja que nunca precisou desse
  // canal via ERROR a cada minuto para sempre, sem nenhum evento para enviar.
  //
  // A recusa é aqui, antes do claim, e não na entrega: reprovar linha a linha
  // gastaria uma tentativa de cada evento por rodada e mataria a fila inteira
  // por esgotamento enquanto o segredo estiver faltando. Nada é reservado,
  // nada é perdido — os eventos esperam a configuração voltar.
  if (!credentials.token) {
    logger.error('Worker: recusado — token do webhook ausente no Vault (Configurações → Webhooks), ha evento(s) pendente(s) aguardando a credencial')
    return { picked: 0, enviados: 0, falhas: 0, mortos: 0, recusado: 'sem_token' }
  }
  if (!credentials.signingSecret) {
    logger.error('Worker: recusado — chave de assinatura do webhook ausente no Vault (Configurações → Webhooks), ha evento(s) pendente(s) aguardando a credencial')
    return { picked: 0, enviados: 0, falhas: 0, mortos: 0, recusado: 'sem_segredo_de_assinatura' }
  }

  const claimed = await claimBatch(supabase, batchSize)
  if (claimed.length === 0) {
    return { picked: 0, enviados: 0, falhas: 0, mortos: 0 }
  }

  let enviados = 0
  let falhas = 0
  let mortos = 0

  // Sequencial por enquanto (KISS). Quando o volume justificar, podemos
  // paralelizar com `Promise.allSettled` em chunks de 5.
  for (const row of claimed) {
    const outcome = await deliverOne(supabase, row, credentials)
    if (outcome === 'enviado') enviados++
    else if (outcome === 'falha') falhas++
    else mortos++
  }

  logger.info('Worker: lote processado', {
    picked: claimed.length,
    enviados,
    falhas,
    mortos,
  })
  return { picked: claimed.length, enviados, falhas, mortos }
}

/**
 * Dias que um evento **já entregue** fica no outbox antes de ser podado.
 * Janela de auditoria: tempo de sobra para investigar uma reclamação de
 * "não recebi o pedido" sem deixar a tabela crescer para sempre (§8.16,
 * defeito 7 — 277 linhas sem nenhuma poda).
 */
const RETENTION_DAYS = 30

/**
 * Remove os `enviado` mais velhos que a janela de retenção.
 *
 * Só `enviado`: `morto` é a fila de dead-letter que o admin enxerga (§8.16,
 * defeito 6) e podá-la seria apagar justamente a evidência de perda. `falha`
 * ainda vai reentregar.
 *
 * O `DELETE` tem `WHERE` em status **e** em data — `pg-safeupdate` recusaria
 * sem ele, e é a proteção que impede um filtro mal montado de esvaziar a
 * tabela (§5, armadilha 2).
 */
export async function pruneWebhookOutbox(
  supabase: SupabaseClient,
  retentionDays: number = RETENTION_DAYS,
): Promise<{ removidos: number }> {
  const limite = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('webhook_outbox')
    .delete()
    .eq('status', 'enviado')
    .lt('sent_at', limite)
    .select('id')

  if (error) {
    logger.error('Worker: falha ao podar o outbox', { error: error.message })
    return { removidos: 0 }
  }

  const removidos = data?.length ?? 0
  if (removidos > 0) {
    logger.info('Worker: outbox podado', { removidos, retentionDays })
  }
  return { removidos }
}

/**
 * Drena o outbox até esvaziar a fila elegível: repete lotes enquanto o lote
 * anterior veio cheio (sinal de que ainda havia pendências). Garante que um
 * evento recém-inserido seja entregue mesmo com backlog maior que um lote na
 * frente (FIFO por `proxima_tentativa_em`). Termina sempre: falhas ganham
 * `proxima_tentativa_em` no futuro (backoff) e saem da janela de claim.
 */
export async function drainWebhookOutbox(
  supabase: SupabaseClient,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<WorkerRunResult> {
  const total: WorkerRunResult = { picked: 0, enviados: 0, falhas: 0, mortos: 0 }
  let batch: WorkerRunResult
  do {
    batch = await processWebhookOutbox(supabase, batchSize)
    total.picked += batch.picked
    total.enviados += batch.enviados
    total.falhas += batch.falhas
    total.mortos += batch.mortos
    if (batch.recusado) total.recusado = batch.recusado
  } while (batch.picked === batchSize)
  return total
}

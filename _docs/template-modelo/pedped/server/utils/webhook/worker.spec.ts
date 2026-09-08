import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WebhookOutboxRow } from '#shared/types/webhook'
import { processWebhookOutbox } from './worker'
import { invalidateWebhookCredentialsCache } from './credentials'

/**
 * Os quatro P0 de segurança do worker de webhook (auditoria de 02/08/2026).
 *
 * Todos foram defeitos reais em produção, não hipóteses: o `pedido.criado`
 * perdido para um `403` do destino abandonado é o caso 4, e o destino de
 * terceiro que recebeu dado de cliente por meses é o caso 2.
 *
 * A ordem importa e está aqui de propósito: validar a URL (2) sem recusar
 * redirecionamento (3) não vale nada, porque um `302` do destino leva o
 * `Authorization` e o payload para um host que ninguém validou.
 */

const TOKEN = 'token-de-saida'
const SEGREDO = 'segredo-de-assinatura'
const CREDENCIAIS = { token: TOKEN, signingSecret: SEGREDO }

function makeRow(overrides: Partial<WebhookOutboxRow> = {}): WebhookOutboxRow {
  return {
    id: 'row-1',
    event_id: 'evt-1',
    evento: 'pedido.criado',
    payload: { pedidoId: 'ped-1' },
    destino_url: 'https://destino.exemplo.com/webhook',
    status: 'pendente',
    tentativas: 0,
    max_tentativas: 5,
    proxima_tentativa_em: new Date().toISOString(),
    ultimo_erro: null,
    http_status: null,
    criado_em: new Date().toISOString(),
    enviado_em: null,
    ...overrides,
  }
}

interface UpdateRegistrado {
  id: string
  payload: Record<string, unknown>
}

/**
 * Supabase de mentira com a forma exata das duas cadeias que o worker usa:
 * o claim (`update().in().in().select()`) e a baixa de cada linha
 * (`update().eq()`).
 */
function buildSupabase(
  rows: WebhookOutboxRow[],
  credenciais: { token: string, signingSecret: string } = CREDENCIAIS,
) {
  const updates: UpdateRegistrado[] = []
  const claimTentado = vi.fn()

  // Os segredos vêm do Vault por RPC (migration 103), não mais de variável de
  // ambiente — é a mesma conexão que o worker já usa para o outbox.
  const rpc = async (_fn: string, args: { p_tipo: string }) => ({
    data: args.p_tipo === 'token' ? credenciais.token : credenciais.signingSecret,
    error: null,
  })

  const from = (): unknown => ({
    select: () => ({
      in: () => ({
        lte: () => ({
          order: () => ({
            limit: async () => {
              claimTentado()
              return { data: rows.map((r) => ({ id: r.id })), error: null }
            },
          }),
        }),
      }),
    }),
    update: (payload: Record<string, unknown>) => ({
      // Claim do lote.
      in: () => ({ in: () => ({ select: async () => ({ data: rows, error: null }) }) }),
      // Baixa de uma linha.
      eq: async (_coluna: string, id: string) => {
        updates.push({ id, payload })
        return { error: null }
      },
    }),
  })

  return { supabase: { from, rpc } as unknown as SupabaseClient, updates, claimTentado }
}

/** Resposta de `fetch` com o mínimo que o worker consome. */
function respond(status: number, headers: Record<string, string> = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (nome: string) => headers[nome.toLowerCase()] ?? null },
    text: async () => 'corpo',
  } as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async () => respond(200))
  vi.stubGlobal('fetch', fetchMock)
  // O cache de credenciais é de módulo (TTL de 60s): sem limpar, o primeiro
  // caso fixaria os segredos para todos os outros e os casos de recusa
  // passariam por acidente.
  invalidateWebhookCredentialsCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('P0 #1 — sem token de saída, o worker recusa em vez de enviar sem credencial', () => {
  it('não faz nenhum POST quando o token está ausente', async () => {
    const { supabase } = buildSupabase([makeRow()], { token: '', signingSecret: SEGREDO })

    const result = await processWebhookOutbox(supabase)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.recusado).toBe('sem_token')
  })

  it('não reserva nem gasta tentativa de nenhum evento — a fila espera a configuração voltar', async () => {
    const { supabase, updates, claimTentado } = buildSupabase([makeRow()], { token: '', signingSecret: SEGREDO })

    await processWebhookOutbox(supabase)

    expect(claimTentado).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('envia SEMPRE com Authorization quando o token existe', async () => {
    const { supabase } = buildSupabase([makeRow()])

    await processWebhookOutbox(supabase)

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })
})

describe('P1 #5 — assinatura HMAC acompanha todo envio', () => {
  it('recusa a rodada quando o segredo de assinatura falta — mesma regra do token', async () => {
    const { supabase, updates, claimTentado } = buildSupabase([makeRow()], { token: TOKEN, signingSecret: '' })

    const result = await processWebhookOutbox(supabase)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(claimTentado).not.toHaveBeenCalled()
    expect(updates).toEqual([])
    expect(result.recusado).toBe('sem_segredo_de_assinatura')
  })

  it('manda o header X-Pedped-Signature junto do Bearer — camadas distintas, as duas presentes', async () => {
    const { supabase } = buildSupabase([makeRow()])

    await processWebhookOutbox(supabase)

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`)
    expect(headers['X-Pedped-Signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
  })

  it('assina EXATAMENTE o corpo que foi enviado', async () => {
    const { supabase } = buildSupabase([makeRow()])

    await processWebhookOutbox(supabase)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    const corpoEnviado = init.body as string
    const { t, v1 } = /^t=(?<t>\d+),v1=(?<v1>[0-9a-f]{64})$/.exec(headers['X-Pedped-Signature'] ?? '')?.groups ?? {}

    // Refaz a conta como o receptor faria, com implementação independente e
    // sobre os bytes que realmente saíram — é o único jeito de provar que não
    // assinamos um objeto e enviamos outro.
    const esperado = createHmac('sha256', SEGREDO).update(`${t}.${corpoEnviado}`).digest('hex')
    expect(v1).toBe(esperado)
  })

  it('o corpo assinado é o envelope real do evento', async () => {
    const { supabase } = buildSupabase([makeRow()])

    await processWebhookOutbox(supabase)

    const corpo = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)
    expect(corpo).toMatchObject({
      evento: 'pedido.criado',
      event_id: 'evt-1',
      schema_version: '1.1',
      data: { pedidoId: 'ped-1' },
    })
  })
})

describe('P0 #2 — destino é validado no envio, não só na gravação', () => {
  it.each([
    ['http, sem TLS', 'http://destino.exemplo.com/webhook'],
    ['loopback', 'https://127.0.0.1:8080/webhook'],
    ['metadados de nuvem', 'https://169.254.169.254/latest/meta-data'],
    ['rede privada', 'https://192.168.0.10/webhook'],
    ['loopback IPv6', 'https://[::1]/webhook'],
    ['malformado', 'nao-e-url'],
  ])('recusa %s sem sequer abrir a conexão', async (_caso, destino) => {
    const { supabase, updates } = buildSupabase([makeRow({ destino_url: destino })])

    const result = await processWebhookOutbox(supabase)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.mortos).toBe(1)
    // Morre em vez de entrar no backoff: `destino_url` é congelado na linha,
    // então reentregar nunca torna o destino seguro.
    expect(updates.at(-1)?.payload.status).toBe('morto')
    expect(updates.at(-1)?.payload.ultimo_erro).toContain('Destino inválido')
  })

  it('entrega normalmente em destino público sob HTTPS', async () => {
    const { supabase, updates } = buildSupabase([makeRow()])

    const result = await processWebhookOutbox(supabase)

    expect(result.enviados).toBe(1)
    expect(updates.at(-1)?.payload.status).toBe('enviado')
  })
})

describe('P0 #3 — redirecionamento não pode levar o Authorization para outro host', () => {
  it('pede redirect manual ao fetch', async () => {
    const { supabase } = buildSupabase([makeRow()])

    await processWebhookOutbox(supabase)

    expect(fetchMock.mock.calls[0]?.[1]?.redirect).toBe('manual')
  })

  it.each([301, 302, 307, 308])('trata %i como falha, nunca como entrega', async (status) => {
    fetchMock.mockResolvedValue(respond(status, { location: 'https://10.0.0.1/interno' }))
    const { supabase, updates } = buildSupabase([makeRow()])

    const result = await processWebhookOutbox(supabase)

    expect(result.enviados).toBe(0)
    expect(updates.at(-1)?.payload.status).toBe('falha')
    expect(updates.at(-1)?.payload.ultimo_erro).toContain('redirecionamento recusado')
  })

  it('registra o destino do redirecionamento para o operador diagnosticar', async () => {
    fetchMock.mockResolvedValue(respond(302, { location: 'https://outro.exemplo.com/x' }))
    const { supabase, updates } = buildSupabase([makeRow()])

    await processWebhookOutbox(supabase)

    expect(updates.at(-1)?.payload.ultimo_erro).toContain('https://outro.exemplo.com/x')
  })
})

describe('P0 #4 — 401/403 é credencial corrigível, não perda de evento', () => {
  it.each([401, 403])('agenda retry para %i em vez de matar o evento', async (status) => {
    fetchMock.mockResolvedValue(respond(status))
    const { supabase, updates } = buildSupabase([makeRow({ tentativas: 0 })])

    const result = await processWebhookOutbox(supabase)

    expect(result.mortos).toBe(0)
    expect(result.falhas).toBe(1)
    expect(updates.at(-1)?.payload.status).toBe('falha')
    expect(updates.at(-1)?.payload.proxima_tentativa_em).toBeDefined()
  })

  it('401 morre só por esgotamento de tentativas', async () => {
    fetchMock.mockResolvedValue(respond(401))
    const { supabase, updates } = buildSupabase([makeRow({ tentativas: 4, max_tentativas: 5 })])

    const result = await processWebhookOutbox(supabase)

    expect(result.mortos).toBe(1)
    expect(updates.at(-1)?.payload.status).toBe('morto')
  })

  it.each([400, 404, 422])('mantém %i como permanente — retry não conserta payload nem rota', async (status) => {
    fetchMock.mockResolvedValue(respond(status))
    const { supabase, updates } = buildSupabase([makeRow()])

    const result = await processWebhookOutbox(supabase)

    expect(result.mortos).toBe(1)
    expect(updates.at(-1)?.payload.status).toBe('morto')
  })

  it.each([408, 429, 500, 503])('mantém %i retentável', async (status) => {
    fetchMock.mockResolvedValue(respond(status))
    const { supabase, updates } = buildSupabase([makeRow()])

    const result = await processWebhookOutbox(supabase)

    expect(result.falhas).toBe(1)
    expect(updates.at(-1)?.payload.status).toBe('falha')
  })
})

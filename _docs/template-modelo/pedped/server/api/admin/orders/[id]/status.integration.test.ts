/**
 * TESTE DE INTEGRAÇÃO - Atualização de Status com Webhook
 * 
 * Este teste valida o FLUXO COMPLETO:
 * 1. Conecta ao Supabase REAL
 * 2. Busca um pedido REAL
 * 3. Atualiza o status
 * 4. Verifica se o webhook foi disparado
 * 
 * Execute: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

/**
 * **Opt-in, e por um motivo:** este suite ALTERA o status de um pedido real e
 * faz POST no `webhook_url` de produção. Rodá-lo por padrão em `test:integration`
 * significaria mexer em dado de cliente a cada execução do portão.
 *
 * Ele também lia `SUPABASE_URL`/`WEBHOOK_TOKEN`, nomes que não existem neste
 * projeto (são `NUXT_PUBLIC_SUPABASE_URL`/`NUXT_WEBHOOK_TOKEN`) — por isso
 * falhava no `beforeAll` em toda execução, sem nunca ter rodado de verdade. Os
 * nomes estão corrigidos abaixo; o portão do skip é o que impede o efeito
 * colateral.
 *
 * Para rodar de propósito:
 *   RUN_DESTRUCTIVE_INTEGRATION=1 pnpm test:integration
 */
const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NUXT_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_KEY ?? ''
const WEBHOOK_TOKEN = process.env.NUXT_WEBHOOK_TOKEN ?? process.env.WEBHOOK_TOKEN ?? ''

const enabled = process.env.RUN_DESTRUCTIVE_INTEGRATION === '1'
  && SUPABASE_URL !== ''
  && SUPABASE_KEY !== ''
  && WEBHOOK_TOKEN !== ''

describe.skipIf(!enabled)('Integration: Status Update + Webhook', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  let testPedidoId: string
  let originalStatus: string

  beforeAll(async () => {
    // Valida variáveis de ambiente
    expect(SUPABASE_URL).toBeDefined()
    expect(SUPABASE_KEY).toBeDefined()
    expect(WEBHOOK_TOKEN).toBeDefined()

    supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Busca um pedido real para testar
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, status')
      .limit(1)
      .single()

    if (!pedidos) {
      throw new Error('Nenhum pedido encontrado no banco. Crie um pedido primeiro.')
    }

    testPedidoId = pedidos.id
    originalStatus = pedidos.status
  })

  it('deve ter webhook_url configurado no banco', async () => {
    const { data: loja } = await supabase
      .from('loja')
      .select('webhook_url')
      .limit(1)
      .single()

    expect(loja).toBeDefined()
    expect(loja?.webhook_url).toBeDefined()
    expect(loja?.webhook_url).not.toBe('')
    expect(loja?.webhook_url).toMatch(/^https:\/\//)
  })

  it('NÃO deve ter webhook_secret no banco (enterprise-grade)', async () => {
    const { data: loja } = await supabase
      .from('loja')
      .select('*')
      .limit(1)
      .single()

    expect(loja).toBeDefined()
    
    // A coluna webhook_secret NÃO DEVE EXISTIR
    expect(loja).not.toHaveProperty('webhook_secret')
  })

  it('deve ter WEBHOOK_TOKEN no .env', () => {
    expect(WEBHOOK_TOKEN).toBeDefined()
    expect(WEBHOOK_TOKEN.length).toBeGreaterThan(10)
  })

  it('deve atualizar status do pedido no banco', async () => {
    const novoStatus = originalStatus === 'pendente' ? 'confirmado' : 'pendente'

    const { data, error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus })
      .eq('id', testPedidoId)
      .select('id, status')
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data?.status).toBe(novoStatus)

    // Restaura status original
    await supabase
      .from('pedidos')
      .update({ status: originalStatus })
      .eq('id', testPedidoId)
  })

  it('deve enviar webhook com token correto', async () => {
    const { data: loja } = await supabase
      .from('loja')
      .select('webhook_url')
      .limit(1)
      .single()

    expect(loja?.webhook_url).toBeDefined()

    // Tenta enviar webhook de teste
    const testPayload = {
      evento: 'test_integration',
      timestamp: new Date().toISOString(),
      pedidoId: testPedidoId
    }

    const response = await fetch(loja!.webhook_url!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_TOKEN}`
      },
      body: JSON.stringify(testPayload)
    })

    // N8N deve aceitar o webhook
    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
  })
})

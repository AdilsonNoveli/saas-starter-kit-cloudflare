import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { updateCheckout } from './updateCheckout'

/**
 * Cobertura de entrega conferida ao GRAVAR o endereço novo, não só no
 * fechamento.
 *
 * Regressão de 02/08/2026: o agente anunciou "sem taxa de entrega" para um
 * endereço a 16 km com raio de 15 km, e o cliente só descobriu ao confirmar o
 * pedido — a única barreira dura estava em `finalizeCheckout`, e a checagem do
 * endereço novo existia apenas como instrução de prompt.
 *
 * Metade destes casos é sobre **não** bloquear: a validação é permissiva nas
 * ausências (sem coordenadas, sem origem da loja, sem raio), igual ao resto do
 * sistema. Endereço a conferir é caso previsto do fluxo, e transformá-lo em
 * erro quebraria pedido que hoje fecha.
 */

// `getCartState` é a montagem do carrinho no fim do fluxo — tem specs próprios e
// nada tem a ver com cobertura de entrega. `requireActiveSession` fica REAL: é
// dele que sai o `delivery_mode` já gravado na sessão, que estes casos exercitam.
vi.mock('./state', async (importOriginal) => ({
  ...await importOriginal<typeof import('./state')>(),
  getCartState: vi.fn(async () => ({ subtotal: 0 })),
}))

const LOJA = { latitude_origem: -23.834417, longitude_origem: -46.8191093, raio_atendimento_km: 15 }

/**
 * Coordenadas escolhidas pela distância, não copiadas de um endereço real:
 * 0,2° de latitude ≈ 22 km da origem, folgadamente fora do raio de 15 km.
 * (O caso que motivou o teste foi um endereço a 16 km, mas não temos as
 * coordenadas exatas dele — inventá-las e rotular como reais seria fingir
 * evidência.)
 */
const FORA_DO_RAIO = { rua: 'Rua Distante', numero: '1', bairro: 'Centro', latitude: -23.634417, longitude: -46.8191093 }
/** A poucos metros da origem da loja. */
const DENTRO_DO_RAIO = { rua: 'Rua Boa Vista', numero: '1118', bairro: 'Centro', latitude: -23.8345, longitude: -46.8192 }

interface Cenario {
  loja?: typeof LOJA | null
  sessaoDeliveryMode?: string | null
}

function buildSupabase(cenario: Cenario = {}) {
  const enderecoInserido = vi.fn()
  const sessaoAtualizada = vi.fn()

  const from = (tabela: string): unknown => {
    if (tabela === 'sessoes') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'sessao-1',
                cliente_id: 'cliente-1',
                status: 'ativa',
                expira_em: null,
                delivery_mode: cenario.sessaoDeliveryMode ?? null,
              },
            }),
          }),
        }),
        update: (payload: unknown) => ({ eq: async () => { sessaoAtualizada(payload); return { error: null } } }),
      }
    }
    if (tabela === 'loja') {
      return {
        select: () => ({
          limit: () => ({ maybeSingle: async () => ({ data: cenario.loja === undefined ? LOJA : cenario.loja }) }),
        }),
      }
    }
    if (tabela === 'enderecos_cliente') {
      return {
        insert: (payload: unknown) => ({
          select: () => ({ single: async () => { enderecoInserido(payload); return { data: { id: 'endereco-novo' }, error: null } } }),
        }),
      }
    }
    // `getCartState` no fim do fluxo — irrelevante para estes casos.
    return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }
  }

  return { supabase: { from, rpc: async () => ({ data: null, error: null }) } as unknown as SupabaseClient<Database>, enderecoInserido, sessaoAtualizada }
}

describe('updateCheckout — cobertura de entrega no momento de gravar o endereço', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('RECUSA endereço novo fora do raio quando a modalidade é entrega', async () => {
    const { supabase, enderecoInserido } = buildSupabase()

    await expect(updateCheckout(supabase, {
      sessao_id: 'sessao-1',
      delivery_mode: 'entrega',
      endereco: FORA_DO_RAIO,
    })).rejects.toMatchObject({ statusCode: 422 })

    // Falha ANTES de inserir: nada de endereço órfão no cadastro do cliente.
    expect(enderecoInserido).not.toHaveBeenCalled()
  })

  it('a mensagem do 422 traz distância, raio e o que oferecer — é o que o modelo repassa', async () => {
    const { supabase } = buildSupabase()

    await expect(updateCheckout(supabase, {
      sessao_id: 'sessao-1',
      delivery_mode: 'entrega',
      endereco: FORA_DO_RAIO,
    })).rejects.toMatchObject({
      statusMessage: expect.stringContaining('máximo permitido 15 km'),
    })
  })

  it('usa a modalidade JÁ gravada na sessão quando a chamada não a envia', async () => {
    // A tool grava incrementalmente: o `delivery_mode` costuma ter sido
    // definido num turno anterior ao que manda o endereço.
    const { supabase, enderecoInserido } = buildSupabase({ sessaoDeliveryMode: 'entrega' })

    await expect(updateCheckout(supabase, {
      sessao_id: 'sessao-1',
      endereco: FORA_DO_RAIO,
    })).rejects.toMatchObject({ statusCode: 422 })
    expect(enderecoInserido).not.toHaveBeenCalled()
  })

  it('ACEITA endereço novo dentro do raio', async () => {
    const { supabase, enderecoInserido } = buildSupabase()

    await updateCheckout(supabase, { sessao_id: 'sessao-1', delivery_mode: 'entrega', endereco: DENTRO_DO_RAIO })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('ACEITA endereço fora do raio quando a modalidade é RETIRADA', async () => {
    // Retirada não usa o endereço para entregar — bloquear aqui impediria o
    // cliente de ter endereço no cadastro.
    const { supabase, enderecoInserido } = buildSupabase()

    await updateCheckout(supabase, { sessao_id: 'sessao-1', delivery_mode: 'retirada', endereco: FORA_DO_RAIO })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('ACEITA quando a modalidade ainda não foi definida em lugar nenhum', async () => {
    const { supabase, enderecoInserido } = buildSupabase({ sessaoDeliveryMode: null })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', endereco: FORA_DO_RAIO })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('ACEITA endereço sem coordenadas — é o caso "a conferir", que vira pedido pendente', async () => {
    const { supabase, enderecoInserido } = buildSupabase()
    const semCoordenadas = { rua: 'Rua Sem Geo', numero: '1', bairro: 'Centro' }

    await updateCheckout(supabase, { sessao_id: 'sessao-1', delivery_mode: 'entrega', endereco: semCoordenadas })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('ACEITA quando a loja não tem raio configurado', async () => {
    const { supabase, enderecoInserido } = buildSupabase({ loja: { ...LOJA, raio_atendimento_km: null } as unknown as typeof LOJA })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', delivery_mode: 'entrega', endereco: FORA_DO_RAIO })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('ACEITA quando a loja não tem coordenadas de origem', async () => {
    const { supabase, enderecoInserido } = buildSupabase({ loja: { ...LOJA, latitude_origem: null, longitude_origem: null } as unknown as typeof LOJA })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', delivery_mode: 'entrega', endereco: FORA_DO_RAIO })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('não consulta a loja quando não há endereço novo — zero custo no caminho comum', async () => {
    const { supabase, sessaoAtualizada } = buildSupabase()

    await updateCheckout(supabase, { sessao_id: 'sessao-1', payment_method: 'pix' })

    expect(sessaoAtualizada).toHaveBeenCalledWith({ payment_method: 'pix' })
  })
})

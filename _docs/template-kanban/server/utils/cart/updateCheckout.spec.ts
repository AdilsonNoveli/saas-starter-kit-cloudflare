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

// `findOrCreateCustomer` tem specs próprios (normalização/backfill do número) —
// aqui só interessa QUE ele foi chamado e o id que ele devolve.
const findOrCreateCustomer = vi.hoisted(() => vi.fn(async () => ({ id: 'cliente-novo' })))
vi.mock('../customers/findOrCreateCustomer', () => ({ findOrCreateCustomer }))

const LOJA = { origin_latitude: -23.834417, origin_longitude: -46.8191093, service_radius_km: 15 }

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
  /** `null` = sessão anônima da COMPRA EXPRESSA (migration 122). */
  sessaoCustomerId?: string | null
  /** Erro devolvido pelo UPDATE de `sessions` — usado no caso de falha da promoção. */
  erroUpdateSessao?: { message: string } | null
}

function buildSupabase(cenario: Cenario = {}) {
  const enderecoInserido = vi.fn()
  const sessaoAtualizada = vi.fn()
  const enderecoConsultadoPara = vi.fn()

  const from = (tabela: string): unknown => {
    if (tabela === 'sessions') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'sessao-1',
                customer_id: cenario.sessaoCustomerId === undefined ? 'cliente-1' : cenario.sessaoCustomerId,
                status: 'ativa',
                expires_at: null,
                delivery_mode: cenario.sessaoDeliveryMode ?? null,
              },
            }),
          }),
        }),
        update: (payload: unknown) => ({
          eq: async () => {
            sessaoAtualizada(payload)
            return { error: cenario.erroUpdateSessao ?? null }
          },
        }),
      }
    }
    if (tabela === 'store') {
      return {
        select: () => ({
          limit: () => ({ maybeSingle: async () => ({ data: cenario.loja === undefined ? LOJA : cenario.loja }) }),
        }),
      }
    }
    if (tabela === 'customer_addresses') {
      return {
        select: () => ({
          eq: (_c1: string, _v1: unknown) => ({
            eq: (_c2: string, clienteId: unknown) => ({
              maybeSingle: async () => {
                enderecoConsultadoPara(clienteId)
                return { data: { id: 'endereco-salvo' } }
              },
            }),
          }),
        }),
        insert: (payload: unknown) => ({
          select: () => ({ single: async () => { enderecoInserido(payload); return { data: { id: 'endereco-novo' }, error: null } } }),
        }),
      }
    }
    // `getCartState` no fim do fluxo — irrelevante para estes casos.
    return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }
  }

  return {
    supabase: { from, rpc: async () => ({ data: null, error: null }) } as unknown as SupabaseClient<Database>,
    enderecoInserido,
    sessaoAtualizada,
    enderecoConsultadoPara,
  }
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
    const { supabase, enderecoInserido } = buildSupabase({ loja: { ...LOJA, service_radius_km: null } as unknown as typeof LOJA })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', delivery_mode: 'entrega', endereco: FORA_DO_RAIO })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('ACEITA quando a loja não tem coordenadas de origem', async () => {
    const { supabase, enderecoInserido } = buildSupabase({ loja: { ...LOJA, origin_latitude: null, origin_longitude: null } as unknown as typeof LOJA })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', delivery_mode: 'entrega', endereco: FORA_DO_RAIO })

    expect(enderecoInserido).toHaveBeenCalledOnce()
  })

  it('não consulta a loja quando não há endereço novo — zero custo no caminho comum', async () => {
    const { supabase, sessaoAtualizada } = buildSupabase()

    await updateCheckout(supabase, { sessao_id: 'sessao-1', payment_method: 'pix' })

    expect(sessaoAtualizada).toHaveBeenCalledWith({ payment_method: 'pix' })
  })
})

/**
 * Promoção da sessão anônima (COMPRA EXPRESSA, migration 122).
 *
 * O visitante do chat do site navega e monta o carrinho sem informar nada:
 * `sessions.customer_id` fica NULL até `finalizeCheckout` devolver o 422
 * "Sessão sem cliente vinculado", que é o gatilho para o agente pedir o número
 * na conversa e reenviar por aqui. O que estes casos protegem é que o vínculo
 * seja gravado no banco (não só em memória) e que ele NUNCA sobrescreva uma
 * sessão que já tem dono.
 */
describe('updateCheckout — identidade da sessão anônima (COMPRA EXPRESSA)', () => {
  beforeEach(() => {
    findOrCreateCustomer.mockClear()
    findOrCreateCustomer.mockResolvedValue({ id: 'cliente-novo' })
  })

  it('vincula o cliente à sessão quando o telefone chega e a sessão é anônima', async () => {
    const { supabase, sessaoAtualizada } = buildSupabase({ sessaoCustomerId: null })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', whatsapp: '11999998888', payment_method: 'pix' })

    expect(findOrCreateCustomer).toHaveBeenCalledWith(supabase, { whatsapp: '11999998888', isVisitante: true })
    expect(sessaoAtualizada).toHaveBeenCalledWith({ customer_id: 'cliente-novo' })
  })

  it('NÃO sobrescreve o vínculo de uma sessão que já tem cliente', async () => {
    // Um número digitado errado num turno tardio sequestraria o carrinho de
    // outro cadastro — o parâmetro é para identificar quem não tem dono, nunca
    // para trocar de dono.
    const { supabase, sessaoAtualizada } = buildSupabase({ sessaoCustomerId: 'cliente-1' })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', whatsapp: '11999998888', payment_method: 'pix' })

    expect(findOrCreateCustomer).not.toHaveBeenCalled()
    expect(sessaoAtualizada).toHaveBeenCalledTimes(1)
    expect(sessaoAtualizada).toHaveBeenCalledWith({ payment_method: 'pix' })
  })

  it('sem telefone, sessão anônima segue anônima — nenhum cliente é inventado', async () => {
    const { supabase, sessaoAtualizada } = buildSupabase({ sessaoCustomerId: null })

    await updateCheckout(supabase, { sessao_id: 'sessao-1', payment_method: 'pix' })

    expect(findOrCreateCustomer).not.toHaveBeenCalled()
    expect(sessaoAtualizada).toHaveBeenCalledWith({ payment_method: 'pix' })
  })

  it('grava o endereço novo no cliente RECÉM-vinculado, no mesmo turno', async () => {
    // Telefone e endereço costumam chegar juntos no fechamento. Usar o
    // `customer_id` nulo do objeto `sessao` (lido antes da promoção) faria o
    // endereço nascer órfão — ou o 422 "sem cliente vinculado" voltar mesmo
    // depois de o cliente ter informado o número.
    const { supabase, enderecoInserido } = buildSupabase({ sessaoCustomerId: null })

    await updateCheckout(supabase, {
      sessao_id: 'sessao-1',
      whatsapp: '11999998888',
      delivery_mode: 'retirada',
      endereco: DENTRO_DO_RAIO,
    })

    expect(enderecoInserido).toHaveBeenCalledWith(expect.objectContaining({ customer_id: 'cliente-novo' }))
  })

  it('confere a propriedade de address_id contra o cliente recém-vinculado', async () => {
    const { supabase, enderecoConsultadoPara } = buildSupabase({ sessaoCustomerId: null })

    await updateCheckout(supabase, {
      sessao_id: 'sessao-1',
      whatsapp: '11999998888',
      address_id: 'endereco-salvo',
    })

    expect(enderecoConsultadoPara).toHaveBeenCalledWith('cliente-novo')
  })

  it('endereço novo em sessão anônima SEM telefone continua sendo 422 "Sessão sem cliente vinculado"', async () => {
    const { supabase, enderecoInserido } = buildSupabase({ sessaoCustomerId: null })

    await expect(updateCheckout(supabase, { sessao_id: 'sessao-1', endereco: DENTRO_DO_RAIO }))
      .rejects.toMatchObject({ statusCode: 422 })
    expect(enderecoInserido).not.toHaveBeenCalled()
  })

  it('falha ao gravar o vínculo aborta o turno — nunca segue com um cliente só em memória', async () => {
    const { supabase, enderecoInserido } = buildSupabase({
      sessaoCustomerId: null,
      erroUpdateSessao: { message: 'boom' },
    })

    await expect(updateCheckout(supabase, {
      sessao_id: 'sessao-1',
      whatsapp: '11999998888',
      endereco: DENTRO_DO_RAIO,
    })).rejects.toMatchObject({ statusCode: 500 })
    expect(enderecoInserido).not.toHaveBeenCalled()
  })
})

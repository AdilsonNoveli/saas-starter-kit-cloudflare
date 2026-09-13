import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database, Json } from '~/types/database.types'
import { logger } from '~/core/services/logger.service'

/**
 * Criação de pedido da integração inbound via a RPC transacional
 * `create_integration_order` (migration 073).
 *
 * A RPC faz reserva de idempotência + endereço + pedido + itens + conclusão da
 * chave + conversão de sessão numa ÚNICA transação. Isso elimina de raiz os
 * furos do fluxo anterior (endereço órfão, duplicata em crash, envenenamento da
 * chave em falha de validação): ou tudo commita, ou nada. Ver o cabeçalho da
 * migration para o racional completo.
 *
 * Toda a lógica de negócio (validação, promoções, frete, distância) permanece
 * aqui no backend; este helper só empacota os valores já calculados.
 */

import type { IntegrationOrderItem } from '~~/shared/types/integration'

/** Item de encomenda a reservar atomicamente junto com o pedido (RPC). */
export interface IntegrationPreorderItem {
  readonly product_id: string
  readonly delivery_date: string
  readonly quantity: number
}

/** Endereço inline — inserido pela RPC na mesma transação do pedido. */
export interface InlineAddress {
  readonly rua: string
  readonly numero: string
  readonly bairro: string
  readonly complemento?: string | null
  readonly cidade?: string | null
  readonly estado?: string | null
  readonly cep?: string | null
  readonly latitude?: number | null
  readonly longitude?: number | null
}

export interface CreateIntegrationOrderInput {
  /** Vazio desativa a proteção de idempotência (aceita sem reservar chave). */
  readonly idempotencyKey: string
  readonly clienteId: string
  readonly tipoEntrega: Database['public']['Enums']['delivery_mode_enum']
  readonly formaPagamento: Database['public']['Enums']['payment_method_enum']
  readonly status: string
  readonly itens: readonly IntegrationOrderItem[]
  /** Endereço salvo já validado; mutuamente exclusivo com `enderecoNovo`. */
  readonly enderecoId?: string | null
  /** Endereço novo a inserir atomicamente; mutuamente exclusivo com `enderecoId`. */
  readonly enderecoNovo?: InlineAddress | null
  /** Presente no checkout de carrinho: a RPC converte a sessão e limpa o carrinho. */
  readonly sessaoId?: string | null
  readonly observacoes?: string | null
  readonly notaOperacional?: string | null
  readonly descontoAplicado?: number
  readonly valorEntrega?: number
  readonly freteGratis?: boolean
  /** Encomendas a reservar na MESMA transação do pedido (anti-overbooking). */
  readonly preorderItems?: readonly IntegrationPreorderItem[]
}

interface OrderPersisted {
  readonly outcome: 'created' | 'replay'
  readonly pedidoId: string
  readonly subtotal: number
  readonly total: number
}

interface OrderInFlight {
  readonly outcome: 'in_flight'
}

export type CreateIntegrationOrderResult = OrderPersisted | OrderInFlight

function extractPedidoId(payload: unknown): string | null {
  const pedidoId = (payload as { pedido_id?: unknown } | null)?.pedido_id
  return typeof pedidoId === 'string' && pedidoId ? pedidoId : null
}

/**
 * Curto-circuito de replay ANTES das validações: retorna o `pedido_id` se a
 * chave já produziu um pedido. Necessário porque o checkout limpa o carrinho ao
 * concluir — sem esta checada, uma revalidação veria "carrinho vazio" e negaria
 * o replay. A RPC continua sendo a autoridade sobre reserva/criação; isto é só a
 * leitura rápida para o caminho já-concluído.
 */
export async function findCompletedIntegrationOrder(
  supabase: SupabaseClient<Database>,
  idempotencyKey: string,
): Promise<string | null> {
  if (!idempotencyKey) return null
  const { data } = await supabase
    .from('integration_idempotency')
    .select('payload')
    .eq('key', idempotencyKey)
    .maybeSingle()
  return extractPedidoId(data?.payload)
}

function parseResult(data: Json): CreateIntegrationOrderResult {
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  if (obj.outcome === 'in_flight') return { outcome: 'in_flight' }
  return {
    outcome: obj.outcome === 'replay' ? 'replay' : 'created',
    pedidoId: typeof obj.pedido_id === 'string' ? obj.pedido_id : '',
    subtotal: Number(obj.subtotal ?? 0),
    total: Number(obj.total ?? 0),
  }
}

export async function createIntegrationOrder(
  supabase: SupabaseClient<Database>,
  input: CreateIntegrationOrderInput,
): Promise<CreateIntegrationOrderResult> {
  const { data, error } = await supabase.rpc('create_integration_order', {
    p_idempotency_key: input.idempotencyKey,
    p_customer_id: input.clienteId,
    p_delivery_mode: input.tipoEntrega,
    p_payment_method: input.formaPagamento,
    p_status: input.status,
    p_items: input.itens as unknown as Json,
    p_address_id: input.enderecoId ?? undefined,
    p_new_address: (input.enderecoNovo ?? undefined) as Json | undefined,
    p_session_id: input.sessaoId ?? undefined,
    p_notes: input.observacoes ?? undefined,
    p_operational_note: input.notaOperacional ?? undefined,
    p_discount_applied: input.descontoAplicado ?? undefined,
    p_delivery_fee: input.valorEntrega ?? undefined,
    p_free_shipping: input.freteGratis ?? undefined,
    p_preorder_items: (input.preorderItems ?? undefined) as Json | undefined,
  })

  if (error) {
    // Encomenda rejeitada pela reserva atômica (capacidade/data/quantidade): a
    // transação inteira reverteu, então a chave de idempotência segue livre.
    const detail = (error as { details?: string }).details || null

    if (error.message.includes('PREORDER_CAPACITY_EXCEEDED')) {
      throw createError({
        statusCode: 409,
        statusMessage: detail ? `Capacidade de encomenda esgotada: ${detail}` : 'Capacidade de encomenda esgotada para a data escolhida.',
        data: { code: 'PREORDER_CAPACITY_EXCEEDED', detail },
      })
    }
    if (error.message.includes('PREORDER_INVALID_QUANTITY')) {
      throw createError({
        statusCode: 422,
        statusMessage: detail ? `Quantidade inválida para encomenda: ${detail}` : 'Quantidade solicitada está fora do mínimo/máximo permitido.',
        data: { code: 'PREORDER_INVALID_QUANTITY', detail },
      })
    }
    if (error.message.includes('PREORDER_DATE_UNAVAILABLE')) {
      throw createError({
        statusCode: 422,
        statusMessage: detail ? `Data indisponível para encomenda: ${detail}` : 'Data fora da janela de antecedência ou em dia sem funcionamento.',
        data: { code: 'PREORDER_DATE_UNAVAILABLE', detail },
      })
    }
    if (error.message.includes('PREORDER_INVALID_PRODUCT')) {
      throw createError({
        statusCode: 422,
        statusMessage: detail ? `Produto indisponível para encomenda: ${detail}` : 'Produto não configurado para aceitar encomendas.',
        data: { code: 'PREORDER_INVALID_PRODUCT', detail },
      })
    }
    if (error.message.includes('PREORDER_INVALID_PAYLOAD')) {
      throw createError({
        statusCode: 422,
        statusMessage: detail ? `Payload de encomenda inválido: ${detail}` : 'Formato de data (YYYY-MM-DD) ou quantidade inválido.',
        data: { code: 'PREORDER_INVALID_PAYLOAD', detail },
      })
    }
    if (error.message.includes('PREORDER_')) {
      throw createError({
        statusCode: 422,
        statusMessage: detail ? `Encomenda inválida: ${detail}` : `Encomenda inválida: ${error.message}`,
        data: { code: 'PREORDER_ERROR', detail },
      })
    }
    // Gestão de estoque (migration 111): a reserva/consumo de estoque roda na
    // MESMA transação da criação do pedido — se rejeitada, a transação
    // inteira reverteu (pedido não foi criado, chave de idempotência livre).
    // Erro de NEGÓCIO (REGRA 4 do agente já sabe explicar — "esse item não
    // está mais disponível na quantidade pedida").
    if (error.message.includes('ESTOQUE_INSUFICIENTE')) {
      throw createError({
        statusCode: 409,
        statusMessage: detail ? `Estoque insuficiente: ${detail}` : 'Estoque insuficiente para a quantidade pedida.',
        data: { code: 'ESTOQUE_INSUFICIENTE', detail },
      })
    }
    if (error.message.includes('PRODUCAO_DIARIA_ESGOTADA')) {
      throw createError({
        statusCode: 409,
        statusMessage: detail ? `Produção do dia esgotada: ${detail}` : 'Capacidade de produção de hoje esgotada para este produto.',
        data: { code: 'PRODUCAO_DIARIA_ESGOTADA', detail },
      })
    }
    if (error.message.includes('INSUMO_INSUFICIENTE')) {
      throw createError({
        statusCode: 409,
        statusMessage: detail ? `Insumo insuficiente: ${detail}` : 'Falta insumo suficiente para preparar este pedido.',
        data: { code: 'INSUMO_INSUFICIENTE', detail },
      })
    }
    // Demais erros: a validação de negócio roda antes, então é inesperado
    // (constraint/infra) e não deve ser mascarado.
    logger.error('Falha na RPC create_integration_order', {
      key: input.idempotencyKey,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao registrar o pedido.' })
  }

  return parseResult(data)
}

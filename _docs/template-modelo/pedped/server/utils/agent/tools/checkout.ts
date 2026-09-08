/**
 * `AtualizarPedido`, `FinalizarPedido` e `ConsultarDetalhePedido` — porte
 * literal dos nodes n8n `httpRequestTool` de mesmo nome. Chamam
 * `updateCheckout`/`finalizeCheckout`/`getOrderDetail` diretamente em vez de
 * `PATCH /cart`, `POST /cart/checkout` e `GET /orders/[id]` (seção 6).
 */
import { z } from 'zod'
import { updateCheckout } from '../../cart/updateCheckout'
import { finalizeCheckout } from '../../integration/finalizeCheckout'
import { getOrderDetail } from '../../orders/getOrderDetail'
import type { AgentToolDefinition } from '../toolContext'

// ─── AtualizarPedido ──────────────────────────────────────────────────────

const atualizarPedidoSchema = z.object({
  delivery_mode: z.enum(['entrega', 'retirada']).optional()
    .describe('entrega ou retirada (vazio se nao for definir agora)'),
  payment_method: z.enum(['pix', 'dinheiro', 'cartao']).optional()
    .describe('pix, dinheiro ou cartao (vazio se nao for definir agora)'),
  address_id: z.string().uuid().optional()
    .describe('UUID de endereco ja salvo do cliente, do briefing (vazio se endereco novo ou nao for definir agora)'),
  rua: z.string().optional().describe('rua do endereco novo, retornada por ConsultarEnderecoEntrega (vazio se nao for salvar endereco novo)'),
  numero: z.string().optional().describe('numero da casa informado pelo cliente'),
  bairro: z.string().optional().describe('bairro retornado pelo geocode'),
  cidade: z.string().optional().describe('cidade retornada pelo geocode'),
  estado: z.string().optional().describe('UF com 2 letras'),
  cep: z.string().optional().describe('CEP retornado pelo geocode'),
  latitude: z.number().optional().describe('latitude retornada pelo geocode'),
  longitude: z.number().optional().describe('longitude retornada pelo geocode'),
}).superRefine((val, ctx) => {
  if (val.address_id && val.rua) {
    ctx.addIssue({ code: 'custom', message: 'address_id e rua/endereco novo sao mutuamente exclusivos — envie so um dos dois.' })
  }
  if (val.rua && (!val.numero || !val.bairro)) {
    ctx.addIssue({ code: 'custom', message: 'endereco novo exige rua, numero e bairro juntos (valores retornados por ConsultarEnderecoEntrega).' })
  }
})

export const atualizarPedidoTool: AgentToolDefinition<z.infer<typeof atualizarPedidoSchema>> = {
  name: 'AtualizarPedido',
  description: 'Grava o estado de checkout do pedido (modalidade de entrega, forma de pagamento e/ou endereco) assim que o cliente informar CADA UM — nao espere ter tudo para chamar, grave incrementalmente. PARAMETROS (todos opcionais, envie so o que foi informado agora): delivery_mode (\'entrega\' ou \'retirada\'), payment_method (\'pix\', \'dinheiro\' ou \'cartao\'), address_id (UUID de um endereco JA salvo do cliente, do briefing) OU rua/numero/bairro/cidade/estado/cep/latitude/longitude (endereco NOVO — chame ConsultarEnderecoEntrega antes e use os valores retornados; nunca invente coordenadas). address_id e rua/etc sao mutuamente exclusivos. RETORNA o carrinho completo com o checkout atualizado. Use antes de FinalizarPedido, que nao aceita mais estes dados. ERRO 422 \'Endereco fora do raio de entrega\': esta tool CONFERE a cobertura ao gravar endereco novo para entrega — o endereco NAO foi salvo. Nao insista nem tente de novo com o mesmo endereco: informe a distancia e o limite ao cliente e ofereca RETIRADA ou outro endereco.',
  schema: atualizarPedidoSchema,
  async run(args, ctx) {
    const endereco = args.rua
      ? {
          rua: args.rua,
          numero: args.numero ?? '',
          bairro: args.bairro ?? '',
          cidade: args.cidade,
          estado: args.estado,
          cep: args.cep,
          latitude: args.latitude,
          longitude: args.longitude,
        }
      : undefined

    return updateCheckout(ctx.supabase, {
      sessao_id: ctx.sessaoId,
      delivery_mode: args.delivery_mode,
      payment_method: args.payment_method,
      address_id: args.address_id,
      endereco,
      googleMapsServerKey: ctx.googleMapsServerKey,
    })
  },
}

// ─── FinalizarPedido ──────────────────────────────────────────────────────

/**
 * Contrato exportado (schema + descrição) para a versão lab-safe reaproveitar
 * byte-a-byte — `_docs/implementar/prd-laboratorio-avaliacao-agente.md` §5.4:
 * mesmo `name`/`description`/`schema`, só o `run` muda (não toca `pedidos`).
 */
export const finalizarPedidoSchema = z.object({})

export const FINALIZAR_PEDIDO_DESCRIPTION = 'Fecha o pedido convertendo o carrinho em pedido — pronta entrega e encomenda juntos ou separados, sem distincao de fluxo. Chame apenas depois do cliente confirmar explicitamente. PRE-REQUISITOS (todos gravados antes via AtualizarPedido/DefinirItemCarrinho): carrinho com itens (target_date definido nos itens de encomenda), delivery_mode definido, e se entrega, endereco definido. RETORNA pedido.receipt_text: reescreva o conteudo ao cliente. Em erro 422/409, leia o campo de mensagem e explique o motivo — provavelmente falta chamar AtualizarPedido ou DefinirItemCarrinho antes.'

/**
 * Granularidade por minuto (seção 4): protege contra chamada duplicada da
 * mesma tool no mesmo turno, permite nova tentativa legítima minutos depois.
 * Sem `Idempotency-Key` HTTP (n8n usava header) — gerada aqui internamente.
 */
export function minuteIdempotencyKey(sessaoId: string, now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '')
  return `${sessaoId}-checkout-${stamp}`
}

export const finalizarPedidoTool: AgentToolDefinition<z.infer<typeof finalizarPedidoSchema>> = {
  name: 'FinalizarPedido',
  description: FINALIZAR_PEDIDO_DESCRIPTION,
  schema: finalizarPedidoSchema,
  async run(_args, ctx) {
    const { response, drain } = await finalizeCheckout(ctx.supabase, {
      sessao_id: ctx.sessaoId,
      idempotencyKey: minuteIdempotencyKey(ctx.sessaoId),
    })
    // Sem H3Event/waitUntil no consumer de fila (seção 2) — aguarda o drain
    // direto, dentro do orçamento de 15min de parede do consumer (seção 2).
    if (drain) await drain
    return response
  },
}

// ─── ConsultarDetalhePedido ───────────────────────────────────────────────

const consultarDetalhePedidoSchema = z.object({
  pedido_id: z.string().uuid().describe('UUID do pedido'),
})

export const consultarDetalhePedidoTool: AgentToolDefinition<z.infer<typeof consultarDetalhePedidoSchema>> = {
  name: 'ConsultarDetalhePedido',
  description: 'Consulta um pedido JA existente pelo UUID e retorna a nota em receipt_text. Use quando o cliente perguntar sobre um pedido anterior ou pedir a nota de novo. Nao use para criar pedido.',
  schema: consultarDetalhePedidoSchema,
  async run(args, ctx) {
    return getOrderDetail(ctx.supabase, args.pedido_id)
  },
}

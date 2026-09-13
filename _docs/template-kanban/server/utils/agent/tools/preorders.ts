/**
 * `ConsultarDatasEncomenda` — porte literal do node n8n `httpRequestTool` de
 * mesmo nome. Chama `loadPreorderProduct`/`buildCalendar` diretamente em vez
 * de `GET /api/preorders/calendar` (seção 6).
 */
import { z } from 'zod'
import { createError } from 'h3'
import { loadPreorderProduct, buildCalendar } from '../../preorders/availability'
import { spToday } from '#shared/utils/preorders'
import type { AgentToolDefinition } from '../toolContext'

const schema = z.object({
  product_id: z.string().uuid().describe('UUID do produto de encomenda retornado por BuscarProdutos'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional()
    .describe('mes no formato YYYY-MM conforme o calendario do briefing'),
})

export const consultarDatasEncomendaTool: AgentToolDefinition<z.infer<typeof schema>> = {
  name: 'ConsultarDatasEncomenda',
  description: 'OBRIGATORIA antes de aceitar qualquer data de encomenda. Retorna as datas reais disponiveis de um produto product_type=\'preorder\'. PARAMETROS: product_id (UUID vindo de BuscarProdutos com product_type=\'preorder\') e month no formato YYYY-MM — use o mes do CALENDARIO OFICIAL do briefing, nunca calcule de cabeca. RETORNA dias com date (YYYY-MM-DD), status e remaining_capacity. Ofereca ao cliente SOMENTE datas com status \'available\'. Se o cliente pedir uma data que nao esta available, diga isso e ofereca no maximo 3 datas available proximas.',
  schema,
  async run(args, ctx) {
    const product = await loadPreorderProduct(ctx.supabase, args.product_id)
    if (!product) {
      throw createError({ statusCode: 404, statusMessage: 'Produto de encomenda não encontrado ou indisponível.' })
    }
    const month = args.month || spToday().slice(0, 7)
    return buildCalendar(ctx.supabase, product, month)
  },
}

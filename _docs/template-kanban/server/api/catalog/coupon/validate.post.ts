import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'

const schema = z.object({
  codigo: z.string().min(1).max(50),
  totalCarrinho: z.number().min(0),
})

interface CupomRow {
  id: string
  code: string
  description: string | null
  discount_type: 'percentual' | 'fixo'
  amount: number
  minimum_amount: number
  max_uses: number | null
  current_uses: number
  active: boolean
  start_date: string | null
  end_date: string | null
}

export default defineEventHandler(async (event) => {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Parâmetros inválidos.' })
  }

  const { codigo, totalCarrinho } = parsed.data
  // Service role por decisão de projeto: `cupons` não tem policy de leitura
  // pública e não deve ter. Abrir a tabela para `anon` exporia regras de
  // desconto, limites de uso e códigos ainda não divulgados. O BFF valida o
  // código e devolve só o resultado.
  const supabase = serverSupabaseServiceRole(event)
  const now = new Date().toISOString()

  const { data: cupom, error } = await supabase
    .from('coupons')
    .select('id, code, description, discount_type, amount, minimum_amount, max_uses, current_uses, active, start_date, end_date')
    .eq('code', codigo.toUpperCase())
    .single()

  if (error || !cupom) {
    throw createError({ statusCode: 404, message: 'Cupom não encontrado.' })
  }

  const c = cupom as CupomRow

  if (!c.active) {
    throw createError({ statusCode: 422, message: 'Este cupom não está mais ativo.' })
  }

  if (c.start_date && c.start_date > now) {
    throw createError({ statusCode: 422, message: 'Este cupom ainda não está vigente.' })
  }

  if (c.end_date && c.end_date < now) {
    throw createError({ statusCode: 422, message: 'Este cupom expirou.' })
  }

  if (c.max_uses !== null && c.current_uses >= c.max_uses) {
    throw createError({ statusCode: 422, message: 'Este cupom atingiu o limite de usos.' })
  }

  const valorMinimo = Number(c.minimum_amount)
  if (totalCarrinho < valorMinimo) {
    const minFormatado = valorMinimo.toFixed(2).replace('.', ',')
    throw createError({
      statusCode: 422,
      message: `Valor mínimo para este cupom: R$ ${minFormatado}.`,
    })
  }

  const desconto =
    c.discount_type === 'percentual'
      ? Math.round(totalCarrinho * (Number(c.amount) / 100) * 100) / 100
      : Math.min(Number(c.amount), totalCarrinho)

  return {
    codigo: c.code,
    desconto,
    descricao: c.description ?? c.code,
  }
})

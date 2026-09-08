import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'

const schema = z.object({
  codigo: z.string().min(1).max(50),
  totalCarrinho: z.number().min(0),
})

interface CupomRow {
  id: string
  codigo: string
  descricao: string | null
  tipo_desconto: 'percentual' | 'fixo'
  valor: number
  valor_minimo: number
  uso_maximo: number | null
  uso_atual: number
  ativo: boolean
  data_inicio: string | null
  data_fim: string | null
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
    .from('cupons')
    .select('id, codigo, descricao, tipo_desconto, valor, valor_minimo, uso_maximo, uso_atual, ativo, data_inicio, data_fim')
    .eq('codigo', codigo.toUpperCase())
    .single()

  if (error || !cupom) {
    throw createError({ statusCode: 404, message: 'Cupom não encontrado.' })
  }

  const c = cupom as CupomRow

  if (!c.ativo) {
    throw createError({ statusCode: 422, message: 'Este cupom não está mais ativo.' })
  }

  if (c.data_inicio && c.data_inicio > now) {
    throw createError({ statusCode: 422, message: 'Este cupom ainda não está vigente.' })
  }

  if (c.data_fim && c.data_fim < now) {
    throw createError({ statusCode: 422, message: 'Este cupom expirou.' })
  }

  if (c.uso_maximo !== null && c.uso_atual >= c.uso_maximo) {
    throw createError({ statusCode: 422, message: 'Este cupom atingiu o limite de usos.' })
  }

  const valorMinimo = Number(c.valor_minimo)
  if (totalCarrinho < valorMinimo) {
    const minFormatado = valorMinimo.toFixed(2).replace('.', ',')
    throw createError({
      statusCode: 422,
      message: `Valor mínimo para este cupom: R$ ${minFormatado}.`,
    })
  }

  const desconto =
    c.tipo_desconto === 'percentual'
      ? Math.round(totalCarrinho * (Number(c.valor) / 100) * 100) / 100
      : Math.min(Number(c.valor), totalCarrinho)

  return {
    codigo: c.codigo,
    desconto,
    descricao: c.descricao ?? c.codigo,
  }
})

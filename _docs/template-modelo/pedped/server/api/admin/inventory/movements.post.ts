import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * POST /api/admin/inventory/movements — ajuste manual de estoque (Gestão de
 * Estoque, migration 111). `quantidade` é o delta assinado (positivo=entrada,
 * negativo=saída), mesma convenção de `estoque_movimentacoes.quantidade`.
 * Não é atômico via RPC (ajuste manual, staff-only, baixa concorrência) —
 * a garantia atômica de verdade (`consumir_estoque_pedido`) protege a venda.
 *
 * Service role (não `serverSupabaseClient`): `produtos` tem uma policy de
 * escrita restrita a gerente+ (migration 038, "Manage produtos (gerente+)"),
 * mas este endpoint autoriza QUALQUER staff via `requireRole`. Com o client
 * autenticado, o UPDATE de um staff abaixo de gerente batia 0 linhas por RLS
 * SEM erro nenhum (Supabase não reporta erro em UPDATE que não casa nenhuma
 * linha) — sucesso falso: resposta 200, nada persistido. Mesma armadilha já
 * documentada em `server/api/admin/orders/[id]/status.put.ts`.
 */
const bodySchema = z.object({
  tipo_entidade: z.enum(['produto', 'insumo']),
  entidade_id: z.uuid(),
  quantidade: z.number().refine((v) => v !== 0, 'Informe um delta diferente de zero.'),
  motivo: z.string().trim().max(500).nullable().default(null),
})

export default defineEventHandler(async (event) => {
  const staff = await requireRole(event, STAFF_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
  }
  const { tipo_entidade, entidade_id, quantidade, motivo } = parsed.data

  const supabase = serverSupabaseServiceRole(event)
  const tabela = tipo_entidade === 'produto' ? 'produtos' : 'insumos'

  const { data: linhaAtual, error: buscaError } = await supabase
    .from(tabela)
    .select('estoque_atual')
    .eq('id', entidade_id)
    .maybeSingle()

  if (buscaError || !linhaAtual) {
    throw createError({ statusCode: 404, statusMessage: `${tipo_entidade === 'produto' ? 'Produto' : 'Insumo'} não encontrado.` })
  }

  const atual = Number(linhaAtual.estoque_atual ?? 0)
  const novo = atual + quantidade
  if (novo < 0) {
    throw createError({ statusCode: 422, statusMessage: `Ajuste deixaria o estoque negativo (atual: ${atual}).` })
  }

  const { data: atualizado, error: updateError } = await supabase
    .from(tabela)
    .update({ estoque_atual: novo })
    .eq('id', entidade_id)
    .select('id')
    .maybeSingle()
  if (updateError || !atualizado) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao aplicar o ajuste de estoque.' })
  }

  const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
    tipo_entidade,
    entidade_id,
    tipo_movimento: 'ajuste',
    quantidade,
    motivo,
    usuario_id: staff.id,
  })
  if (movError) {
    throw createError({ statusCode: 500, statusMessage: 'Ajuste aplicado, mas falhou ao registrar a movimentação.' })
  }

  return { success: true, estoque_atual: novo }
})

/**
 * Endpoint GET /api/admin/customers/:id
 *
 * Dados do cliente + endereços para o modal de visualização rápida
 * (`app/components/admin/CustomerInfoModal.vue`). Antes lido direto do
 * navegador via `useSupabaseClient()` (client anônimo) — só a policy de
 * RLS barrava o acesso, sem checagem de papel nem log no servidor. Migrado
 * pro mesmo padrão de guard das outras rotas admin (§5 do AUDITORIA.md).
 */
import { z } from 'zod'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

const idSchema = z.string().uuid()

interface ClienteFull {
  readonly id: string
  readonly nome: string | null
  readonly telefone_whatsapp: string | null
  readonly observacoes_internas: string | null
  readonly cliente_desde: string | null
  readonly is_visitante: boolean | null
  readonly total_pedidos: number | null
  readonly valor_gasto_acumulado: number | null
}

interface EnderecoRow {
  readonly id: string
  readonly rua: string | null
  readonly numero: string | null
  readonly complemento: string | null
  readonly bairro: string | null
  readonly cidade: string | null
  readonly estado: string | null
  readonly cep: string | null
  readonly padrao: boolean | null
}

export default defineEventHandler(async (event): Promise<{ cliente: ClienteFull | null; enderecos: readonly EnderecoRow[] }> => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do cliente inválido' })
  }
  const id = idRaw as string

  // Duas queries em paralelo: cliente + endereços.
  const [{ data: c, error: errC }, { data: e, error: errE }] = await Promise.all([
    supabase
      .from('customers')
      .select(
        'id, nome:name, telefone_whatsapp:whatsapp_phone, observacoes_internas:internal_notes, cliente_desde:customer_since, is_visitante:is_guest, total_pedidos:total_orders, valor_gasto_acumulado:total_amount_spent',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('customer_addresses')
      .select('id, rua:street, numero:number, complemento:complement, bairro:neighborhood, cidade:city, estado:state, cep:zip_code, padrao:is_default')
      .eq('customer_id', id)
      .order('is_default', { ascending: false })
      .order('id', { ascending: true }),
  ])

  if (errC) {
    logger.error('[admin/customers/[id].get] Falha ao buscar cliente', { id, error: errC.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar dados do cliente' })
  }
  if (errE) {
    logger.error('[admin/customers/[id].get] Falha ao buscar endereços', { id, error: errE.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar endereços do cliente' })
  }

  return {
    cliente: (c as ClienteFull | null) ?? null,
    enderecos: (e ?? []) as readonly EnderecoRow[],
  }
})

/**
 * Endpoint GET /api/catalog/products/:id/preorder-config
 *
 * Fallback autoritativo de `product_type`/`preorder_config` pra
 * `useProductPreorder.ts`, usado só quando o produto não trouxe essa
 * config já embutida no payload da listagem. PÚBLICO de propósito (mesma
 * decisão de `option-groups.get.ts`) — mas `products` não tem policy de
 * SELECT pra `anon` (mesmo motivo documentado em
 * `server/api/catalog/products-page.get.ts`: devolveria 0 linhas em
 * silêncio com o client RLS), por isso usa service role só pra estes dois
 * campos 100% públicos (tipo de venda e regras de encomenda do produto —
 * nenhum dado sensível).
 */
import { z } from 'zod'
import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { ProductType, PreorderConfig } from '#shared/types/preorder'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event): Promise<{ productType: ProductType | null; preorderConfig: PreorderConfig | null }> => {
  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de produto inválido' })
  }
  const produtoId = idRaw as string

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('products')
    .select('product_type, preorder_config')
    .eq('id', produtoId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao carregar configuração de encomenda' })
  }

  return {
    productType: (data?.product_type as ProductType | undefined) ?? null,
    preorderConfig: (data?.preorder_config as unknown as PreorderConfig | undefined) ?? null,
  }
})

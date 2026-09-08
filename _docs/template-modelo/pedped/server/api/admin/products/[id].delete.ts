import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireRole } from '../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do produto inválido' })
  }
  const id = idRaw as string

  // A Service Role tem poder de Hard Delete transacional ignorando RLS
  const supabase = serverSupabaseServiceRole(event)

  try {
    // 1. Busca produto para resgatar mídias (foto_url e imagens extras)
    const { data: prod } = await supabase
      .from('produtos')
      .select('foto_url, imagens')
      .eq('id', id)
      .single()

    // 2. Limpeza S3 (Bucket: produtos)
    if (prod) {
      const pathsToDelete: string[] = []
      
      // Helper para extrair o caminho interno pós-nome do bucket
      const extractPath = (url: string | null) => {
        if (!url) return null
        const match = url.match(/produtos\/(.+)$/)
        return match ? match[1] : null
      }

      const pCapa = extractPath(prod.foto_url)
      if (pCapa) pathsToDelete.push(pCapa)

      if (Array.isArray(prod.imagens)) {
        for (const img of prod.imagens) {
          const p = extractPath(img)
          if (p) pathsToDelete.push(p)
        }
      }

      // Buscar fotos dos opcionais cadastrados sob este produto para limpá-las do S3
      const { data: optGroups } = await supabase
        .from('produto_opcao_grupo')
        .select('id')
        .eq('produto_id', id)

      if (optGroups && optGroups.length > 0) {
        const groupIds = optGroups.map((g) => g.id)
        const { data: optItems } = await supabase
          .from('produto_opcao_item')
          .select('foto_url')
          .in('grupo_id', groupIds)

        if (optItems) {
          for (const item of optItems) {
            if (item.foto_url) {
              const p = extractPath(item.foto_url)
              if (p) pathsToDelete.push(p)
            }
          }
        }
      }

      // Expurgar do Storage
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('produtos').remove(pathsToDelete)
      }
    }

    // 3. Orquestração da Cascata Relacional 
    // Garantimos a exclusão das foreign keys que possuem RESTRICT nativo
    await supabase.from('cart_items').delete().eq('produto_id', id)
    await supabase.from('kit_itens').delete().eq('produto_id', id)
    await supabase.from('promocao_produtos').delete().eq('produto_id', id)
    
    // Deletar o item do pedido fará o Trigger do Postgres recalcular o subtotal do pedido.
    await supabase.from('itens_pedido').delete().eq('produto_id', id)

    // 4. Deleção Final do Produto 
    // (Atenção: produto_opcao_grupo e produto_opcao_item já possuem CASCADE nativo no BD)
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error

    return { success: true }
  } catch (err: unknown) {
    const e = err as { message?: string }
    logger.error('[products/delete] Erro na deleção em cascata', { id, error: e.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro interno ao deletar produto' })
  }
})

import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../utils/auth/requireRole'
import { CUSTOMER_DELETE_ROLES } from '#shared/types/user'
import { deleteFile } from '../../../utils/s3/delete'
import { getBucketName } from '../../../utils/s3/constants'
import { extractArteClienteKey } from '../../../utils/orders/optionCustomization'

const idSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
  // Hard-delete em cascata (produto + histórico de pedidos vinculados) é
  // irreversível: restrito a gerência para cima, mesmo teto de
  // `customers/[id].delete.ts`. A Service Role tem poder de Hard Delete
  // transacional ignorando RLS.
  const { supabase } = await requireServiceRole(event, CUSTOMER_DELETE_ROLES)

  const idRaw = getRouterParam(event, 'id')
  if (!idSchema.safeParse(idRaw).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID do produto inválido' })
  }
  const id = idRaw as string

  try {
    // 1. Busca produto para resgatar mídias (photo_url e images extras)
    const { data: prod } = await supabase
      .from('products')
      .select('photo_url, images')
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

      const pCapa = extractPath(prod.photo_url)
      if (pCapa) pathsToDelete.push(pCapa)

      if (Array.isArray(prod.images)) {
        for (const img of prod.images) {
          const p = extractPath(img)
          if (p) pathsToDelete.push(p)
        }
      }

      // Buscar fotos dos opcionais cadastrados sob este produto para limpá-las do S3
      const { data: optGroups } = await supabase
        .from('product_option_group')
        .select('id')
        .eq('product_id', id)

      if (optGroups && optGroups.length > 0) {
        const groupIds = optGroups.map((g) => g.id)
        const { data: optItems } = await supabase
          .from('product_option_item')
          .select('photo_url')
          .in('group_id', groupIds)

        if (optItems) {
          for (const item of optItems) {
            if (item.photo_url) {
              const p = extractPath(item.photo_url)
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

    // 2b. Limpeza de arte enviada pelo cliente (migration 114): order_items
    // já feitos por este produto podem ter order_item_options.file_url
    // (PDF/imagem que o cliente subiu para um grupo upload_arquivo). O DELETE
    // de order_items logo abaixo faz CASCADE em order_item_options — sem
    // apagar o objeto do S3 ANTES disso, o arquivo vira lixo órfão pra sempre
    // (nenhuma linha no banco aponta mais pra ele). Só apaga chaves sob o
    // prefixo artes-clientes/ — nunca uma URL fora desse escopo.
    const { data: itensDoProduto } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', id)

    if (itensDoProduto && itensDoProduto.length > 0) {
      const { data: opcoesComArquivo } = await supabase
        .from('order_item_options')
        .select('file_url')
        .in('order_item_id', itensDoProduto.map((i) => i.id))
        .not('file_url', 'is', null)

      const arteKeys = (opcoesComArquivo ?? [])
        .map((o) => (o.file_url ? extractArteClienteKey(o.file_url) : null))
        .filter((k): k is string => k !== null)

      if (arteKeys.length > 0) {
        const bucket = getBucketName('attachments')
        await Promise.all(
          arteKeys.map((key) =>
            deleteFile(bucket, key).catch((err: unknown) => {
              logger.error('[products/delete] Falha ao apagar arte de cliente do S3 (não-fatal)', {
                id,
                key,
                error: (err as Error).message,
              })
            }),
          ),
        )
      }
    }

    // 3. Orquestração da Cascata Relacional
    // Garantimos a exclusão das foreign keys que possuem RESTRICT nativo
    await supabase.from('cart_items').delete().eq('product_id', id)
    await supabase.from('kit_items').delete().eq('product_id', id)
    await supabase.from('promotion_products').delete().eq('product_id', id)

    // Deletar o item do pedido fará o Trigger do Postgres recalcular o subtotal do pedido.
    await supabase.from('order_items').delete().eq('product_id', id)

    // 4. Deleção Final do Produto 
    // (Atenção: product_option_group e product_option_item já possuem CASCADE nativo no BD)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error

    return { success: true }
  } catch (err: unknown) {
    const e = err as { message?: string }
    logger.error('[products/delete] Erro na deleção em cascata', { id, error: e.message })
    throw createError({ statusCode: 500, statusMessage: 'Erro interno ao deletar produto' })
  }
})

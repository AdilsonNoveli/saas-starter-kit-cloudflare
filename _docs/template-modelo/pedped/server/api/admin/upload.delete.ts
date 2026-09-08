import { createError, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { logger } from '~/core/services/logger.service'
import { deleteFile } from '../../utils/s3/delete'
import { getBucketName } from '../../utils/s3/constants'
import { requireRole } from '../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

/**
 * Extrai a key S3 (`uuid.ext`) da URL pública.
 *
 * A key é sempre o último segmento do path em TODOS os formatos de
 * `generatePublicUrl` (CDN `/key`, path-style `/bucket/key`, virtual-hosted
 * `/key`), pois a própria key não contém barras. Retorna null para URLs inválidas.
 */
function keyFromUrl(url: string): string | null {
  try {
    const last = new URL(url).pathname.split('/').pop()
    return last ? decodeURIComponent(last) : null
  } catch {
    return null
  }
}

/**
 * DELETE /api/admin/upload — remove imagens de produto órfãs do bucket S3.
 *
 * Chamado pelo formulário de produto ao salvar, com as URLs que deixaram de ser
 * usadas. Restrito a STAFF. Blindagem: só apaga se a URL não estiver mais
 * referenciada em `produtos` (foto_url/imagens) nem em `kits` — evita remover
 * uma imagem compartilhada. Best-effort: falhas de storage são logadas, nunca
 * derrubam a request (o pior caso é o órfão permanecer).
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, STAFF_ROLES)

  const body = await readBody<{ urls?: unknown }>(event)
  const urls = Array.isArray(body?.urls)
    ? body.urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : []

  if (urls.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Nenhuma URL fornecida.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const bucket = getBucketName('attachments')

  const checkAndDelete = async (url: string): Promise<boolean> => {
    const key = keyFromUrl(url)
    if (!key) return false

    const [
      { count: prodFoto },
      { count: prodImgs },
      { count: kitFoto },
      { count: kitImgs },
      { count: cliFoto },
      { count: catIcone },
    ] = await Promise.all([
      supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('foto_url', url),
      supabase.from('produtos').select('id', { count: 'exact', head: true }).contains('imagens', [url]),
      supabase.from('kits').select('id', { count: 'exact', head: true }).eq('foto_url', url),
      supabase.from('kits').select('id', { count: 'exact', head: true }).contains('imagens', [url]),
      supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('foto_url', url),
      supabase.from('categorias').select('id', { count: 'exact', head: true }).eq('icone_url', url),
    ])

    const refs = (prodFoto ?? 0) + (prodImgs ?? 0) + (kitFoto ?? 0) + (kitImgs ?? 0) + (cliFoto ?? 0) + (catIcone ?? 0)
    if (refs > 0) {
      logger.info('Imagem ainda referenciada — deleção ignorada', { url })
      return false
    }

    try {
      await deleteFile(bucket, key)
      return true
    } catch (error: unknown) {
      logger.error('Falha ao deletar imagem órfã do S3', { url, key, error: (error as Error).message })
      return false
    }
  }

  // All URLs checked in parallel — one DB round-trip per URL, all concurrent
  const results = await Promise.all(urls.map(checkAndDelete))
  const deleted = results.filter(Boolean).length

  return { success: true, deleted }
})

import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { deleteFile } from '../../utils/s3/delete'
import { getBucketName } from '../../utils/s3/constants'
import { enforceCustomerArtRateLimit } from '../../utils/s3/rateLimit'

const bodySchema = z.object({
  key: z.string().startsWith('artes-clientes/'),
})

/**
 * DELETE /api/catalog/upload-arte — remove um arquivo de arte que o cliente
 * enviou e depois removeu/trocou no modal, antes de confirmar o pedido.
 * Best-effort (não bloqueia o fluxo do cliente em caso de falha).
 *
 * Recebe a `key` (não a URL) — devolvida verbatim por `POST /upload-arte` —
 * porque as várias formas de URL pública (`generatePublicUrl`) não são todas
 * trivialmente reversíveis pra key com prefixo (`artes-clientes/uuid.ext`),
 * diferente do upload admin (sem prefixo, onde o último segmento já é a key).
 *
 * Restrito ao prefixo `artes-clientes/`: nunca deixa apagar uma foto de
 * produto ou outro asset admin por engano/abuso.
 */
export default defineEventHandler(async (event) => {
  enforceCustomerArtRateLimit(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Key inválida.' })
  }
  const { key } = parsed.data

  try {
    await deleteFile(getBucketName('attachments'), key)
    return { success: true }
  } catch (error: unknown) {
    logger.error('Falha ao deletar arte de cliente do S3', { key, error: (error as Error).message })
    // Best-effort: não bloqueia o cliente por uma falha de limpeza de storage.
    return { success: false }
  }
})

import { readMultipartFormData, createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { uploadFile } from '../../utils/s3/upload'
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES, getBucketName } from '../../utils/s3/constants'
import { requireRole } from '../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

export default defineEventHandler(async (event) => {
  try {
    // Restringe upload à equipe interna (staff). Antes qualquer usuário
    // autenticado podia gravar no bucket. requireRole também garante `id`.
    const user = await requireRole(event, STAFF_ROLES)

    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Nenhum arquivo fornecido.' })
    }

    const fileData = formData.find((f) => f.name === 'file') ?? formData[0]

    if (!fileData?.data || !fileData.filename) {
      throw createError({ statusCode: 400, statusMessage: 'Dados do arquivo inválidos.' })
    }

    const fileSize = fileData.data.length

    if (fileSize > MAX_IMAGE_SIZE) {
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1)
      const maxSizeMB = Math.round(MAX_IMAGE_SIZE / 1024 / 1024)
      throw createError({
        statusCode: 400,
        statusMessage: `A imagem é muito grande (${fileSizeMB}MB). O tamanho máximo é ${maxSizeMB}MB.`,
      })
    }

    const mimeType = fileData.type || 'application/octet-stream'

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tipo de arquivo não permitido. Por favor, envie apenas imagens JPG, PNG, GIF ou WebP.',
      })
    }

    const bucketTargetField = formData.find((f) => f.name === 'bucketTarget')
    const requestedBucket = bucketTargetField?.data ? bucketTargetField.data.toString() : null

    const targetBucket = requestedBucket === 'loja'
      ? getBucketName('avatars')
      : getBucketName('attachments')

    const uploadResult = await uploadFile(fileData.data, {
      fileName: fileData.filename,
      fileSize,
      mimeType,
      bucket: targetBucket,
      uploadedBy: user.id,
    })

    logger.info('Imagem enviada para o S3 com sucesso', { key: uploadResult.key })

    return {
      success: true,
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
      },
    }
  } catch (error: unknown) {
    logger.error('Erro no upload', error)
    // Erros H3 (createError) carregam statusMessage já pensado para o usuário
    // (limite de tamanho, tipo inválido) — repassamos. Erros JS/AWS crus NÃO
    // são expostos: suas mensagens podem vazar bucket/endpoint/credencial e
    // estrutura interna. O detalhe fica só no log acima.
    const h3err = error as { statusCode?: number; statusMessage?: string }
    if (h3err.statusCode && h3err.statusMessage) {
      throw createError({ statusCode: h3err.statusCode, statusMessage: h3err.statusMessage })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível processar o upload. Tente novamente.',
    })
  }
})

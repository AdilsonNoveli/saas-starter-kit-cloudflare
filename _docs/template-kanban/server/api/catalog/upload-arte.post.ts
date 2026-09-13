import { readMultipartFormData, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { logger } from '~/core/services/logger.service'
import { uploadFile } from '../../utils/s3/upload'
import { ALLOWED_CUSTOMER_ART_TYPES, MAX_CUSTOMER_ART_SIZE, getBucketName } from '../../utils/s3/constants'
import { enforceCustomerArtRateLimit } from '../../utils/s3/rateLimit'

/**
 * Upload de arte do cliente (grupo de opção `upload_arquivo`) — PDF ou imagem
 * que personaliza um produto (ex.: logo pra estampar). Sem `requireRole`:
 * usado tanto pelo catálogo web (cliente anônimo, `ProductDetailsModal`
 * `mode='info'`) quanto pelo PDV do admin (`mode='pdv'`), já que os dois
 * compartilham o mesmo componente. Não dá pra gatear por sessão de checkout
 * — ela só existe depois do ponto do funil onde este upload acontece — por
 * isso o rate limit é por IP (`enforceCustomerArtRateLimit`).
 *
 * Whitelist e teto de tamanho são os do CLIENTE (mais restritos que o upload
 * admin) — a config por grupo (`arquivo_tipos_aceitos`/`arquivo_tamanho_maximo_mb`)
 * só pode restringir isso ainda mais no client-side, nunca ampliar; o
 * servidor nunca confia em nada além desta whitelist fixa.
 */
export default defineEventHandler(async (event) => {
  enforceCustomerArtRateLimit(event)

  try {
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Nenhum arquivo fornecido.' })
    }

    const fileData = formData.find((f) => f.name === 'file') ?? formData[0]

    if (!fileData?.data || !fileData.filename) {
      throw createError({ statusCode: 400, statusMessage: 'Dados do arquivo inválidos.' })
    }

    const fileSize = fileData.data.length

    if (fileSize > MAX_CUSTOMER_ART_SIZE) {
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1)
      const maxSizeMB = Math.round(MAX_CUSTOMER_ART_SIZE / 1024 / 1024)
      throw createError({
        statusCode: 400,
        statusMessage: `O arquivo é muito grande (${fileSizeMB}MB). O tamanho máximo é ${maxSizeMB}MB.`,
      })
    }

    const mimeType = fileData.type || 'application/octet-stream'

    if (!ALLOWED_CUSTOMER_ART_TYPES.includes(mimeType as (typeof ALLOWED_CUSTOMER_ART_TYPES)[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tipo de arquivo não permitido. Envie um PDF ou uma imagem (JPG, PNG ou WebP).',
      })
    }

    // Opcional: staff logado no PDV vira o "autor" do upload; cliente anônimo
    // do catálogo web usa um literal fixo (não guarda IP como metadata — PII).
    const user = await serverSupabaseUser(event).catch(() => null)
    const uploadedBy = user?.sub ? String(user.sub) : 'catalogo-cliente'

    const uploadResult = await uploadFile(fileData.data, {
      fileName: fileData.filename,
      fileSize,
      mimeType,
      bucket: getBucketName('attachments'),
      uploadedBy,
      keyPrefix: 'artes-clientes',
    })

    logger.info('Arte de cliente enviada para o S3 com sucesso', { key: uploadResult.key })

    return {
      success: true,
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
        nomeOriginal: fileData.filename,
        mimeType,
      },
    }
  } catch (error: unknown) {
    logger.error('Erro no upload de arte do cliente', error)
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

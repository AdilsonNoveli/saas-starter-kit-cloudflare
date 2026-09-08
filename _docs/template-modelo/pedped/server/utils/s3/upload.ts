/**
 * S3 Upload Service — aws4fetch
 *
 * Upload de arquivos para storage S3-compatible via aws4fetch.
 * Substitui @aws-sdk/lib-storage (Upload) que usa node:stream internamente
 * e @aws-sdk/client-s3 que chama process.emitWarning no nível de módulo —
 * ambos incompatíveis com o runtime workerd da Cloudflare Workers.
 *
 * aws4fetch usa Fetch API + Web Crypto API nativos: funciona sem alterações
 * em Cloudflare Workers e em Node.js/Docker.
 *
 * Docs: https://github.com/mhart/aws4fetch
 *       https://www.backblaze.com/b2/docs/cloudflare_workers.html
 */

import { logger } from '~/core/services/logger.service'
import { getS3Client, buildObjectUrl } from './client'
import { validateFileMagicBytes, readAndValidateStream } from './validation'
import { sanitizeFileName, getFileExtension, generatePublicUrl, getRetryDelay } from './utils'
import {
  MAX_FILE_SIZE,
  MAX_RETRIES,
  ALLOWED_MIME_TYPES,
} from './constants'
import type { UploadOptions, UploadResult, FileInput } from '#shared/types/s3'

export async function uploadFile(
  file: FileInput,
  options: UploadOptions,
): Promise<UploadResult> {
  const startTime = Date.now()
  let attempt = 0

  if (options.fileSize > MAX_FILE_SIZE) {
    const fileSizeMB = Math.round(options.fileSize / 1024 / 1024)
    const maxSizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024)
    logger.error('File size validation failed', { fileSize: options.fileSize, maxSize: MAX_FILE_SIZE, fileName: options.fileName })
    throw new Error(`O arquivo é muito grande (${fileSizeMB}MB). O tamanho máximo permitido é ${maxSizeMB}MB.`)
  }

  if (!ALLOWED_MIME_TYPES.includes(options.mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    logger.error('MIME type validation failed', { mimeType: options.mimeType, fileName: options.fileName })
    throw new Error('Tipo de arquivo não permitido. Por favor, envie apenas imagens, documentos ou arquivos PDF.')
  }

  // Normaliza qualquer FileInput para Buffer — aws4fetch aceita BodyInit
  // (Buffer/Uint8Array/string/ReadableStream), mas normalizar garante
  // que a validação de magic bytes rode antes do envio em todos os runtimes.
  let body: Buffer

  if (Buffer.isBuffer(file)) {
    await validateFileMagicBytes(file, options.mimeType)
    body = file
  } else if (typeof (file as { read?: unknown }).read === 'function') {
    // Node.js Readable stream
    const { fullStream } = await readAndValidateStream(
      file as Parameters<typeof readAndValidateStream>[0],
      options.mimeType,
    )
    const chunks: Buffer[] = []
    for await (const chunk of fullStream) chunks.push(chunk as Buffer)
    body = Buffer.concat(chunks)
  } else {
    // Web ReadableStream (CF Workers / browser)
    const reader = (file as ReadableStream<Uint8Array>).getReader()
    const chunks: Uint8Array[] = []
    let done = false
    while (!done) {
      const { value, done: streamDone } = await reader.read()
      done = streamDone
      if (value) chunks.push(value)
    }
    body = Buffer.concat(chunks)
    await validateFileMagicBytes(body, options.mimeType)
  }

  const sanitizedName = sanitizeFileName(options.fileName)
  const extension = getFileExtension(sanitizedName)
  const uuid = crypto.randomUUID()
  const key = extension ? `${uuid}.${extension}` : uuid
  const url = buildObjectUrl(options.bucket, key)

  while (attempt < MAX_RETRIES) {
    attempt++

    try {
      const aws = getS3Client()

      // Metadata S3: prefixo x-amz-meta-* obrigatório (lowercase).
      // Docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html
      const response = await aws.fetch(url, {
        method: 'PUT',
        body: body as unknown as BodyInit,
        headers: {
          'Content-Type': options.mimeType,
          'Content-Length': String(body.byteLength),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'x-amz-meta-originalfilename': sanitizedName,
          'x-amz-meta-uploadedby': options.uploadedBy,
        },
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`S3 PUT falhou (HTTP ${response.status}): ${text.slice(0, 500)}`)
      }

      const publicUrl = generatePublicUrl(options.bucket, key)
      const duration = Date.now() - startTime

      logger.info('File uploaded successfully', {
        bucket: options.bucket,
        key,
        size: options.fileSize,
        mimeType: options.mimeType,
        uploadedBy: options.uploadedBy,
        duration,
        attempt,
      })

      return { key, url: publicUrl, bucket: options.bucket }
    } catch (error: unknown) {
      const err = error as Error

      if (attempt >= MAX_RETRIES) {
        logger.error('File upload failed after all retries', {
          bucket: options.bucket,
          fileName: options.fileName,
          attempts: attempt,
          error: err.message,
        })
        throw err
      }

      const delay = getRetryDelay(attempt)
      logger.warn('File upload failed, retrying', {
        bucket: options.bucket,
        fileName: options.fileName,
        attempt,
        nextAttempt: attempt + 1,
        delay,
        error: err.message,
      })
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Upload failed: unexpected error')
}

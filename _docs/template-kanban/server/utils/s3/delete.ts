/**
 * S3 Delete Service — aws4fetch
 *
 * Deleção de arquivos via aws4fetch (Fetch API + Web Crypto API nativos).
 * Substitui @aws-sdk/client-s3 (DeleteObjectCommand) incompatível com workerd.
 *
 * Docs: https://github.com/mhart/aws4fetch
 */

import { logger } from '~/core/services/logger.service'
import { getS3Client, buildObjectUrl } from './client'
import { getRetryDelay } from './utils'
import { MAX_RETRIES } from './constants'

export async function deleteFile(bucket: string, key: string): Promise<void> {
  const startTime = Date.now()
  let attempt = 0

  while (attempt < MAX_RETRIES) {
    attempt++

    try {
      const aws = getS3Client()
      const url = buildObjectUrl(bucket, key)

      const response = await aws.fetch(url, { method: 'DELETE' })

      // 204 No Content = sucesso padrão S3. 404 = já deletado, tratamos como ok.
      if (!response.ok && response.status !== 404) {
        const text = await response.text().catch(() => '')
        throw new Error(`S3 DELETE falhou (HTTP ${response.status}): ${text.slice(0, 500)}`)
      }

      logger.info('File deleted successfully', {
        bucket,
        key,
        duration: Date.now() - startTime,
        attempt,
      })
      return
    } catch (error: unknown) {
      const err = error as Error

      if (attempt >= MAX_RETRIES) {
        logger.error('File deletion failed after all retries', {
          bucket,
          key,
          attempts: attempt,
          error: err.message,
        })
        throw err
      }

      const delay = getRetryDelay(attempt)
      logger.warn('File deletion failed, retrying', {
        bucket,
        key,
        attempt,
        nextAttempt: attempt + 1,
        delay,
        error: err.message,
      })
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Deletion failed: unexpected error')
}

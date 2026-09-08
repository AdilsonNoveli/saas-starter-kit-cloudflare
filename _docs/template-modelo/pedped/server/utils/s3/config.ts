/**
 * S3 Configuration Module
 *
 * Validates and caches S3 configuration from environment variables.
 * Uses Zod for schema validation with descriptive error messages.
 *
 * @module server/utils/s3/config
 */

import { z } from 'zod'
import type { S3Config } from '#shared/types/s3'
import { logger } from '~/core/services/logger.service'

/**
 * Zod schema for S3 configuration validation
 * Validates required environment variables with descriptive error messages
 */
const S3ConfigSchema = z.object({
  region: z.string().min(1, 'S3_REGION is required'),
  endpoint: z.string().url('S3_ENDPOINT must be a valid URL (e.g., https://s3.us-east-005.backblazeb2.com)').optional(),
  accessKeyId: z.string().min(1, 'S3_ACCESS_KEY_ID is required'),
  secretAccessKey: z.string().min(1, 'S3_SECRET_ACCESS_KEY is required'),
  forcePathStyle: z.boolean().default(false),
  avatarBucketName: z.string().min(1, 'S3_AVATAR_BUCKET_NAME is required'),
  attachmentsBucketName: z.string().min(1, 'S3_ATTACHMENTS_BUCKET_NAME is required'),
})

/**
 * Cached configuration singleton
 * Prevents repeated validation and environment variable reads
 */
let cachedConfig: S3Config | null = null

/**
 * Get validated S3 configuration
 *
 * Reads environment variables, validates them using Zod schema,
 * and caches the result for subsequent calls.
 *
 * @returns Validated S3 configuration
 * @throws {Error} If required environment variables are missing or invalid
 *
 * @example
 * ```typescript
 * const config = getS3Config()
 * console.log(config.region) // 'us-east-1'
 * console.log(config.avatarBucketName) // 'avatars'
 * ```
 */
export function getS3Config(): S3Config {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig
  }

  // Lê via runtimeConfig (garantido pelo Nitro) em vez de process.env diretamente
  const rc = useRuntimeConfig()
  const config = {
    region: rc.s3Region || process.env.S3_REGION,
    endpoint: rc.s3Endpoint || process.env.S3_ENDPOINT,
    accessKeyId: rc.s3AccessKeyId || process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: rc.s3SecretAccessKey || process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: rc.s3ForcePathStyle ?? (process.env.S3_FORCE_PATH_STYLE === 'true'),
    avatarBucketName: rc.s3AvatarBucketName || process.env.S3_AVATAR_BUCKET_NAME,
    attachmentsBucketName: rc.s3AttachmentsBucketName || process.env.S3_ATTACHMENTS_BUCKET_NAME,
  }

  try {
    // Validate configuration
    cachedConfig = S3ConfigSchema.parse(config)

    logger.info('S3 configuration loaded', {
      region: cachedConfig.region,
      endpoint: cachedConfig.endpoint,
      forcePathStyle: cachedConfig.forcePathStyle,
      avatarBucketName: cachedConfig.avatarBucketName,
      attachmentsBucketName: cachedConfig.attachmentsBucketName,
    })

    return cachedConfig
  } catch (error) {
    // Handle Zod validation errors with descriptive messages
    if (error instanceof z.ZodError) {
      const missingFields = error.issues
        .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        .join(', ')

      logger.error('S3 configuration validation failed', {
        error: missingFields,
        issues: error.issues,
      })

      throw new Error(
        `S3 configuration validation failed: ${missingFields}. Check environment variables.`,
        { cause: error }
      )
    }

    // Re-throw unexpected errors
    throw error
  }
}

/**
 * Reset cached configuration
 * Useful for testing or when environment variables change
 *
 * @internal
 */
export function resetS3Config(): void {
  cachedConfig = null
  logger.debug('S3 configuration cache cleared')
}

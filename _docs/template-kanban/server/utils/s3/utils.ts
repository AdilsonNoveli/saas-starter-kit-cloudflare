/**
 * S3 Utility Functions
 *
 * Helper functions for filename sanitization, URL generation, and retry logic.
 * Provides provider-agnostic utilities for S3-compatible storage systems.
 *
 * @module server/utils/s3/utils
 */

import { getS3Config } from './config'
import { MAX_RETRY_DELAY_MS, RETRY_BASE_DELAY_MS } from './constants'

/**
 * Optimized regex for filename sanitization
 * Matches:
 * - Path traversal patterns (../, ..\)
 * - Path separators (/, \)
 * - Special characters (everything except alphanumeric, dot, hyphen, underscore)
 */
const SANITIZE_REGEX = /\.{2,}|[^\w.-]/g

/**
 * Sanitize filename to prevent path traversal and special character attacks
 *
 * Applies multiple sanitization rules:
 * - Removes path traversal patterns (../, ..\)
 * - Replaces path separators (/, \) with underscores
 * - Replaces special characters with underscores
 * - Trims leading/trailing dots and spaces
 * - Limits length to 255 characters
 * - Preserves alphanumeric characters, dots, hyphens, and underscores
 *
 * @param fileName - Original filename to sanitize
 * @returns Sanitized filename safe for storage
 *
 * @example
 * ```typescript
 * sanitizeFileName('../../../etc/passwd') // '___etc_passwd'
 * sanitizeFileName('my file (1).pdf') // 'my_file__1_.pdf'
 * sanitizeFileName('document.pdf') // 'document.pdf'
 * ```
 */
export function sanitizeFileName(fileName: string): string {
  // First trim leading/trailing dots and spaces
  const trimmed = fileName.replace(/^[.\s]+|[.\s]+$/g, '')

  // Then apply sanitization regex
  return trimmed
    .replace(SANITIZE_REGEX, '_')
    .substring(0, 255)
}

/**
 * Extract file extension from filename
 *
 * Returns the extension WITHOUT the dot, or empty string if no extension.
 * Handles multiple dots correctly (e.g., 'file.tar.gz' returns 'gz').
 *
 * @param fileName - Filename to extract extension from
 * @returns File extension without dot, or empty string
 *
 * @example
 * ```typescript
 * getFileExtension('document.pdf') // 'pdf'
 * getFileExtension('image.jpg') // 'jpg'
 * getFileExtension('archive.tar.gz') // 'gz'
 * getFileExtension('noextension') // ''
 * ```
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return ''
  }
  return fileName.substring(lastDotIndex + 1)
}

/**
 * Generate public URL for uploaded file
 *
 * Supports multiple S3 providers with different URL formats:
 * - Custom PUBLIC_STORAGE_URL (highest priority)
 * - Path-style URLs (bucket/key in path)
 * - Virtual-hosted-style URLs (bucket as subdomain)
 * - Custom PUBLIC_STORAGE_DOMAIN for CDN
 * - Standard AWS S3 URLs (fallback)
 *
 * @param bucket - S3 bucket name
 * @param key - Storage key (UUID + extension)
 * @returns Public URL to access the file
 *
 * @example
 * ```typescript
 * // With PUBLIC_STORAGE_URL
 * generatePublicUrl('avatars', 'abc.jpg')
 * // 'https://cdn.example.com/avatars/abc.jpg'
 *
 * // With forcePathStyle
 * generatePublicUrl('avatars', 'abc.jpg')
 * // 'https://s3.amazonaws.com/avatars/abc.jpg'
 *
 * // Standard AWS S3
 * generatePublicUrl('avatars', 'abc.jpg')
 * // 'https://avatars.s3.us-east-1.amazonaws.com/abc.jpg'
 * ```
 */
export function generatePublicUrl(bucket: string, key: string): string {
  const sanitizedBucket = bucket.trim()
  const sanitizedKey = key.trim()

  const rc = useRuntimeConfig()

  // Priority 1: Domínio customizado (R2/CDN) — o domínio já aponta para o
  // bucket, então o path é apenas /<key> sem o nome do bucket.
  const publicUrl = rc.s3PublicUrl || process.env.S3_PUBLIC_URL
  if (publicUrl) {
    const base = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
    return `${base}/${sanitizedKey}`
  }

  const config = getS3Config()

  // Priority 2: Path-style (MinIO, Backblaze B2)
  if (config.forcePathStyle) {
    if (config.endpoint) {
      const endpoint = config.endpoint.endsWith('/') ? config.endpoint.slice(0, -1) : config.endpoint
      return `${endpoint}/${sanitizedBucket}/${sanitizedKey}`
    }
    return `https://s3.${config.region}.amazonaws.com/${sanitizedBucket}/${sanitizedKey}`
  }

  // Priority 3: Virtual-hosted via endpoint customizado (R2 sem domínio próprio)
  if (config.endpoint) {
    const endpointUrl = new URL(config.endpoint)
    return `https://${sanitizedBucket}.${endpointUrl.host}/${sanitizedKey}`
  }

  // Priority 4: AWS S3 padrão
  return `https://${sanitizedBucket}.s3.${config.region}.amazonaws.com/${sanitizedKey}`
}

/**
 * Calculate retry delay using exponential backoff
 *
 * Implements exponential backoff strategy:
 * - Delay = baseDelay * 2^attempt
 * - Capped at MAX_RETRY_DELAY_MS (30 seconds)
 *
 * @param attempt - Retry attempt number (0-based)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000ms)
 * @returns Delay in milliseconds before next retry
 *
 * @example
 * ```typescript
 * getRetryDelay(0) // 1000ms (1s)
 * getRetryDelay(1) // 2000ms (2s)
 * getRetryDelay(2) // 4000ms (4s)
 * getRetryDelay(3) // 8000ms (8s)
 * getRetryDelay(10) // 30000ms (30s, capped)
 * ```
 */
export function getRetryDelay(
  attempt: number,
  baseDelayMs: number = RETRY_BASE_DELAY_MS
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
  return Math.min(exponentialDelay, MAX_RETRY_DELAY_MS)
}

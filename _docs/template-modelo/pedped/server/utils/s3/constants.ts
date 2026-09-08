/**
 * S3 Storage Constants
 *
 * Centralized configuration constants for S3 storage system.
 * Defines MIME types, size limits, rate limits, and bucket names.
 *
 * @module server/utils/s3/constants
 */

import { getS3Config } from './config'

/**
 * Allowed MIME types for file uploads
 * Whitelist approach for security
 */
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // JSON
  'application/json',
] as const

/**
 * Allowed image MIME types (subset of ALLOWED_MIME_TYPES)
 * Used for avatar uploads with stricter validation
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

/**
 * Maximum file size for general uploads (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * Maximum file size for image uploads (10MB)
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

/**
 * Maximum number of files per upload request
 */
export const MAX_FILES_PER_REQUEST = 5

/**
 * Multipart upload configuration
 * Part size: 5MB (S3 minimum requirement)
 */
export const MULTIPART_PART_SIZE = 5 * 1024 * 1024

/**
 * Multipart upload queue size
 * Number of parallel part uploads
 */
export const MULTIPART_QUEUE_SIZE = 3

/**
 * Rate limiting configuration
 * Window: 1 hour in milliseconds
 */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

/**
 * Maximum uploads per user per hour
 */
export const RATE_LIMIT_MAX_UPLOADS_PER_USER = 50

/**
 * Maximum uploads per IP address per hour
 */
export const RATE_LIMIT_MAX_UPLOADS_PER_IP = 100

/**
 * Retry configuration
 * Maximum number of retry attempts for failed operations
 */
export const MAX_RETRIES = 3

/**
 * Base delay for exponential backoff (1 second)
 */
export const RETRY_BASE_DELAY_MS = 1000

/**
 * Maximum retry delay (30 seconds)
 */
export const MAX_RETRY_DELAY_MS = 30000

/**
 * S3 bucket names from environment variables
 * Allows different bucket names per environment (dev/staging/prod)
 *
 * @example
 * ```typescript
 * // Development
 * S3_AVATAR_BUCKET_NAME=dev-avatars
 * S3_ATTACHMENTS_BUCKET_NAME=dev-attachments
 *
 * // Production
 * S3_AVATAR_BUCKET_NAME=prod-avatars
 * S3_ATTACHMENTS_BUCKET_NAME=prod-attachments
 * ```
 */
export function getBucketName(type: 'avatars' | 'attachments'): string {
  const config = getS3Config()
  return type === 'avatars' ? config.avatarBucketName : config.attachmentsBucketName
}

/**
 * Legacy BUCKETS constant for backward compatibility
 * @deprecated Use getBucketName() instead
 */
export const BUCKETS = {
  get AVATARS() {
    return getBucketName('avatars')
  },
  get ATTACHMENTS() {
    return getBucketName('attachments')
  },
  get COVERS() {
    return getBucketName('attachments')
  },
} as const

/**
 * Text-based MIME types that don't have magic bytes
 * These types skip magic bytes validation
 */
export const TEXT_BASED_MIME_TYPES = [
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
] as const

/**
 * Number of bytes to read for magic bytes validation
 */
export const MAGIC_BYTES_READ_SIZE = 4100

/**
 * S3 Storage Validation Module
 *
 * Multi-layer file validation with magic bytes detection.
 * Provides security against file type spoofing and malicious uploads.
 *
 * @module server/utils/s3/validation
 */

import { fileTypeFromBuffer } from 'file-type'
import { Readable } from 'node:stream'
import { createError } from 'h3'
import { logger } from '~/core/services/logger.service'
import { TEXT_BASED_MIME_TYPES, MAGIC_BYTES_READ_SIZE } from './constants'

/**
 * Validates file type using magic bytes detection
 *
 * For text-based MIME types (text/plain, application/json, etc.),
 * magic bytes validation is skipped as these files don't have
 * reliable magic byte signatures.
 *
 * For binary files, validates that the detected MIME type from
 * magic bytes matches the expected MIME type.
 *
 * @param fileBuffer - Buffer containing file data (minimum 4100 bytes recommended)
 * @param expectedMimeType - Expected MIME type to validate against
 * @returns Promise<boolean> - True if validation passes
 * @throws Error if magic bytes cannot be detected for non-text files
 * @throws Error if detected MIME type doesn't match expected
 *
 * @example
 * ```typescript
 * const buffer = await readFile('image.jpg')
 * await validateFileMagicBytes(buffer, 'image/jpeg') // true
 * await validateFileMagicBytes(buffer, 'image/png')  // throws error
 * ```
 */
export async function validateFileMagicBytes(
  fileBuffer: Buffer,
  expectedMimeType: string
): Promise<boolean> {
  // Skip magic bytes validation for text-based MIME types
  if ((TEXT_BASED_MIME_TYPES as readonly string[]).includes(expectedMimeType)) {
    logger.info('Skipping magic bytes validation for text-based MIME type', {
      mimeType: expectedMimeType,
    })
    return true
  }

  // Detect file type from magic bytes
  const detectedType = await fileTypeFromBuffer(fileBuffer)

  // If magic bytes cannot be detected for non-text file, throw error
  if (!detectedType) {
    logger.error('Magic bytes detection failed', {
      expectedMimeType,
    })
    // `createError` (não `Error` cru): esta mensagem não vaza nada sensível
    // (bucket/endpoint/credencial), então deve chegar ao usuário como 400 —
    // não ser mascarada como 500 genérico por `upload.post.ts`.
    throw createError({
      statusCode: 400,
      statusMessage: 'O arquivo parece estar corrompido ou não é do tipo esperado. Tente enviar outro arquivo.',
    })
  }

  // Validate detected MIME type matches expected
  if (detectedType.mime !== expectedMimeType) {
    logger.error('Magic bytes validation failed', {
      expectedMimeType,
      detectedMimeType: detectedType.mime,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'O arquivo parece estar corrompido ou não é do tipo esperado. Tente enviar outro arquivo.',
    })
  }

  logger.info('Magic bytes validation passed', {
    mimeType: expectedMimeType,
  })

  return true
}

/**
 * Reads and validates a stream while preserving the complete content
 *
 * This function reads the first N bytes from a stream for magic bytes
 * validation, then reconstructs a new stream containing ALL the original
 * bytes (including the validation bytes).
 *
 * This is critical for upload operations where the entire file content
 * must be preserved after validation.
 *
 * @param stream - Readable stream to validate
 * @param expectedMimeType - Expected MIME type to validate against
 * @param bytesToRead - Number of bytes to read for validation (default: MAGIC_BYTES_READ_SIZE)
 * @returns Promise with validationBuffer and fullStream
 *
 * @example
 * ```typescript
 * const fileStream = createReadStream('file.pdf')
 * const { validationBuffer, fullStream } = await readAndValidateStream(
 *   fileStream,
 *   'application/pdf'
 * )
 * // fullStream contains ALL original bytes
 * await uploadToS3(fullStream)
 * ```
 */
export async function readAndValidateStream(
  stream: Readable,
  expectedMimeType: string,
  bytesToRead: number = MAGIC_BYTES_READ_SIZE
): Promise<{ validationBuffer: Buffer; fullStream: Readable }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let totalBytesRead = 0
    let validationComplete = false
    let validationPromise: Promise<boolean> | null = null

    const onData = (chunk: Buffer) => {
      chunks.push(chunk)
      totalBytesRead += chunk.length

      // Once we have enough bytes for validation, validate and continue
      if (!validationComplete && totalBytesRead >= bytesToRead) {
        validationComplete = true

        // Combine chunks for validation
        const validationBuffer = Buffer.concat(chunks)

        // Validate magic bytes and store the promise
        validationPromise = validateFileMagicBytes(validationBuffer.subarray(0, bytesToRead), expectedMimeType)
          .then(() => {
            // Validation passed - continue reading the rest of the stream
            logger.info('Stream validation passed, continuing to read', {
              bytesRead: totalBytesRead,
              mimeType: expectedMimeType,
            })
            return true
          })
          .catch((error) => {
            // Validation failed - stop reading and reject
            stream.removeListener('data', onData)
            stream.removeListener('end', onEnd)
            stream.removeListener('error', onError)
            stream.destroy()
            throw error
          })
      }
    }

    const onEnd = async () => {
      // Wait for validation to complete if it's in progress
      if (validationPromise) {
        try {
          await validationPromise
        } catch (error) {
          reject(error)
          return
        }
      }

      // Stream ended - create new stream with all collected data
      const validationBuffer = Buffer.concat(chunks)
      const fullStream = Readable.from(validationBuffer)

      logger.info('Stream reading complete', {
        totalBytes: totalBytesRead,
        mimeType: expectedMimeType,
      })

      resolve({ validationBuffer, fullStream })
    }

    const onError = (error: Error) => {
      logger.error('Stream reading error', {
        error: error.message,
        stack: error.stack,
      })
      reject(error)
    }

    stream.on('data', onData)
    stream.on('end', onEnd)
    stream.on('error', onError)
  })
}

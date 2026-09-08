/**
 * Global Error Handler Plugin
 *
 * CRITICAL: Prevents Nitro from crashing on socket errors (ECONNABORTED, ECONNRESET, EPIPE)
 * These errors are EXPECTED when clients disconnect abruptly (closing tab, navigation, etc)
 *
 * Without this handler, Nitro restarts the entire server on every socket error,
 * causing instability when multiple browsers access the same page.
 */

import { logger } from '~/core/services/logger.service'

export default defineNitroPlugin(() => {
  // CRITICAL: Catch unhandled rejections BEFORE they crash Nitro
  if (!process.listenerCount('unhandledRejection')) {
    process.on('unhandledRejection', (reason: unknown) => {
      const error = reason as Error & { code?: string; syscall?: string }

      // Socket errors are EXPECTED - don't crash the server
      const isSocketError = error.code === 'ECONNABORTED' ||
                           error.code === 'ECONNRESET' ||
                           error.code === 'EPIPE' ||
                           error.syscall === 'write' ||
                           error.syscall === 'read'

      if (isSocketError) {
        logger.debug('[Error Handler] Socket error caught (client disconnected)', {
          code: error.code,
          syscall: error.syscall,
          message: error.message
        })
        // DO NOT crash - this is normal behavior
        return
      }

      // Log other unhandled rejections as errors
      logger.error('[Error Handler] Unhandled Rejection', {
        error: error.message || String(reason),
        code: error.code,
        stack: error.stack
      })

      // DO NOT crash - just log
    })
  }

  // CRITICAL: Catch uncaught exceptions BEFORE they crash Nitro
  if (!process.listenerCount('uncaughtException')) {
    process.on('uncaughtException', (error: Error) => {
      const errCode = (error as NodeJS.ErrnoException).code
      const errSyscall = (error as NodeJS.ErrnoException).syscall

      // Socket errors are EXPECTED - don't crash the server
      const isSocketError = errCode === 'ECONNABORTED' ||
                           errCode === 'ECONNRESET' ||
                           errCode === 'EPIPE' ||
                           errSyscall === 'write' ||
                           errSyscall === 'read'

      if (isSocketError) {
        logger.debug('[Error Handler] Socket error caught (client disconnected)', {
          code: errCode,
          syscall: errSyscall,
          message: error.message
        })
        // DO NOT crash - this is normal behavior
        return
      }

      // Log other uncaught exceptions as errors
      logger.error('[Error Handler] Uncaught Exception', {
        error: error.message,
        code: errCode,
        stack: error.stack
      })

      // DO NOT crash - just log
    })
  }

  logger.info('[Error Handler] Global error handlers registered')
})

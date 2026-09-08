/**
 * Logger Service Stub
 * Substitui o logger complexo importado da outra arquitetura
 * por simples chamadas ao console padrão, seguindo a Regra de Ouro (Simplicidade).
 */

export const logger = {
  info: (...args: unknown[]) => console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  debug: (...args: unknown[]) => console.debug('[DEBUG]', ...args),
}

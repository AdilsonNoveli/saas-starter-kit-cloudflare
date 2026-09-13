/**
 * Máscara exibida no lugar de um segredo já salvo (chave OpenAI, token do
 * provedor de WhatsApp). Derivada do próprio valor, nunca com prefixo fixo:
 * chaves reais vêm em formatos diferentes (`sk-`, `sk-proj-`, `sk_live_`) e
 * cravar um prefixo faria a máscara mentir sobre o que está guardado.
 *
 * Os 4 últimos caracteres bastam para o lojista reconhecer qual credencial
 * está ativa sem que a máscara sozinha ajude quem a ler no banco ou num
 * screenshot.
 */
export function maskSecret(secret: string): string {
  const prefix = secret.slice(0, Math.min(7, Math.max(0, secret.length - 4)))
  return `${prefix}...${secret.slice(-4)}`
}

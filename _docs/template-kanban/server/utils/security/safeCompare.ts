/**
 * Comparação de strings em tempo (aproximadamente) constante.
 *
 * Usada para comparar Bearer tokens/segredos sem vazar informação por timing.
 * O `===`/`!==` de strings faz short-circuit no primeiro byte divergente, o que
 * — em teoria — permite recuperar o segredo byte a byte medindo latência.
 *
 * Implementação sem dependência de `node:crypto` para funcionar de forma
 * idêntica em dev local e no runtime workerd da Cloudflare Workers.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a)
  const bufB = new TextEncoder().encode(b)

  // XOR dos comprimentos entra no acumulador: comprimentos diferentes → diff != 0,
  // mas ainda percorremos o laço até `len` para não encurtar o tempo total.
  const len = Math.max(bufA.length, bufB.length)
  let diff = bufA.length ^ bufB.length
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0)
  }
  return diff === 0
}

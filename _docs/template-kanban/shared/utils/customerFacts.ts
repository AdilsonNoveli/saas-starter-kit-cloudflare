/**
 * Leitura defensiva dos fatos em `customer_intelligence` que chegam como jsonb
 * (migration 095).
 *
 * Mora em `shared/` pelo mesmo motivo de `customerPreferences.ts`: o agente lê
 * esses fatos para montar a SKILL e a ficha do cliente os exibe ao lojista.
 * Dois parsers do mesmo jsonb divergiriam com o tempo — e a divergência
 * apareceria como "a tela mostra um produto habitual que o agente não conhece".
 */

export interface CustomerTopProduct {
  name: string
  count: number
}

/** Teto de exibição: nome de produto é rótulo, não descrição. */
const PRODUCT_NAME_MAX = 60

/**
 * `raw: unknown` de propósito. O tipo `Json` do `database.types.ts` é recursivo
 * (`Json[] | { [k: string]: Json }`), e percorrê-lo com `Array.isArray` +
 * `flatMap` faz o TypeScript estourar a profundidade de instanciação (TS2589).
 * Entrar por `unknown` corta a recursão na porta e ainda deixa a validação
 * explícita, que é o que se quer para dado vindo do banco.
 */
export function parseTopProducts(raw: unknown): CustomerTopProduct[] {
  if (!Array.isArray(raw)) return []

  const result: CustomerTopProduct[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue

    const candidate = item as { name?: unknown, count?: unknown }
    if (typeof candidate.name !== 'string' || typeof candidate.count !== 'number') continue

    const name = candidate.name.replace(/\s+/g, ' ').trim().slice(0, PRODUCT_NAME_MAX)
    if (name) result.push({ name, count: candidate.count })
  }
  return result
}

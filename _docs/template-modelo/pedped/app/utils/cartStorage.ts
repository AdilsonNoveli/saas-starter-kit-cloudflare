import { z } from 'zod'
import type { CartItem } from '~/stores/cart'

/**
 * Persistência do carrinho em localStorage.
 *
 * Motivação: o carrinho vive em memória (Pinia). Qualquer recarga de página
 * — F5, restauração via bfcache, ou o hard-reload que o Nuxt dispara quando
 * detecta um build desatualizado após a aba ficar muito tempo aberta — zera
 * o estado e o cliente perde o pedido em montagem. Persistir torna o carrinho
 * resiliente a TODAS essas recargas (padrão de mercado em e-commerce).
 *
 * Isolado do store (SoC): funções puras, sem Vue, validadas com zod para nunca
 * reidratar dados corrompidos ou de um schema antigo (falha → carrinho vazio).
 */

const STORAGE_KEY = 'sc:cart'
// v4: encomenda carrega `preorder.delivery_date` (data escolhida no modal).
// Envelopes anteriores são descartados com segurança pelo literal do schema
// (fail-safe → carrinho vazio).
const SCHEMA_VERSION = 4

/** Janela máxima de sobrevivência do carrinho persistido (alinhada à expiração
 *  das sessões: 24h). Evita ressuscitar carrinhos antigos com preços defasados;
 *  o backend segue autoritativo sobre preço/frete no fechamento do pedido. */
const TTL_MS = 24 * 60 * 60 * 1000

// Espelha CartItem (app/stores/cart.ts). Mantido em sincronia com aquele tipo.
const selectedOptionSchema = z.object({
  opcao_item_id: z.string(),
  nome_congelado: z.string(),
  preco_delta_congelado: z.number(),
})

const cartItemSchema = z.object({
  cart_key: z.string(),
  produto_id: z.string(),
  nome: z.string(),
  preco: z.number(),
  quantidade: z.number(),
  foto_url: z.string().nullable().optional(),
  permite_fracionamento: z.boolean().optional(),
  unidade_medida: z.string().nullable().optional(),
  opcoes: z.array(selectedOptionSchema).readonly().optional(),
  preorder: z.object({ delivery_date: z.string() }).optional(),
})

const envelopeSchema = z.object({
  v: z.literal(SCHEMA_VERSION),
  savedAt: z.number(),
  items: z.array(cartItemSchema),
})

/**
 * Lê e valida o carrinho persistido. Retorna `[]` (fail-safe) no servidor,
 * quando ausente, expirado, corrompido ou fora do schema — nesses casos também
 * remove a chave para não reprocessar lixo.
 */
export function loadPersistedCart(): CartItem[] {
  if (import.meta.server || typeof localStorage === 'undefined') return []

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = envelopeSchema.safeParse(JSON.parse(raw))
    if (!parsed.success || Date.now() - parsed.data.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    return parsed.data.items as CartItem[]
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

/**
 * Persiste o carrinho. Carrinho vazio remove a chave (limpeza — evita envelope
 * órfão e reidratação de estado vazio). No-op no servidor.
 */
export function persistCart(items: readonly CartItem[]): void {
  if (import.meta.server || typeof localStorage === 'undefined') return

  if (items.length === 0) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: SCHEMA_VERSION, savedAt: Date.now(), items }),
    )
  } catch {
    // Quota cheia / modo privativo: persistência é best-effort, nunca quebra a UX.
  }
}

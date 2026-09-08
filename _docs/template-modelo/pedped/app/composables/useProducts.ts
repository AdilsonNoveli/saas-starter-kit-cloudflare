import { computed } from 'vue'
import type { CatalogProductItem, CatalogCursor } from '#shared/types/product'
import type { CatalogPromocao } from '#shared/types/promotion'

/** Linha de `categorias` (select *) exposta ao catálogo. Espelha o schema. */
interface Categoria {
  id: string
  nome: string
  descricao: string | null
  icone_url: string | null
  cor: string | null
  ordem: number | null
  ativa: boolean
  /** Categoria âncora do catálogo (substitui a aba "Todos"). Migration 064. */
  principal: boolean
}

interface Kit {
  id: string
  nome: string
  descricao: string | null
  foto_url: string | null
  imagens: string[]
  preco_fixo: number
  disponivel: boolean
  categoria_id: string | null
  etiqueta: string
  kit_itens: { quantidade: number; produtos: { nome: string; preco_venda: number } | null }[]
}

export interface ProductsApiResponse {
  produtos: CatalogProductItem[]
  categorias: Categoria[]
  kits: Kit[]
  promocoes: CatalogPromocao[]
  hasMore: boolean
  /** Pivot da ordem aleatória — reusado pela paginação keyset. */
  pivot: number
  /** Cursor da página 1 (para continuar via /api/catalog/products-page). */
  cursor: CatalogCursor | null
}

export const useProducts = () => {
  // Seed do pivot da ordem aleatória do catálogo: gerado UMA vez por navegação
  // e compartilhado entre SSR e hidratação via `useState` (mecanismo do
  // próprio Nuxt pra estado serializado do servidor pro cliente — a factory
  // só roda no servidor; o cliente lê o mesmo valor do payload, nunca sorteia
  // de novo). Sem isso, o servidor sorteava um pivot ao renderizar e o
  // cliente sorteava OUTRO ao montar, produzindo ordens diferentes de produto
  // e mismatch de hidratação — a ordem aleatória em si é intencional (renova
  // a cada nova navegação/reload), só a geração precisava ser SSR-segura.
  // Nome diferente de `pivot` (abaixo) de propósito: aquele é o valor
  // ECOADO pela resposta (autoridade pra paginação via loadMore), este é só
  // a semente enviada na requisição inicial.
  const pivotSeed = useState('catalog:pivot', () => Math.random())

  const { data, pending, error, refresh } = useFetch<ProductsApiResponse>('/api/products', {
    key: 'catalog-products',
    // .value (não a ref): já é o mesmo número em SSR e hidratação (garantido
    // pelo useState acima), sem necessidade de reatividade aqui — mesma
    // convenção de `fetchNext` em useCatalogInfiniteProducts.ts.
    query: { pivot: pivotSeed.value },
  })

  const produtos = computed<CatalogProductItem[]>(() => (data.value?.produtos ?? []) as CatalogProductItem[])
  const categorias = computed<Categoria[]>(() => data.value?.categorias ?? [])
  const kits = computed<Kit[]>(() => data.value?.kits ?? [])
  const promocoes = computed<CatalogPromocao[]>(() => data.value?.promocoes ?? [])
  const hasMore = computed<boolean>(() => data.value?.hasMore ?? false)
  const pivot = computed<number>(() => data.value?.pivot ?? 0)
  const cursor = computed<CatalogCursor | null>(() => data.value?.cursor ?? null)

  return {
    produtos,
    categorias,
    kits,
    promocoes,
    hasMore,
    pivot,
    cursor,
    pending,
    error,
    refresh,
  }
}

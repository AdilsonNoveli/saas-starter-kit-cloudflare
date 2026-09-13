/**
 * Contrato canônico de configuração de promoções.
 *
 * Tipo discriminado por `tipo_promocao_enum` (espelhando o enum do banco).
 * Editor (admin) e calculadora (cart) DEVEM consumir o mesmo shape.
 *
 * Validação no save é feita por `promocaoConfigSchema` (zod).
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enum espelhado de status_pedido_enum / tipo_promocao_enum
// ---------------------------------------------------------------------------
export const TIPOS_PROMOCAO = ['leve_pague', 'progressivo', 'desconto_carrinho', 'destaque'] as const
export type TipoPromocao = (typeof TIPOS_PROMOCAO)[number]

// ---------------------------------------------------------------------------
// Schemas zod
// ---------------------------------------------------------------------------

/**
 * "Leve X pelo preço de Y" — ex.: leve 3, pague 2.
 *  - compre: quantidade que é cobrada
 *  - leve:   quantidade que é entregue
 * Restrição: leve > compre (caso contrário não há benefício).
 */
export const levePagueSchema = z
  .object({
    compre: z.number().int().min(1),
    leve: z.number().int().min(2),
  })
  .refine((c) => c.leve > c.compre, {
    message: 'A quantidade de "leve" deve ser maior que "compre".',
    path: ['leve'],
  })

/**
 * Desconto progressivo por faixas de quantidade.
 * Cada faixa: a partir de `quantidade` itens, aplica `desconto_percentual` (0–100).
 * As faixas são ordenadas por `quantidade` ASC para aplicar a maior aplicável.
 */
export const progressivoFaixaSchema = z.object({
  quantidade: z.number().int().min(1),
  desconto_percentual: z.number().min(0).max(100),
})

export const progressivoSchema = z.object({
  faixas: z.array(progressivoFaixaSchema).min(1),
})

/**
 * Desconto sobre o carrinho a partir de um valor mínimo.
 * Apenas percentual (decisão atual; "fixo" pode ser adicionado depois).
 */
export const descontoCarrinhoSchema = z.object({
  valor_minimo: z.number().min(0),
  desconto_percentual: z.number().min(0).max(100),
})

/**
 * Destaque/Banner promocional sem mecânica de desconto.
 * Usado para cards visuais informativos no catálogo (ex: combos especiais).
 * Não requer configuração - apenas exibe nome, descrição e foto.
 */
export const destaqueSchema = z.object({
  link_tipo: z.enum(['produto', 'kit']).nullable().optional(),
  produto_id: z.string().uuid().nullable().optional(),
  kit_id: z.string().uuid().nullable().optional(),
})

// União discriminada por `tipo` para uso fora do registro de schemas
export const promocaoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('leve_pague'), configuracao: levePagueSchema }),
  z.object({ tipo: z.literal('progressivo'), configuracao: progressivoSchema }),
  z.object({ tipo: z.literal('desconto_carrinho'), configuracao: descontoCarrinhoSchema }),
  z.object({ tipo: z.literal('destaque'), configuracao: destaqueSchema }),
])

// Mapa de schemas por tipo (útil para validar a `configuracao` isoladamente)
export const promocaoConfigSchemaByTipo = {
  leve_pague: levePagueSchema,
  progressivo: progressivoSchema,
  desconto_carrinho: descontoCarrinhoSchema,
  destaque: destaqueSchema,
} as const

// ---------------------------------------------------------------------------
// Tipos derivados (use-os no editor e na calculadora)
// ---------------------------------------------------------------------------
export type LevePagueConfig = z.infer<typeof levePagueSchema>
export type ProgressivoFaixa = z.infer<typeof progressivoFaixaSchema>
export type ProgressivoConfig = z.infer<typeof progressivoSchema>
export type DescontoCarrinhoConfig = z.infer<typeof descontoCarrinhoSchema>
export type DestaqueConfig = z.infer<typeof destaqueSchema>

export type PromocaoConfigByTipo = {
  leve_pague: LevePagueConfig
  progressivo: ProgressivoConfig
  desconto_carrinho: DescontoCarrinhoConfig
  destaque: DestaqueConfig
}

export type PromocaoConfig =
  | LevePagueConfig
  | ProgressivoConfig
  | DescontoCarrinhoConfig
  | DestaqueConfig

/**
 * Defaults usados ao trocar o tipo no editor.
 * Manter sincronizado com o seed do schema acima.
 */
export const PROMOCAO_DEFAULTS: PromocaoConfigByTipo = {
  leve_pague: { compre: 2, leve: 3 },
  progressivo: {
    faixas: [
      { quantidade: 2, desconto_percentual: 10 },
      { quantidade: 3, desconto_percentual: 15 },
    ],
  },
  desconto_carrinho: { valor_minimo: 100, desconto_percentual: 10 },
  destaque: { link_tipo: null, produto_id: null, kit_id: null },
}

// ---------------------------------------------------------------------------
// CatalogPromocao — shape retornado por /api/products para o cliente
// (declarado após os tipos derivados para que LevePagueConfig etc. já existam)
// ---------------------------------------------------------------------------

/**
 * Incentivo de upsell exposto ao agente/cliente: quanto falta para o próximo
 * nível de desconto. Só os tipos com faixa de progressão têm incentivo
 * ('progressivo' por quantidade, 'desconto_carrinho' por valor). Derivado das
 * calculadoras puras — nunca adivinhado; ausente quando nada está configurado.
 */
export interface PromotionIncentive {
  readonly tipo: Extract<TipoPromocao, 'progressivo' | 'desconto_carrinho'>
  /** Quanto falta: unidades (progressivo) ou reais (desconto_carrinho). */
  readonly faltam: number
  readonly unidade: 'itens' | 'reais'
  /** Percentual desbloqueado ao atingir o próximo nível. */
  readonly desconto_percentual: number
}

/** Produto participante de uma promoção (vindo de promocao_produtos). */
export interface PromocaoProdutoAssoc {
  produto_id: string
}

/**
 * Promoção ativa retornada pelo catálogo público.
 * Inclui a lista de produto_ids associados (vazia = aplica a todos os produtos do carrinho).
 */
export interface CatalogPromocao {
  id: string
  nome: string
  descricao: string | null
  foto_url: string | null
  imagens: string[]
  tipo: TipoPromocao
  configuracao: PromocaoConfig
  ativa: boolean
  data_inicio: string | null
  data_fim: string | null
  categoria_id: string | null
  criado_em: string
  /** Posição do banner no catálogo (apenas tipo 'destaque'). */
  posicao_exibicao: 'topo' | 'meio' | 'rodape' | null
  /** Categorias onde o banner aparece. Vazio/null = usa categoria_id legado ou exibe em todas. */
  categorias_ids: string[] | null
  /** IDs dos produtos que participam desta promoção. Vazio = aplica ao carrinho inteiro. */
  promocao_produtos: PromocaoProdutoAssoc[]
}

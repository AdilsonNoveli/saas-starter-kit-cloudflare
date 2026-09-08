<script setup lang="ts">
/**
 * @descricao: Formulário de produto (Fase 5.4).
 * @objetivo: Layout enterprise — foto + básico em 2 colunas, precificação
 *   em linha, preco_venda readOnly (GENERATED ALWAYS AS STORED no banco),
 *   editor de opções/variações. Validação via Zod + useNotification;
 *   zero alert() nativo.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, Plus, Trash2, ImagePlus, X, Layout, Sliders, Link2, DollarSign, Settings, Sparkles, CalendarDays, ShoppingBag, Check } from '@lucide/vue'
import { z } from 'zod'
import { navigateTo, useState } from 'nuxt/app'
import { Constants, type Json } from '~/types/database.types'
import type { TipoOpcaoGrupo } from '~~/shared/types/product'
import { MAX_PRODUCT_IMAGES, getProductGallery } from '~~/shared/types/product'
import type { PreorderConfig, ProductType } from '~~/shared/types/preorder'
import { useNotification } from '~/composables/useNotification'
import { useOrphanImageCleanup } from '~/composables/useOrphanImageCleanup'
import { useCategories } from '~/composables/useCategories'
import { useImageUpload } from '~/composables/useImageUpload'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')

const isNew = computed<boolean>(() => route.params.id === 'new')
const loading = ref<boolean>(false)
const saving = ref<boolean>(false)

// === Validação ===

const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(200),
  categoria_id: z.string().min(1, 'Categoria obrigatória'),
  unidade_medida: z.enum(['unidade', 'kg', 'litro', 'metro', 'caixa']),
  preco_custo: z.number().nonnegative('Custo deve ser ≥ 0'),
  margem_lucro: z.number().nonnegative('Margem deve ser ≥ 0'),
  preco_promocional: z.number().positive('Preço promocional deve ser > 0').nullable(),
  disponivel: z.boolean(),
  descricao: z.string().optional(),
  // Galeria ordenada (a primeira é a capa). Split capa/extras acontece no save.
  fotos: z.array(z.string()).max(MAX_PRODUCT_IMAGES),
  permite_fracionamento: z.boolean(),
  // Sinônimos: variações e termos coloquiais que a LLM pode usar para encontrar o produto.
  // Armazenados em lowercase; o índice GIN aplica f_unaccent(lower(...)) automaticamente.
  sinonimos: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  product_type: z.enum(['stock', 'preorder']),
})

/**
 * Regras de encomenda — validadas apenas quando product_type !== 'stock'.
 * daily_capacity removido: migration 113 — fonte única em produtos.producao_diaria_limite
 * (estoqueForm.producao_diaria_limite), validada separadamente no save.
 */
const preorderConfigSchema = z
  .object({
    min_quantity: z.number().positive('Quantidade mínima deve ser > 0'),
    max_quantity: z.number().positive('Quantidade máxima deve ser > 0'),
    min_lead_days: z.number().int().nonnegative('Antecedência mínima deve ser ≥ 0'),
    max_lead_days: z.number().int().positive('Antecedência máxima deve ser > 0'),
  })
  .refine((v) => v.min_quantity <= v.max_quantity, {
    message: 'Quantidade mínima não pode exceder a máxima',
  })
  .refine((v) => v.min_lead_days <= v.max_lead_days, {
    message: 'Antecedência mínima não pode exceder a máxima',
  })

// === Formulário principal ===

// Fonte única compartilhada (products, kits, promotions).
// autoLoad=false: carregamos dentro de loadData para paralelizar com o produto.
const { categorias, load: loadCategorias, toOptions: categoriaOptionsFn } = useCategories({ autoLoad: false })

const form = ref({
  nome: '',
  categoria_id: '',
  unidade_medida: 'unidade' as 'unidade' | 'kg' | 'litro' | 'metro' | 'caixa',
  descricao: '',
  fotos: [] as string[],
  preco_custo: 0,
  margem_lucro: 0,
  preco_promocional: null as number | null,
  disponivel: true,
  permite_fracionamento: false,
  sinonimos: [] as string[],
  product_type: 'stock' as ProductType,
})

/**
 * Regras de encomenda editáveis (alimentam produtos.preorder_config).
 * daily_capacity removido: migration 113 — gerenciado via estoqueForm.producao_diaria_limite.
 */
const DEFAULT_PREORDER_FORM = {
  min_quantity: 1,
  max_quantity: 10,
  min_lead_days: 1,
  max_lead_days: 30,
}
const preorderForm = ref({ ...DEFAULT_PREORDER_FORM })

const isPreorderEnabled = computed<boolean>(() => form.value.product_type !== 'stock')

// === Gestão de Estoque (migration 111) ===
// Política é atributo do PRODUTO; OPERAÇÃO do dia a dia (ajustes de saldo,
// histórico) vive em /admin/inventory — não misturar as duas responsabilidades
// (SoC, ver _docs/plano-estoque.md). Por isso `estoque_atual` só entra no
// payload de save quando o produto é NOVO (valor inicial); numa edição, o
// saldo é preservado e só muda via ajuste manual na página de Estoque.
const DEFAULT_ESTOQUE_FORM = {
  controle_estoque: 'nenhum' as 'nenhum' | 'contagem' | 'producao_diaria',
  estoque_atual: 0,
  estoque_minimo: null as number | null,
  producao_diaria_limite: null as number | null,
}
const estoqueForm = ref({ ...DEFAULT_ESTOQUE_FORM })

// Ajuste inline (issue real de UX: sem isto, "Contagem" num produto já
// existente — ex.: refrigerante pronto — não tinha como receber estoque
// nenhum sem sair da página). `ajusteDelta` é o delta (+/-) digitado, NUNCA
// o saldo absoluto — aplicar chama a mesma API de ajuste manual
// (POST /api/admin/inventory/movements) direto, sem modal, mantendo a
// trilha de auditoria (estoque_movimentacoes) intacta.
const ajusteDelta = ref<number>(0)
const aplicandoAjuste = ref(false)

async function aplicarAjusteInline(): Promise<void> {
  if (isNew.value || !ajusteDelta.value) return

  aplicandoAjuste.value = true
  try {
    const result = await $fetch<{ success: true, estoque_atual: number }>('/api/admin/inventory/movements', {
      method: 'POST',
      body: {
        tipo_entidade: 'produto',
        entidade_id: route.params.id as string,
        quantidade: ajusteDelta.value,
        motivo: null,
      },
    })
    estoqueForm.value.estoque_atual = result.estoque_atual
    ajusteDelta.value = 0
    notify.success('Estoque ajustado', `Novo saldo: ${result.estoque_atual}`)
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao ajustar estoque', message)
  } finally {
    aplicandoAjuste.value = false
  }
}

const ALL_CONTROLE_ESTOQUE_OPTIONS = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'contagem', label: 'Contagem' },
  { value: 'producao_diaria', label: 'Produção diária' },
]

/**
 * 'producao_diaria' e encomenda são mutuamente exclusivos (migration 112):
 * encomenda já tem sua PRÓPRIA capacidade diária (preorder_config.daily_capacity,
 * por data agendada) — 'producao_diaria' é o equivalente pra pronta entrega
 * sem agendamento, nunca os dois pro mesmo produto. Escondido da lista em vez
 * de só validado: a opção nem deveria existir como escolha pra quem já
 * configurou Encomenda acima.
 */
const CONTROLE_ESTOQUE_OPTIONS = computed(() =>
  isPreorderEnabled.value
    ? ALL_CONTROLE_ESTOQUE_OPTIONS.filter((o) => o.value !== 'producao_diaria')
    : ALL_CONTROLE_ESTOQUE_OPTIONS,
)

// Produto muda de Estoque pra Encomenda com 'Produção diária' já selecionado:
// reseta pra 'nenhum' (a constraint do banco rejeitaria o save de qualquer
// forma, mas o formulário não deve nem deixar chegar nesse estado).
watch(isPreorderEnabled, (enabled) => {
  if (enabled && estoqueForm.value.controle_estoque === 'producao_diaria') {
    estoqueForm.value.controle_estoque = 'nenhum'
    estoqueForm.value.producao_diaria_limite = null
  }
})

interface InsumoOption {
  id: string
  nome: string
  unidade_medida: string
}
const insumosDisponiveis = ref<InsumoOption[]>([])
const insumoOptions = computed(() => insumosDisponiveis.value.map((i) => ({ value: i.id, label: `${i.nome} (${i.unidade_medida})` })))

interface ReceitaItem { insumo_id: string, quantidade_por_unidade: number }
const receitaInsumos = ref<ReceitaItem[]>([])

function addReceitaItem(): void {
  receitaInsumos.value.push({ insumo_id: '', quantidade_por_unidade: 1 })
}
function removeReceitaItem(index: number): void {
  receitaInsumos.value.splice(index, 1)
}

async function loadInsumosDisponiveis(): Promise<void> {
  try {
    const res = await $fetch<{ data: InsumoOption[] }>('/api/admin/inventory/insumos')
    insumosDisponiveis.value = res.data
  } catch {
    insumosDisponiveis.value = []
  }
}

const sinonimoQuery = ref('')

function addSinonimo(): void {
  const v = sinonimoQuery.value.trim().toLowerCase()
  if (v && !form.value.sinonimos.includes(v) && form.value.sinonimos.length < 20) {
    form.value.sinonimos.push(v)
  }
  sinonimoQuery.value = ''
}

function handleSinonimosKeydown(e: KeyboardEvent): void {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault()
    addSinonimo()
  } else if (e.key === 'Backspace' && sinonimoQuery.value === '' && form.value.sinonimos.length > 0) {
    form.value.sinonimos.pop()
  }
}

// === Grupos de opções (declarados antes de useOrphanImageCleanup) ===

interface ItemForm {
  id: string | null
  nome: string
  preco_delta: number
  selecionado_padrao: boolean
  ativo: boolean
  ordem: number
  foto_url: string | null
}

interface GrupoForm {
  id: string | null
  nome: string
  tipo: TipoOpcaoGrupo
  obrigatorio: boolean
  min_selecoes: number
  max_selecoes: number
  ordem: number
  itens: ItemForm[]
}

const grupos = ref<GrupoForm[]>([])
const deletedGrupoIds = ref<string[]>([])
const deletedItemIds = ref<string[]>([])

// Limpeza de imagens órfãs no S3 (fonte única compartilhada com o form de kits).
const { cleanup: cleanupOrphanImages } = useOrphanImageCleanup(() => [
  ...form.value.fotos,
  ...grupos.value.flatMap((g) => g.itens.map((i) => i.foto_url).filter((u): u is string => typeof u === 'string')),
])

/** Preço final derivado do custo × margem (preview síncrono do que o banco calcularia). */
const sellingPricePreview = computed<number>(() =>
  Math.round(Number(form.value.preco_custo) * (1 + Number(form.value.margem_lucro) / 100) * 100) / 100,
)

/**
 * Preço final customizado pelo comerciante (ref mutável).
 * null = usar derivado (custo × margem); number = valor digitado diretamente.
 */
const precoFinalCustomizado = ref<number | null>(null)

/** Preço final efetivo: usa o customizado se definido, senão o derivado custo×margem. */
const precoFinalEfetivo = computed<number>(() =>
  precoFinalCustomizado.value !== null ? precoFinalCustomizado.value : sellingPricePreview.value,
)

/**
 * Valor de exibição formatado em pt-BR (ex: "6,00") para o campo de texto do Preço Final.
 * Sincronizado com precoFinalEfetivo; updated por onPrecoFinalBlur.
 */
const precoFinalDisplay = ref<string>('')

/** Formata um número para exibição em pt-BR sem símbolo (ex: 6.5 → "6,50"). */
function formatDecimalBR(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

/**
 * Handler chamado ao digitar no campo Preço Final.
 * Apenas atualiza o texto de exibição — não parseamos até o blur para não
 * interromper a digitação (ex: "1," ainda não é número completo).
 */
function onPrecoFinalInput(event: Event): void {
  precoFinalDisplay.value = (event.target as HTMLInputElement).value
}

/**
 * Handler chamado ao sair do campo (blur).
 * Parseia o valor pt-BR, atualiza precoFinalCustomizado e recalcula margem.
 * Fórmula inversa: margem = ((precoFinal / precoCusto) - 1) × 100
 */
function onPrecoFinalBlur(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  // Normaliza: troca vírgula por ponto para parseFloat
  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const val = parseFloat(normalized)
  if (isNaN(val) || val <= 0) {
    // Valor inválido: reverte para o preço efetivo anterior
    precoFinalDisplay.value = formatDecimalBR(precoFinalEfetivo.value)
    return
  }
  const rounded = Math.round(val * 100) / 100
  precoFinalCustomizado.value = rounded
  precoFinalDisplay.value = formatDecimalBR(rounded)
  const custo = Number(form.value.preco_custo)
  if (custo > 0) {
    form.value.margem_lucro = Math.round(((rounded / custo) - 1) * 10000) / 100
  }
}

// Sincroniza o display sempre que precoFinalEfetivo muda de fora (custo/margem alterados)
watch(precoFinalEfetivo, (val) => {
  // Só sincroniza se o campo não estiver sendo digitado (precoFinalDisplay está formatado)
  const normalized = precoFinalDisplay.value.replace(/\./g, '').replace(',', '.')
  const current = parseFloat(normalized)
  if (isNaN(current) || Math.abs(current - val) > 0.001) {
    precoFinalDisplay.value = formatDecimalBR(val)
  }
}, { immediate: true })

const effectiveBasePrice = computed<number>(() =>
  form.value.preco_promocional != null
    ? Number(form.value.preco_promocional)
    : sellingPricePreview.value
)

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

// Upload de fotos das opções
const optionFileInput = ref<HTMLInputElement | null>(null)
const uploadingTarget = ref<{ gi: number; ii: number } | null>(null)
const { uploading: uploadingOption, uploadImage: uploadOptionImage } = useImageUpload()

function triggerOptionUpload(gi: number, ii: number): void {
  uploadingTarget.value = { gi, ii }
  optionFileInput.value?.click()
}

async function onOptionFileSelected(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && uploadingTarget.value) {
    const { gi, ii } = uploadingTarget.value
    const item = grupos.value[gi]?.itens[ii]
    if (item) {
      const url = await uploadOptionImage(file, 'produtos')
      if (url) {
        item.foto_url = url
      }
    }
  }
  uploadingTarget.value = null
  if (optionFileInput.value) optionFileInput.value.value = ''
}

const draggingOptionTarget = ref<{ gi: number; ii: number } | null>(null)

async function onOptionFileDropped(event: DragEvent, gi: number, ii: number): Promise<void> {
  draggingOptionTarget.value = null
  if (uploadingOption.value) return
  
  const files = event.dataTransfer?.files
  if (!files) return
  
  const file = Array.from(files).find(f => f.type.startsWith('image/'))
  if (file) {
    const item = grupos.value[gi]?.itens[ii]
    if (item) {
      uploadingTarget.value = { gi, ii }
      const url = await uploadOptionImage(file, 'produtos')
      if (url) {
        item.foto_url = url
      }
      uploadingTarget.value = null
    }
  }
}

function removeOptionPhoto(gi: number, ii: number): void {
  const item = grupos.value[gi]?.itens[ii]
  if (item) {
    item.foto_url = null
  }
}

// Reordenação de grupos e itens
function moveGrupo(idx: number, direction: 'up' | 'down'): void {
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= grupos.value.length) return
  
  const temp = grupos.value[idx]!
  grupos.value[idx] = grupos.value[targetIdx]!
  grupos.value[targetIdx] = temp
  
  grupos.value.forEach((g, i) => {
    g.ordem = i
  })
}

function moveItem(grupoIdx: number, itemIdx: number, direction: 'up' | 'down'): void {
  const g = grupos.value[grupoIdx]
  if (!g) return
  const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1
  if (targetIdx < 0 || targetIdx >= g.itens.length) return
  
  const temp = g.itens[itemIdx]!
  g.itens[itemIdx] = g.itens[targetIdx]!
  g.itens[targetIdx] = temp
  
  g.itens.forEach((item, i) => {
    item.ordem = i
  })
}

function addGrupo(): void {
  grupos.value.push({
    id: null,
    nome: '',
    tipo: 'single',
    obrigatorio: false,
    min_selecoes: 0,
    max_selecoes: 1,
    ordem: grupos.value.length,
    itens: [],
  })
}

async function removeGrupo(idx: number): Promise<void> {
  const g = grupos.value[idx]
  if (!g) return
  const ok = await confirm({
    title: 'Remover grupo?',
    message: g.nome ? `Remover "${g.nome}" e todos os seus itens?` : 'Remover este grupo de opções?',
    variant: 'error',
    confirmText: 'Remover',
  })
  if (!ok) return
  if (g.id) deletedGrupoIds.value.push(g.id)
  grupos.value.splice(idx, 1)
}

function addItem(grupoIdx: number): void {
  grupos.value[grupoIdx]?.itens.push({
    id: null,
    nome: '',
    preco_delta: 0,
    selecionado_padrao: false,
    ativo: true,
    foto_url: null,
    ordem: grupos.value[grupoIdx]!.itens.length,
  })
}

async function removeItem(grupoIdx: number, itemIdx: number): Promise<void> {
  const g = grupos.value[grupoIdx]
  if (!g) return
  const item = g.itens[itemIdx]
  if (!item) return
  const ok = await confirm({
    title: 'Remover item?',
    message: item.nome ? `Remover "${item.nome}"?` : 'Remover este item?',
    variant: 'error',
    confirmText: 'Remover',
  })
  if (!ok) return
  if (item.id) deletedItemIds.value.push(item.id)
  g.itens.splice(itemIdx, 1)
}

// === Carga inicial ===

async function loadData(): Promise<void> {
  loading.value = true

  // Await paralelo: garante que o seed de "primeira categoria" (produto novo)
  // veja a lista carregada.
  const [, prodRes] = await Promise.all([
    loadCategorias(),
    isNew.value
      ? Promise.resolve({ data: null, error: null })
      : supabase.from('produtos').select('*').eq('id', route.params.id as string).maybeSingle(),
  ])

  if (!isNew.value) {
    if (prodRes.data === null) {
      await navigateTo('/admin/products')
      return
    }
    const p = prodRes.data
    /** Valores válidos do formulário (subconjunto do enum do banco). */
    // Derivado do enum do banco: a lista antes era hardcoded com 3 unidades e
    // ficou defasada, então produtos salvos como `metro`/`caixa` voltavam do
    // banco rebaixados para `unidade` — perda silenciosa ao reabrir o produto.
    // O fallback permanece para valores realmente desconhecidos.
    type UnidadeForm = typeof form.value.unidade_medida
    const UNIDADES_SUPORTADAS = Constants.public.Enums.unidade_medida_enum
    const rawUnidade = p.unidade_medida ?? 'unidade'
    const unidadeSegura: UnidadeForm = (UNIDADES_SUPORTADAS as readonly string[]).includes(rawUnidade)
      ? (rawUnidade as UnidadeForm)
      : 'unidade'

    form.value = {
      nome: p.nome ?? '',
      categoria_id: p.categoria_id ?? '',
      unidade_medida: unidadeSegura,
      descricao: p.descricao ?? '',
      fotos: getProductGallery(p),
      preco_custo: Number(p.preco_custo ?? 0),
      margem_lucro: Number(p.margem_lucro ?? 0),
      preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : null,
      disponivel: p.disponivel ?? true,
      permite_fracionamento: p.permite_fracionamento ?? false,
      sinonimos: Array.isArray(p.sinonimos) ? p.sinonimos : [],
      product_type: (p.product_type as ProductType) ?? 'stock',
    }

    const savedConfig = p.preorder_config as unknown as PreorderConfig | null
    // daily_capacity removido do JSON (migration 113 step 2): lido de p.producao_diaria_limite
    // via estoqueForm abaixo — não mais do JSONB.
    preorderForm.value = savedConfig
      ? {
          min_quantity: Number(savedConfig.min_quantity),
          max_quantity: Number(savedConfig.max_quantity),
          min_lead_days: Number(savedConfig.min_lead_days),
          max_lead_days: Number(savedConfig.max_lead_days),
        }
      : { ...DEFAULT_PREORDER_FORM }

    estoqueForm.value = {
      controle_estoque: (p.controle_estoque as 'nenhum' | 'contagem' | 'producao_diaria' | undefined) ?? 'nenhum',
      estoque_atual: p.estoque_atual != null ? Number(p.estoque_atual) : 0,
      estoque_minimo: p.estoque_minimo != null ? Number(p.estoque_minimo) : null,
      producao_diaria_limite: p.producao_diaria_limite != null ? Number(p.producao_diaria_limite) : null,
    }

    const { data: receitaData } = await supabase
      .from('produto_insumos')
      .select('insumo_id, quantidade_por_unidade')
      .eq('produto_id', route.params.id as string)
    receitaInsumos.value = (receitaData ?? []).map((r) => ({
      insumo_id: r.insumo_id,
      quantidade_por_unidade: Number(r.quantidade_por_unidade),
    }))

    // Se o banco já tem preco_venda gravado, inicializa o campo customizado com ele.
    // Isso garante que edições subsequentes partem do valor real — não do derivado.
    if (p.preco_venda != null) {
      precoFinalCustomizado.value = Number(p.preco_venda)
    } else {
      precoFinalCustomizado.value = null
    }
    // Força atualização do display imediatamente após carregar os dados do banco.
    precoFinalDisplay.value = formatDecimalBR(precoFinalEfetivo.value)

    // Carrega grupos + itens do produto
    const { data: gruposData } = await supabase
      .from('produto_opcao_grupo')
      .select('*, produto_opcao_item(id, nome, preco_delta, selecionado_padrao, ativo, ordem, grupo_id, foto_url)')
      .eq('produto_id', route.params.id as string)
      .order('ordem', { ascending: true })
      .order('ordem', { ascending: true, referencedTable: 'produto_opcao_item' })

    grupos.value = (gruposData ?? []).map((g) => ({
      id: g.id,
      nome: g.nome,
      tipo: g.tipo as TipoOpcaoGrupo,
      obrigatorio: g.obrigatorio,
      min_selecoes: g.min_selecoes ?? 0,
      max_selecoes: g.max_selecoes ?? 1,
      ordem: g.ordem,
      itens: (g.produto_opcao_item ?? []).map((i) => ({
        id: i.id,
        nome: i.nome,
        preco_delta: Number(i.preco_delta ?? 0),
        selecionado_padrao: i.selecionado_padrao ?? false,
        ativo: i.ativo ?? true,
        ordem: i.ordem,
        foto_url: i.foto_url ?? null,
      })),
    }))

    // Carrega produtos relacionados
    const { data: relLinks } = await supabase
      .from('produto_relacionados')
      .select('produto_relacionado_id')
      .eq('produto_id', route.params.id as string)
      .order('ordem', { ascending: true })

    if (relLinks && relLinks.length > 0) {
      const relIds = relLinks.map((r) => r.produto_relacionado_id)
      const { data: relProds } = await supabase
        .from('produtos')
        .select('id, nome, foto_url, preco_venda')
        .in('id', relIds)
      const byId = new Map((relProds ?? []).map((p) => [p.id, p]))
      relacionados.value = relIds
        .map((id) => byId.get(id))
        .filter((p): p is ProdutoRelacionado => p !== undefined)
    } else {
      relacionados.value = []
    }
  } else {
    // Redefine estados para produto novo para evitar vazamento de dados de edições anteriores
    if (categorias.value.length > 0) {
      form.value.categoria_id = categorias.value[0]!.id
    }
    form.value.nome = ''
    form.value.descricao = ''
    form.value.fotos = []
    form.value.preco_custo = 0
    form.value.margem_lucro = 0
    form.value.preco_promocional = null
    form.value.disponivel = true
    form.value.permite_fracionamento = false
    form.value.sinonimos = []
    form.value.product_type = 'stock'
    preorderForm.value = { ...DEFAULT_PREORDER_FORM }
    estoqueForm.value = { ...DEFAULT_ESTOQUE_FORM }
    receitaInsumos.value = []

    precoFinalCustomizado.value = null
    grupos.value = []
    relacionados.value = []
  }

  loading.value = false
}

onMounted(() => {
  void loadData()
  void loadInsumosDisponiveis()
})

// Sincroniza min/max de acordo com tipo e obrigatoriedade, garantindo integridade das regras
watch(
  () => grupos.value.map((g) => ({ tipo: g.tipo, obrigatorio: g.obrigatorio, max_selecoes: g.max_selecoes })),
  (val) => {
    val.forEach((v, idx) => {
      const g = grupos.value[idx]
      if (!g) return
      if (v.tipo === 'single') {
        g.max_selecoes = 1
        g.min_selecoes = v.obrigatorio ? 1 : 0
      } else if (v.tipo === 'toggle') {
        g.max_selecoes = 0
        g.min_selecoes = 0
      } else {
        // Para multiple, garante que o min não ultrapasse o max
        if (g.min_selecoes > g.max_selecoes) g.min_selecoes = g.max_selecoes
      }
    })
  },
  { deep: true }
)

// === Salvar (helpers decompostos para KISS / cognitive complexity) ===

async function saveGruposOpcoes(produtoId: string): Promise<void> {
  // 1. Deletar grupos marcados (CASCADE deleta os itens do grupo)
  if (deletedGrupoIds.value.length > 0) {
    await supabase.from('produto_opcao_grupo').delete().in('id', deletedGrupoIds.value)
    deletedGrupoIds.value = []
  }

  // 2. Deletar itens marcados individualmente
  if (deletedItemIds.value.length > 0) {
    await supabase.from('produto_opcao_item').delete().in('id', deletedItemIds.value)
    deletedItemIds.value = []
  }

  // 3. Upsert grupos e seus itens em sequência
  for (let gi = 0; gi < grupos.value.length; gi++) {
    const g = grupos.value[gi]!
    await saveGrupo(g, gi, produtoId)
  }
}

async function saveGrupo(g: GrupoForm, gi: number, produtoId: string): Promise<void> {
  const grupoPayload = {
    produto_id: produtoId,
    nome: g.nome,
    tipo: g.tipo,
    obrigatorio: g.obrigatorio,
    min_selecoes: g.min_selecoes,
    max_selecoes: g.max_selecoes,
    ordem: gi,
  }

  if (g.id) {
    await supabase.from('produto_opcao_grupo').update(grupoPayload).eq('id', g.id)
  } else {
    const { data: gd } = await supabase
      .from('produto_opcao_grupo')
      .insert([grupoPayload])
      .select('id')
      .single()
    if (gd) g.id = gd.id
  }

  if (!g.id) return

  for (let ii = 0; ii < g.itens.length; ii++) {
    await saveItem(g.itens[ii]!, ii, g.id)
  }
}

async function saveItem(item: ItemForm, ii: number, grupoId: string): Promise<void> {
  const itemPayload = {
    grupo_id: grupoId,
    nome: item.nome,
    preco_delta: item.preco_delta,
    selecionado_padrao: item.selecionado_padrao,
    ativo: item.ativo,
    ordem: ii,
    foto_url: item.foto_url,
  }
  if (item.id) {
    await supabase.from('produto_opcao_item').update(itemPayload).eq('id', item.id)
  } else {
    const { data: id_ } = await supabase
      .from('produto_opcao_item')
      .insert([itemPayload])
      .select('id')
      .single()
    if (id_) item.id = id_.id
  }
}

async function save(exitAfterSave: boolean = true): Promise<void> {
  addSinonimo()
  const parsed = produtoSchema.safeParse(form.value)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    notify.error('Campos inválidos', first?.message)
    return
  }

  // Regras de encomenda: validadas apenas quando o modo de venda as exige.
  let preorderConfig: PreorderConfig | null = null
  if (parsed.data.product_type !== 'stock') {
    const parsedPreorder = preorderConfigSchema.safeParse(preorderForm.value)
    if (!parsedPreorder.success) {
      notify.error('Configuração de encomenda inválida', parsedPreorder.error.issues[0]?.message)
      return
    }
    preorderConfig = { scheduling_type: 'made_to_order', ...parsedPreorder.data }

    // migration 113: capacidade diária de encomenda agora vive em producao_diaria_limite.
    if (!estoqueForm.value.producao_diaria_limite || estoqueForm.value.producao_diaria_limite <= 0) {
      notify.error('Configuração de encomenda inválida', 'Informe a capacidade limite diária (maior que zero) no card Estoque.')
      return
    }
    if (estoqueForm.value.producao_diaria_limite < preorderForm.value.min_quantity) {
      notify.error('Configuração de encomenda inválida', `Capacidade diária (${estoqueForm.value.producao_diaria_limite}) deve ser ≥ quantidade mínima por pedido (${preorderForm.value.min_quantity}).`)
      return
    }
  }

  // Gestão de Estoque (migration 111): validação leve, condicional à política.
  if (estoqueForm.value.controle_estoque === 'producao_diaria'
    && (!estoqueForm.value.producao_diaria_limite || estoqueForm.value.producao_diaria_limite <= 0)) {
    notify.error('Estoque inválido', 'Informe a capacidade de produção diária (maior que zero).')
    return
  }
  if (receitaInsumos.value.some((r) => !r.insumo_id || !(r.quantidade_por_unidade > 0))) {
    notify.error('Receita inválida', 'Cada insumo usado precisa de uma seleção e uma quantidade maior que zero.')
    return
  }

  saving.value = true

  // Payload não inclui preco_venda (GENERATED ALWAYS AS STORED)
  const payload = {
    categoria_id: parsed.data.categoria_id,
    nome: parsed.data.nome,
    descricao: parsed.data.descricao ?? '',
    // Capa = primeira foto; extras = restante (mesma convenção de getProductGallery).
    foto_url: parsed.data.fotos[0] ?? '',
    imagens: parsed.data.fotos.slice(1),
    preco_custo: parsed.data.preco_custo,
    margem_lucro: parsed.data.margem_lucro,
    // preco_venda precisa ser enviado explicitamente pois não é GENERATED no banco.
    // Usa o preço final customizado se definido, senão deriva do custo × margem.
    preco_venda: Math.round(precoFinalEfetivo.value * 100) / 100,
    preco_promocional: parsed.data.preco_promocional,
    unidade_medida: parsed.data.unidade_medida,
    permite_fracionamento: parsed.data.permite_fracionamento,
    disponivel: parsed.data.disponivel,
    // Sinônimos: normaliza para lowercase antes de salvar para consistência com o índice
    sinonimos: parsed.data.sinonimos.map((s) => s.toLowerCase()),
    // Pre-Order System: modo de venda + regras (null quando venda imediata).
    product_type: parsed.data.product_type,
    preorder_config: preorderConfig as unknown as Json,
    // Requisitos para o motor de missing_fields (EPIC 2, migration 084).
    // Derivado do "Tipo de venda" — não há campo próprio no form porque hoje
    // requires_date é 1:1 com product_type; um toggle separado duplicaria a
    // mesma decisão (DRY). Se requirements ganhar sinais independentes no
    // futuro, aí sim precisa de UI dedicada.
    requirements: { requires_date: parsed.data.product_type !== 'stock' } as unknown as Json,
    // Gestão de Estoque (migration 111): política do produto. `estoque_atual`
    // só entra no payload na CRIAÇÃO (valor inicial) — numa edição, o saldo é
    // operacional e só muda via ajuste manual em /admin/inventory (SoC).
    // migration 113: producao_diaria_limite também é salvo para produtos de encomenda
    // independentemente de controle_estoque (os dois consomem o mesmo campo).
    controle_estoque: estoqueForm.value.controle_estoque,
    estoque_minimo: estoqueForm.value.estoque_minimo,
    producao_diaria_limite:
      estoqueForm.value.controle_estoque === 'producao_diaria' || form.value.product_type === 'preorder'
        ? estoqueForm.value.producao_diaria_limite
        : null,
    ...(isNew.value ? { estoque_atual: estoqueForm.value.estoque_atual } : {}),
  }

  let produtoId = isNew.value ? null : (route.params.id as string)

  if (!isNew.value && produtoId) {
    const { error } = await supabase.from('produtos').update(payload).eq('id', produtoId)
    if (error) {
      notify.error('Erro ao salvar', error.message)
      saving.value = false
      return
    }
  } else {
    const { data, error } = await supabase.from('produtos').insert([payload]).select('id').single()
    if (error || !data) {
      notify.error('Erro ao criar produto', error?.message)
      saving.value = false
      return
    }
    produtoId = data.id
  }

  if (produtoId) {
    await saveGruposOpcoes(produtoId)

    // Sync produtos relacionados (delete-and-reinsert é idempotente e seguro aqui)
    const { error: deleteError } = await supabase.from('produto_relacionados').delete().eq('produto_id', produtoId)
    if (deleteError) {
      notify.error('Erro ao sincronizar relacionados', deleteError.message)
      saving.value = false
      return
    }

    if (relacionados.value.length > 0) {
      const { error: insertError } = await supabase.from('produto_relacionados').insert(
        relacionados.value.map((r, i) => ({
          produto_id: produtoId,
          produto_relacionado_id: r.id,
          ordem: i,
        })),
      )
      if (insertError) {
        notify.error('Erro ao salvar relacionados', insertError.message)
        saving.value = false
        return
      }
    }

    // Receita/BOM (migration 111): delete+reinsert via endpoint dedicado
    // (mesmo "set semântico" de produto_relacionados acima).
    try {
      await $fetch('/api/admin/inventory/recipe', {
        method: 'PUT',
        body: { produto_id: produtoId, insumos: receitaInsumos.value },
      })
    } catch (err) {
      const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      notify.error('Erro ao salvar receita de insumos', message)
      saving.value = false
      return
    }
  }

  // Limpeza best-effort das imagens que ficaram órfãs nesta edição (S3).
  await cleanupOrphanImages(parsed.data.fotos)

  saving.value = false
  notify.success('Produto salvo')

  if (exitAfterSave) {
    await navigateTo('/admin/products')
  } else {
    if (isNew.value && produtoId) {
      // Se era novo, navega para a página de edição do novo ID sem reload completo
      await navigateTo(`/admin/products/${produtoId}`, { replace: true })
      await loadData()
    } else {
      // Recarrega dados para obter os IDs do banco gerados para novos opcionais
      await loadData()
    }
  }
}

const TIPO_OPCAO_OPTIONS = [
  { value: 'single', label: 'Escolha Única (Tamanho, Cor)' },
  { value: 'multiple', label: 'Múltipla Escolha (Adicionais)' },
  { value: 'toggle', label: 'Interruptor Individual' },
]

const categoriaOptions = computed(() => categoriaOptionsFn())

const unidadeOptions = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'litro', label: 'Litro' },
  { value: 'metro', label: 'Metro' },
  { value: 'caixa', label: 'Caixa' },
]

const PRODUCT_TYPE_OPTIONS = [
  { value: 'stock', label: 'Venda imediata' },
  { value: 'preorder', label: 'Encomenda' },
]

// === Produtos Relacionados ===

interface ProdutoRelacionado {
  readonly id: string
  readonly nome: string
  readonly foto_url: string | null
  readonly preco_venda: number
}

const relacionados = ref<ProdutoRelacionado[]>([])
const relacionadosSearch = ref('')
const relacionadosResults = ref<ProdutoRelacionado[]>([])
const relacionadosSearching = ref(false)
let _searchTimer: ReturnType<typeof setTimeout> | undefined

function searchRelacionados(): void {
  if (_searchTimer) clearTimeout(_searchTimer)
  const q = relacionadosSearch.value.trim()
  if (!q) { relacionadosResults.value = []; return }
  _searchTimer = setTimeout(async () => {
    relacionadosSearching.value = true
    try {
      const excludeIds = new Set([route.params.id as string, ...relacionados.value.map((r) => r.id)])
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, foto_url, preco_venda')
        .ilike('nome', `%${q}%`)
        .eq('disponivel', true)
        .limit(8)
      relacionadosResults.value = (data ?? []).filter((p) => !excludeIds.has(p.id)) as ProdutoRelacionado[]
    } finally {
      // `finally` evita que uma falha de rede deixe o spinner de busca preso.
      relacionadosSearching.value = false
    }
  }, 300)
}

// Sem o clear, um debounce pendente consulta o banco depois do unmount.
onBeforeUnmount(() => {
  if (_searchTimer) clearTimeout(_searchTimer)
})

function addRelacionado(prod: ProdutoRelacionado): void {
  if (relacionados.value.length >= 3 || relacionados.value.some((r) => r.id === prod.id)) return
  relacionados.value = [...relacionados.value, prod]
  relacionadosSearch.value = ''
  relacionadosResults.value = []
}

function removeRelacionado(id: string): void {
  relacionados.value = relacionados.value.filter((r) => r.id !== id)
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface text-text-primary font-sans">

    <!-- Header Sticky de Ações (Enterprise Grade Padrão) -->
    <header class="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 -ml-2 rounded-full hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors mr-1 cursor-pointer"
          :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
          @click="navigateTo('/admin/products')"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
          {{ isNew ? 'Novo Produto' : 'Editar Produto' }}
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          @click="navigateTo('/admin/products')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-brand-green text-brand-green hover:bg-brand-green/10 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
          :disabled="saving"
          @click="save(false)"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
          Salvar e Continuar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          :disabled="saving"
          @click="save(true)"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Salvar e Sair
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 pb-32">
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        
        <!-- COLUNA DA ESQUERDA: Informações estruturadas (7/12) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Card 1: Informações Básicas -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Layout class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Informações Básicas</h3>
            </div>
            
            <div class="space-y-4">
              <div>
                <label for="prod-nome" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Nome *</label>
                <input
                  id="prod-nome"
                  v-model="form.nome"
                  type="text"
                  class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  placeholder="Ex: Pizza Calabresa"
                >
              </div>

              <div class="flex gap-4">
                <div class="flex-1">
                  <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Categoria *</p>
                  <UiSelect
                    :model-value="form.categoria_id"
                    :options="categoriaOptions"
                    placeholder="Selecione uma categoria…"
                    aria-label="Categoria do produto"
                    @update:model-value="(v) => (form.categoria_id = String(v ?? ''))"
                  />
                </div>
                <div class="w-36">
                  <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Unidade</p>
                  <UiSelect
                    :model-value="form.unidade_medida"
                    :options="unidadeOptions"
                    aria-label="Unidade de medida"
                    @update:model-value="(v) => (form.unidade_medida = v as typeof form.unidade_medida)"
                  />
                </div>
              </div>

              <div>
                <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Tipo de venda</p>
                <UiSelect
                  :model-value="form.product_type"
                  :options="PRODUCT_TYPE_OPTIONS"
                  aria-label="Tipo de venda"
                  @update:model-value="(v) => (form.product_type = v as ProductType)"
                />
                <p class="mt-1 text-[10px] text-text-muted leading-tight">
                  Encomenda: o cliente escolhe a data de entrega e a capacidade diária é controlada automaticamente.
                </p>
              </div>

              <div>
                <label for="prod-descricao" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Descrição</label>
                <textarea
                  id="prod-descricao"
                  v-model="form.descricao"
                  rows="3.5"
                  class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                  placeholder="Descreva os ingredientes, tamanho ou detalhes adicionais..."
                />
              </div>
            </div>
          </div>

          <!-- Card 1b: Configuração de Encomenda (Pre-Order System) -->
          <div v-if="isPreorderEnabled" class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <CalendarDays class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Configuração de Encomenda</h3>
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-brand-green/10 text-brand-green border border-brand-green/20">
                Unidade: {{ form.unidade_medida || 'un' }} {{ form.permite_fracionamento ? '(Fracionado)' : '(Inteiro)' }}
              </span>
            </div>

            <p class="text-[10px] text-text-muted mt-1">
              Quantidade mínima e máxima por pedido, antecedência de agendamento e capacidade diária total (configurada no card Estoque). Datas ficam indisponíveis automaticamente quando a capacidade é atingida.
            </p>

            <!-- Avisos de Validação em Tempo Real -->
            <div v-if="preorderForm.min_quantity > preorderForm.max_quantity" class="p-2.5 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 rounded-lg text-xs font-medium text-danger-600 dark:text-danger-400">
              ⚠️ A quantidade mínima ({{ preorderForm.min_quantity }}) não pode ser maior que a quantidade máxima ({{ preorderForm.max_quantity }}).
            </div>
            <div v-if="preorderForm.min_lead_days > preorderForm.max_lead_days" class="p-2.5 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 rounded-lg text-xs font-medium text-danger-600 dark:text-danger-400">
              ⚠️ A antecedência mínima ({{ preorderForm.min_lead_days }} dias) não pode ser maior que a antecedência máxima ({{ preorderForm.max_lead_days }} dias).
            </div>

            <!-- Capacidade diária removida deste card (migration 113): gerenciada em Estoque abaixo. -->

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="preorder-min-qty" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Qtd. mínima ({{ form.unidade_medida || 'un' }})
                </label>
                <UiNumberInput
                  id="preorder-min-qty"
                  :model-value="preorderForm.min_quantity"
                  :min="0.001"
                  :step="form.permite_fracionamento ? 0.1 : 1"
                  @update:model-value="(v) => preorderForm.min_quantity = v ?? 1"
                />
                <p class="text-[10px] text-text-muted mt-1">Menor lote ou quantidade aceita por pedido.</p>
              </div>

              <div>
                <label for="preorder-max-qty" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Qtd. máxima ({{ form.unidade_medida || 'un' }})
                </label>
                <UiNumberInput
                  id="preorder-max-qty"
                  :model-value="preorderForm.max_quantity"
                  :min="0.001"
                  :step="form.permite_fracionamento ? 0.1 : 1"
                  @update:model-value="(v) => preorderForm.max_quantity = v ?? 1"
                />
                <p class="text-[10px] text-text-muted mt-1">Limite máximo por pedido individual.</p>
              </div>

              <div>
                <label for="preorder-min-lead" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Antecedência mínima (dias)
                </label>
                <UiNumberInput
                  id="preorder-min-lead"
                  :model-value="preorderForm.min_lead_days"
                  :min="0"
                  :step="1"
                  :precision="0"
                  @update:model-value="(v) => preorderForm.min_lead_days = v ?? 0"
                />
                <p class="text-[10px] text-text-muted mt-1">Dias mínimos de antecedência para agendar.</p>
              </div>

              <div>
                <label for="preorder-max-lead" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Antecedência máxima (dias)
                </label>
                <UiNumberInput
                  id="preorder-max-lead"
                  :model-value="preorderForm.max_lead_days"
                  :min="1"
                  :step="1"
                  :precision="0"
                  @update:model-value="(v) => preorderForm.max_lead_days = v ?? 1"
                />
                <p class="text-[10px] text-text-muted mt-1">Janela máxima no futuro para abrir a agenda.</p>
              </div>
            </div>
          </div>

          <!-- Card 1c: Estoque (Gestão de Estoque, migration 111) -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <ShoppingBag class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Estoque</h3>
            </div>

            <div>
              <label class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Controle de estoque</label>
              <UiSelect
                :model-value="estoqueForm.controle_estoque"
                :options="CONTROLE_ESTOQUE_OPTIONS"
                @update:model-value="(v) => estoqueForm.controle_estoque = (v as typeof estoqueForm.controle_estoque)"
              />
              <p class="text-[10px] text-text-muted mt-1">
                <span class="font-medium">Nenhum:</span> vende sem limites, sem controle de saldo.
                <span class="font-medium">Contagem:</span> desconta do estoque a cada venda — para quando acabar.
                <span class="font-medium">Produção diária:</span> define quantas unidades podem ser vendidas por dia; reseta sozinho à meia-noite.
              </p>
            </div>

            <div v-if="estoqueForm.controle_estoque === 'contagem'">
              <!-- Produto novo: só o valor inicial, sem trilha de ajuste ainda (não existe id). -->
              <div v-if="isNew" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="estoque-inicial" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Estoque inicial</label>
                  <input
                    id="estoque-inicial"
                    v-model.number="estoqueForm.estoque_atual"
                    type="number"
                    min="0"
                    step="any"
                    class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-colors"
                  >
                </div>
                <div>
                  <label for="estoque-minimo" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Estoque mínimo</label>
                  <input
                    id="estoque-minimo"
                    v-model.number="estoqueForm.estoque_minimo"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Sem alerta"
                    class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-colors"
                  >
                </div>
              </div>

              <!-- Produto existente: grid adaptável.
                   Sem preorder: 2 col (Ajuste+btn / Alerta)
                   Com preorder + contagem: 3 col (Ajuste+btn / Alerta / Limite) -->
              <div v-else class="space-y-2.5">
                <p class="text-xs text-text-muted">
                  Saldo atual: <span class="font-bold text-text-primary tabular-nums">{{ estoqueForm.estoque_atual }} {{ form.unidade_medida || 'un' }}</span>
                </p>
                <div class="grid grid-cols-1 gap-4 items-end"
                  :class="isPreorderEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'"
                >
                  <!-- Ajuste + botão CircleCheck grudado à direita -->
                  <div>
                    <div class="flex items-center gap-1.5 mb-1.5">
                      <label for="ajuste-delta" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Ajuste</label>
                      <UiInfoTip text="Some ou subtrai do saldo atual. Ex.: +5 adiciona, -3 remove." />
                    </div>
                    <div class="flex">
                      <UiNumberInput
                        id="ajuste-delta"
                        :model-value="ajusteDelta"
                        :attach-right="true"
                        placeholder="0"
                        class="flex-1 min-w-0"
                        @update:model-value="(v) => ajusteDelta = v ?? 0"
                        @keyup:enter="aplicarAjusteInline"
                      />
                      <button
                        type="button"
                        class="shrink-0 flex items-center justify-center px-2.5 border border-l-0 border-border rounded-r bg-brand-green/10 hover:bg-brand-green/20 text-brand-green transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        :disabled="!ajusteDelta || aplicandoAjuste"
                        :aria-label="aplicandoAjuste ? 'Ajustando…' : 'Confirmar ajuste'"
                        @click="aplicarAjusteInline"
                      >
                        <Check class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Alerta -->
                  <div>
                    <div class="flex items-center gap-1.5 mb-1.5">
                      <label for="estoque-minimo" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Alerta</label>
                      <UiInfoTip text="Avisa quando o saldo cair abaixo deste valor. Deixe vazio para desativar." />
                    </div>
                    <UiNumberInput
                      id="estoque-minimo"
                      :model-value="estoqueForm.estoque_minimo"
                      :min="0"
                      placeholder="Sem alerta"
                      @update:model-value="(v) => estoqueForm.estoque_minimo = v"
                    />
                  </div>

                  <!-- Limite: aparece no grid somente quando contagem + preorder -->
                  <div v-if="isPreorderEnabled">
                    <div class="flex items-center gap-1.5 mb-1.5">
                      <label for="producao-diaria-limite" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Limite</label>
                      <UiInfoTip text="Máximo de pedidos aceitos no mesmo dia. Ao atingir, a data bloqueia automaticamente." />
                    </div>
                    <UiNumberInput
                      id="producao-diaria-limite"
                      :model-value="estoqueForm.producao_diaria_limite"
                      :min="0.001"
                      :step="form.permite_fracionamento ? 0.1 : 1"
                      @update:model-value="(v) => estoqueForm.producao_diaria_limite = v"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!--
              Limite Diário — seção standalone.
              Aparece apenas para controle_estoque='producao_diaria' (pronta entrega).
              Para encomenda com 'contagem', o campo já está no grid acima.
              Para encomenda com 'nenhum', o campo não é exibido (a pergunta do usuário).
            -->
            <div v-if="estoqueForm.controle_estoque === 'producao_diaria' && !isPreorderEnabled">
              <div class="flex items-center gap-1.5 mb-1.5">
                <label for="producao-diaria-limite" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Limite diário ({{ form.unidade_medida || 'un' }}/dia)
                </label>
                <UiInfoTip
                  text="Quanto pode ser produzido por dia. Quando atingido, para de vender automaticamente até o dia seguinte."
                  position="right"
                />
              </div>
              <UiNumberInput
                id="producao-diaria-limite"
                :model-value="estoqueForm.producao_diaria_limite"
                :min="0.001"
                :step="form.permite_fracionamento ? 0.1 : 1"
                class="w-full sm:w-1/3"
                @update:model-value="(v) => estoqueForm.producao_diaria_limite = v"
              />
            </div>

            <!-- Insumos usados (receita/BOM) — sempre visível, independente da política. -->
            <div class="pt-3 border-t border-border/70 space-y-2.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Insumos usados</label>
                <button
                  type="button"
                  class="text-xs font-bold uppercase tracking-wider text-brand-green flex items-center gap-1 cursor-pointer"
                  @click="addReceitaItem"
                >
                  <Plus class="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              <p v-if="receitaInsumos.length === 0" class="text-xs text-text-muted italic">Este produto não consome insumo nenhum.</p>
              <div v-for="(item, idx) in receitaInsumos" :key="idx" class="flex items-center gap-2">
                <div class="flex-1">
                  <UiSelect
                    :model-value="item.insumo_id || null"
                    :options="insumoOptions"
                    placeholder="Selecione o insumo"
                    @update:model-value="(v) => item.insumo_id = String(v ?? '')"
                  />
                </div>
                <input
                  v-model.number="item.quantidade_por_unidade"
                  type="number"
                  min="0.001"
                  step="any"
                  class="w-28 px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-colors"
                  title="Quantidade por unidade vendida"
                >
                <button type="button" class="p-1.5 text-text-muted hover:text-danger-600 hover:bg-danger-50 rounded transition-colors cursor-pointer shrink-0" title="Remover" @click="removeReceitaItem(idx)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Busca por IA (Sinônimos) -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Busca por IA</h3>
            </div>

            <p class="text-xs text-text-muted mt-0.5">Termos alternativos para este item (sinônimos, apelidos e variações).</p>

            <div class="bg-surface rounded-lg border border-border p-3 space-y-2">
              <div class="flex flex-wrap gap-1.5 min-h-[2rem] items-center">
                <!-- Chips de sinônimos -->
                <span
                  v-for="(tag, ti) in form.sinonimos"
                  :key="ti"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200"
                >
                  {{ tag }}
                  <button
                    type="button"
                    class="text-primary-400 hover:text-primary-700 transition-colors ml-0.5"
                    :aria-label="`Remover sinônimo ${tag}`"
                    @click="form.sinonimos = form.sinonimos.filter((_, i) => i !== ti)"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </span>

                <!-- Input de novo sinônimo -->
                <input
                  v-if="form.sinonimos.length < 20"
                  id="prod-sinonimos-input"
                  v-model="sinonimoQuery"
                  type="text"
                  class="flex-1 min-w-[120px] text-xs text-text-primary bg-transparent placeholder:text-text-muted outline-none"
                  placeholder="Adicione termo..."
                  aria-label="Adicionar sinônimo"
                  @keydown="handleSinonimosKeydown"
                  @blur="addSinonimo"
                >
              </div>
            </div>
            <p class="text-[10px] text-text-muted leading-tight">
              Digite e aperte <kbd class="px-1 py-0.2 rounded bg-surface border border-border text-[9px] font-mono">Enter</kbd> ou <kbd class="px-1 py-0.2 rounded bg-surface border border-border text-[9px] font-mono">,</kbd> para salvar. Máx. 20 termos.
            </p>
          </div>

          <!-- Card 3: Opções / Variações -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <Sliders class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Opções / Variações</h3>
              </div>
              <button
                type="button"
                class="flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-md transition-colors"
                @click="addGrupo"
              >
                <Plus class="w-3.5 h-3.5" />
                Adicionar grupo
              </button>
            </div>

            <div v-if="grupos.length === 0" class="py-8 text-center border border-dashed border-border rounded-lg text-text-muted text-sm italic">
              Nenhum grupo. Clique em "Adicionar grupo" para criar opções para este produto.
            </div>

            <div class="space-y-4">
              <div
                v-for="(grupo, gi) in grupos"
                :key="gi"
                class="border border-border rounded-lg bg-surface"
              >
                <!-- Cabeçalho do grupo (Duas Linhas para Evitar Esmagamento) -->
                <div class="bg-surface-raised rounded-t-lg px-4 py-3.5 space-y-3 border-b border-border/55">
                  <!-- Linha 1: Reordenação, Nome do Grupo e Lixeira -->
                  <div class="flex items-center gap-3">
                    <!-- Ordenador do Grupo -->
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        class="text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        :disabled="gi === 0"
                        title="Mover grupo para cima"
                        @click="moveGrupo(gi, 'up')"
                      >
                        <ChevronUp class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        class="text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        :disabled="gi === grupos.length - 1"
                        title="Mover grupo para baixo"
                        @click="moveGrupo(gi, 'down')"
                      >
                        <ChevronDown class="w-4 h-4" />
                      </button>
                    </div>

                    <!-- Input Nome do Grupo -->
                    <div class="flex-1 min-w-0">
                      <label :for="`grupo-nome-${gi}`" class="sr-only">Nome do grupo</label>
                      <input
                        :id="`grupo-nome-${gi}`"
                        v-model="grupo.nome"
                        type="text"
                        class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors font-medium"
                        placeholder="Nome do grupo (ex: Tamanho, Acompanhamentos)"
                      >
                    </div>

                    <!-- Botão Remover Grupo -->
                    <button
                      type="button"
                      class="text-danger-400 hover:text-danger-600 p-1.5 rounded-md hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors shrink-0"
                      title="Remover grupo"
                      @click="removeGrupo(gi)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>

                  <!-- Linha 2: Tipo de Grupo, Toggle Obrigatório e Limites -->
                  <div class="flex flex-wrap items-center gap-4 pl-12">
                    <!-- Seletor do Tipo -->
                    <div class="w-full sm:w-64 md:w-72 shrink-0">
                      <UiSelect
                        :model-value="grupo.tipo"
                        :options="TIPO_OPCAO_OPTIONS"
                        size="sm"
                        @update:model-value="(v) => (grupo.tipo = v as TipoOpcaoGrupo)"
                      />
                    </div>

                    <!-- Toggle Obrigatório -->
                    <label class="flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap" aria-label="Obrigatório">
                      <UiToggle v-model="grupo.obrigatorio" size="sm" />
                      <span class="text-xs text-text-muted">Obrigatório</span>
                    </label>
                    
                    <!-- Limites: Só visível para tipo "multiple" -->
                    <div v-if="grupo.tipo === 'multiple'" class="flex items-center gap-1.5 text-xs text-text-muted" title="Limites de seleção mínima e máxima">
                      <span class="text-xs text-text-muted mr-1">Qtd:</span>
                      <input
                        :id="`grupo-min-${gi}`"
                        v-model.number="grupo.min_selecoes"
                        type="number"
                        min="0"
                        :max="grupo.max_selecoes"
                        class="w-12 px-2 py-1 rounded-md border border-border bg-surface text-center text-xs text-text-primary focus:outline-none focus:border-primary-500"
                        :aria-label="`Mínimo de seleções do grupo ${gi + 1}`"
                      >
                      <span class="text-text-muted">–</span>
                      <input
                        :id="`grupo-max-${gi}`"
                        v-model.number="grupo.max_selecoes"
                        type="number"
                        min="1"
                        class="w-12 px-2 py-1 rounded-md border border-border bg-surface text-center text-xs text-text-primary focus:outline-none focus:border-primary-500"
                        :aria-label="`Máximo de seleções do grupo ${gi + 1}`"
                      >
                    </div>
                  </div>
                </div>

                <!-- Itens do grupo -->
                <div class="px-4 py-3 space-y-3 bg-surface">
                  <div
                    v-for="(item, ii) in grupo.itens"
                    :key="ii"
                    class="py-3 border-b border-border/30 last:border-b-0 space-y-2.5"
                  >
                    <!-- Linha 1: Reordenação, Foto, Nome e Remover -->
                    <div class="flex items-center gap-2">
                      <!-- Ordenação de Itens -->
                      <div class="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          class="text-text-muted hover:text-text-primary p-1 rounded disabled:opacity-30 transition-colors"
                          :disabled="ii === 0"
                          title="Mover item para cima"
                          @click="moveItem(gi, ii, 'up')"
                        >
                          <ChevronUp class="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          class="text-text-muted hover:text-text-primary p-1 rounded disabled:opacity-30 transition-colors"
                          :disabled="ii === grupo.itens.length - 1"
                          title="Mover item para baixo"
                          @click="moveItem(gi, ii, 'down')"
                        >
                          <ChevronDown class="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <!-- Miniatura da Foto da Opção -->
                      <div
                        class="relative w-9 h-9 border rounded-md bg-surface-raised flex items-center justify-center shrink-0 overflow-hidden group/thumb transition-all duration-200"
                        :class="[
                          draggingOptionTarget?.gi === gi && draggingOptionTarget?.ii === ii
                            ? 'border-primary-500 ring-2 ring-primary-500/20 scale-105'
                            : 'border-border'
                        ]"
                        @dragover.prevent="draggingOptionTarget = { gi, ii }"
                        @dragleave.prevent="draggingOptionTarget = null"
                        @drop.prevent="onOptionFileDropped($event, gi, ii)"
                      >
                        <!-- Se já tem foto -->
                        <template v-if="item.foto_url">
                          <NuxtImg :src="item.foto_url" class="w-full h-full object-cover" />
                          <!-- Botão de remover foto -->
                          <button
                            type="button"
                            class="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            title="Remover foto"
                            @click="removeOptionPhoto(gi, ii)"
                          >
                            <X class="w-3.5 h-3.5" />
                          </button>
                        </template>
                        <!-- Se não tem foto -->
                        <button
                          v-else
                          type="button"
                          class="w-full h-full flex items-center justify-center text-text-muted hover:text-primary-600 transition-colors cursor-pointer"
                          title="Adicionar foto"
                          :disabled="uploadingOption"
                          @click="triggerOptionUpload(gi, ii)"
                        >
                          <span v-if="uploadingOption && uploadingTarget?.gi === gi && uploadingTarget?.ii === ii" class="w-4 h-4 border-2 border-border border-t-primary-500 rounded-full animate-spin" />
                          <ImagePlus v-else class="w-4 h-4" />
                        </button>
                      </div>

                      <!-- Nome do Item (Ocupa toda a largura restante de forma flexível) -->
                      <input
                        :id="`item-nome-${gi}-${ii}`"
                        v-model="item.nome"
                        type="text"
                        class="flex-1 min-w-0 px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                        placeholder="Nome do item (ex: Vermelho, Grande, Coca-Cola)"
                        :aria-label="`Nome do item ${ii + 1} do grupo ${gi + 1}`"
                      >

                      <!-- Botão Remover Item -->
                      <button
                        type="button"
                        class="text-danger-400 hover:text-danger-600 p-1.5 rounded-md hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors shrink-0"
                        title="Remover item"
                        @click="removeItem(gi, ii)"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <!-- Linha 2: Parâmetros Comerciais e Comportamentais (Alinhada com Recuo) -->
                    <div class="flex flex-wrap items-center gap-4 pl-12">
                      <!-- Delta preço -->
                      <div class="flex items-center gap-0 rounded-md border border-border bg-surface overflow-hidden shrink-0">
                        <span class="px-2.5 py-1.5 text-xs text-text-muted bg-surface-raised border-r border-border select-none">+ R$</span>
                        <input
                          :id="`item-delta-${gi}-${ii}`"
                          v-model.number="item.preco_delta"
                          type="number"
                          step="0.01"
                          min="0"
                          class="w-20 px-2 py-1.5 text-xs text-right text-text-primary bg-surface focus:outline-none"
                          placeholder="0,00"
                          :aria-label="`Acréscimo de preço do item ${ii + 1}`"
                        >
                      </div>

                      <!-- Simulador de Preço Final -->
                      <span class="text-[10px] text-text-muted whitespace-nowrap select-none">
                        (= {{ formatCurrency(effectiveBasePrice + (item.preco_delta || 0)) }} final)
                      </span>

                      <!-- Configs (Toggles de Padrão e Ativo) -->
                      <label class="flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap" aria-label="Selecionado por padrão">
                        <UiToggle v-model="item.selecionado_padrao" size="sm" />
                        <span class="text-xs text-text-muted">Padrão</span>
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap" aria-label="Item ativo">
                        <UiToggle v-model="item.ativo" size="sm" />
                        <span class="text-xs text-text-muted">Ativo</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 mt-3 transition-colors"
                    @click="addItem(gi)"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    Adicionar item
                  </button>
                </div>
              </div>
            </div>

            <!-- Input de Upload Oculto para as Fotos das Opções -->
            <input
              ref="optionFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onOptionFileSelected"
            >
          </div>

          <!-- Card 4: Regras de Venda -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Settings class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Regras de Venda</h3>
            </div>

            <div class="space-y-4 divide-y divide-border/50">
              <!-- Toggle: Disponível -->
              <div class="flex items-start gap-3 pt-0 pb-3">
                <UiToggle v-model="form.disponivel" size="sm" class="mt-0.5 shrink-0" />
                <div>
                  <label class="block text-xs font-bold text-text-primary mb-0.5 cursor-pointer select-none" @click="form.disponivel = !form.disponivel">
                    Exibir no Catálogo
                  </label>
                  <p class="text-[10px] text-text-muted leading-normal">
                    Fica visível no catálogo e disponível para novos pedidos.
                  </p>
                </div>
              </div>

              <!-- Toggle: Fracionamento -->
              <div class="flex items-start gap-3 pt-3">
                <UiToggle v-model="form.permite_fracionamento" size="sm" class="mt-0.5 shrink-0" />
                <div>
                  <label class="block text-xs font-bold text-text-primary mb-0.5 cursor-pointer select-none" @click="form.permite_fracionamento = !form.permite_fracionamento">
                    Permitir Venda Fracionada
                  </label>
                  <p class="text-[10px] text-text-muted leading-normal">
                    Permite fracionar a quantidade (ex: 0,5 kg ou 1,2 litro).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 5: Produtos Relacionados -->
          <div v-if="!isNew" class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Link2 class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Produtos Relacionados</h3>
            </div>
            
            <p class="text-xs text-text-muted">Sugeridos no checkout quando este produto está no carrinho (máx. 3).</p>

            <!-- Lista de selecionados -->
            <div v-if="relacionados.length > 0" class="space-y-2 mb-4">
              <div
                v-for="rel in relacionados"
                :key="rel.id"
                class="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface"
              >
                <NuxtImg
                  v-if="rel.foto_url"
                  :src="rel.foto_url"
                  :alt="rel.nome"
                  class="w-10 h-10 object-cover rounded shrink-0"
                />
                <div v-else class="w-10 h-10 rounded bg-surface-raised shrink-0 flex items-center justify-center">
                  <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-text-primary line-clamp-1">{{ rel.nome }}</p>
                  <p class="text-xs text-text-muted tabular-nums">{{ formatCurrency(rel.preco_venda) }}</p>
                </div>
                <button
                  type="button"
                  class="p-1.5 text-text-muted hover:text-danger-600 transition-colors rounded hover:bg-surface-raised shrink-0"
                  title="Remover"
                  @click="removeRelacionado(rel.id)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <!-- Busca (apenas se < 3 selecionados) -->
            <div v-if="relacionados.length < 3" class="relative">
              <input
                v-model="relacionadosSearch"
                type="text"
                placeholder="Buscar produto para relacionar…"
                class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500/20 transition-colors"
                @input="searchRelacionados"
              >
              <div v-if="relacionadosSearching" class="absolute right-3 top-1/2 -translate-y-1/2">
                <div class="w-4 h-4 border-2 border-border border-t-text-primary rounded-full animate-spin" />
              </div>
              <!-- Dropdown de resultados -->
              <div
                v-if="relacionadosResults.length > 0"
                class="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
              >
                <button
                  v-for="result in relacionadosResults"
                  :key="result.id"
                  type="button"
                  class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-raised transition-colors text-left"
                  @click="addRelacionado(result)"
                >
                  <NuxtImg
                    v-if="result.foto_url"
                    :src="result.foto_url"
                    :alt="result.nome"
                    class="w-8 h-8 object-cover rounded shrink-0"
                  />
                  <div v-else class="w-8 h-8 rounded bg-surface-raised shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-text-primary line-clamp-1">{{ result.nome }}</p>
                    <p class="text-xs text-text-muted tabular-nums">{{ formatCurrency(result.preco_venda) }}</p>
                  </div>
                </button>
              </div>
            </div>
            <p v-else class="text-xs text-text-muted">Máximo de 3 produtos atingido.</p>
          </div>
        </div>

        <!-- COLUNA DA DIREITA: Mídias, Preço (5/12) -->
        <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          
          <!-- Card 1: Fotos (Galeria) -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <ImagePlus class="w-4.5 h-4.5 text-brand-green" />
              <div>
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Imagens do Produto</h3>
              </div>
            </div>
            
            <ProductImageManager
              v-model="form.fotos"
              bucket="produtos"
            />
          </div>

          <!-- Card 2: Precificação -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <DollarSign class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Precificação</h3>
            </div>

            <div class="space-y-4">
              <div>
                <label for="prod-custo" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Custo (R$)</label>
                <input
                  id="prod-custo"
                  v-model.number="form.preco_custo"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors"
                >
              </div>
              
              <div>
                <label for="prod-margem" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Margem (%)</label>
                <input
                  id="prod-margem"
                  v-model.number="form.margem_lucro"
                  type="number"
                  min="0"
                  step="0.1"
                  class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors"
                >
              </div>

              <div>
                <label
                  for="prod-preco-venda"
                  class="block text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1.5"
                >
                  Preço Final
                  <span class="normal-case font-normal text-text-muted ml-1 text-[10px]">(editável)</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary-500 font-semibold pointer-events-none select-none">R$</span>
                  <input
                    id="prod-preco-venda"
                    type="text"
                    inputmode="decimal"
                    :value="precoFinalDisplay"
                    class="w-full pl-9 pr-3 py-2 border border-primary-300 bg-primary-50 dark:bg-primary-950/20 text-sm text-primary-700 font-semibold focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors"
                    aria-label="Preço final — editável; altera a margem automaticamente"
                    @input="onPrecoFinalInput"
                    @blur="onPrecoFinalBlur"
                  >
                </div>
              </div>

              <div>
                <label for="prod-preco-promo" class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-warning-600">
                  Aplicar Desconto
                </label>
                <div class="relative">
                  <input
                    id="prod-preco-promo"
                    v-model.number="form.preco_promocional"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Deixe vazio para sem desconto"
                    class="w-full px-3 py-2 border text-sm transition-colors placeholder:text-text-muted focus:outline-none focus:ring-1"
                    :class="form.preco_promocional
                      ? 'border-warning-400 bg-warning-50 text-warning-700 font-semibold focus:border-warning-500 focus:ring-warning-400/20'
                      : 'border-border bg-surface text-text-primary focus:border-primary-500 focus:ring-primary-500/20'"
                  >
                  <button
                    v-if="form.preco_promocional"
                    type="button"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-danger-500 transition-colors"
                    title="Remover desconto"
                    @click="form.preco_promocional = null"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p v-if="form.preco_promocional" class="mt-1 text-[10px] text-warning-600 font-medium leading-tight">
                  Preço com desconto: {{ formatCurrency(form.preco_promocional) }}
                  <span v-if="precoFinalEfetivo > form.preco_promocional" class="block mt-0.5">
                    (economia de {{ formatCurrency(precoFinalEfetivo - form.preco_promocional) }})
                  </span>
                </p>
                <p v-else class="mt-1 text-[10px] text-text-muted leading-tight">
                  Preço promocional exibido no catálogo. Opcional.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  </div>
</template>

import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'
import { useStore } from '~/composables/useStore'
import type { StoreScheduleConfig, DayScheduleConfig, PromotionConfig, OperationStatus } from '~~/shared/types/store'
import type { SelectedOption } from '~~/shared/types/product'
import type { CatalogPromocao, ProgressivoConfig, DescontoCarrinhoConfig } from '#shared/types/promotion'
import {
  calcularMelhorDesconto,
  calcularProximaFaixaProgressivo,
  calcularProximoDescontoCarrinho,
  resolverItensElegiveis,
  type ItemCalculo,
} from '#shared/utils/promotions'

import { getSaoPauloDateString } from '~~/shared/utils/datetime'

export interface CartItem {
  /** Unique cart key: produto_id[::sorted_opcao_ids][::d:delivery_date]. */
  cart_key: string
  produto_id: string
  nome: string
  /** Unit price including selected option deltas. */
  preco: number
  quantidade: number
  foto_url?: string | null
  /** Fotos extras (galeria além da capa) — `products.images`. */
  imagens?: string[]
  permite_fracionamento?: boolean
  unidade_medida?: string | null
  opcoes?: readonly SelectedOption[]
  /**
   * Encomenda: pré-venda com data de entrega escolhida NO MODAL (obrigatória).
   * A quantidade é fixa no carrinho (min/max validados no modal e revalidados no
   * backend) — para alterar, o cliente remove e adiciona de novo. O mesmo produto
   * em datas diferentes são itens distintos (a data entra na cart_key).
   */
  preorder?: { readonly delivery_date: string }
}

/**
 * Fragmento da cart_key derivado das opções selecionadas. Inclui
 * `valor_texto`/`arquivo_url` além do `opcao_item_id`: grupos `texto_livre`/
 * `upload_arquivo` (migration 114) têm um único item-âncora fixo por grupo —
 * sem o valor no fragmento, duas personalizações DIFERENTES do mesmo produto
 * (ex.: dois nomes de camisa distintos) colidiriam na mesma linha do
 * carrinho, somando quantidade em vez de virarem itens separados.
 */
function buildOpcoesKeyFragment(opcoes: readonly SelectedOption[]): string {
  return [...opcoes]
    .map((o) => `${o.opcao_item_id}:${o.valor_texto ?? ''}${o.arquivo_url ?? ''}`)
    .sort()
    .join(',')
}

export interface StoreStatus {
  readonly isOpen: boolean
  readonly message: string
}

export interface UpsellMessage {
  readonly type: 'success' | 'warning'
  readonly text: string
  readonly progress: number
}

/**
 * Card de incentivo do DESCONTO NO CARRINHO: "quanto falta para o próximo
 * nível" — nudge de conversão exibido como card único no carrinho/checkout.
 */
export interface PromotionIncentive {
  readonly promocaoId: string
  readonly promocaoNome: string
  readonly tipo: 'progressivo' | 'desconto_carrinho'
  readonly text: string
  /** Progresso até o próximo nível, 0–100 (barra visual). */
  readonly progress: number
  readonly descontoPercentual: number
}

/** Hint progressivo (QTD → desconto) exibido inline sob o nome do produto. */
export interface ProgressiveHint {
  readonly text: string
  readonly promocaoNome: string
  /** Quanto falta para a próxima faixa — usado para desempate entre promoções. */
  readonly faltam: number
}

/** Formata "1 unidade" / "N unidades" (aceita fracionado, sem zeros à direita). */
function formatUnidades(n: number): string {
  const label = Number.isInteger(n) ? n.toString() : n.toFixed(3).replace(/\.?0+$/, '')
  const isSingular = Math.abs(n - 1) < 1e-9
  return `${label} ${isSingular ? 'unidade' : 'unidades'}`
}

const _brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Defaults usados quando a `loja` ainda não carregou ou não tem
 * `config_promocoes` populado. Mantidos sincronizados com o DEFAULT
 * do banco em `supabase-init.sql` para evitar divergência claro/escuro.
 */
const FALLBACK_CONFIG_PROMOCOES: PromotionConfig = {
  habilitar_upsell_frete: true,
  meta_frete_gratis: 80,
  habilitar_toast_upsell: true,
  copy_upsell_success: 'Parabéns! Você desbloqueou o FRETE GRÁTIS!',
  copy_upsell_progress: 'Faltam só {valor} para você ganhar FRETE GRÁTIS!',
}

const DIAS_SEMANA_NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

const STATUS_ABERTA: StoreStatus = { isOpen: true, message: '' }
const FREE_SHIPPING_THRESHOLD_FALLBACK = 80

/**
 * Avalia override manual (`aberta` / `fechada` / `pausada`) considerando a
 * data de expiração diária. Retorna `null` quando não há override aplicável
 * (modo automático ou override expirado) — o caller deve então consultar a
 * grade semanal.
 */
function evaluateManualOverride(status: OperationStatus, overrideDate: string | null, todayStr: string): StoreStatus | null {
  if (status === 'automatico') return null

  const isExpired = overrideDate !== null && overrideDate !== todayStr
  if (isExpired) return null

  if (status === 'aberta') return STATUS_ABERTA
  if (status === 'fechada') return { isOpen: false, message: 'Nossa loja está fechada no momento.' }
  return { isOpen: false, message: 'Pausamos temporariamente para organizar as entregas. Voltamos logo!' }
}

/**
 * Quando o dia atual está fechado, calcula a mensagem com o próximo dia
 * que abre (lookahead de 1 a 7 dias). Mensagem fallback para "em breve" se
 * a grade inteira estiver desativada.
 */
function buildClosedDayMessage(horarios: StoreScheduleConfig, today: number): string {
  for (let i = 1; i <= 7; i++) {
    const nextIndex = (today + i) % 7
    const nextKey = nextIndex.toString() as keyof StoreScheduleConfig
    const nextDia = horarios[nextKey]
    if (nextDia?.aberto) {
      const prefixo = i === 1 ? 'amanhã' : DIAS_SEMANA_NOMES[nextIndex]
      return `Estamos de folga hoje! Retornaremos ${prefixo} às ${nextDia.inicio}.`
    }
  }
  return 'Estamos de folga hoje! Retornaremos em breve.'
}

/** Avalia a grade semanal (modo automático). */
function evaluateSchedule(horarios: StoreScheduleConfig, now: Date): StoreStatus {
  const today = now.getDay()
  const todayKey = today.toString() as keyof StoreScheduleConfig
  const configHoje: DayScheduleConfig | undefined = horarios[todayKey]
  const timeNow = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  if (!configHoje?.aberto) {
    return { isOpen: false, message: buildClosedDayMessage(horarios, today) }
  }

  if (timeNow >= configHoje.inicio && timeNow <= configHoje.fim) return STATUS_ABERTA
  if (timeNow < configHoje.inicio) {
    return { isOpen: false, message: `Ainda estamos fechados. Abriremos hoje às ${configHoje.inicio}.` }
  }
  return { isOpen: false, message: `Já encerramos por hoje! Nosso horário foi até às ${configHoje.fim}.` }
}

export const useCartStore = defineStore('cart', () => {
  // Loja: leitura via composable singleton (fonte única — DRY). O cart consome
  // o ref reativo; páginas que precisam de outros campos usam useStore() direto.
  const { loja } = useStore()

  const items = ref<CartItem[]>([])
  const editingPedidoId = ref<string | null>(null)

  // Controle de UI Global
  const isCartSidebarOpen = ref(false)
  const toggleCartSidebar = (state?: boolean): void => {
    // `??` cobre o caso `state === undefined` (toggle implícito); valores
    // explícitos `true`/`false` são propagados sem inversão.
    isCartSidebarOpen.value = state ?? !isCartSidebarOpen.value
  }

  // --- MOTOR DE HORÁRIO DE FUNCIONAMENTO ---
  // O relógio não é uma dependência reativa: sem este tick, `storeStatus`
  // cacheia o resultado da primeira leitura e a loja nunca "fecha" para quem
  // deixou a aba aberta — permitindo pedidos fora do horário.
  const nowTick = ref<number>(Date.now())
  if (import.meta.client) {
    const clock = setInterval(() => { nowTick.value = Date.now() }, 30_000)
    onScopeDispose(() => { clearInterval(clock) })
  }

  const storeStatus = computed<StoreStatus>(() => {
    const config = loja.value
    if (!config) return STATUS_ABERTA

    const TZ = 'America/Sao_Paulo'
    const nowUtc = new Date(nowTick.value)
    const now = new Date(nowUtc.toLocaleString('en-US', { timeZone: TZ }))
    const todayStr = getSaoPauloDateString(nowUtc)

    const override = evaluateManualOverride(config.status_operacao, config.status_override_data, todayStr)
    if (override) return override

    if (!config.config_horarios) return STATUS_ABERTA
    return evaluateSchedule(config.config_horarios, now)
  })

  const totalItems = computed<number>(() =>
    Number(items.value.reduce((total, item) => total + item.quantidade, 0).toFixed(3)),
  )

  const totalPrice = computed<number>(() =>
    Number(items.value.reduce((total, item) => total + (item.preco * item.quantidade), 0).toFixed(2)),
  )

  const updateQuantity = (
    produto: { id: string; nome: string; preco: number; foto_url?: string | null; permite_fracionamento?: boolean; unidade_medida?: string | null },
    delta: number,
    opcoes: readonly SelectedOption[] = [],
  ): void => {
    const precoExtra = opcoes.reduce((s, o) => s + o.preco_delta_congelado, 0)
    const sortedIds = buildOpcoesKeyFragment(opcoes)
    const cartKey = sortedIds ? `${produto.id}::${sortedIds}` : produto.id

    const existingItem = items.value.find((i) => i.cart_key === cartKey)

    if (existingItem) {
      existingItem.quantidade = Number((existingItem.quantidade + delta).toFixed(3))
      if (existingItem.quantidade <= 0) {
        items.value = items.value.filter((i) => i.cart_key !== cartKey)
      }
      return
    }

    if (delta > 0) {
      items.value.push({
        cart_key: cartKey,
        produto_id: produto.id,
        nome: produto.nome,
        preco: produto.preco + precoExtra,
        quantidade: delta,
        foto_url: produto.foto_url,
        permite_fracionamento: produto.permite_fracionamento,
        unidade_medida: produto.unidade_medida,
        opcoes: opcoes.length > 0 ? opcoes : undefined,
      })
    }
  }

  /**
   * Define a encomenda no carrinho. A DATA de entrega (escolhida no modal) entra
   * na cart_key: o mesmo produto em datas diferentes são itens distintos. A
   * quantidade é DEFINIDA (não somada): o modal já valida min/max, então reabrir
   * o modal reconfigura o pedido — impossível acumular além do máximo. O backend
   * revalida min/max/capacidade na RPC transacional (autoridade final).
   */
  const addPreorderItem = (
    produto: { id: string; nome: string; preco: number; foto_url?: string | null; permite_fracionamento?: boolean; unidade_medida?: string | null },
    quantidade: number,
    deliveryDate: string,
    opcoes: readonly SelectedOption[] = [],
  ): void => {
    const precoExtra = opcoes.reduce((s, o) => s + o.preco_delta_congelado, 0)
    const sortedIds = buildOpcoesKeyFragment(opcoes)
    const cartKey = [produto.id, sortedIds, `d:${deliveryDate}`].filter(Boolean).join('::')

    const existing = items.value.find((i) => i.cart_key === cartKey)
    if (existing) {
      existing.quantidade = Number(quantidade.toFixed(3))
      return
    }

    items.value.push({
      cart_key: cartKey,
      produto_id: produto.id,
      nome: produto.nome,
      preco: produto.preco + precoExtra,
      quantidade,
      foto_url: produto.foto_url,
      permite_fracionamento: produto.permite_fracionamento,
      unidade_medida: produto.unidade_medida,
      opcoes: opcoes.length > 0 ? opcoes : undefined,
      preorder: { delivery_date: deliveryDate },
    })
  }

  /** Remove uma entrada do carrinho pela cart_key (usado por encomendas). */
  const removeByKey = (cartKey: string): void => {
    items.value = items.value.filter((i) => i.cart_key !== cartKey)
  }

  /** Adjusts quantity for a specific cart entry identified by its cart_key. */
  const updateByKey = (cartKey: string, delta: number): void => {
    const item = items.value.find((i) => i.cart_key === cartKey)
    if (!item) return

    let finalDelta = delta
    if (item.permite_fracionamento) {
      if (delta === 1) finalDelta = 0.1
      else if (delta === -1) finalDelta = -0.1
    }

    item.quantidade = Number((item.quantidade + finalDelta).toFixed(3))
    if (item.quantidade <= 0) {
      items.value = items.value.filter((i) => i.cart_key !== cartKey)
    }
  }

  /** Adjusts quantity precisely by a direct raw delta (e.g. from key input). */
  const updateByKeyRaw = (cartKey: string, delta: number): void => {
    const item = items.value.find((i) => i.cart_key === cartKey)
    if (!item) return
    item.quantidade = Number((item.quantidade + delta).toFixed(3))
    if (item.quantidade <= 0) {
      items.value = items.value.filter((i) => i.cart_key !== cartKey)
    }
  }

  /** Returns total quantity for a product across all option combos. */
  const getItemQuantity = (produtoId: string): number => {
    return items.value
      .filter((i) => i.produto_id === produtoId)
      .reduce((sum, i) => sum + i.quantidade, 0)
  }

  /** Returns quantity of a specific preorder item for a product, date and option set, or null if not in cart. */
  const getPreorderQuantity = (
    produtoId: string,
    deliveryDate: string,
    opcoes: readonly SelectedOption[] = [],
  ): number | null => {
    const sortedIds = buildOpcoesKeyFragment(opcoes)
    const cartKey = [produtoId, sortedIds, `d:${deliveryDate}`].filter(Boolean).join('::')
    const item = items.value.find((i) => i.cart_key === cartKey)
    return item ? item.quantidade : null
  }

  const clearCart = (): void => {
    items.value = []
    editingPedidoId.value = null
  }

  // --- MOTOR DE PROMOÇÕES (desconto automático no carrinho) ---

  /**
   * Lê as promoções do cache já carregado por useProducts (chave 'catalog-products').
   * Zero fetch extra — fonte única de dados (DRY).
   */
  const activePromotions = computed<CatalogPromocao[]>(() => {
    const catalogData = useNuxtData<{ promocoes: CatalogPromocao[] }>('catalog-products')
    return catalogData.data.value?.promocoes ?? []
  })

  /**
   * Itens do carrinho no shape das calculadoras puras — promo-independente,
   * reaproveitado por `discountResult` e `progressiveHints` via
   * `resolverItensElegiveis` (evita remapear a cada promoção/computed).
   */
  const itensCalculo = computed<ItemCalculo[]>(() =>
    items.value.map((i) => ({ produto_id: i.produto_id, preco: i.preco, quantidade: i.quantidade })),
  )

  /**
   * Calcula o melhor desconto aplicável ao carrinho atual usando as mesmas
   * funções canônicas do backend (shared/utils/promotions) — zero divergência.
   * Vence o maior desconto; promoções não se acumulam.
   */
  const discountResult = computed<{ valor: number; nome: string }>(() => {
    if (items.value.length === 0 || activePromotions.value.length === 0) {
      return { valor: 0, nome: '' }
    }

    const resultado = calcularMelhorDesconto(activePromotions.value, itensCalculo.value, totalPrice.value)
    return { valor: resultado.valor, nome: resultado.nome }
  })

  /** Valor do desconto promocional calculado no cliente. */
  const discount = computed<number>(() => discountResult.value.valor)

  /** Nome da promoção aplicada (vazio quando não há desconto). */
  const discountName = computed<string>(() => discountResult.value.nome)

  /** Total com desconto deduzido. */
  const totalPriceWithDiscount = computed<number>(() =>
    Math.max(0, Number((totalPrice.value - discount.value).toFixed(2))),
  )

  /**
   * Incentivo PROGRESSIVO (QTD → desconto): hint discreto POR PRODUTO, exibido
   * sob o nome do item no resumo. A faixa é resolvida pela quantidade total de
   * itens elegíveis (produtos vinculados ou toda a loja) — mesma base do
   * desconto real. Mapa produto_id → hint (o item herda o hint da promoção
   * mais próxima de desbloquear quando participa de mais de uma).
   */
  const progressiveHints = computed<Map<string, ProgressiveHint>>(() => {
    const map = new Map<string, ProgressiveHint>()
    if (items.value.length === 0 || activePromotions.value.length === 0) return map

    for (const promo of activePromotions.value) {
      if (promo.tipo !== 'progressivo') continue

      const produtosIds = new Set<string>(promo.promocao_produtos.map((p) => p.produto_id))
      const elegiveis = resolverItensElegiveis(itensCalculo.value, produtosIds)
      if (elegiveis.length === 0) continue

      const prox = calcularProximaFaixaProgressivo(promo.configuracao as ProgressivoConfig, elegiveis)
      if (!prox) continue

      const text = `Adicione mais ${formatUnidades(prox.faltam)} e ganhe ${prox.descontoPercentual}% de desconto`
      for (const it of elegiveis) {
        const existing = map.get(it.produto_id)
        if (!existing || prox.faltam < existing.faltam) {
          map.set(it.produto_id, { text, promocaoNome: promo.nome, faltam: prox.faltam })
        }
      }
    }

    return map
  })

  /** Texto do hint progressivo de um produto (ou `null`). */
  const getProgressiveHint = (produtoId: string): string | null =>
    progressiveHints.value.get(produtoId)?.text ?? null

  /**
   * Incentivo DESCONTO NO CARRINHO (valor → desconto): UM único card com a
   * PRÓXIMA faixa a desbloquear — a promoção não atingida cujo valor mínimo
   * está mais perto (menor faltante). Ex.: faixas R$100/R$200; acima de R$100
   * mostra a de R$200. Mesma elegibilidade/base do desconto real.
   */
  const cartDiscountIncentive = computed<PromotionIncentive | null>(() => {
    if (items.value.length === 0 || activePromotions.value.length === 0) return null

    const subtotalTotal = totalPrice.value
    let best: PromotionIncentive | null = null
    let bestFaltam = Number.POSITIVE_INFINITY

    for (const promo of activePromotions.value) {
      if (promo.tipo !== 'desconto_carrinho') continue

      // Gating por elegibilidade quando a promoção tem produtos vinculados.
      const produtosIds = new Set<string>(promo.promocao_produtos.map((p) => p.produto_id))
      if (produtosIds.size > 0 && !items.value.some((i) => produtosIds.has(i.produto_id))) continue

      const prox = calcularProximoDescontoCarrinho(promo.configuracao as DescontoCarrinhoConfig, subtotalTotal)
      if (!prox || prox.faltam >= bestFaltam) continue

      bestFaltam = prox.faltam
      best = {
        promocaoId: promo.id,
        promocaoNome: promo.nome,
        tipo: 'desconto_carrinho',
        text: `Adicione mais ${_brl.format(prox.faltam)} e ganhe ${prox.descontoPercentual}% de desconto no carrinho`,
        progress: prox.progresso,
        descontoPercentual: prox.descontoPercentual,
      }
    }

    return best
  })

  // --- MOTOR DE PROMOÇÕES E UPSELL (barra de progresso do frete grátis) ---
  // Exige a campanha ativa (habilitar_upsell_frete) E o aviso de progresso
  // habilitado (habilitar_toast_upsell). Textos 100% customizáveis pelo admin.
  const upsellMessage = computed<UpsellMessage | null>(() => {
    if (totalItems.value === 0) return null
    const config = loja.value?.config_promocoes ?? FALLBACK_CONFIG_PROMOCOES
    if (!config.habilitar_upsell_frete || !config.habilitar_toast_upsell) return null

    const threshold = Number(config.meta_frete_gratis) || FREE_SHIPPING_THRESHOLD_FALLBACK
    if (totalPrice.value < threshold) {
      const diff = threshold - totalPrice.value
      const diffFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diff)
      const template = config.copy_upsell_progress || FALLBACK_CONFIG_PROMOCOES.copy_upsell_progress
      return {
        type: 'warning',
        // `{valor}` é o placeholder do quanto falta; fallback anexa o valor.
        text: template.includes('{valor}') ? template.replaceAll('{valor}', diffFormatado) : `${template} ${diffFormatado}`,
        progress: (totalPrice.value / threshold) * 100,
      }
    }

    return {
      type: 'success',
      text: config.copy_upsell_success || FALLBACK_CONFIG_PROMOCOES.copy_upsell_success,
      progress: 100,
    }
  })

  return {
    items,
    totalItems,
    totalPrice,
    discount,
    discountName,
    totalPriceWithDiscount,
    progressiveHints,
    getProgressiveHint,
    cartDiscountIncentive,
    updateQuantity,
    addPreorderItem,
    removeByKey,
    updateByKey,
    updateByKeyRaw,
    getItemQuantity,
    getPreorderQuantity,
    clearCart,
    isCartSidebarOpen,
    toggleCartSidebar,
    storeStatus,
    upsellMessage,
    editingPedidoId,
  }
})

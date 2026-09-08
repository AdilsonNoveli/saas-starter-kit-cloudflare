<script setup lang="ts">
/**
 * PDV (Point of Sale) — /admin/orders/new (Phase 5.3).
 * @objetivo: Criação de pedido balcão com busca paginada de produtos via
 *   /api/admin/products, filtro de categorias (client-side, baixa
 *   cardinalidade), foto + preço + botão Plus nos cards, modal de opções
 *   via ProductDetailsModal quando tem_opcoes=true, notificações via
 *   useNotification.
 *
 *   Mudanças vs. versão anterior:
 *    - Produtos via endpoint paginado (sem "carregar tudo").
 *    - Filtro de categorias em pills.
 *    - Cards com NuxtImg.
 *    - tem_opcoes=true → ProductDetailsModal em mode='pdv'.
 *    - Remoção de 'link' do union de forma de pagamento.
 *    - CartItemPdv aceita opcoes; enviadas para o backend ao finalizar.
 *    - useNotification em vez de toast inline.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import {
  Search,
  User,
  ArrowLeft,
  Store,
  Truck,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CameraOff,
  ChevronDown,
  CalendarDays,
} from '@lucide/vue'
import { useState } from 'nuxt/app'
import type { AdminProductListItem, AdminProductsResponse, CartItemPdv, SelectedOption } from '~~/shared/types/product'
import { getEffectivePrice } from '~~/shared/types/product'
import { useNotification } from '~/composables/useNotification'
import { ilikeContainsPattern } from '~~/shared/utils/postgrest'
import { formatDeliveryDate } from '~~/shared/utils/preorders'
import AddressAutocomplete from '~/components/checkout/AddressAutocomplete.vue'
import type { AddressDetails } from '#shared/types/maps'

definePageMeta({ layout: 'admin' })

const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const activeMobileTab = ref<'catalog' | 'cart'>('catalog')

watch(showMobileSearch, async (val) => {
  if (val) {
    await nextTick()
    mobileSearchInput.value?.focus()
  } else {
    searchQuery.value = ''
  }
})

const supabase = useSupabaseClient()
const { notify } = useNotification()
const { formatCurrency } = useFormatters()

// ===== Produtos =====

interface CategoriaRow { id: string; nome: string; ativa: boolean }

const categorias = ref<CategoriaRow[]>([])
const categoriaSelecionada = ref<string | null>(null) // null = "Todos"

const produtosBusca = ref<string>('')
const produtosList = ref<readonly AdminProductListItem[]>([])
const produtosTotal = ref<number>(0)
const produtosLoading = ref<boolean>(false)

const PAGE_SIZE = 20
const page = ref<number>(1)
const totalPages = computed<number>(() => Math.max(1, Math.ceil(produtosTotal.value / PAGE_SIZE)))

async function loadCategorias(): Promise<void> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nome, ativa')
    .eq('ativa', true)
    .order('nome', { ascending: true })
  if (error) {
    // Sem isso, as pills de categoria somem do PDV sem qualquer explicação.
    notify.error('Falha ao carregar categorias', error.message)
    return
  }
  categorias.value = (data ?? []) as CategoriaRow[]
}

async function loadProdutos(): Promise<void> {
  produtosLoading.value = true
  try {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page.value - 1) * PAGE_SIZE),
      disponivel: 'true',
      orderBy: 'nome',
      order: 'asc',
    })
    if (produtosBusca.value.trim()) params.set('q', produtosBusca.value.trim())
    if (categoriaSelecionada.value) params.set('categoria_id', categoriaSelecionada.value)

    const res = await $fetch<AdminProductsResponse>(`/api/admin/products?${params.toString()}`)
    produtosList.value = res.data
    produtosTotal.value = res.total
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar produtos'
    notify.error('Falha ao carregar catálogo', message)
  } finally {
    produtosLoading.value = false
  }
}

// Volta para página 1 ao mudar filtros
// Watcher único: com dois watchers (um zerando `page`, outro recarregando),
// mudar um filtro estando na página 2+ disparava duas cargas para a mesma ação.
let produtosTimer: ReturnType<typeof setTimeout> | null = null

watch([produtosBusca, categoriaSelecionada, page], ([busca, cat], [prevBusca, prevCat]) => {
  const filtrosMudaram = busca !== prevBusca || cat !== prevCat
  if (filtrosMudaram && page.value !== 1) {
    // Zerar a página re-dispara este watcher; a carga acontece lá.
    page.value = 1
    return
  }
  if (produtosTimer) clearTimeout(produtosTimer)
  // Debounce: sem ele, cada tecla digitada bate em /api/admin/products.
  produtosTimer = setTimeout(() => { void loadProdutos() }, 300)
})

onBeforeUnmount(() => {
  if (produtosTimer) clearTimeout(produtosTimer)
})

onMounted(async () => {
  // `await` evita unhandled rejection quando a carga inicial falha na rede.
  await Promise.all([loadCategorias(), loadProdutos()])
})

// ===== Clientes =====

interface ClienteRow { id: string; nome: string; telefone_whatsapp: string; is_visitante: boolean }

const clienteBusca = ref<string>('')
const clientesList = ref<ClienteRow[]>([])
const clienteSelecionado = ref<ClienteRow | null>(null)
const showClienteModal = ref<boolean>(false)

async function buscarClientes(): Promise<void> {
  const termo = clienteBusca.value.trim()
  if (termo.length < 2) { clientesList.value = []; return }
  const { data } = await supabase
    .from('clientes')
    .select('id, nome, telefone_whatsapp, is_visitante')
    // Valor citado: sem isso, uma vírgula no nome ("Silva, João") escapa do
    // valor e vira uma expressão de filtro adicional.
    .or(
      `nome.ilike.${ilikeContainsPattern(termo)},`
      + `telefone_whatsapp.ilike.${ilikeContainsPattern(termo)}`,
    )
    .limit(5)
  clientesList.value = (data ?? []) as ClienteRow[]
}

/** Cliente recém-criado no modal: seleciona e limpa a busca, sem sair do PDV. */
function handleClienteCreated(cliente: ClienteRow): void {
  clienteSelecionado.value = cliente
  clientesList.value = []
  clienteBusca.value = ''
  showClienteModal.value = false
}

// ===== Carrinho =====

const carrinho = ref<CartItemPdv[]>([])

/** Gera chave de unicidade: produto + combinação de opções selecionadas + data de entrega. */
function buildCartKey(
  produtoId: string,
  opcoes: readonly SelectedOption[],
  deliveryDate?: string | null,
): string {
  const sorted = [...opcoes].map((o) => o.opcao_item_id).sort().join(',')
  let key = sorted ? `${produtoId}:${sorted}` : produtoId
  if (deliveryDate) key += `:date:${deliveryDate}`
  return key
}

function calcPrecoUnitario(precoBase: number, opcoes: readonly SelectedOption[]): number {
  return precoBase + opcoes.reduce((acc, o) => acc + Number(o.preco_delta_congelado ?? 0), 0)
}

function adicionarProduto(
  produto: AdminProductListItem,
  opcoes: readonly SelectedOption[] = [],
  qtyToAdd: number = 1,
  deliveryDate: string | null = null,
): void {
  const cartKey = buildCartKey(produto.id, opcoes, deliveryDate)
  const existing = carrinho.value.find((i) => i.cart_key === cartKey)
  if (existing) {
    if (deliveryDate) {
      existing.quantidade = qtyToAdd
    } else {
      existing.quantidade += qtyToAdd
    }
  } else {
    carrinho.value.push({
      cart_key: cartKey,
      produto_id: produto.id,
      nome: produto.nome,
      foto_url: produto.foto_url,
      // Preço vigente (promocional quando houver) — mesma fonte do catálogo e do
      // trigger freeze_product_info, garantindo que o exibido = o cobrado.
      preco_base: getEffectivePrice(produto),
      opcoes,
      quantidade: qtyToAdd,
      delivery_date: deliveryDate,
    })
  }
}

function removerItem(cartKey: string): void {
  carrinho.value = carrinho.value.filter((i) => i.cart_key !== cartKey)
}

function decrementarItem(cartKey: string): void {
  const item = carrinho.value.find((i) => i.cart_key === cartKey)
  if (!item) return
  if (item.quantidade <= 1) {
    removerItem(cartKey)
  } else {
    item.quantidade--
  }
}

const subtotal = computed<number>(() =>
  carrinho.value.reduce((acc, i) => acc + calcPrecoUnitario(i.preco_base, i.opcoes) * i.quantidade, 0),
)

const totalFinal = computed<number>(() =>
  subtotal.value + (tipoEntrega.value === 'entrega' ? Number(valorEntrega.value) : 0),
)

const valorTroco = computed<number>(() => {
  const t = Number(trocoPara.value ?? 0)
  return t > totalFinal.value ? t - totalFinal.value : 0
})

// ===== Modal de opções / Encomendas =====

const produtoParaModal = ref<AdminProductListItem | null>(null)
const showOpcaoModal = ref<boolean>(false)

function handlePlusClick(produto: AdminProductListItem): void {
  // Se o produto tiver opções OU for do tipo encomenda (preorder ou preorder_config), abre o modal de detalhes para coleta
  if (
    produto.tem_opcoes ||
    produto.product_type === 'preorder' ||
    produto.preorder_config !== null
  ) {
    produtoParaModal.value = produto
    showOpcaoModal.value = true
  } else {
    adicionarProduto(produto)
  }
}

function handleOpcaoConfirm(
  opcoes: readonly SelectedOption[],
  quantidade: number,
  deliveryDate: string | null,
): void {
  if (produtoParaModal.value) {
    adicionarProduto(produtoParaModal.value, opcoes, quantidade, deliveryDate)
  }
  showOpcaoModal.value = false
  produtoParaModal.value = null
}

// ===== Entrega e pagamento =====

const tipoEntrega = ref<'retirada' | 'entrega'>('retirada')
const formaPagamento = ref<'dinheiro' | 'pix' | 'cartao'>('pix')
const trocoPara = ref<number | null>(null)
const valorEntrega = ref<number>(0)
const observacoes = ref<string>('')
const enderecoEntrega = ref({ rua: '', numero: '', bairro: '', complemento: '' })
const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const addressOutOfRange = ref(false)
const addressRangeError = ref('')

/** Endereço selecionado no autocomplete (resolvido pelo BFF /api/maps/place). */
async function onPlaceSelected(details: AddressDetails): Promise<void> {
  lat.value = details.lat
  lng.value = details.lng
  enderecoEntrega.value.rua = details.formattedAddress
  if (details.bairro) enderecoEntrega.value.bairro = details.bairro
  if (details.numero) enderecoEntrega.value.numero = details.numero

  // Validação proativa de raio — feedback imediato ao selecionar o endereço.
  addressOutOfRange.value = false
  addressRangeError.value = ''
  try {
    await $fetch('/api/validate-address', {
      method: 'POST',
      body: { lat: lat.value, lng: lng.value },
    })
  } catch (err) {
    const msg = (err as { data?: { message?: string } })?.data?.message
      ?? 'Endereço fora do raio de entrega.'
    addressOutOfRange.value = true
    addressRangeError.value = msg
  }
}

/** Texto editado após uma seleção → coordenadas antigas ficam inválidas (bloqueia envio). */
function onAddressInvalidate(): void {
  lat.value = null
  lng.value = null
  addressOutOfRange.value = false
  addressRangeError.value = ''
}

// ===== Finalizar =====

const loading = ref<boolean>(false)

async function finalizarVenda(): Promise<void> {
  if (carrinho.value.length === 0) {
    notify.error('Carrinho vazio', 'Adicione itens ao carrinho antes de finalizar.')
    return
  }
  if (tipoEntrega.value === 'entrega') {
    if (!enderecoEntrega.value.rua || !lat.value || !lng.value) {
      notify.error('Endereço obrigatório', 'Selecione um endereço válido na lista de sugestões.')
      return
    }
    if (addressOutOfRange.value) {
      notify.error('Endereço inválido', addressRangeError.value)
      return
    }
  }

  loading.value = true
  try {
    // Revalida raio no backend (defesa em profundidade)
    if (tipoEntrega.value === 'entrega' && lat.value && lng.value) {
      await $fetch('/api/validate-address', {
        method: 'POST',
        body: { lat: lat.value, lng: lng.value }
      })
    }

    await $fetch('/api/admin/orders/create', {
      method: 'POST',
      body: {
        cliente_id: clienteSelecionado.value?.id ?? null,
        itens: carrinho.value.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          delivery_date: i.delivery_date ?? undefined,
          opcoes: i.opcoes.length > 0 ? [...i.opcoes] : undefined,
        })),
        tipo_entrega: tipoEntrega.value,
        forma_pagamento: formaPagamento.value,
        troco_para: trocoPara.value,
        observacoes: observacoes.value,
        endereco: tipoEntrega.value === 'entrega' ? {
          ...enderecoEntrega.value,
          lat: lat.value,
          lng: lng.value
        } : null,
        valor_entrega_manual: tipoEntrega.value === 'entrega' ? Number(valorEntrega.value) : 0,
      },
    })
    notify.success('Venda finalizada', 'Pedido registrado com sucesso.')
    await navigateTo('/admin/orders')
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Erro ao finalizar venda.'
    notify.error('Falha ao finalizar', msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div id="pdv-page" class="flex flex-col h-full min-h-0 bg-surface font-sans relative">

    <!-- Header Mobile: Alternador Catálogo / Carrinho -->
    <div class="md:hidden flex items-center border-b border-border bg-surface shrink-0 px-4 py-2 gap-2 select-none">
      <button
        type="button"
        class="flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="activeMobileTab === 'catalog' ? 'bg-brand-light dark:bg-brand-green/20 text-text-primary dark:text-brand-green border border-brand-green/40 shadow-xs' : 'text-text-muted hover:bg-surface-raised border border-transparent'"
        @click="activeMobileTab = 'catalog'"
      >
        <Store class="w-4 h-4" /> Catálogo
      </button>
      <button
        type="button"
        class="flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative cursor-pointer"
        :class="activeMobileTab === 'cart' ? 'bg-brand-light dark:bg-brand-green/20 text-text-primary dark:text-brand-green border border-brand-green/40 shadow-xs' : 'text-text-muted hover:bg-surface-raised border border-transparent'"
        @click="activeMobileTab = 'cart'"
      >
        <ShoppingCart class="w-4 h-4" /> Carrinho
        <span
          v-if="carrinho.length > 0"
          class="bg-brand-green text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-4 text-center"
        >
          {{ carrinho.reduce((acc, i) => acc + i.quantidade, 0) }}
        </span>
      </button>
    </div>

    <div class="flex-1 flex overflow-hidden relative">
      <!-- ===== Lado Esquerdo: Catálogo (Fullwidth no Mobile, 2/3 no Desktop) ===== -->
      <div
        class="w-full md:w-2/3 flex flex-col bg-surface md:border-r border-border overflow-hidden transition-all"
        :class="activeMobileTab === 'catalog' ? 'flex' : 'hidden md:flex'"
      >

        <!-- Filtros: busca + categorias (estilo quadrado/rounded-lg) -->
        <div class="px-4 md:px-6 py-3 border-b border-border shrink-0">
          <div class="flex items-center gap-3 mb-3">
            <!-- Botão Voltar ao Kanban (ArrowLeft) -->
            <NuxtLink
              to="/admin/orders"
              class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-all shadow-xs shrink-0 active:scale-95"
              :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
              title="Voltar ao Kanban"
              aria-label="Voltar ao Kanban"
            >
              <ArrowLeft class="w-4.5 h-4.5" stroke-width="2.5" />
            </NuxtLink>

            <div class="relative flex-1">
              <Search class="w-4 h-4 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
              <input
                v-model="produtosBusca"
                type="text"
                aria-label="Buscar produtos"
                class="block w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                placeholder="Buscar produtos…"
              >
            </div>
          </div>
          <!-- Pills de categoria (estilo quadrado/rounded-lg) -->
          <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              class="shrink-0 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold transition-colors cursor-pointer"
              :class="categoriaSelecionada === null ? 'bg-text-primary text-text-inverse' : 'bg-surface-raised text-text-muted hover:text-text-primary'"
              @click="categoriaSelecionada = null; page = 1"
            >
              Todos
            </button>
            <button
              v-for="cat in categorias"
              :key="cat.id"
              type="button"
              class="shrink-0 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold transition-colors cursor-pointer"
              :class="categoriaSelecionada === cat.id ? 'bg-text-primary text-text-inverse' : 'bg-surface-raised text-text-muted hover:text-text-primary'"
              @click="categoriaSelecionada = cat.id; page = 1"
            >
              {{ cat.nome }}
            </button>
          </div>
        </div>

        <!-- Grid de produtos -->
        <div class="flex-1 overflow-y-auto p-3 md:p-4 pb-20 md:pb-4">
          <div v-if="produtosLoading" class="flex items-center justify-center h-32 text-text-muted text-sm">
            Carregando…
          </div>
          <div v-else-if="produtosList.length === 0" class="flex items-center justify-center h-32 text-text-muted text-sm italic">
            Nenhum produto encontrado.
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
            <div
              v-for="produto in produtosList"
              :key="produto.id"
              class="bg-surface border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary-400 hover:shadow-sm transition-all"
            >
              <!-- Foto -->
              <div class="aspect-square bg-surface-raised flex items-center justify-center overflow-hidden">
                <NuxtImg
                  v-if="produto.foto_url"
                  :src="produto.foto_url"
                  :alt="produto.nome"
                  loading="lazy"
                  sizes="160px"
                  class="w-full h-full object-cover"
                />
                <CameraOff v-else class="w-8 h-8 text-text-muted" />
              </div>
              <!-- Info -->
              <div class="p-2 flex flex-col flex-1">
                <span class="text-xs font-medium text-text-primary leading-tight line-clamp-2 mb-1">
                  {{ produto.nome }}
                </span>
                <div class="mt-auto flex items-center justify-between gap-2">
                  <span
                    class="text-sm font-bold tabular-nums flex items-baseline gap-1"
                    :class="produto.preco_promocional != null ? 'text-warning-600' : 'text-text-primary'"
                  >
                    <span v-if="produto.preco_promocional != null" class="text-[10px] text-text-muted line-through font-normal">
                      {{ formatCurrency(produto.preco_venda) }}
                    </span>
                    {{ formatCurrency(getEffectivePrice(produto)) }}
                  </span>
                  <button
                    type="button"
                    class="shrink-0 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap bg-brand text-white rounded px-3 py-1.5 hover:bg-brand-hover transition-colors active:scale-95"
                    @click="handlePlusClick(produto)"
                  >
                    {{ produto.tem_opcoes ? 'OPÇÕES' : 'ADICIONAR' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Paginação -->
          <div v-if="!produtosLoading && totalPages > 1" class="mt-6">
            <UiPagination :current-page="page" :total-pages="totalPages" @change="page = $event" />
          </div>
        </div>

        <!-- Sticky Bottom Bar de Resumo do Carrinho no Mobile -->
        <div
          v-if="carrinho.length > 0 && activeMobileTab === 'catalog'"
          class="md:hidden fixed bottom-4 left-4 right-4 z-30 bg-surface-raised border border-border rounded-xl p-3 shadow-xl flex items-center justify-between gap-3 animate-fade-in"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-brand-green/20 text-brand-green flex items-center justify-center font-extrabold text-sm shrink-0">
              {{ carrinho.reduce((acc, i) => acc + i.quantidade, 0) }}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Total</span>
              <span class="text-sm font-extrabold text-text-primary tabular-nums truncate">{{ formatCurrency(totalFinal) }}</span>
            </div>
          </div>
          <button
            type="button"
            class="bg-brand-green hover:bg-brand-greenDark text-white font-extrabold text-xs uppercase px-4 py-2.5 rounded-lg shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            @click="activeMobileTab = 'cart'"
          >
            <span>Ver Carrinho</span>
            <ArrowLeft class="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>

      <!-- ===== Lado Direito: Carrinho + Finalização (Fullwidth no Mobile, 1/3 no Desktop) ===== -->
      <div
        class="w-full md:w-1/3 flex flex-col overflow-hidden bg-surface transition-all"
        :class="activeMobileTab === 'cart' ? 'flex' : 'hidden md:flex'"
      >

        <!-- Busca de Cliente (no lugar de Resumo do Pedido) -->
        <div class="p-4 border-b border-border bg-surface shrink-0">
          <div class="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
            <User class="w-3.5 h-3.5" />
            <span>Cliente</span>
          </div>

          <div v-if="clienteSelecionado" class="flex items-center justify-between bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800/40 rounded-lg px-3 py-2">
            <div>
              <span class="text-sm font-semibold text-primary-900 dark:text-primary-300">{{ clienteSelecionado.nome }}</span>
              <span class="ml-2 text-xs text-primary-700 dark:text-primary-400">{{ clienteSelecionado.telefone_whatsapp }}</span>
            </div>
            <button type="button" class="text-xs text-primary-600 hover:underline cursor-pointer" @click="clienteSelecionado = null">
              Trocar
            </button>
          </div>

          <div v-else class="flex items-center gap-2">
            <!-- Cadastro rápido: abre modal sem sair do PDV quando o cliente não existe. -->
            <button
              type="button"
              class="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-raised border border-border text-text-primary hover:bg-surface transition-colors cursor-pointer shrink-0"
              aria-label="Cadastrar novo cliente"
              title="Cadastrar novo cliente"
              @click="showClienteModal = true"
            >
              <Plus class="w-5 h-5" />
            </button>
            <div class="relative flex-1">
              <Search class="w-4 h-4 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
              <input
                v-model="clienteBusca"
                type="text"
                aria-label="Buscar cliente por nome ou WhatsApp"
                class="block w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                placeholder="Buscar cliente por nome ou WhatsApp…"
                @input="buscarClientes"
              >
              <ul
                v-if="clientesList.length > 0 && clienteBusca.length >= 2"
                class="absolute z-10 w-full bg-surface mt-1 border border-border rounded-lg shadow-float overflow-hidden"
              >
                <li
                  v-for="c in clientesList"
                  :key="c.id"
                  class="px-4 py-2.5 hover:bg-surface-raised cursor-pointer border-b border-border last:border-0 flex justify-between items-center text-sm"
                  @click="clienteSelecionado = c; clientesList = []; clienteBusca = ''"
                >
                  <div>
                    <span class="font-medium text-text-primary">{{ c.nome }}</span>
                    <span class="ml-2 text-xs text-text-muted">{{ c.telefone_whatsapp }}</span>
                  </div>
                  <span v-if="c.is_visitante" class="text-[10px] bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-300 px-2 py-0.5 rounded font-bold uppercase">Lead</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Itens -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <div v-if="carrinho.length === 0" class="flex flex-col items-center justify-center py-12 text-text-muted">
            <ShoppingCart class="w-10 h-10 mb-2 opacity-30" />
            <span class="text-sm">Nenhum item.</span>
          </div>

          <div
            v-for="item in carrinho"
            :key="item.cart_key"
            class="bg-surface border border-border rounded-lg p-3 flex justify-between items-start gap-2"
          >
            <div class="flex-1 min-w-0">
              <span class="text-xs font-medium text-text-primary line-clamp-1">{{ item.nome }}</span>
              <div v-if="item.opcoes.length > 0" class="text-[10px] text-text-muted mt-0.5">
                {{ item.opcoes.map(o => o.nome_congelado).join(', ') }}
              </div>
              <div v-if="item.delivery_date" class="text-[10px] text-brand-green font-bold mt-0.5 flex items-center gap-1">
                <CalendarDays class="w-3 h-3 shrink-0" />
                Entrega: {{ formatDeliveryDate(item.delivery_date) }}
              </div>
              <span class="text-xs text-text-muted tabular-nums">
                {{ formatCurrency(calcPrecoUnitario(item.preco_base, item.opcoes)) }} un
              </span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <div class="flex items-center bg-surface-raised rounded-lg border border-border">
                <button type="button" aria-label="Diminuir quantidade" class="p-2 text-text-muted hover:text-text-primary active:scale-90 transition-all cursor-pointer" @click="decrementarItem(item.cart_key)">
                  <Minus class="w-3.5 h-3.5" />
                </button>
                <span class="text-xs font-bold w-6 text-center tabular-nums">{{ item.quantidade }}</span>
                <button type="button" aria-label="Aumentar quantidade" class="p-2 text-text-muted hover:text-text-primary active:scale-90 transition-all cursor-pointer" @click="item.quantidade++">
                  <Plus class="w-3.5 h-3.5" />
                </button>
              </div>
              <button type="button" aria-label="Remover item" class="p-2 text-danger-400 hover:text-danger-600 active:scale-90 transition-all cursor-pointer" @click="removerItem(item.cart_key)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Finalização -->
        <div class="p-4 border-t border-border bg-surface shrink-0 flex flex-col gap-3">
          <!-- Entrega / Retirada -->
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              :class="tipoEntrega === 'retirada' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border text-text-muted hover:bg-surface-raised'"
              @click="tipoEntrega = 'retirada'"
            >
              <Store class="w-4 h-4" /> Balcão
            </button>
            <button
              type="button"
              class="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              :class="tipoEntrega === 'entrega' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border text-text-muted hover:bg-surface-raised'"
              @click="tipoEntrega = 'entrega'"
            >
              <Truck class="w-4 h-4" /> Entrega
            </button>
          </div>

          <!-- Endereço de entrega -->
          <div v-if="tipoEntrega === 'entrega'" class="flex flex-col gap-2 p-3 bg-surface-raised rounded-lg border border-border">
            <div>
              <AddressAutocomplete
                v-model="enderecoEntrega.rua"
                placeholder="Digite o endereço completo…"
                @select="onPlaceSelected"
                @invalidate="onAddressInvalidate"
              />
              <!-- Erro: endereço fora do raio de entrega -->
              <p
                v-if="addressOutOfRange"
                class="text-[11px] font-medium text-danger-600 mt-1 flex items-start gap-1"
              >
                <svg class="w-3 h-3 shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                {{ addressRangeError }}
              </p>
              <!-- Hint: selecionar da lista até coordenadas confirmadas -->
              <p
                v-else-if="!lat"
                class="text-[10px] text-text-muted mt-1"
              >
                Selecione o endereço na lista para confirmar a localização.
              </p>
            </div>
            <div class="flex gap-2">
              <input v-model="enderecoEntrega.numero" aria-label="Número" placeholder="Nº" class="w-1/3 text-sm p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500">
              <input v-model="enderecoEntrega.bairro" aria-label="Bairro" placeholder="Bairro" class="flex-1 text-sm p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500">
            </div>
            <input v-model="enderecoEntrega.complemento" aria-label="Complemento" placeholder="Complemento (opcional)" class="text-sm p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500">
            <div class="flex items-center gap-2">
              <label for="pdv-taxa" class="text-xs text-text-muted whitespace-nowrap">Taxa R$:</label>
              <input id="pdv-taxa" v-model="valorEntrega" type="number" min="0" step="0.01" class="flex-1 text-sm p-2 border border-border rounded-md bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500">
            </div>
          </div>

          <!-- Forma de pagamento — sem `link` (nunca suportado pelo backend) -->
          <div class="relative w-full">
            <select
              v-model="formaPagamento"
              aria-label="Forma de pagamento"
              class="w-full text-sm pl-3 pr-10 py-2.5 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/20 appearance-none cursor-pointer transition-all"
            >
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão (Máquina)</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
              <ChevronDown class="w-4 h-4" />
            </div>
          </div>

          <div v-if="formaPagamento === 'dinheiro'" class="flex items-center gap-2">
            <label for="pdv-troco" class="text-xs text-text-muted whitespace-nowrap">Troco para:</label>
            <input id="pdv-troco" v-model="trocoPara" type="number" placeholder="Ex: 50" class="flex-1 text-sm p-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500">
          </div>

          <textarea
            v-model="observacoes"
            placeholder="Observações do pedido…"
            rows="2"
            class="w-full text-sm p-2 border border-border rounded-lg bg-surface-raised focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          />

          <!-- Totais -->
          <div class="flex flex-col gap-1 pt-2 border-t border-border">
            <div class="flex justify-between text-sm text-text-muted">
              <span>Subtotal</span>
              <span class="tabular-nums">{{ formatCurrency(subtotal) }}</span>
            </div>
            <div v-if="tipoEntrega === 'entrega'" class="flex justify-between text-sm text-text-muted">
              <span>Entrega</span>
              <span class="tabular-nums">{{ formatCurrency(Number(valorEntrega)) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold text-text-primary mt-1">
              <span>Total</span>
              <span class="tabular-nums">{{ formatCurrency(totalFinal) }}</span>
            </div>
            <div v-if="formaPagamento === 'dinheiro' && valorTroco > 0" class="flex justify-between text-sm font-bold text-secondary-600 bg-secondary-50 p-2 rounded-lg mt-1">
              <span>Troco</span>
              <span class="tabular-nums">{{ formatCurrency(valorTroco) }}</span>
            </div>
          </div>

          <button
            type="button"
            class="w-full bg-interactive-primary hover:bg-interactive-primary-hover text-text-inverse font-bold py-3.5 rounded-lg transition-colors mt-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            :disabled="loading || carrinho.length === 0"
            @click="finalizarVenda"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {{ loading ? 'Processando…' : 'Finalizar Venda' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de opções (ProductDetailsModal em modo PDV) -->
    <UiProductDetailsModal
      :is-open="showOpcaoModal"
      :produto="produtoParaModal"
      mode="pdv"
      :allow-preorder="true"
      @close="showOpcaoModal = false; produtoParaModal = null"
      @confirm="handleOpcaoConfirm"
    />

    <!-- Cadastro rápido de cliente (sem sair do PDV) -->
    <AdminCustomerQuickCreateModal
      :open="showClienteModal"
      :prefill="clienteBusca"
      @close="showClienteModal = false"
      @created="handleClienteCreated"
    />
  </div>
</template>

<style>
/* Remove o scroll do layout principal e fixa a altura em 100% da viewport */
.admin-layout:has(#pdv-page) main {
  overflow: hidden !important;
  height: 100vh !important;
}

.admin-layout:has(#pdv-page) main > .flex-1 {
  height: 100% !important;
  max-height: 100vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* Oculta o rodapé institucional do layout global no PDV */
.admin-layout:has(#pdv-page) footer {
  display: none !important;
}
</style>

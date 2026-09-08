<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  ArrowLeft,
  ArrowUp,
  MoveHorizontal,
  ArrowDown,
  HelpCircle,
  Settings,
  Target,
  CalendarDays,
  Image,
  LayoutTemplate,
  Flame,
  Percent,
} from '@lucide/vue'
import { navigateTo } from 'nuxt/app'
import { useRouter } from 'vue-router'

import DatePicker from '~/components/ui/DatePicker.vue'
import {
  TIPOS_PROMOCAO,
  PROMOCAO_DEFAULTS,
  promocaoConfigSchemaByTipo,
  type TipoPromocao,
  type PromocaoConfigByTipo,
  type DestaqueConfig,
} from '#shared/types/promotion'
import { getProductGallery, type AdminProdutoListItem } from '~~/shared/types/product'
import { useCategories } from '~/composables/useCategories'

const { notify } = useNotification()
const router = useRouter()

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const supabase = useSupabaseClient()

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/admin/promotions')
  }
}

const isNew = computed(() => route.params.id === 'new')
const loading = ref(false)
const saving = ref(false)

interface ProdutoSelecionado {
  readonly id: string
  readonly nome: string
}

interface PromocaoForm {
  id: string | null
  nome: string
  descricao: string
  fotos: string[]
  categorias_ids: string[]
  tipo: TipoPromocao
  ativa: boolean
  data_inicio: string
  data_fim: string
  configuracao: PromocaoConfigByTipo[TipoPromocao]
  produtos: string[]
  posicao_exibicao: 'topo' | 'meio' | 'rodape'
}

const form = ref<PromocaoForm>({
  id: null,
  nome: '',
  descricao: '',
  fotos: [],
  categorias_ids: [],
  tipo: 'leve_pague',
  ativa: true,
  data_inicio: '',
  data_fim: '',
  configuracao: { ...PROMOCAO_DEFAULTS.leve_pague },
  produtos: [],
  posicao_exibicao: 'topo',
})

const isSemFim = ref(false)
const scopeType = ref<'all' | 'specific'>('all')
/**
 * Escopo de exibição do banner: 'all' = aparece em todas as categorias,
 * 'specific' = apenas nas categorias selecionadas. Torna explícito o que antes
 * era implícito (lista de categorias vazia = todas).
 */
const bannerScope = ref<'all' | 'specific'>('all')

// Ao voltar para "todas", zera as categorias específicas (fonte única da verdade).
watch(bannerScope, (val) => {
  if (val === 'all') form.value.categorias_ids = []
})

// Banner multi-category: list without the "(Nenhuma)" sentinel
const { toOptions: bannerCatOptionsFn } = useCategories({ includeNone: false })
const allBannerCatOptions = computed(() => bannerCatOptionsFn())
// Only show categories not yet added as chips
const availableBannerCatOptions = computed(() =>
  allBannerCatOptions.value.filter((opt) => !form.value.categorias_ids.includes(String(opt.value))),
)
// Quick label lookup by id for chip display
const bannerCatLabelMap = computed(() => {
  const map = new Map<string, string>()
  for (const opt of allBannerCatOptions.value) map.set(String(opt.value), opt.label)
  return map
})
// Drives the "add" dropdown — reset to '' after adding so the select returns to placeholder
const bannerCatAddId = ref<string>('')

function addBannerCategoria(id: string): void {
  if (!id || form.value.categorias_ids.includes(id)) return
  form.value.categorias_ids.push(id)
  bannerCatAddId.value = ''
}

function removeBannerCategoria(id: string): void {
  form.value.categorias_ids = form.value.categorias_ids.filter((c) => c !== id)
}

const produtosSelecionados = ref<ProdutoSelecionado[]>([])

// Resets config whenever the type changes — deep clone avoids shared reference with defaults.
watch(() => form.value.tipo, (newTipo, oldTipo) => {
  if (newTipo !== oldTipo) {
    form.value.configuracao = structuredClone(PROMOCAO_DEFAULTS[newTipo])
  }
}, { immediate: true })

watch(isSemFim, (val) => {
  if (val) form.value.data_fim = ''
})

const configLevePague = computed(() => form.value.configuracao as PromocaoConfigByTipo['leve_pague'])
const configProgressivo = computed(() => form.value.configuracao as PromocaoConfigByTipo['progressivo'])
const configDescontoCarrinho = computed(() => form.value.configuracao as PromocaoConfigByTipo['desconto_carrinho'])
const configDestaque = computed(() => form.value.configuracao as PromocaoConfigByTipo['destaque'])

const selectedLinkedProduct = ref<{ id: string; nome: string } | null>(null)
const allKits = ref<Array<{ id: string; nome: string; preco_fixo: number }>>([])

const kitOptions = computed(() => {
  return allKits.value.map((k) => ({
    value: k.id,
    label: `${k.nome} - R$ ${k.preco_fixo.toFixed(2)}`,
  }))
})

function handleLinkTipoChange(v: 'produto' | 'kit' | null): void {
  const cfg = form.value.configuracao as DestaqueConfig
  cfg.link_tipo = v
  cfg.produto_id = null
  cfg.kit_id = null
  selectedLinkedProduct.value = null
}

function handleSelectLinkedProduct(produto: AdminProdutoListItem): void {
  const cfg = form.value.configuracao as DestaqueConfig
  cfg.produto_id = produto.id
  selectedLinkedProduct.value = { id: produto.id, nome: produto.nome }
}

function clearLinkedProduct(): void {
  const cfg = form.value.configuracao as DestaqueConfig
  cfg.produto_id = null
  selectedLinkedProduct.value = null
}

function handleSelectLinkedKit(v: string | null): void {
  const cfg = form.value.configuracao as DestaqueConfig
  cfg.kit_id = v
}

// Banner uses only the first image in the array.
const bannerUrl = computed({
  get: (): string | null => form.value.fotos[0] ?? null,
  set: (url: string | null): void => {
    form.value.fotos = url ? [url] : []
  },
})

const TIPO_LABELS: Record<TipoPromocao, string> = {
  leve_pague: 'Leve Pague',
  progressivo: 'Desconto Progressivo',
  desconto_carrinho: 'Desconto no Carrinho',
  destaque: 'Banner Promocional',
}

const tipoLabel = computed(() => TIPO_LABELS[form.value.tipo])

const loadData = async () => {
  loading.value = true

  // Fetch available kits for the link selector
  const resKits = await supabase
    .from('kits')
    .select('id, nome, preco_fixo')
    .eq('disponivel', true)
    .order('nome')
  if (resKits.data) {
    allKits.value = resKits.data.map((k) => ({ ...k, preco_fixo: k.preco_fixo ?? 0 }))
  }

  if (isNew.value) {
    // Type is fixed at creation time via query param; cannot be changed in the editor.
    const queryTipo = route.query.tipo as string
    if (TIPOS_PROMOCAO.includes(queryTipo as TipoPromocao)) {
      form.value.tipo = queryTipo as TipoPromocao
      form.value.configuracao = structuredClone(PROMOCAO_DEFAULTS[form.value.tipo])
    }
    loading.value = false
    return
  }

  const resPromo = await supabase
      .from('promocoes')
      .select('*')
      .eq('id', route.params.id as string)
      .maybeSingle()

    if (resPromo.data) {
      form.value.id = resPromo.data.id
      form.value.nome = resPromo.data.nome
      form.value.descricao = resPromo.data.descricao ?? ''
      form.value.fotos = getProductGallery(
        resPromo.data as unknown as { foto_url: string | null; imagens: string[] },
      )
      form.value.tipo = resPromo.data.tipo as TipoPromocao
      form.value.ativa = resPromo.data.ativa ?? true
      form.value.data_inicio = resPromo.data.data_inicio
        ? new Date(resPromo.data.data_inicio).toISOString().split('T')[0]!
        : ''
      form.value.data_fim = resPromo.data.data_fim
        ? new Date(resPromo.data.data_fim).toISOString().split('T')[0]!
        : ''
      form.value.configuracao = (resPromo.data.configuracao
        ?? { ...PROMOCAO_DEFAULTS[form.value.tipo] }) as PromocaoConfigByTipo[TipoPromocao]
      form.value.posicao_exibicao = (['topo', 'meio', 'rodape'].includes(
        resPromo.data.posicao_exibicao as string,
      )
        ? resPromo.data.posicao_exibicao as 'topo' | 'meio' | 'rodape'
        : 'topo')

      // Migrate: if categorias_ids exists use it; else seed from legacy categoria_id
      form.value.categorias_ids = Array.isArray(resPromo.data.categorias_ids)
        ? (resPromo.data.categorias_ids as string[])
        : (resPromo.data.categoria_id ? [resPromo.data.categoria_id as string] : [])

      // Escopo do banner derivado das categorias persistidas (vazio = todas).
      bannerScope.value = form.value.categorias_ids.length > 0 ? 'specific' : 'all'

      isSemFim.value = !resPromo.data.data_fim

      // Fetch linked product info if type is destaque
      if (resPromo.data.tipo === 'destaque') {
        const cfg = form.value.configuracao as DestaqueConfig
        if (cfg?.link_tipo === 'produto' && cfg?.produto_id) {
          const { data: linkedProdData } = await supabase
            .from('produtos')
            .select('id, nome')
            .eq('id', cfg.produto_id)
            .maybeSingle()
          if (linkedProdData) {
            selectedLinkedProduct.value = {
              id: linkedProdData.id,
              nome: linkedProdData.nome,
            }
          }
        }
      }

      const resProds = await supabase
        .from('promocao_produtos')
        .select('produto_id, produtos(id, nome)')
        .eq('promocao_id', resPromo.data.id)

      if (resProds.data) {
        form.value.produtos = resProds.data.map((p) => p.produto_id ?? '')
        produtosSelecionados.value = resProds.data.map((p) => ({
          id: p.produto_id ?? '',
          nome: (p.produtos as { id: string; nome: string } | null)?.nome ?? 'Produto',
        }))
        scopeType.value = resProds.data.length > 0 ? 'specific' : 'all'
      } else {
        scopeType.value = 'all'
      }
    } else {
      await navigateTo('/admin/promotions')
      return
    }

  loading.value = false
}

onMounted(() => loadData())

function addFaixaProgressiva(): void {
  if (form.value.tipo !== 'progressivo') return
  const cfg = form.value.configuracao as PromocaoConfigByTipo['progressivo']
  cfg.faixas.push({ quantidade: 1, desconto_percentual: 5 })
}

function removeFaixaProgressiva(index: number): void {
  if (form.value.tipo !== 'progressivo') return
  const cfg = form.value.configuracao as PromocaoConfigByTipo['progressivo']
  cfg.faixas.splice(index, 1)
}

function handleAddProduto(produto: AdminProdutoListItem): void {
  if (form.value.produtos.includes(produto.id)) return
  form.value.produtos.push(produto.id)
  produtosSelecionados.value.push({ id: produto.id, nome: produto.nome })
}

function removeProduto(produtoId: string): void {
  form.value.produtos = form.value.produtos.filter((id) => id !== produtoId)
  produtosSelecionados.value = produtosSelecionados.value.filter((p) => p.id !== produtoId)
}

const save = async (): Promise<void> => {
  if (!form.value.nome.trim()) {
    notify.error('Validação', 'O nome da campanha é obrigatório.')
    return
  }

  if (!isSemFim.value && !form.value.data_fim) {
    notify.error('Validação', 'Informe a data de fim ou marque como promoção contínua.')
    return
  }

  if (
    form.value.tipo !== 'desconto_carrinho'
    && form.value.tipo !== 'destaque'
    && scopeType.value === 'specific'
    && form.value.produtos.length === 0
  ) {
    notify.error('Validação', 'Selecione ao menos um produto participante.')
    return
  }

  const parsed = promocaoConfigSchemaByTipo[form.value.tipo].safeParse(form.value.configuracao)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    notify.error('Configuração inválida', first?.message ?? 'Configuração da promoção é inválida.')
    return
  }

  saving.value = true

  const isBanner = form.value.tipo === 'destaque'
  const payloadPromo = {
    nome: form.value.nome.trim(),
    descricao: form.value.descricao.trim() || null,
    foto_url: form.value.fotos[0] || null,
    imagens: form.value.fotos.slice(1),
    // categoria_id nunca é usado: banners usam categorias_ids, descontos são por produto.
    categoria_id: null,
    categorias_ids: isBanner
      ? (form.value.categorias_ids.length > 0 ? form.value.categorias_ids : null)
      : null,
    tipo: form.value.tipo,
    ativa: form.value.ativa,
    data_inicio: form.value.data_inicio ? new Date(form.value.data_inicio).toISOString() : null,
    data_fim: (!isSemFim.value && form.value.data_fim)
      ? new Date(form.value.data_fim).toISOString()
      : null,
    configuracao: parsed.data,
    posicao_exibicao: isBanner ? form.value.posicao_exibicao : null,
  }

  let promoId = form.value.id

  try {
    if (!isNew.value && promoId) {
      // O erro do update precisa barrar o delete abaixo: sem isso, uma escrita
      // recusada (RLS/constraint) ainda desvincularia todos os produtos da
      // promoção — corrompendo um registro que não chegou a ser alterado.
      const { error: updateError } = await supabase
        .from('promocoes')
        .update(payloadPromo)
        .eq('id', promoId)
      if (updateError) {
        notify.error('Erro ao salvar promoção', updateError.message)
        return
      }

      const { error: clearError } = await supabase
        .from('promocao_produtos')
        .delete()
        .eq('promocao_id', promoId)
      if (clearError) {
        notify.error('Erro ao atualizar produtos da promoção', clearError.message)
        return
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('promocoes')
        .insert([payloadPromo])
        .select('id')
        .single()
      // Sem esta checagem, uma falha na criação seguia para o "Promoção salva"
      // e navegava para fora — o usuário acreditava ter salvo algo inexistente.
      if (insertError || !data) {
        notify.error('Erro ao criar promoção', insertError?.message ?? 'Tente novamente.')
        return
      }
      promoId = data.id
    }

    if (
      promoId
      && form.value.tipo !== 'desconto_carrinho'
      && form.value.tipo !== 'destaque'
      && scopeType.value === 'specific'
      && form.value.produtos.length > 0
    ) {
      const { error: linkError } = await supabase.from('promocao_produtos').insert(
        form.value.produtos.map((pid) => ({ promocao_id: promoId, produto_id: pid })),
      )
      if (linkError) {
        notify.error('Erro ao vincular produtos', linkError.message)
        return
      }
    }

    notify.success('Promoção salva', form.value.nome)
    goBack()
  } finally {
    // `finally` evita que uma falha de rede deixe o botão travado em "salvando".
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface font-sans text-text-primary">

    <!-- Header Sticky de Ações (Enterprise Grade Padrão) -->
    <header class="h-16 flex items-center justify-between px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
          title="Voltar"
          aria-label="Voltar"
          @click="goBack()"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <div class="flex items-center gap-3">
          <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
            {{ isNew ? 'Nova Campanha' : 'Editar Campanha' }}
          </h1>
          <span class="shrink-0 text-[10px] font-black px-2.5 py-1 rounded bg-brand-green/10 text-brand-green border border-brand-green/20 uppercase tracking-wider">
            {{ tipoLabel }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          @click="goBack()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-admin-primary hover:bg-admin-secondary text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          :disabled="saving"
          @click="save()"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ saving ? 'Salvando…' : 'Salvar Alterações' }}
        </button>
      </div>
    </header>

    <!-- Main Content Area: Grid 2 Colunas -->
    <main class="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 pb-32">

      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <div v-else class="space-y-8 animate-fade-in">

        <!-- ═══════════════════════════════════════════════════════
             1. FLUXO: BANNER PROMOCIONAL (tipo === destaque)
             ═══════════════════════════════════════════════════════ -->
        <div v-if="form.tipo === 'destaque'" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- COLUNA ESQUERDA (Banner): Informações e Ação (7/12) -->
          <div class="lg:col-span-7 space-y-6">
            
            <!-- Card 1.1: Conteúdo do Banner -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <LayoutTemplate class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Conteúdo do Banner</h3>
              </div>

              <div class="space-y-4">
                <div>
                  <label for="banner-nome" class="block text-xs font-semibold text-text-secondary mb-1.5">Título do Banner *</label>
                  <input
                    id="banner-nome"
                    v-model="form.nome"
                    type="text"
                    class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors"
                    placeholder="Ex: Especial de Inverno — Até 30% OFF"
                  >
                  <p class="mt-1 text-[10px] text-text-muted">Exibido em destaque como sobreposição na imagem.</p>
                </div>

                <div>
                  <label for="banner-desc" class="block text-xs font-semibold text-text-secondary mb-1.5">Subtítulo (Opcional)</label>
                  <textarea
                    id="banner-desc"
                    v-model="form.descricao"
                    rows="3"
                    class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors resize-none"
                    placeholder="Texto complementar curto exibido logo abaixo do título."
                  />
                </div>
              </div>
            </div>

            <!-- Card 1.2: Ação ao Clicar -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <Settings class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Ação do Clique (Opcional)</h3>
              </div>

              <div class="space-y-4">
                <p class="text-xs text-text-muted leading-relaxed">Defina o que acontece quando o cliente clicar no banner. Você pode vincular um produto ou um kit para facilitar a compra.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="banner-link-tipo" class="block text-xs font-semibold text-text-secondary mb-1.5">Destino da Ação</label>
                    <UiSelect
                      id="banner-link-tipo"
                      :model-value="configDestaque.link_tipo ?? null"
                      :options="[
                        { value: null, label: 'Sem link (Apenas banner informativo)' },
                        { value: 'produto', label: 'Ver / Adicionar Produto' },
                        { value: 'kit', label: 'Ver / Adicionar Kit' }
                      ]"
                      placeholder="Escolha o destino…"
                      @update:model-value="(v) => handleLinkTipoChange(v as 'produto' | 'kit' | null)"
                    />
                  </div>

                  <!-- Se selecionou Produto -->
                  <div v-if="configDestaque.link_tipo === 'produto'" class="space-y-2">
                    <label class="block text-xs font-semibold text-text-secondary">Produto Vinculado</label>
                    <div v-if="selectedLinkedProduct" class="inline-flex items-center gap-1.5 bg-surface border border-border text-text-primary text-xs font-bold px-2.5 py-1.5 rounded-md shadow-sm">
                      <span class="truncate max-w-[200px]">{{ selectedLinkedProduct.nome }}</span>
                      <button type="button" class="text-text-muted hover:text-danger-600 transition-colors p-0.5" @click="clearLinkedProduct">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div v-else class="w-full">
                      <AdminProductPicker
                        placeholder="Pesquisar produto pelo nome…"
                        @select="handleSelectLinkedProduct"
                      />
                    </div>
                  </div>

                  <!-- Se selecionou Kit -->
                  <div v-if="configDestaque.link_tipo === 'kit'" class="space-y-2">
                    <label for="banner-kit-select" class="block text-xs font-semibold text-text-secondary">Kit Vinculado</label>
                    <UiSelect
                      id="banner-kit-select"
                      :model-value="configDestaque.kit_id ?? null"
                      :options="kitOptions"
                      placeholder="Selecione o kit…"
                      @update:model-value="(v) => handleSelectLinkedKit(v as string | null)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 1.3: Exibição no Catálogo -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <Target class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Onde Exibir no Catálogo</h3>
              </div>

              <div class="space-y-5">
                <!-- Posição vertical -->
                <div>
                  <span class="block text-xs font-semibold text-text-secondary mb-3">Posição Vertical</span>
                  <div class="grid grid-cols-3 gap-3">
                    <button
                      v-for="pos in ([
                        { value: 'topo', label: 'Topo', icon: ArrowUp, hint: 'Antes dos produtos' },
                        { value: 'meio', label: 'Meio', icon: MoveHorizontal, hint: 'Entre categorias' },
                        { value: 'rodape', label: 'Rodapé', icon: ArrowDown, hint: 'Fim do catálogo' },
                      ] as const)"
                      :key="pos.value"
                      type="button"
                      class="relative flex flex-col items-center gap-1.5 p-3 rounded border text-center transition-all cursor-pointer"
                      :class="form.posicao_exibicao === pos.value
                        ? 'border-brand-green bg-brand-green/[0.03] shadow-sm'
                        : 'border-border bg-surface hover:border-gray-400'"
                      @click="form.posicao_exibicao = pos.value"
                    >
                      <component
                        :is="pos.icon"
                        class="w-4.5 h-4.5"
                        :class="form.posicao_exibicao === pos.value ? 'text-brand-green' : 'text-text-muted'"
                      />
                      <span class="text-xs font-bold text-text-primary">{{ pos.label }}</span>
                      <span class="text-[9px] text-text-muted leading-tight mt-0.5">{{ pos.hint }}</span>
                    </button>
                  </div>
                </div>

                <!-- Categorias de destino -->
                <div class="border-t border-border pt-4">
                  <span class="block text-xs font-semibold text-text-secondary mb-3">Categorias Participantes</span>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      class="relative flex flex-col items-start p-3 rounded border text-left transition-all cursor-pointer"
                      :class="bannerScope === 'all'
                        ? 'border-brand-green bg-brand-green/[0.03] shadow-sm'
                        : 'border-border bg-surface hover:border-gray-400'"
                      @click="bannerScope = 'all'"
                    >
                      <span class="text-xs font-bold text-text-primary">Toda a Loja</span>
                      <span class="text-[9px] text-text-muted leading-tight mt-1">Exibe em todas as abas e categorias</span>
                    </button>
                    <button
                      type="button"
                      class="relative flex flex-col items-start p-3 rounded border text-left transition-all cursor-pointer"
                      :class="bannerScope === 'specific'
                        ? 'border-brand-green bg-brand-green/[0.03] shadow-sm'
                        : 'border-border bg-surface hover:border-gray-400'"
                      @click="bannerScope = 'specific'"
                    >
                      <span class="text-xs font-bold text-text-primary">Filtrar Categorias</span>
                      <span class="text-[9px] text-text-muted leading-tight mt-1">Exibe apenas nas categorias selecionadas</span>
                    </button>
                  </div>

                  <!-- Picker de categorias específicas -->
                  <div v-if="bannerScope === 'specific'" class="mt-4 space-y-3">
                    <UiSelect
                      :model-value="bannerCatAddId"
                      :options="availableBannerCatOptions"
                      placeholder="Selecionar categoria para adicionar…"
                      @update:model-value="(v) => addBannerCategoria(String(v ?? ''))"
                    />
                    
                    <div v-if="form.categorias_ids.length > 0" class="flex flex-wrap gap-2">
                      <span
                        v-for="catId in form.categorias_ids"
                        :key="catId"
                        class="inline-flex items-center gap-1.5 bg-surface border border-border text-text-primary text-xs font-bold px-2.5 py-1 rounded shadow-xs"
                      >
                        {{ bannerCatLabelMap.get(catId) ?? catId }}
                        <button
                          type="button"
                          class="text-text-muted hover:text-danger-600 transition-colors p-0.5"
                          @click="removeBannerCategoria(catId)"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    </div>
                    <p v-else class="text-[10px] text-amber-600 font-semibold">Vincule ao menos uma categoria, caso contrário o banner será exibido em todas.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- COLUNA DIREITA (Banner): Upload Imagem e Vigência Sticky (5/12) -->
          <div class="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
            
            <!-- Card 1.4: Foto do Banner -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs flex flex-col">
              <div class="flex items-center gap-2 border-b border-border pb-3 w-full">
                <Image class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Imagem do Banner</h3>
              </div>

              <div class="w-full mt-2">
                <AdminBannerImageUploader
                  v-model="bannerUrl"
                  bucket="produtos"
                />
              </div>
            </div>

            <!-- Card 1.5: Vigência & Status -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <CalendarDays class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Vigência &amp; Status</h3>
              </div>

              <div class="space-y-4">
                <!-- Status -->
                <div class="flex items-center justify-between p-3.5 border border-border bg-surface rounded-md">
                  <div>
                    <h4 class="font-bold text-text-primary text-xs leading-none">Campanha Ativa</h4>
                    <p class="text-[10px] text-text-muted mt-1">Define se o banner está visível no catálogo.</p>
                  </div>
                  <UiToggle id="toggle-banner-ativa" v-model="form.ativa" size="sm" />
                </div>

                <!-- Sem fim toggle -->
                <div class="flex items-center justify-between p-3.5 border border-border bg-surface rounded-md">
                  <div>
                    <h4 class="font-bold text-text-primary text-xs leading-none">Tempo Indeterminado</h4>
                    <p class="text-[10px] text-text-muted mt-1">A campanha não expira automaticamente.</p>
                  </div>
                  <UiToggle id="toggle-banner-sem-fim" v-model="isSemFim" size="sm" />
                </div>

                <!-- DatePickers -->
                <div class="grid grid-cols-1 gap-4 pt-2 border-t border-border/60">
                  <div>
                    <label class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Data de Início</label>
                    <DatePicker v-model="form.data_inicio" />
                  </div>
                  <div :class="isSemFim ? 'opacity-40 pointer-events-none' : ''">
                    <label class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Data de Término</label>
                    <DatePicker v-model="form.data_fim" />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- ═══════════════════════════════════════════════════════
             2. FLUXO: MECÂNICA DE DESCONTO (leve_pague / progressivo / desconto_carrinho)
             ═══════════════════════════════════════════════════════ -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- COLUNA ESQUERDA (Mecânicas): Regras e Escopo de Produtos (7/12) -->
          <div class="lg:col-span-7 space-y-6">
            
            <!-- Card 2.1: Dados da Campanha -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <Flame class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Identificação da Campanha</h3>
              </div>

              <div class="space-y-4">
                <div>
                  <label for="promo-nome" class="block text-xs font-semibold text-text-secondary mb-1.5">Nome da Campanha *</label>
                  <input
                    id="promo-nome"
                    v-model="form.nome"
                    type="text"
                    class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors"
                    placeholder="Ex: Leve Pague de Final de Semana"
                  >
                </div>

                <div>
                  <label for="promo-desc" class="block text-xs font-semibold text-text-secondary mb-1.5">Descrição (Exibida no Carrinho)</label>
                  <textarea
                    id="promo-desc"
                    v-model="form.descricao"
                    rows="4"
                    class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-colors resize-none"
                    placeholder="Explicite as condições da promoção para o cliente no checkout…"
                  />
                </div>
              </div>
            </div>

            <!-- Card 2.2: Regras da Promoção -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <Percent class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Regra de Desconto</h3>
              </div>

              <!-- MECÂNICA: LEVE PAGUE -->
              <div v-if="form.tipo === 'leve_pague'" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label for="promo-compre" class="block text-xs font-semibold text-text-secondary mb-1.5">Compre (Qtd. cobrada)</label>
                    <input
                      id="promo-compre"
                      v-model.number="configLevePague.compre"
                      type="number"
                      min="1"
                      class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm font-bold text-center focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                    >
                  </div>
                  <div>
                    <label for="promo-leve" class="block text-xs font-semibold text-text-secondary mb-1.5">Leve (Qtd. total entregue)</label>
                    <input
                      id="promo-leve"
                      v-model.number="configLevePague.leve"
                      type="number"
                      min="2"
                      class="w-full px-3 py-2 rounded-md border border-brand-green bg-surface text-sm font-bold text-center text-brand-green focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                    >
                  </div>
                </div>
                <div class="p-3 bg-primary-50 dark:bg-primary-950/10 rounded-md border border-primary-200/50 flex items-start gap-2 max-w-xl mx-auto">
                  <HelpCircle class="w-4.5 h-4.5 text-primary-600 shrink-0 mt-0.5" />
                  <p class="text-[10px] text-primary-700 dark:text-primary-400 font-semibold leading-relaxed">
                    O cliente pagará por {{ configLevePague.compre }} unidades e levará {{ configLevePague.leve }} ({{ configLevePague.leve - configLevePague.compre }} grátis). O desconto é aplicado no produto de menor valor entre os participantes.
                  </p>
                </div>
              </div>

              <!-- MECÂNICA: PROGRESSIVO -->
              <div v-else-if="form.tipo === 'progressivo'" class="space-y-4">
                <p class="text-xs text-text-muted">Adicione faixas de descontos que aumentam conforme a quantidade comprada.</p>
                
                <div class="border border-border rounded-md overflow-hidden bg-surface">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-raised border-b border-border">
                        <th class="px-4 py-2.5">A partir de (Qtd.)</th>
                        <th class="px-4 py-2.5">Desconto (%)</th>
                        <th class="px-4 py-2.5 w-12" />
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border/60">
                      <tr
                        v-for="(faixa, idx) in configProgressivo.faixas"
                        :key="idx"
                        class="hover:bg-surface-raised/40 transition-colors"
                      >
                        <td class="px-4 py-2">
                          <input
                            v-model.number="faixa.quantidade"
                            type="number"
                            min="1"
                            class="w-24 px-2.5 py-1.5 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-xs font-semibold text-center"
                          >
                        </td>
                        <td class="px-4 py-2">
                          <div class="flex items-center gap-1">
                            <span class="text-text-muted text-xs font-bold">%</span>
                            <input
                              v-model.number="faixa.desconto_percentual"
                              type="number"
                              min="0"
                              max="100"
                              class="w-24 px-2.5 py-1.5 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-xs font-bold text-secondary-600"
                            >
                          </div>
                        </td>
                        <td class="px-4 py-2 text-right">
                          <button
                            type="button"
                            class="p-1.5 rounded text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors active:scale-95 cursor-pointer"
                            title="Remover faixa"
                            @click="removeFaixaProgressiva(idx)"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="flex justify-center pt-2">
                  <button
                    type="button"
                    class="flex items-center gap-1.5 px-3.5 py-2 rounded border border-border text-xs font-bold uppercase tracking-wider hover:bg-surface-raised transition-colors active:scale-95 cursor-pointer bg-surface"
                    @click="addFaixaProgressiva"
                  >
                    + Adicionar Faixa
                  </button>
                </div>
              </div>

              <!-- MECÂNICA: DESCONTO NO CARRINHO -->
              <div v-else class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label for="promo-valor-min" class="block text-xs font-semibold text-text-secondary mb-1.5">Compra Mínima (R$)</label>
                    <div class="relative">
                      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">R$</span>
                      <input
                        id="promo-valor-min"
                        v-model.number="configDescontoCarrinho.valor_minimo"
                        type="number"
                        min="0"
                        step="0.01"
                        class="w-full px-3 py-2 pl-9 rounded-md border border-border bg-surface text-sm font-semibold focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                      >
                    </div>
                  </div>
                  <div>
                    <label for="promo-desc-carrinho" class="block text-xs font-semibold text-text-secondary mb-1.5">Desconto (%)</label>
                    <div class="relative">
                      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-secondary-500">%</span>
                      <input
                        id="promo-desc-carrinho"
                        v-model.number="configDescontoCarrinho.desconto_percentual"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        class="w-full px-3 py-2 pl-8 rounded-md border border-secondary-300 dark:border-secondary-700 bg-surface text-sm font-bold text-secondary-700 dark:text-secondary-400 focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 2.3: Escopo de Aplicação (Apenas para Leve Pague e Progressivo) -->
            <div v-if="form.tipo !== 'desconto_carrinho'" class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <Target class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Produtos Participantes</h3>
              </div>

              <div class="space-y-5">
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    class="relative flex flex-col items-start p-3 rounded border text-left transition-all cursor-pointer"
                    :class="scopeType === 'all'
                      ? 'border-brand-green bg-brand-green/[0.03] shadow-sm'
                      : 'border-border bg-surface hover:border-gray-400'"
                    @click="scopeType = 'all'"
                  >
                    <span class="text-xs font-bold text-text-primary">Toda a Loja (Mix &amp; Match)</span>
                    <span class="text-[9px] text-text-muted leading-tight mt-1">Qualquer produto no catálogo é elegível</span>
                  </button>
                  <button
                    type="button"
                    class="relative flex flex-col items-start p-3 rounded border text-left transition-all cursor-pointer"
                    :class="scopeType === 'specific'
                      ? 'border-brand-green bg-brand-green/[0.03] shadow-sm'
                      : 'border-border bg-surface hover:border-gray-400'"
                    @click="scopeType = 'specific'"
                  >
                    <span class="text-xs font-bold text-text-primary">Restringir Produtos</span>
                    <span class="text-[9px] text-text-muted leading-tight mt-1">Apenas os produtos escolhidos participam</span>
                  </button>
                </div>

                <div class="p-4 rounded border border-border bg-surface">
                  <div v-if="scopeType === 'all'" class="flex items-center gap-2.5 text-xs font-semibold text-brand-green">
                    <svg class="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Todos os produtos da loja são elegíveis para essa campanha.</span>
                  </div>

                  <div v-else class="space-y-4">
                    <div class="max-w-xl">
                      <AdminProductPicker
                        :excluded-ids="form.produtos"
                        placeholder="Pesquisar produto pelo nome para vincular…"
                        @select="handleAddProduto"
                      />
                    </div>

                    <div v-if="produtosSelecionados.length > 0" class="flex flex-wrap gap-2 max-h-60 overflow-y-auto pt-2">
                      <span
                        v-for="p in produtosSelecionados"
                        :key="p.id"
                        class="inline-flex items-center gap-1.5 bg-surface-raised border border-border text-text-primary text-xs font-bold px-2.5 py-1 rounded shadow-xs"
                      >
                        {{ p.nome }}
                        <button
                          type="button"
                          class="text-text-muted hover:text-danger-600 transition-colors p-0.5 cursor-pointer"
                          @click="removeProduto(p.id)"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    </div>

                    <div v-else class="flex items-center gap-2 text-xs font-semibold text-amber-600">
                      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      A promoção não terá efeito se nenhum produto for vinculado.
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- COLUNA DIREITA (Mecânicas): Imagem e Vigência Sticky (5/12) -->
          <div class="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
            
            <!-- Card 2.4: Imagem de Destaque -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs flex flex-col">
              <div class="flex items-center gap-2 border-b border-border pb-3 w-full">
                <Image class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Imagem Destaque</h3>
              </div>

              <!-- Gerenciador de fotos expandido para 100% da largura do card -->
              <div class="w-full mt-2">
                <ProductImageManager v-model="form.fotos" bucket="produtos" />
              </div>
            </div>

            <!-- Card 2.5: Vigência & Status -->
            <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
              <div class="flex items-center gap-2 border-b border-border pb-3">
                <CalendarDays class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Vigência &amp; Status</h3>
              </div>

              <div class="space-y-4">
                <!-- Status -->
                <div class="flex items-center justify-between p-3.5 border border-border bg-surface rounded-md">
                  <div>
                    <h4 class="font-bold text-text-primary text-xs leading-none">Campanha Ativa</h4>
                    <p class="text-[10px] text-text-muted mt-1">A promoção aplica descontos no carrinho.</p>
                  </div>
                  <UiToggle id="toggle-promo-ativa" v-model="form.ativa" size="sm" />
                </div>

                <!-- Sem fim toggle -->
                <div class="flex items-center justify-between p-3.5 border border-border bg-surface rounded-md">
                  <div>
                    <h4 class="font-bold text-text-primary text-xs leading-none">Tempo Indeterminado</h4>
                    <p class="text-[10px] text-text-muted mt-1">A campanha não expira automaticamente.</p>
                  </div>
                  <UiToggle id="toggle-sem-fim" v-model="isSemFim" size="sm" />
                </div>

                <!-- DatePickers -->
                <div class="grid grid-cols-1 gap-4 pt-2 border-t border-border/60">
                  <div>
                    <label class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Data de Início</label>
                    <DatePicker v-model="form.data_inicio" />
                  </div>
                  <div :class="isSemFim ? 'opacity-40 pointer-events-none' : ''">
                    <label class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Data de Término</label>
                    <DatePicker v-model="form.data_fim" />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- Footer das Ações do Formulário (Salvar / Cancelar) - Removido para o Header -->

      </div>
    </main>

  </div>
</template>

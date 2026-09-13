<script setup lang="ts">
/**
 * @descricao: Formulário de produto (Fase 5.4).
 * @objetivo: Orquestra o carregamento/salvamento do produto delegando cada
 *   seção (precificação, encomenda, estoque, receita, sinônimos, opções,
 *   relacionados) a uma composable + componente dedicados (SoC) — ver
 *   `app/composables/useProduct*.ts` e `app/components/admin/Product*.vue`.
 *   Validação via Zod + useNotification; zero alert() nativo.
 */
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { ArrowLeft, ImagePlus } from '@lucide/vue'
import { z } from 'zod'
import { navigateTo, useState } from 'nuxt/app'
import { Constants, type Json } from '~/types/database.types'
import { MAX_PRODUCT_IMAGES, getProductGallery } from '~~/shared/types/product'
import type { PreorderConfig, ProductType } from '~~/shared/types/preorder'
import { useNotification } from '~/composables/useNotification'
import { useOrphanImageCleanup } from '~/composables/useOrphanImageCleanup'
import { useCategories } from '~/composables/useCategories'
import { useProductPricing } from '~/composables/useProductPricing'
import { useProductPreorderConfig } from '~/composables/useProductPreorderConfig'
import { useProductEstoque } from '~/composables/useProductEstoque'
import { useProductReceitaInsumos } from '~/composables/useProductReceitaInsumos'
import { useProductOptionGroups } from '~/composables/useProductOptionGroups'
import { useProductRelated } from '~/composables/useProductRelated'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const supabase = useSupabaseClient()
const { notify } = useNotification()
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')

const isNew = computed<boolean>(() => route.params.id === 'new')
const loading = ref<boolean>(false)
const saving = ref<boolean>(false)

// === Validação (campos núcleo do form) ===

const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(200),
  categoria_id: z.string().min(1, 'Categoria obrigatória'),
  unidade_medida: z.enum(['unidade', 'kg', 'litro', 'metro', 'caixa']),
  // Número manual de exibição no catálogo (migration 128) — opcional, único por categoria.
  numero: z.number().int().min(1).max(999999).nullable(),
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

// === Formulário núcleo ===

// Fonte única compartilhada (products, kits, promotions).
// autoLoad=false: carregamos dentro de loadData para paralelizar com o produto.
const { categorias, load: loadCategorias, toOptions: categoriaOptionsFn } = useCategories({ autoLoad: false })
const categoriaOptions = computed(() => categoriaOptionsFn())

const form = ref({
  nome: '',
  categoria_id: '',
  unidade_medida: 'unidade' as 'unidade' | 'kg' | 'litro' | 'metro' | 'caixa',
  numero: null as number | null,
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

const isPreorderEnabled = computed<boolean>(() => form.value.product_type !== 'stock')

// === Seções do formulário (cada uma dona do próprio estado + load/save) ===

const pricing = useProductPricing({
  precoCusto: () => form.value.preco_custo,
  margemLucro: () => form.value.margem_lucro,
  setMargemLucro: (v) => { form.value.margem_lucro = v },
})
const preorder = useProductPreorderConfig()
const estoque = useProductEstoque(isPreorderEnabled)
const receita = useProductReceitaInsumos()
const optionGroups = useProductOptionGroups()
const related = useProductRelated()

const sinonimosCard = useTemplateRef<{ flushPending: () => void }>('sinonimosCard')

// Limpeza de imagens órfãs no S3 (fonte única compartilhada com o form de kits):
// galeria do produto + fotos dos itens de opção.
const { cleanup: cleanupOrphanImages } = useOrphanImageCleanup(() => [
  ...form.value.fotos,
  ...optionGroups.grupos.value.flatMap((g) => g.itens.map((i) => i.foto_url).filter((u): u is string => typeof u === 'string')),
])

// === Carga inicial ===

async function loadData(): Promise<void> {
  loading.value = true

  // Await paralelo: garante que o seed de "primeira categoria" (produto novo)
  // veja a lista carregada.
  const [, prodRes] = await Promise.all([
    loadCategorias(),
    isNew.value
      ? Promise.resolve({ data: null, error: null })
      : supabase.from('products').select('*').eq('id', route.params.id as string).maybeSingle(),
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
    const UNIDADES_SUPORTADAS = Constants.public.Enums.unit_enum
    const rawUnidade = p.unit ?? 'unidade'
    const unidadeSegura: UnidadeForm = (UNIDADES_SUPORTADAS as readonly string[]).includes(rawUnidade)
      ? (rawUnidade as UnidadeForm)
      : 'unidade'

    form.value = {
      nome: p.name ?? '',
      categoria_id: p.category_id ?? '',
      unidade_medida: unidadeSegura,
      numero: p.number ?? null,
      descricao: p.description ?? '',
      fotos: getProductGallery({ foto_url: p.photo_url, imagens: p.images }),
      preco_custo: Number(p.cost_price ?? 0),
      margem_lucro: Number(p.profit_margin ?? 0),
      preco_promocional: p.promo_price ? Number(p.promo_price) : null,
      disponivel: p.available ?? true,
      permite_fracionamento: p.allows_fractional_sale ?? false,
      sinonimos: Array.isArray(p.synonyms) ? p.synonyms : [],
      product_type: (p.product_type as ProductType) ?? 'stock',
    }

    // daily_capacity removido do JSON (migration 113 step 2): lido de
    // p.daily_production_limit via useProductEstoque abaixo — não mais do JSONB.
    preorder.loadFromConfig(p.preorder_config as unknown as PreorderConfig | null)
    estoque.loadFromRow({
      controle_estoque: p.stock_control,
      estoque_atual: p.current_stock,
      estoque_minimo: p.minimum_stock,
      producao_diaria_limite: p.daily_production_limit,
    })

    // Se o banco já tem preco_venda gravado, inicializa o campo customizado com ele —
    // garante que edições subsequentes partem do valor real, não do derivado.
    pricing.setFromServerPreco(p.sale_price)

    await receita.loadForProduct(route.params.id as string)
    await optionGroups.loadForProduct(route.params.id as string)
    await related.loadForProduct(route.params.id as string)
  } else {
    // Redefine estados para produto novo para evitar vazamento de dados de edições anteriores
    if (categorias.value.length > 0) {
      form.value.categoria_id = categorias.value[0]!.id
    }
    form.value.nome = ''
    form.value.numero = null
    form.value.descricao = ''
    form.value.fotos = []
    form.value.preco_custo = 0
    form.value.margem_lucro = 0
    form.value.preco_promocional = null
    form.value.disponivel = true
    form.value.permite_fracionamento = false
    form.value.sinonimos = []
    form.value.product_type = 'stock'

    preorder.reset()
    estoque.reset()
    receita.reset()
    pricing.reset()
    optionGroups.reset()
    related.reset()
  }

  loading.value = false
}

onMounted(() => {
  void loadData()
  void receita.loadInsumosDisponiveis()
})

// === Salvar ===

/**
 * Traduz o erro cru do Postgres para uma mensagem acionável quando possível.
 * `23505` = unique_violation — aqui, quase sempre `products_category_number_unique`
 * (migration 128): dois produtos com o mesmo Número na mesma categoria.
 */
function friendlyProductSaveError(error: { code?: string; message: string }): string {
  if (error.code === '23505' && error.message.includes('products_category_number_unique')) {
    return 'Já existe um produto com esse Número nesta categoria. Escolha outro número ou deixe em branco.'
  }
  return error.message
}

async function save(exitAfterSave: boolean = true): Promise<void> {
  // Commita um sinônimo digitado-mas-não-confirmado antes de validar.
  sinonimosCard.value?.flushPending()

  const parsed = produtoSchema.safeParse(form.value)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    notify.error('Campos inválidos', first?.message)
    return
  }

  // Regras de encomenda: validadas apenas quando o modo de venda as exige.
  let preorderConfig: PreorderConfig | null = null
  if (parsed.data.product_type !== 'stock') {
    preorderConfig = preorder.validate()
    if (!preorderConfig) return

    // migration 113: capacidade diária de encomenda agora vive em producao_diaria_limite.
    if (!estoque.estoqueForm.value.producao_diaria_limite || estoque.estoqueForm.value.producao_diaria_limite <= 0) {
      notify.error('Configuração de encomenda inválida', 'Informe a capacidade limite diária (maior que zero) no card Estoque.')
      return
    }
    if (estoque.estoqueForm.value.producao_diaria_limite < preorder.preorderForm.value.min_quantity) {
      notify.error(
        'Configuração de encomenda inválida',
        `Capacidade diária (${estoque.estoqueForm.value.producao_diaria_limite}) deve ser ≥ quantidade mínima por pedido (${preorder.preorderForm.value.min_quantity}).`,
      )
      return
    }
  }

  // Gestão de Estoque (migration 111): validação leve, condicional à política.
  if (estoque.estoqueForm.value.controle_estoque === 'producao_diaria'
    && (!estoque.estoqueForm.value.producao_diaria_limite || estoque.estoqueForm.value.producao_diaria_limite <= 0)) {
    notify.error('Estoque inválido', 'Informe a capacidade de produção diária (maior que zero).')
    return
  }
  if (!receita.validate()) {
    notify.error('Receita inválida', 'Cada insumo usado precisa de uma seleção e uma quantidade maior que zero.')
    return
  }

  saving.value = true

  // Payload não inclui preco_venda (GENERATED ALWAYS AS STORED)
  const payload = {
    category_id: parsed.data.categoria_id,
    name: parsed.data.nome,
    description: parsed.data.descricao ?? '',
    // Capa = primeira foto; extras = restante (mesma convenção de getProductGallery).
    photo_url: parsed.data.fotos[0] ?? '',
    images: parsed.data.fotos.slice(1),
    cost_price: parsed.data.preco_custo,
    profit_margin: parsed.data.margem_lucro,
    // preco_venda precisa ser enviado explicitamente pois não é GENERATED no banco.
    // Usa o preço final customizado se definido, senão deriva do custo × margem.
    sale_price: Math.round(pricing.precoFinalEfetivo.value * 100) / 100,
    promo_price: parsed.data.preco_promocional,
    unit: parsed.data.unidade_medida,
    // Número de exibição no catálogo (migration 128) — opcional, único por categoria
    // (constraint products_category_number_unique trata a colisão no banco).
    number: parsed.data.numero,
    allows_fractional_sale: parsed.data.permite_fracionamento,
    available: parsed.data.disponivel,
    // Sinônimos: normaliza para lowercase antes de salvar para consistência com o índice
    synonyms: parsed.data.sinonimos.map((s) => s.toLowerCase()),
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
    stock_control: estoque.estoqueForm.value.controle_estoque,
    minimum_stock: estoque.estoqueForm.value.estoque_minimo,
    daily_production_limit:
      estoque.estoqueForm.value.controle_estoque === 'producao_diaria' || form.value.product_type === 'preorder'
        ? estoque.estoqueForm.value.producao_diaria_limite
        : null,
    ...(isNew.value ? { current_stock: estoque.estoqueForm.value.estoque_atual } : {}),
  }

  let produtoId = isNew.value ? null : (route.params.id as string)

  if (!isNew.value && produtoId) {
    const { error } = await supabase.from('products').update(payload).eq('id', produtoId)
    if (error) {
      notify.error('Erro ao salvar', friendlyProductSaveError(error))
      saving.value = false
      return
    }
  } else {
    const { data, error } = await supabase.from('products').insert([payload]).select('id').single()
    if (error || !data) {
      notify.error('Erro ao criar produto', error ? friendlyProductSaveError(error) : undefined)
      saving.value = false
      return
    }
    produtoId = data.id
  }

  if (produtoId) {
    const groupsResult = await optionGroups.saveForProduct(produtoId)
    if (!groupsResult.success) {
      notify.error('Erro ao salvar opções do produto', groupsResult.message)
      saving.value = false
      return
    }

    // Sync produtos relacionados (delete-and-reinsert é idempotente e seguro aqui)
    const relatedResult = await related.saveForProduct(produtoId)
    if (!relatedResult.success) {
      notify.error('Erro ao salvar relacionados', relatedResult.message)
      saving.value = false
      return
    }

    // Receita/BOM (migration 111): delete+reinsert via endpoint dedicado
    // (mesmo "set semântico" de produto_relacionados acima).
    const receitaResult = await receita.saveForProduct(produtoId)
    if (!receitaResult.success) {
      notify.error('Erro ao salvar receita de insumos', receitaResult.message)
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
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
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
          <AdminProductBasicInfoCard
            v-model:nome="form.nome"
            v-model:categoria-id="form.categoria_id"
            v-model:unidade-medida="form.unidade_medida"
            v-model:numero="form.numero"
            v-model:product-type="form.product_type"
            v-model:descricao="form.descricao"
            :categoria-options="categoriaOptions"
          />

          <AdminProductPreorderCard
            v-if="isPreorderEnabled"
            v-model:preorder-form="preorder.preorderForm.value"
            :unidade-medida="form.unidade_medida"
            :permite-fracionamento="form.permite_fracionamento"
          />

          <AdminProductEstoqueCard
            v-model:estoque-form="estoque.estoqueForm.value"
            v-model:ajuste-delta="estoque.ajusteDelta.value"
            :estoque="estoque"
            :receita="receita"
            :unidade-medida="form.unidade_medida"
            :permite-fracionamento="form.permite_fracionamento"
            :is-preorder-enabled="isPreorderEnabled"
            :is-new="isNew"
            :produto-id="isNew ? null : (route.params.id as string)"
          />

          <AdminProductSinonimosCard ref="sinonimosCard" v-model="form.sinonimos" />

          <AdminProductOptionGroupsCard :groups="optionGroups" />

          <AdminProductRegrasVendaCard
            v-model:disponivel="form.disponivel"
            v-model:permite-fracionamento="form.permite_fracionamento"
          />

          <AdminProductRelatedCard
            v-if="!isNew"
            :related="related"
            :exclude-id="route.params.id as string"
          />
        </div>

        <!-- COLUNA DA DIREITA: Mídias, Preço (5/12) -->
        <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-20">

          <!-- Card 1: Fotos (Galeria) -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
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

          <AdminProductPricingCard
            v-model:preco-custo="form.preco_custo"
            v-model:margem-lucro="form.margem_lucro"
            v-model:preco-promocional="form.preco_promocional"
            :pricing="pricing"
          />
        </div>

      </div>
    </main>
  </div>
</template>

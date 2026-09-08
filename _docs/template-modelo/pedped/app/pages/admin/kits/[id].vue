<script setup lang="ts">
/**
 * @descricao: Formulário de Kit (Fase 5.7).
 * Kit items selected via AdminProductPicker (search
 *   paginada — sem "carregar tudo"). confirm() para remoção de itens;
 *   useNotification para sucesso/erro; zod para validação mínima.
 */
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Trash2 } from '@lucide/vue'
import { z } from 'zod'
import { navigateTo } from 'nuxt/app'
import type { AdminProdutoListItem } from '~~/shared/types/product'
import { getProductGallery } from '~~/shared/types/product'
import { useNotification } from '~/composables/useNotification'
import { useOrphanImageCleanup } from '~/composables/useOrphanImageCleanup'
import { useCategories } from '~/composables/useCategories'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()

const isNew = computed<boolean>(() => route.params.id === 'new')
const loading = ref<boolean>(false)
const saving = ref<boolean>(false)

const kitSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(200),
  preco_fixo: z.number().nonnegative('Preço deve ser ≥ 0'),
})

interface KitItem {
  produto_id: string
  nome: string
  preco_venda: number
  quantidade: number
}

const ETIQUETA_OPTIONS = ['KIT', 'COMBO', 'PACOTE'] as const
type Etiqueta = typeof ETIQUETA_OPTIONS[number]

const form = ref({
  nome: '',
  descricao: '',
  fotos: [] as string[],
  categoria_id: '' as string,
  preco_fixo: 0,
  disponivel: true,
  mostrar_no_checkout: false,
  etiqueta: 'KIT' as Etiqueta,
  itens: [] as KitItem[],
})

// Limpeza de imagens órfãs no S3 (fonte única compartilhada com o form de produtos).
const { cleanup: cleanupOrphanImages } = useOrphanImageCleanup(() => form.value.fotos)

// Categorias (opcional para kits) — mesma fonte usada por produtos e promoções.
const { toOptions: categoriaOptionsFn } = useCategories({ includeNone: true })
const categoriaOptions = computed(() => categoriaOptionsFn())

const somaOriginal = computed<number>(() =>
  form.value.itens.reduce((acc, i) => acc + i.preco_venda * i.quantidade, 0),
)

/** IDs já adicionados — passados ao picker para filtrar da busca. */
const idsAdicionados = computed<readonly string[]>(() =>
  form.value.itens.map((i) => i.produto_id),
)

function handleAddProduto(produto: AdminProdutoListItem): void {
  // Garante unicidade (picker já filtra, mas duplo-clique pode causar race)
  if (form.value.itens.some((i) => i.produto_id === produto.id)) return
  form.value.itens.push({
    produto_id: produto.id,
    nome: produto.nome,
    preco_venda: Number(produto.preco_venda ?? 0),
    quantidade: 1,
  })
}

async function removeItem(idx: number): Promise<void> {
  const item = form.value.itens[idx]
  if (!item) return
  const ok = await confirm({
    title: 'Remover item do kit?',
    message: `Remover "${item.nome}"?`,
    variant: 'error',
    confirmText: 'Remover',
  })
  if (!ok) return
  form.value.itens.splice(idx, 1)
}

async function loadData(): Promise<void> {
  if (isNew.value) return
  loading.value = true
  const { data: kit } = await supabase.from('kits').select('*').eq('id', route.params.id as string).maybeSingle()
  if (!kit) {
    await navigateTo('/admin/kits')
    return
  }
  form.value = {
    nome: kit.nome ?? '',
    descricao: kit.descricao ?? '',
    fotos: getProductGallery(kit),
    categoria_id: kit.categoria_id ?? '',
    preco_fixo: Number(kit.preco_fixo ?? 0),
    disponivel: kit.disponivel ?? true,
    mostrar_no_checkout: (kit as { mostrar_no_checkout?: boolean }).mostrar_no_checkout ?? false,
    etiqueta: ((kit as { etiqueta?: string }).etiqueta as Etiqueta) ?? 'KIT',
    itens: [],
  }

  const { data: itens } = await supabase
    .from('kit_itens')
    .select('produto_id, quantidade, produtos(id, nome, preco_venda)')
    .eq('kit_id', kit.id)
  if (itens) {
    form.value.itens = itens.map((i) => ({
      produto_id: i.produto_id ?? '',
      nome: (i.produtos as { nome: string } | null)?.nome ?? 'Produto',
      preco_venda: Number((i.produtos as { preco_venda: number } | null)?.preco_venda ?? 0),
      quantidade: i.quantidade,
    }))
  }
  loading.value = false
}

onMounted(() => loadData())

async function save(): Promise<void> {
  const parsed = kitSchema.safeParse(form.value)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    notify.error('Campos inválidos', first?.message)
    return
  }
  if (form.value.itens.length === 0) {
    notify.error('Itens obrigatórios', 'Adicione ao menos um produto ao kit.')
    return
  }

  saving.value = true
  const kitPayload = {
    nome: parsed.data.nome,
    descricao: form.value.descricao,
    // Capa = primeira foto; extras = restante (mesma convenção de getProductGallery).
    foto_url: form.value.fotos[0] ?? '',
    imagens: form.value.fotos.slice(1),
    // "" (Sem categoria) → NULL, para respeitar a FK ON DELETE SET NULL.
    categoria_id: form.value.categoria_id || null,
    preco_fixo: parsed.data.preco_fixo,
    disponivel: form.value.disponivel,
    mostrar_no_checkout: form.value.mostrar_no_checkout,
    etiqueta: form.value.etiqueta,
  }

  let kitId = isNew.value ? null : (route.params.id as string)

  if (isNew.value) {
    const { data, error } = await supabase.from('kits').insert([kitPayload]).select('id').single()
    if (error || !data) {
      notify.error('Erro ao criar kit', error?.message)
      saving.value = false
      return
    }
    kitId = data.id
  } else {
    const { error } = await supabase.from('kits').update(kitPayload).eq('id', kitId!)
    if (error) {
      notify.error('Erro ao salvar kit', error.message)
      saving.value = false
      return
    }
    // Recria os itens (delete-then-insert, mantém simplicidade MVP)
    await supabase.from('kit_itens').delete().eq('kit_id', kitId!)
  }

  if (kitId) {
    const itensPayload = form.value.itens.map((i) => ({
      kit_id: kitId,
      produto_id: i.produto_id,
      quantidade: i.quantidade,
    }))
    const { error } = await supabase.from('kit_itens').insert(itensPayload)
    if (error) {
      notify.error('Erro ao salvar itens', error.message)
      saving.value = false
      return
    }
  }

  // Limpeza best-effort das imagens que ficaram órfãs nesta edição (S3).
  await cleanupOrphanImages(form.value.fotos)

  saving.value = false
  notify.success('Kit salvo')
  await navigateTo('/admin/kits')
}

const { formatCurrency } = useFormatters()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface text-text-primary font-sans">

    <!-- Header Sticky de Ações (Enterprise Grade Padrão) -->
    <header class="h-16 flex items-center justify-between px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 -ml-2 rounded-full hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors mr-1 cursor-pointer"
          @click="navigateTo('/admin/kits')"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
          {{ isNew ? 'Novo Kit' : 'Editar Kit' }}
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          @click="navigateTo('/admin/kits')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          :disabled="saving"
          @click="save()"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ saving ? 'Salvando…' : 'Salvar Alterações' }}
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-4xl mx-auto p-6 md:p-8 pb-32">
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <div v-else class="space-y-10">

        <!-- ROW 1: Foto + Básico -->
        <div class="flex flex-col md:flex-row gap-8 items-start">
          <div class="w-full md:w-72 shrink-0">
            <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Imagens do Kit</p>
            <ProductImageManager
              v-model="form.fotos"
              bucket="produtos"
            />
          </div>
          <div class="flex-1 space-y-4">
            <div>
              <label for="kit-nome" class="block text-sm font-semibold text-text-primary mb-1">Nome *</label>
              <input
                id="kit-nome"
                v-model="form.nome"
                type="text"
                class="w-full px-3 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Combo Família Feliz"
              >
            </div>
            <div>
              <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Categoria (opcional)</p>
              <UiSelect
                :model-value="form.categoria_id"
                :options="categoriaOptions"
                placeholder="Selecione uma categoria…"
                aria-label="Categoria do kit"
                @update:model-value="(v) => (form.categoria_id = String(v ?? ''))"
              />
              <p class="mt-1 text-[11px] text-text-muted">
                Sem categoria: o kit aparece apenas em <em>/catalog/kits</em>.
              </p>
            </div>
            <div>
              <label for="kit-desc" class="block text-sm font-semibold text-text-primary mb-1">Descrição</label>
              <textarea
                id="kit-desc"
                v-model="form.descricao"
                rows="3"
                class="w-full px-3 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
        </div>

        <hr class="border-border">

        <!-- ROW 2: Itens do Kit -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wide text-text-muted mb-3">
            Itens do Kit
          </h3>

          <!-- Picker de produto -->
          <div class="mb-4">
            <AdminProductPicker
              :excluded-ids="idsAdicionados"
              placeholder="Buscar produto para adicionar ao kit…"
              @select="handleAddProduto"
            />
          </div>

          <div
            v-if="form.itens.length === 0"
            class="text-sm text-text-muted py-6 text-center border border-dashed border-border rounded-lg italic"
          >
            Nenhum produto adicionado. Use a busca acima para incluir itens.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(item, idx) in form.itens"
              :key="item.produto_id"
              class="flex items-center gap-3 bg-surface-raised px-3 py-2.5 rounded-md border border-border"
            >
              <span class="flex-1 text-sm font-medium text-text-primary truncate">{{ item.nome }}</span>
              <span class="text-xs text-text-muted tabular-nums shrink-0">{{ formatCurrency(item.preco_venda) }}</span>
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-xs text-text-muted">Qtd</span>
                <input
                  v-model.number="item.quantidade"
                  type="number"
                  min="1"
                  step="1"
                  class="w-14 px-2 py-1 rounded border border-border bg-surface text-sm text-center"
                >
              </div>
              <button
                type="button"
                class="text-danger-400 hover:text-danger-600 p-1 transition-colors shrink-0"
                title="Remover item"
                @click="removeItem(idx)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <hr class="border-border">

        <!-- ROW 3: Precificação -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wide text-text-muted mb-4">Precificação do Kit</h3>
          <div class="flex flex-col md:flex-row gap-6 items-center">
            <div class="flex-1">
              <span class="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
                Valor Original (Soma dos Itens)
              </span>
              <span class="text-lg font-medium text-text-muted line-through tabular-nums">
                {{ formatCurrency(somaOriginal) }}
              </span>
            </div>
            <div class="flex-1 w-full">
              <label for="kit-preco" class="block text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">
                Preço Fixo Cobrado (R$)
              </label>
              <input
                id="kit-preco"
                v-model.number="form.preco_fixo"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 rounded-md border border-primary-400 bg-primary-50 dark:bg-primary-950/20 text-primary-900 dark:text-primary-200 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
            </div>
          </div>
        </div>

        <hr class="border-border">

        <!-- ROW 4: Etiqueta + Disponibilidade + Checkout -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-text-primary mb-2">Rótulo do card</label>
            <div class="flex gap-2">
              <button
                v-for="op in ETIQUETA_OPTIONS"
                :key="op"
                type="button"
                :class="[
                  'px-4 py-2 rounded-md border text-sm font-bold transition-all',
                  form.etiqueta === op
                    ? 'bg-interactive-primary text-text-inverse border-interactive-primary'
                    : 'bg-surface text-text-muted border-border hover:border-text-primary'
                ]"
                @click="form.etiqueta = op"
              >
                {{ op }}
              </button>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <input
              id="kit-disponivel"
              v-model="form.disponivel"
              type="checkbox"
              class="accent-secondary-600 w-4 h-4"
            >
            <label for="kit-disponivel" class="text-sm font-medium text-text-primary cursor-pointer">
              Kit ativo e visível no catálogo
            </label>
          </div>
          <div class="flex items-center gap-3">
            <input
              id="kit-checkout"
              v-model="form.mostrar_no_checkout"
              type="checkbox"
              class="accent-primary-600 w-4 h-4"
            >
            <label for="kit-checkout" class="text-sm font-medium text-text-primary cursor-pointer">
              Aparecer no checkout como upsell
            </label>
          </div>
        </div>

        <!-- Actions - Removido para o Header -->
      </div>
    </main>
  </div>
</template>

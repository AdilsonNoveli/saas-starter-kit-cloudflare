<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Trash2, Layout, Sliders, Palette, Sparkles } from '@lucide/vue'
import { z } from 'zod'
import { navigateTo, useState } from 'nuxt/app'
import { useNotification } from '~/composables/useNotification'
import { CATEGORY_COLORS } from '~~/shared/utils/categoryColors'
import { useOrphanImageCleanup } from '~/composables/useOrphanImageCleanup'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const supabase = useSupabaseClient()
const { notify } = useNotification()
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')

const isNew = computed<boolean>(() => route.params.id === 'new')
const loading = ref<boolean>(false)
const saving = ref<boolean>(false)

const categoriaSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  description: z.string().optional(),
  icon_url: z.string().optional(),
  sort_order: z.number().int().nonnegative(),
  active: z.boolean(),
  color: z.string().nullable().optional(),
  is_primary: z.boolean().default(false),
  // Ordem de exibição dos produtos no catálogo (migration 128): 'random' (padrão,
  // atual) ou 'numeric' (pelo campo Número do produto). Também governa a aba
  // "Todos" quando esta é a categoria Principal.
  sort_mode: z.enum(['random', 'numeric']).default('random'),
})

const form = ref({
  name: '',
  description: '',
  icon_url: '',
  sort_order: 10,
  active: true,
  color: 'brand-green',
  is_primary: false,
  sort_mode: 'random' as 'random' | 'numeric',
})

// Limpeza de imagens órfãs no S3
const { cleanup: cleanupOrphanImages } = useOrphanImageCleanup(() =>
  form.value.icon_url ? [form.value.icon_url] : []
)

async function loadData(): Promise<void> {
  if (isNew.value) {
    const { data } = await supabase
      .from('categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      form.value.sort_order = (data[0]?.sort_order ?? 0) + 10
    }
    return
  }
  loading.value = true
  const { data } = await supabase.from('categories').select('*').eq('id', route.params.id as string).maybeSingle()
  if (data) {
    form.value = {
      name: data.name ?? '',
      description: data.description ?? '',
      icon_url: data.icon_url ?? '',
      sort_order: data.sort_order ?? 10,
      active: data.active ?? true,
      color: data.color ?? 'brand-green',
      is_primary: data.is_primary ?? false,
      sort_mode: (data.sort_mode as 'random' | 'numeric') ?? 'random',
    }
  } else {
    await navigateTo('/admin/products?tab=categorias')
    return
  }
  loading.value = false
}

onMounted(() => loadData())

async function save(): Promise<void> {
  const parsed = categoriaSchema.safeParse(form.value)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    notify.error('Campos inválidos', first?.message)
    return
  }
  saving.value = true
  if (isNew.value) {
    const { error } = await supabase.from('categories').insert([parsed.data])
    if (error) {
      notify.error('Erro ao criar categoria', error.message)
      saving.value = false
      return
    }
  } else {
    const { error } = await supabase.from('categories').update(parsed.data).eq('id', route.params.id as string)
    if (error) {
      notify.error('Erro ao atualizar', error.message)
      saving.value = false
      return
    }
  }
  
  // Limpar imagens órfãs que foram removidas do formulário antes de salvar
  await cleanupOrphanImages(form.value.icon_url ? [form.value.icon_url] : [])

  saving.value = false
  notify.success('Categoria salva')
  await navigateTo('/admin/products?tab=categorias')
}

function removeIcone(): void {
  form.value.icon_url = ''
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface text-text-primary">
    
    <!-- Header Sticky de Ações (Enterprise Grade Padrão) -->
    <header class="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="p-2 -ml-2 rounded-full hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors mr-1 cursor-pointer"
          :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
          @click="navigateTo('/admin/products?tab=categorias')"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
          {{ isNew ? 'Nova Categoria' : 'Editar Categoria' }}
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          @click="navigateTo('/admin/products?tab=categorias')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          :disabled="saving"
          @click="save"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ saving ? 'Salvando…' : 'Salvar Categoria' }}
        </button>
      </div>
    </header>

    <!-- Main Content (Two Columns Layout) -->
    <main class="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8">
      <div v-if="loading" class="flex justify-center items-center h-64 text-text-muted">
        <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-32">
        
        <!-- COLUNA DA ESQUERDA: Dados do Formulário (7/12) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Card 1: Informações Básicas -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Layout class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Informações Básicas</h3>
            </div>

            <div class="space-y-4">
              <!-- Nome e Ordem -->
              <div class="flex gap-4">
                <div class="flex-1">
                  <label for="cat-nome" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Nome *</label>
                  <input
                    id="cat-nome"
                    v-model="form.name"
                    type="text"
                    class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 transition-colors"
                    placeholder="Ex: Bebidas"
                  >
                </div>
                <div class="w-28 shrink-0">
                  <label for="cat-ordem" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Ordem</label>
                  <input
                    id="cat-ordem"
                    v-model.number="form.sort_order"
                    type="number"
                    class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 transition-colors text-center font-bold"
                  >
                </div>
              </div>

              <!-- Descrição -->
              <div>
                <label for="cat-descricao" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Descrição</label>
                <textarea
                  id="cat-descricao"
                  v-model="form.description"
                  rows="3.5"
                  class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 transition-colors resize-none"
                  placeholder="Descreva a finalidade ou os produtos pertencentes a esta categoria..."
                />
              </div>
            </div>
          </div>

          <!-- Card 2: Cor Temática de Destaque -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Palette class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Identidade Visual</h3>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between gap-4">
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wider">Cor Temática de Destaque</p>
                <button
                  v-if="form.color !== 'brand-green'"
                  type="button"
                  class="text-[11px] text-brand-green hover:underline font-bold transition-all cursor-pointer"
                  @click="form.color = 'brand-green'"
                >
                  Restaurar cor padrão do tema
                </button>
              </div>

              <div class="flex flex-wrap gap-2.5">
                <button
                  v-for="color in CATEGORY_COLORS"
                  :key="color.value"
                  type="button"
                  class="w-8 h-8 rounded-full border border-border/50 transition-all relative flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                  :class="form.color === color.value ? 'ring-2 ring-offset-2 ring-brand-green scale-105' : 'hover:scale-105'"
                  :style="{ backgroundColor: color.hex }"
                  :title="color.label"
                  @click="form.color = color.value"
                >
                  <span v-if="form.color === color.value" class="text-white text-[10px] font-bold shadow-sm">✓</span>
                </button>
              </div>
              <p class="text-[10px] text-text-muted leading-relaxed">
                Define as cores de destaque e a linha de seleção desta categoria no catálogo (Light/Dark mode).
              </p>
            </div>
          </div>

          <!-- Card 3: Regras de Exibição -->
          <div class="border border-border bg-surface-raised p-5 space-y-5 rounded-md shadow-xs">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Sliders class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Regras de Exibição</h3>
            </div>

            <div class="space-y-4">
              <div class="flex items-start gap-3 cursor-pointer">
                <input
                  id="cat-ativa"
                  v-model="form.active"
                  type="checkbox"
                  class="w-4 h-4 mt-0.5 rounded border-border accent-brand-green focus:ring-brand-green/20 cursor-pointer"
                >
                <div class="flex flex-col">
                  <label for="cat-ativa" class="text-xs font-bold text-text-primary uppercase tracking-wider cursor-pointer select-none">Categoria Ativa</label>
                  <p class="text-[10px] text-text-muted select-none">Fica visível no PDV e Catálogo público para os clientes.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 cursor-pointer border-t border-border pt-4">
                <input
                  id="cat-principal"
                  v-model="form.is_primary"
                  type="checkbox"
                  class="w-4 h-4 mt-0.5 rounded border-border accent-brand-green focus:ring-brand-green/20 cursor-pointer"
                >
                <div class="flex flex-col">
                  <label for="cat-principal" class="text-xs font-bold text-text-primary uppercase tracking-wider cursor-pointer select-none">Categoria Principal</label>
                  <p class="text-[10px] text-text-muted select-none">Se ativado, esta categoria funcionará como a aba "Todos" e unificará todos os itens da loja.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 cursor-pointer border-t border-border pt-4">
                <input
                  id="cat-ordem-numerica"
                  :checked="form.sort_mode === 'numeric'"
                  type="checkbox"
                  class="w-4 h-4 mt-0.5 rounded border-border accent-brand-green focus:ring-brand-green/20 cursor-pointer"
                  @change="form.sort_mode = ($event.target as HTMLInputElement).checked ? 'numeric' : 'random'"
                >
                <div class="flex flex-col">
                  <label for="cat-ordem-numerica" class="text-xs font-bold text-text-primary uppercase tracking-wider cursor-pointer select-none">Ordem Numérica no Catálogo</label>
                  <p class="text-[10px] text-text-muted select-none">Quando ativado, os produtos desta categoria seguem o campo Número (menor primeiro); produtos sem número aparecem por último. Quando desativado, a ordem é aleatória (padrão).</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUNA DA DIREITA: Ícone / Upload (5/12) -->
        <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          
          <!-- Card 4: Ícone da Categoria -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md shadow-xs">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <Sparkles class="w-4.5 h-4.5 text-brand-green" />
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Ícone da Categoria</h3>
              </div>
              <!-- Botão de remover imagem se existir -->
              <button
                v-if="form.icon_url"
                type="button"
                class="text-[10px] font-bold text-danger-600 hover:text-danger-700 uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                title="Excluir imagem atual"
                @click="removeIcone"
              >
                <Trash2 class="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>

            <div class="flex flex-col items-center justify-center p-4 bg-surface rounded border border-border/80">
              <ImageUploader
                v-model="form.icon_url"
                bucket="produtos"
                placeholder-text="Upload Ícone"
                custom-class="h-40 w-40"
                shape="square"
                hide-url-input
              />
              <p class="text-[10px] text-text-muted text-center mt-3 leading-relaxed">
                Tamanho recomendado: 256x256 pixels. Formatos suportados: PNG, JPG ou SVG.
              </p>
            </div>
          </div>

        </div>

      </div>
    </main>

  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.35s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

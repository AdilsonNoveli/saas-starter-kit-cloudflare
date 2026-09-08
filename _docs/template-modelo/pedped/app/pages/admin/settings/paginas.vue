<script setup lang="ts">
/**
 * @descricao: Aba "Páginas" das configurações da loja.
 * @objetivo: Editar as páginas institucionais do catálogo (termos, políticas).
 *
 * Não toca `loja`: escreve na tabela `paginas`, cada página salva pelo modal.
 * Por isso não há "Salvar Alterações" nesta aba.
 */
import { ref, reactive, onMounted } from 'vue'
import { Pencil } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'

const supabase = useSupabaseClient()
const { notify } = useNotification()

interface PaginaRow {
  slug: string
  titulo: string
  conteudo: string
  atualizado_em?: string
}

const paginas = ref<PaginaRow[]>([])
const paginasLoading = ref<boolean>(false)
const paginasSaving = ref<boolean>(false)
const pageModalOpen = ref<boolean>(false)
const editingPage = ref<PaginaRow | null>(null)
const pageForm = reactive({
  slug: '',
  titulo: '',
  conteudo: '',
})

async function loadPages(): Promise<void> {
  paginasLoading.value = true
  try {
    const { data, error } = await supabase
      .from('paginas')
      .select('slug, titulo, conteudo, atualizado_em')
      .order('titulo')
    if (error) throw error
    paginas.value = data ?? []
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Tente novamente.'
    notify.error('Erro ao carregar páginas', errorMsg)
  } finally {
    paginasLoading.value = false
  }
}

onMounted(() => {
  void loadPages()
})

function openEditPageModal(page: PaginaRow): void {
  editingPage.value = page
  pageForm.slug = page.slug
  pageForm.titulo = page.titulo
  pageForm.conteudo = page.conteudo
  pageModalOpen.value = true
}

async function savePage(): Promise<void> {
  if (!pageForm.titulo.trim()) {
    notify.warning('Informe o título da página.')
    return
  }
  if (!pageForm.conteudo.trim()) {
    notify.warning('Informe o conteúdo da página.')
    return
  }

  paginasSaving.value = true
  try {
    // `.eq('slug', ...)` não é opcional: `pg-safeupdate` recusa UPDATE sem WHERE.
    const { error } = await supabase
      .from('paginas')
      .update({
        titulo: pageForm.titulo.trim(),
        conteudo: pageForm.conteudo.trim(),
      })
      .eq('slug', pageForm.slug)

    if (error) throw error

    notify.success('Página salva com sucesso')
    pageModalOpen.value = false
    await loadPages()
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Tente novamente.'
    notify.error('Erro ao salvar página', errorMsg)
  } finally {
    paginasSaving.value = false
  }
}
</script>

<template>
  <main class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-8 animate-fade-in">
      <div>
        <h2 class="text-lg font-bold mb-1">Páginas do Catálogo</h2>
        <p class="text-sm text-text-muted">Gerencie e edite os termos de uso, políticas de privacidade e outras páginas institucionais.</p>
      </div>

      <div v-if="paginasLoading" class="flex justify-center py-8">
        <div class="w-6 h-6 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <div v-else class="border border-border rounded-lg bg-surface divide-y divide-border overflow-hidden">
        <div v-for="page in paginas" :key="page.slug" class="flex items-center justify-between p-4 hover:bg-surface-raised/30 transition-colors">
          <div>
            <h3 class="text-sm font-semibold text-text-primary">{{ page.titulo }}</h3>
            <p class="text-xs text-text-muted mt-0.5">slug: <code class="bg-surface-raised px-1.5 py-0.5 rounded text-[10px]">{{ page.slug }}</code></p>
          </div>
          <button
            type="button"
            class="p-2 text-text-muted hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
            @click="openEditPageModal(page)"
          >
            <Pencil class="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>
    </section>

    <!-- Modal Editar Página -->
    <UiModal
      :open="pageModalOpen"
      :title="`Editar Página: ${pageForm.titulo}`"
      size="lg"
      @close="pageModalOpen = false"
    >
      <div class="space-y-4">
        <div>
          <label for="page-title" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Título *</label>
          <input
            id="page-title"
            v-model="pageForm.titulo"
            type="text"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm"
            placeholder="Título da página"
          >
        </div>
        <div>
          <label for="page-content" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Conteúdo *</label>
          <textarea
            id="page-content"
            v-model="pageForm.conteudo"
            rows="15"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm font-sans leading-relaxed resize-y"
            placeholder="Escreva o conteúdo da página..."
          />
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-sm font-medium active:scale-95"
          @click="pageModalOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 shadow-xs"
          :disabled="paginasSaving"
          @click="savePage"
        >
          <span v-if="paginasSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Salvar
        </button>
      </template>
    </UiModal>
  </main>
</template>

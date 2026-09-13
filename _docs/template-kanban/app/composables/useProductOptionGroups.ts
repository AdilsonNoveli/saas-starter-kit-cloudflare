import { computed, nextTick, ref, watch } from 'vue'
import { useNotification } from '~/composables/useNotification'
import type { SaveResult } from '~/composables/useProductSaveResult'
import type { TipoOpcaoGrupo } from '~~/shared/types/product'

export interface ItemForm {
  id: string | null
  nome: string
  preco_delta: number
  selecionado_padrao: boolean
  ativo: boolean
  ordem: number
  foto_url: string | null
}

export interface GrupoForm {
  id: string | null
  nome: string
  tipo: TipoOpcaoGrupo
  obrigatorio: boolean
  min_selecoes: number
  max_selecoes: number
  ordem: number
  itens: ItemForm[]
  // Config exclusiva de tipo='texto_livre'
  texto_max_caracteres: number | null
  texto_placeholder: string
  // Config exclusiva de tipo='upload_arquivo'
  arquivo_tipos_aceitos: string[]
  arquivo_tamanho_maximo_mb: number
  _collapsed?: boolean
}

export const TIPO_OPCAO_OPTIONS = [
  { value: 'single', label: 'Escolha Única (Tamanho, Cor)' },
  { value: 'multiple', label: 'Múltipla Escolha (Adicionais)' },
  { value: 'toggle', label: 'Interruptor Individual' },
  { value: 'texto_livre', label: 'Texto Livre (personalização)' },
  { value: 'upload_arquivo', label: 'Upload de Arquivo (arte/logo)' },
]

/** Tipos que capturam um VALOR do cliente (texto/arquivo) em vez de uma lista de itens escolhíveis. */
export const TIPOS_VALOR_LIVRE = new Set<TipoOpcaoGrupo>(['texto_livre', 'upload_arquivo'])

export const ARQUIVO_TIPO_CHIPS: { value: string; label: string }[] = [
  { value: 'application/pdf', label: 'PDF' },
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
]

/**
 * Editor de Grupos/Itens de Opções do produto (tamanhos, sabores,
 * adicionais, personalização). Extraído de `[id].vue` — é a maior fatia de
 * lógica do formulário, por isso ganha composable própria (SoC).
 */
export function useProductOptionGroups() {
  const supabase = useSupabaseClient()
  const { confirm } = useNotification()

  const grupos = ref<GrupoForm[]>([])
  const deletedGrupoIds = ref<string[]>([])
  const deletedItemIds = ref<string[]>([])

  // === Accordion & feedback visual ===
  const newlyAddedGrupoIndex = ref<number | null>(null)

  function toggleGrupoCollapse(gi: number): void {
    const g = grupos.value[gi]
    if (g) g._collapsed = !g._collapsed
  }

  function isGrupoCollapsed(gi: number): boolean {
    return grupos.value[gi]?._collapsed === true
  }

  const allGroupsCollapsed = computed(() =>
    grupos.value.length > 0 && grupos.value.every((g) => g._collapsed === true),
  )

  function toggleAllGroupsCollapse(): void {
    const target = !allGroupsCollapsed.value
    grupos.value.forEach((g) => {
      g._collapsed = target
    })
  }

  function addGrupo(): void {
    const newIndex = grupos.value.length
    grupos.value.push({
      id: null,
      nome: '',
      tipo: 'single',
      obrigatorio: false,
      min_selecoes: 0,
      max_selecoes: 1,
      ordem: newIndex,
      itens: [],
      texto_max_caracteres: 200,
      texto_placeholder: '',
      arquivo_tipos_aceitos: ['application/pdf'],
      arquivo_tamanho_maximo_mb: 10,
      _collapsed: false,
    })

    // Feedback visual com destaque luminoso
    newlyAddedGrupoIndex.value = newIndex
    setTimeout(() => {
      if (newlyAddedGrupoIndex.value === newIndex) {
        newlyAddedGrupoIndex.value = null
      }
    }, 2500)

    // Scroll suave e foco automático no input de nome do grupo criado
    void nextTick(() => {
      const el = document.getElementById(`grupo-nome-${newIndex}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus()
      }
    })
  }

  /** Item-âncora único dos tipos texto_livre/upload_arquivo — nome/preco_delta
   * reaproveitados como taxa de personalização opcional (ver migration 114). */
  function ensureAnchorItem(grupo: GrupoForm): void {
    if (!TIPOS_VALOR_LIVRE.has(grupo.tipo)) return
    if (grupo.itens.length === 0) {
      grupo.itens.push({
        id: null,
        nome: grupo.nome || 'Personalização',
        preco_delta: 0,
        selecionado_padrao: false,
        ativo: true,
        foto_url: null,
        ordem: 0,
      })
    } else if (grupo.itens.length > 1) {
      // Defensivo — não deveria acontecer, mas garante 1 único item-âncora.
      for (const extra of grupo.itens.slice(1)) {
        if (extra.id) deletedItemIds.value.push(extra.id)
      }
      grupo.itens = [grupo.itens[0]!]
    }
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

  // === Reordenação de grupos via Drag & Drop (Move) ===
  const draggedGrupoIndex = ref<number | null>(null)
  const dragOverGrupoIndex = ref<number | null>(null)

  function onGrupoDragStart(event: DragEvent, index: number): void {
    draggedGrupoIndex.value = index
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  function onGrupoDragOver(event: DragEvent, index: number): void {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    dragOverGrupoIndex.value = index
  }

  function onGrupoDragLeave(_event: DragEvent, index: number): void {
    if (dragOverGrupoIndex.value === index) {
      dragOverGrupoIndex.value = null
    }
  }

  function onGrupoDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault()
    const fromIndex = draggedGrupoIndex.value
    if (fromIndex !== null && fromIndex !== targetIndex) {
      const [item] = grupos.value.splice(fromIndex, 1)
      if (item) {
        grupos.value.splice(targetIndex, 0, item)
        grupos.value.forEach((g, i) => {
          g.ordem = i
        })
      }
    }
    draggedGrupoIndex.value = null
    dragOverGrupoIndex.value = null
  }

  function onGrupoDragEnd(): void {
    draggedGrupoIndex.value = null
    dragOverGrupoIndex.value = null
  }

  // Sincroniza min/max de acordo com tipo e obrigatoriedade, garantindo integridade das regras
  watch(
    () => grupos.value.map((g) => ({ tipo: g.tipo, obrigatorio: g.obrigatorio, max_selecoes: g.max_selecoes })),
    (val) => {
      val.forEach((v, idx) => {
        const g = grupos.value[idx]
        if (!g) return
        if (v.tipo === 'single' || TIPOS_VALOR_LIVRE.has(v.tipo)) {
          // texto_livre/upload_arquivo: uma resposta livre é "escolha única" por natureza.
          g.max_selecoes = 1
          g.min_selecoes = v.obrigatorio ? 1 : 0
        } else if (v.tipo === 'toggle') {
          g.max_selecoes = 0
          g.min_selecoes = 0
        } else {
          // Para multiple, garante que o min não ultrapasse o max
          if (g.min_selecoes > g.max_selecoes) g.min_selecoes = g.max_selecoes
        }
        ensureAnchorItem(g)
      })
    },
    { deep: true },
  )

  async function loadForProduct(produtoId: string): Promise<void> {
    const { data: gruposData } = await supabase
      .from('product_option_group')
      .select('*, product_option_item(id, name, price_delta, default_selected, active, sort_order, group_id, photo_url)')
      .eq('product_id', produtoId)
      .order('sort_order', { ascending: true })
      .order('sort_order', { ascending: true, referencedTable: 'product_option_item' })

    grupos.value = (gruposData ?? []).map((g) => ({
      id: g.id,
      nome: g.name,
      tipo: g.type as TipoOpcaoGrupo,
      obrigatorio: g.required,
      min_selecoes: g.min_selections ?? 0,
      max_selecoes: g.max_selections ?? 1,
      ordem: g.sort_order,
      itens: (g.product_option_item ?? []).map((i) => ({
        id: i.id,
        nome: i.name,
        preco_delta: Number(i.price_delta ?? 0),
        selecionado_padrao: i.default_selected ?? false,
        ativo: i.active ?? true,
        ordem: i.sort_order,
        foto_url: i.photo_url ?? null,
      })),
      texto_max_caracteres: g.max_text_length ?? 200,
      texto_placeholder: g.text_placeholder ?? '',
      arquivo_tipos_aceitos: g.accepted_file_types ?? ['application/pdf'],
      arquivo_tamanho_maximo_mb: g.max_file_size_mb ?? 10,
      _collapsed: false,
    }))
  }

  async function saveItem(item: ItemForm, ii: number, grupoId: string): Promise<SaveResult> {
    const itemPayload = {
      group_id: grupoId,
      name: item.nome,
      price_delta: item.preco_delta,
      default_selected: item.selecionado_padrao,
      active: item.ativo,
      sort_order: ii,
      photo_url: item.foto_url,
    }
    if (item.id) {
      const { error } = await supabase.from('product_option_item').update(itemPayload).eq('id', item.id)
      if (error) return { success: false, message: error.message }
    } else {
      const { data: id_, error } = await supabase
        .from('product_option_item')
        .insert([itemPayload])
        .select('id')
        .single()
      if (error) return { success: false, message: error.message }
      if (id_) item.id = id_.id
    }
    return { success: true }
  }

  async function saveGrupo(g: GrupoForm, gi: number, produtoId: string): Promise<SaveResult> {
    ensureAnchorItem(g)
    const grupoPayload = {
      product_id: produtoId,
      name: g.nome,
      type: g.tipo,
      required: g.obrigatorio,
      min_selections: g.min_selecoes,
      max_selections: g.max_selecoes,
      sort_order: gi,
      max_text_length: g.tipo === 'texto_livre' ? g.texto_max_caracteres : null,
      text_placeholder: g.tipo === 'texto_livre' ? (g.texto_placeholder || null) : null,
      accepted_file_types: g.tipo === 'upload_arquivo' ? g.arquivo_tipos_aceitos : null,
      max_file_size_mb: g.tipo === 'upload_arquivo' ? g.arquivo_tamanho_maximo_mb : null,
    }

    if (g.id) {
      const { error } = await supabase.from('product_option_group').update(grupoPayload).eq('id', g.id)
      if (error) return { success: false, message: error.message }
    } else {
      const { data: gd, error } = await supabase
        .from('product_option_group')
        .insert([grupoPayload])
        .select('id')
        .single()
      if (error) return { success: false, message: error.message }
      if (gd) g.id = gd.id
    }

    if (!g.id) return { success: false, message: 'Falha ao obter o ID do grupo salvo.' }

    // Título do item-âncora (texto_livre/upload_arquivo): editável na própria
    // UI do painel de config (campo "Nome do item"), igual aos demais tipos —
    // só cai pro nome do grupo se o lojista deixar em branco.
    if (TIPOS_VALOR_LIVRE.has(g.tipo) && g.itens[0] && !g.itens[0].nome.trim()) {
      g.itens[0].nome = g.nome || 'Personalização'
    }

    for (let ii = 0; ii < g.itens.length; ii++) {
      const result = await saveItem(g.itens[ii]!, ii, g.id)
      if (!result.success) return result
    }
    return { success: true }
  }

  async function saveForProduct(produtoId: string): Promise<SaveResult> {
    // 1. Deletar grupos marcados (CASCADE deleta os itens do grupo)
    if (deletedGrupoIds.value.length > 0) {
      const { error } = await supabase.from('product_option_group').delete().in('id', deletedGrupoIds.value)
      if (error) return { success: false, message: error.message }
      deletedGrupoIds.value = []
    }

    // 2. Deletar itens marcados individualmente
    if (deletedItemIds.value.length > 0) {
      const { error } = await supabase.from('product_option_item').delete().in('id', deletedItemIds.value)
      if (error) return { success: false, message: error.message }
      deletedItemIds.value = []
    }

    // 3. Upsert grupos e seus itens em sequência
    for (let gi = 0; gi < grupos.value.length; gi++) {
      const result = await saveGrupo(grupos.value[gi]!, gi, produtoId)
      if (!result.success) return result
    }
    return { success: true }
  }

  function reset(): void {
    grupos.value = []
    deletedGrupoIds.value = []
    deletedItemIds.value = []
  }

  return {
    grupos,
    newlyAddedGrupoIndex,
    draggedGrupoIndex,
    dragOverGrupoIndex,
    allGroupsCollapsed,
    toggleGrupoCollapse,
    isGrupoCollapsed,
    toggleAllGroupsCollapse,
    addGrupo,
    removeGrupo,
    addItem,
    removeItem,
    onGrupoDragStart,
    onGrupoDragOver,
    onGrupoDragLeave,
    onGrupoDrop,
    onGrupoDragEnd,
    loadForProduct,
    saveForProduct,
    reset,
  }
}

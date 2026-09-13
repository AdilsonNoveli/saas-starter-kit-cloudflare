import { ref, computed } from 'vue'
import type { OptionGroup, OptionItem, SelectedOption } from '~~/shared/types/product'
import { useArtUpload } from '~/composables/useArtUpload'

/**
 * Sistema de seleção de opções do `ProductDetailsModal` — carga dos grupos,
 * seleção (single/multiple/toggle), grupos `texto_livre`/`upload_arquivo`
 * (personalização digitada / arte enviada), validação de obrigatoriedade e
 * o preço extra das opções selecionadas.
 *
 * NÃO confundir com `useProductOptionGroups.ts` (editor ADMIN de
 * grupos/itens — CRUD, drag&drop, persistência). Este composable é do lado
 * do CLIENTE: seleciona entre opções já cadastradas, nunca as edita.
 */
export function useProductOptionSelection() {
  const { uploadArte, removeArte } = useArtUpload()

  const grupos = ref<readonly OptionGroup[]>([])
  const loadingOpcoes = ref<boolean>(false)

  /**
   * Mapa grupo_id → Set de opcao_item_id selecionados.
   * Reiniciado a cada abertura do modal para não preservar seleções antigas.
   */
  const selections = ref<Map<string, Set<string>>>(new Map())

  // === Grupos texto_livre / upload_arquivo (migration 114) ===
  // Não usam `selections`/`toggleItem` (não têm semântica de radio/checkbox/
  // switch) — o valor fornecido pelo cliente É a seleção do grupo. Chaveados
  // por grupo.id, resetados em resetOptionState() como o resto do estado.
  const textValues = ref<Map<string, string>>(new Map())
  const fileValues = ref<Map<string, { url: string; key: string; nomeOriginal: string }>>(new Map())
  const fileUploading = ref<Set<string>>(new Set())
  const fileUploadError = ref<Map<string, string>>(new Map())

  function grupoAnchorItem(grupo: OptionGroup): OptionItem | undefined {
    return grupo.produto_opcao_item[0]
  }

  async function onArteFileSelected(grupo: OptionGroup, file: File | undefined): Promise<void> {
    if (!file) return
    const tiposAceitos = grupo.arquivo_tipos_aceitos ?? ['application/pdf']
    const maxMb = grupo.arquivo_tamanho_maximo_mb ?? 10

    fileUploading.value = new Set(fileUploading.value).add(grupo.id)
    fileUploadError.value = new Map(fileUploadError.value).set(grupo.id, '')

    const result = await uploadArte(file, tiposAceitos, maxMb)

    const uploading = new Set(fileUploading.value)
    uploading.delete(grupo.id)
    fileUploading.value = uploading

    if (!result) {
      fileUploadError.value = new Map(fileUploadError.value).set(grupo.id, 'Erro ao enviar arquivo. Tente novamente.')
      return
    }

    fileValues.value = new Map(fileValues.value).set(grupo.id, result)
  }

  function removeArteFile(grupo: OptionGroup): void {
    const current = fileValues.value.get(grupo.id)
    if (current) void removeArte(current.key)
    const next = new Map(fileValues.value)
    next.delete(grupo.id)
    fileValues.value = next
  }

  function setTextValue(grupoId: string, value: string): void {
    textValues.value = new Map(textValues.value).set(grupoId, value)
  }

  async function loadGrupos(produtoId: string): Promise<void> {
    loadingOpcoes.value = true
    try {
      const res = await $fetch<{ grupos: OptionGroup[] }>(`/api/catalog/products/${produtoId}/option-groups`)
      grupos.value = res.grupos
    } catch {
      grupos.value = []
      return
    } finally {
      loadingOpcoes.value = false
    }

    // Seed defaults — reseta selections para os itens marcados como padrão.
    const map = new Map<string, Set<string>>()
    for (const grupo of grupos.value) {
      const def = new Set<string>()
      for (const item of grupo.produto_opcao_item) {
        if (item.selecionado_padrao) def.add(item.id)
      }
      map.set(grupo.id, def)
    }
    selections.value = map
  }

  /** Reinicializa o estado de opções ao abrir/trocar de produto. */
  function resetOptionState(): void {
    grupos.value = []
    selections.value = new Map()
    textValues.value = new Map()
    fileValues.value = new Map()
    fileUploading.value = new Set()
    fileUploadError.value = new Map()
  }


  // === Seleção de opções ===

  function isSelected(grupoId: string, itemId: string): boolean {
    return selections.value.get(grupoId)?.has(itemId) ?? false
  }

  /** Para UiRadio (single): retorna o único item selecionado no grupo, ou undefined. */
  function getSingleSelected(grupoId: string): string | undefined {
    const set = selections.value.get(grupoId)
    if (!set || set.size === 0) return undefined
    return [...set][0]
  }

  function toggleItem(grupoId: string, itemId: string, tipo: OptionGroup['tipo']): void {
    const map = new Map(selections.value)
    const set = new Set(map.get(grupoId) ?? [])

    if (tipo === 'single') {
      set.clear()
      set.add(itemId)
    } else {
      if (set.has(itemId)) {
        set.delete(itemId)
      } else {
        if (tipo === 'multiple') {
          const grupo = grupos.value.find((g) => g.id === grupoId)
          if (grupo && grupo.max_selecoes > 0 && set.size >= grupo.max_selecoes) return
        }
        set.add(itemId)
      }
    }

    map.set(grupoId, set)
    selections.value = map
  }


  // Validação: grupos obrigatórios precisam de seleção suficiente.
  const validationErrors = computed<Map<string, string>>(() => {
    const errors = new Map<string, string>()
    for (const grupo of grupos.value) {
      if (!grupo.obrigatorio) continue

      if (grupo.tipo === 'texto_livre') {
        if (!textValues.value.get(grupo.id)?.trim()) {
          errors.set(grupo.id, `Preencha "${grupo.nome}" para continuar.`)
        }
        continue
      }
      if (grupo.tipo === 'upload_arquivo') {
        if (!fileValues.value.has(grupo.id)) {
          errors.set(grupo.id, `Envie um arquivo em "${grupo.nome}" para continuar.`)
        }
        continue
      }

      // Grupos `toggle` ("Interruptor Individual") gravam min_selecoes=0 por
      // padrão (cada item liga/desliga independente, sem semântica de "escolha
      // N") — mas quando `obrigatorio` está ativo, ao menos 1 tem que ficar
      // ligado. Sem este piso, o grupo nunca bloqueava o avanço (0 < 0 é falso).
      // Mesma regra usada no servidor (setCartItem.ts) para o carrinho do WhatsApp.
      const count = selections.value.get(grupo.id)?.size ?? 0
      const minimo = grupo.obrigatorio ? Math.max(1, grupo.min_selecoes) : grupo.min_selecoes
      if (count < minimo) {
        errors.set(grupo.id, `Selecione ao menos ${minimo} opção(ões) em "${grupo.nome}".`)
      }
    }
    return errors
  })

  function grupoHint(grupo: OptionGroup): string {
    if (grupo.tipo === 'texto_livre' || grupo.tipo === 'upload_arquivo') return ''
    if (grupo.tipo === 'single') return 'Escolha 1'
    if (grupo.tipo === 'toggle') return grupo.obrigatorio ? 'Selecione ao menos 1' : 'Opcional'
    if (grupo.min_selecoes > 0 && grupo.max_selecoes > grupo.min_selecoes) {
      return `Escolha de ${grupo.min_selecoes} a ${grupo.max_selecoes}`
    }
    if (grupo.max_selecoes > 0) return `Escolha até ${grupo.max_selecoes}`
    return 'Múltipla escolha'
  }

  /** Delta total das opções selecionadas (preview de preço). */
  const precoExtraTotal = computed<number>(() => {
    let total = 0
    for (const grupo of grupos.value) {
      if (grupo.tipo === 'texto_livre' || grupo.tipo === 'upload_arquivo') {
        // Taxa de personalização só entra quando o cliente de fato preencheu o valor.
        const preenchido = grupo.tipo === 'texto_livre'
          ? !!textValues.value.get(grupo.id)?.trim()
          : fileValues.value.has(grupo.id)
        const delta = Number(grupoAnchorItem(grupo)?.preco_delta ?? 0)
        if (preenchido && delta > 0) total += delta
        continue
      }

      const selectedIds = selections.value.get(grupo.id) ?? new Set<string>()
      for (const item of grupo.produto_opcao_item) {
        if (selectedIds.has(item.id) && Number(item.preco_delta) > 0) {
          total += Number(item.preco_delta)
        }
      }
    }
    return total
  })

  /** Monta o payload de opções selecionadas para `emit('confirm', ...)`. */
  function buildSelectedOptions(): SelectedOption[] {
    const opcoes: SelectedOption[] = []
    for (const grupo of grupos.value) {
      if (grupo.tipo === 'texto_livre' || grupo.tipo === 'upload_arquivo') {
        const anchor = grupoAnchorItem(grupo)
        if (!anchor) continue

        if (grupo.tipo === 'texto_livre') {
          const texto = textValues.value.get(grupo.id)?.trim()
          if (!texto) continue
          opcoes.push({
            opcao_item_id: anchor.id,
            nome_congelado: anchor.nome,
            preco_delta_congelado: Number(anchor.preco_delta ?? 0),
            valor_texto: texto,
          })
        } else {
          const arquivo = fileValues.value.get(grupo.id)
          if (!arquivo) continue
          opcoes.push({
            opcao_item_id: anchor.id,
            nome_congelado: anchor.nome,
            preco_delta_congelado: Number(anchor.preco_delta ?? 0),
            arquivo_url: arquivo.url,
            arquivo_nome_original: arquivo.nomeOriginal,
          })
        }
        continue
      }

      const selectedIds = selections.value.get(grupo.id) ?? new Set<string>()
      for (const item of grupo.produto_opcao_item) {
        if (selectedIds.has(item.id)) {
          opcoes.push({
            opcao_item_id: item.id,
            nome_congelado: item.nome,
            preco_delta_congelado: Number(item.preco_delta ?? 0),
          })
        }
      }
    }
    return opcoes
  }

  return {
    grupos,
    loadingOpcoes,
    loadGrupos,
    selections,
    resetOptionState,
    isSelected,
    getSingleSelected,
    toggleItem,
    textValues,
    fileValues,
    fileUploading,
    fileUploadError,
    setTextValue,
    onArteFileSelected,
    removeArteFile,
    validationErrors,
    grupoHint,
    precoExtraTotal,
    buildSelectedOptions,
  }
}

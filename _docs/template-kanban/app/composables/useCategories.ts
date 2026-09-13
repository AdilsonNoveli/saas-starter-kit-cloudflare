import { ref, onMounted } from 'vue'

export interface CategoriaRow {
  readonly id: string
  readonly nome: string
}

/**
 * Carrega as categorias (id, nome) ordenadas por nome — fonte única reutilizada
 * pelos forms de produto, kit e promoção (DRY). Já monta as `options` no formato
 * do `UiSelect`, com a opção "Sem categoria" opcional.
 *
 * `autoLoad`: quando `true` (padrão), carrega em `onMounted`. Passe `false` quando
 * quiser controlar o momento do fetch (ex: paralelizar com outros awaits).
 */
export function useCategories(options?: {
  includeNone?: boolean
  noneLabel?: string
  autoLoad?: boolean
}) {
  const includeNone = options?.includeNone ?? false
  const noneLabel = options?.noneLabel ?? '— Sem categoria —'
  const autoLoad = options?.autoLoad ?? true

  const supabase = useSupabaseClient()
  const categorias = ref<CategoriaRow[]>([])
  const loading = ref<boolean>(false)

  async function load(): Promise<void> {
    loading.value = true
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, nome:name')
        .order('name', { ascending: true })
      categorias.value = (data ?? []) as CategoriaRow[]
    } finally {
      // `finally` garante que uma falha de rede (o client do Supabase lança
      // nesse caso, em vez de retornar `{ error }`) não deixe o spinner preso.
      loading.value = false
    }
  }

  if (autoLoad) onMounted(() => { void load() })

  function toOptions(): Array<{ value: string; label: string }> {
    const opts = categorias.value.map((c) => ({ value: c.id, label: c.nome }))
    return includeNone ? [{ value: '', label: noneLabel }, ...opts] : opts
  }

  return { categorias, loading, load, toOptions }
}

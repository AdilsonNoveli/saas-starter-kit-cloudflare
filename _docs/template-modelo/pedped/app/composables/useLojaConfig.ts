/**
 * @descricao: Gravação por fatia da linha singleton `loja`.
 * @objetivo: Dar a cada página de `/admin/settings` um `save()` que toca só as
 *   colunas daquela aba (§8.19 de `_docs/em-andamento.md` — o split trocou um
 *   "Salvar" que gravava a linha inteira por seis, um por página).
 *
 * Duas regras que não são estéticas:
 *
 * 1. O `UPDATE` é sempre escopado por `id` — `pg-safeupdate` recusa
 *    `UPDATE`/`DELETE` sem `WHERE` (armadilha 2 da §5).
 * 2. O id é relido do banco na hora de gravar, e não confiado ao que a página
 *    carregou. Foi exatamente o `id` vazio de um load falho que gerou linhas
 *    duplicadas em `loja` antes da migration 102.
 */
import type { Database } from '~/types/database.types'
import { useStore } from '~/composables/useStore'

type LojaUpdate = Database['public']['Tables']['loja']['Update']

export function useLojaConfig() {
  const supabase = useSupabaseClient()

  /** Id da linha singleton, relido agora. `null` = nenhuma loja cadastrada. */
  async function lerLojaId(): Promise<string | null> {
    const { data } = await supabase.from('loja').select('id').limit(1).maybeSingle()
    return data?.id ?? null
  }

  /**
   * Grava só as colunas de `patch`. Devolve `null` em sucesso ou a mensagem de
   * erro pronta para exibir.
   */
  async function salvarFatia(patch: LojaUpdate): Promise<string | null> {
    const id = await lerLojaId()
    if (!id) {
      return 'Nenhuma loja cadastrada. Preencha a aba Negócio primeiro.'
    }

    const { error } = await supabase.from('loja').update(patch).eq('id', id)
    if (error) return error.message

    await revalidarLoja()
    return null
  }

  /** Invalida os caches que leem `loja` — o catálogo reflete a mudança na hora. */
  async function revalidarLoja(): Promise<void> {
    await useStore().fetch({ force: true })
    refreshNuxtData('catalog:store-status')
    refreshNuxtData('store-closed-status')
  }

  return { lerLojaId, salvarFatia, revalidarLoja }
}

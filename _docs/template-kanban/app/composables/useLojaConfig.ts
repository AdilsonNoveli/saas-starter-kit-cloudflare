/**
 * @descricao: Gravação por fatia da linha singleton `loja`.
 * @objetivo: Dar a cada página de `/admin/settings` um `save()` que toca só as
 *   colunas daquela aba (§8.19 de `_docs/em-andamento.md` — o split trocou um
 *   "Salvar" que gravava a linha inteira por seis, um por página).
 *
 * Três regras que não são estéticas:
 *
 * 1. O `UPDATE` é sempre escopado por `id` — `pg-safeupdate` recusa
 *    `UPDATE`/`DELETE` sem `WHERE` (armadilha 2 da §5).
 * 2. O id é relido do banco na hora de gravar, e não confiado ao que a página
 *    carregou. Foi exatamente o `id` vazio de um load falho que gerou linhas
 *    duplicadas em `loja` antes da migration 102.
 * 3. O `UPDATE` pede `.select('id')` de volta e confere se alguma linha
 *    voltou. Sem isso, a RLS de `loja` (`Manage loja (gerente+)`, migration
 *    004: exige `has_role(['gerente','administrador','proprietario'])`)
 *    filtra o `UPDATE` como um `WHERE` adicional — se o usuário logado não
 *    tem o papel exigido (ou `usuarios.ativo = false`, ou a sessão expirou),
 *    o Postgres aceita a instrução e atualiza ZERO linhas. Isso não é erro
 *    para o Postgres nem para o PostgREST: sem `.select()`, o supabase-js
 *    recebe `{ data: null, error: null }` e a tela mostra "Configurações
 *    salvas" com o banco intocado — a causa raiz do bug relatado em
 *    2026-08-15 ("as configurações não fixam ao atualizar, tudo se perde").
 *    Ver também `useStore.fetch`, que sofre o problema simétrico do lado da
 *    leitura (por isso o cache-buster).
 */
import type { Database } from '~/types/database.types'
import { useStore } from '~/composables/useStore'

type LojaUpdate = Database['public']['Tables']['store']['Update']

export function useLojaConfig() {
  const supabase = useSupabaseClient()

  /** Id da linha singleton, relido agora. `null` = nenhuma loja cadastrada. */
  async function lerLojaId(): Promise<string | null> {
    const { data } = await supabase.from('store').select('id').limit(1).maybeSingle()
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

    // `.select('id')` força `Prefer: return=representation` — sem ele, um
    // UPDATE que a RLS filtrou para zero linhas volta como sucesso silencioso
    // (regra 3 do cabeçalho). `data.length === 0` é a única forma de
    // distinguir "gravou" de "a RLS descartou".
    const { data, error } = await supabase.from('store').update(patch).eq('id', id).select('id')
    if (error) return error.message
    if (!data || data.length === 0) {
      return 'A alteração não foi salva: seu usuário não tem permissão para editar as configurações da loja, ou a sessão expirou. Faça login novamente ou peça a um gerente/administrador para revisar seu papel de acesso.'
    }

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

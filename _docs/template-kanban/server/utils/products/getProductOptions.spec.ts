import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '~/types/database.types'
import { getProductOptions } from './getProductOptions'

function fakeSupabase(data: unknown): SupabaseClient<Database> {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>
}

describe('getProductOptions', () => {
  it('produto sem grupo de opção devolve array vazio — nada a perguntar', async () => {
    const supabase = fakeSupabase([])
    await expect(getProductOptions(supabase, 'produto-1')).resolves.toEqual([])
  })

  it('devolve grupos com itens, ordenados e mapeados para o shape OptionGroup/OptionItem', async () => {
    const supabase = fakeSupabase([
      {
        id: 'grupo-borda',
        product_id: 'produto-1',
        name: 'Borda',
        type: 'single',
        required: false,
        min_selections: 0,
        max_selections: 1,
        sort_order: 0,
        product_option_item: [
          { id: 'item-cheddar', group_id: 'grupo-borda', name: 'Cheddar', price_delta: 8, default_selected: false, active: true, sort_order: 1, photo_url: null },
          { id: 'item-catupiry', group_id: 'grupo-borda', name: 'Catupiry', price_delta: 8, default_selected: false, active: true, sort_order: 0, photo_url: null },
        ],
      },
    ])

    const result = await getProductOptions(supabase, 'produto-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'grupo-borda', nome: 'Borda', tipo: 'single', obrigatorio: false })
    // Itens ordenados por `ordem` — catupiry (0) antes de cheddar (1).
    expect(result[0]!.produto_opcao_item.map((i) => i.nome)).toEqual(['Catupiry', 'Cheddar'])
  })

  it('filtra itens inativos — nunca oferecidos ao agente', async () => {
    const supabase = fakeSupabase([
      {
        id: 'grupo-tamanho',
        product_id: 'produto-1',
        name: 'Tamanho',
        type: 'single',
        required: true,
        min_selections: 1,
        max_selections: 1,
        sort_order: 0,
        product_option_item: [
          { id: 'item-p', group_id: 'grupo-tamanho', name: 'P', price_delta: 0, default_selected: true, active: true, sort_order: 0, photo_url: null },
          { id: 'item-descontinuado', group_id: 'grupo-tamanho', name: 'GG (descontinuado)', price_delta: 20, default_selected: false, active: false, sort_order: 1, photo_url: null },
        ],
      },
    ])

    const result = await getProductOptions(supabase, 'produto-1')

    expect(result[0]!.produto_opcao_item).toHaveLength(1)
    expect(result[0]!.produto_opcao_item[0]!.nome).toBe('P')
  })

  it('grupo obrigatório com min/max preserva as regras de validação', async () => {
    const supabase = fakeSupabase([
      {
        id: 'grupo-adicionais',
        product_id: 'produto-1',
        name: 'Adicionais',
        type: 'multiple',
        required: false,
        min_selections: 0,
        max_selections: 3,
        sort_order: 0,
        product_option_item: [],
      },
    ])

    const result = await getProductOptions(supabase, 'produto-1')

    expect(result[0]).toMatchObject({ tipo: 'multiple', min_selecoes: 0, max_selecoes: 3 })
  })
})

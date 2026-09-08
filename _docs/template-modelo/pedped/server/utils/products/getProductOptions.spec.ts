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
        produto_id: 'produto-1',
        nome: 'Borda',
        tipo: 'single',
        obrigatorio: false,
        min_selecoes: 0,
        max_selecoes: 1,
        ordem: 0,
        produto_opcao_item: [
          { id: 'item-cheddar', grupo_id: 'grupo-borda', nome: 'Cheddar', preco_delta: 8, selecionado_padrao: false, ativo: true, ordem: 1, foto_url: null },
          { id: 'item-catupiry', grupo_id: 'grupo-borda', nome: 'Catupiry', preco_delta: 8, selecionado_padrao: false, ativo: true, ordem: 0, foto_url: null },
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
        produto_id: 'produto-1',
        nome: 'Tamanho',
        tipo: 'single',
        obrigatorio: true,
        min_selecoes: 1,
        max_selecoes: 1,
        ordem: 0,
        produto_opcao_item: [
          { id: 'item-p', grupo_id: 'grupo-tamanho', nome: 'P', preco_delta: 0, selecionado_padrao: true, ativo: true, ordem: 0, foto_url: null },
          { id: 'item-descontinuado', grupo_id: 'grupo-tamanho', nome: 'GG (descontinuado)', preco_delta: 20, selecionado_padrao: false, ativo: false, ordem: 1, foto_url: null },
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
        produto_id: 'produto-1',
        nome: 'Adicionais',
        tipo: 'multiple',
        obrigatorio: false,
        min_selecoes: 0,
        max_selecoes: 3,
        ordem: 0,
        produto_opcao_item: [],
      },
    ])

    const result = await getProductOptions(supabase, 'produto-1')

    expect(result[0]).toMatchObject({ tipo: 'multiple', min_selecoes: 0, max_selecoes: 3 })
  })
})

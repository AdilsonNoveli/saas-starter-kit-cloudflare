import { describe, expect, it } from 'vitest'
import type { OptionGroup } from '#shared/types/product'
import { resolveOptionGroupChoice } from './resolveOptionGroupChoice'

function grupo(overrides: Partial<OptionGroup> & Pick<OptionGroup, 'produto_opcao_item'>): OptionGroup {
  return {
    id: 'grupo-1',
    produto_id: 'produto-1',
    nome: 'Grupo',
    tipo: 'single',
    obrigatorio: true,
    min_selecoes: 1,
    max_selecoes: 1,
    ordem: 0,
    ...overrides,
  }
}

const item = (id: string, nome: string): OptionGroup['produto_opcao_item'][number] => ({
  id, grupo_id: 'grupo-1', nome, preco_delta: 0, selecionado_padrao: false, ativo: true, ordem: 0, foto_url: null,
})

describe('resolveOptionGroupChoice', () => {
  it('grupo opcional (minimo=0): fora de escopo, devolve null', () => {
    const g = grupo({ obrigatorio: false, min_selecoes: 0, produto_opcao_item: [item('a', 'A')] })
    expect(resolveOptionGroupChoice(g)).toBeNull()
  })

  it('texto_livre: fora de escopo, mecanismo próprio', () => {
    const g = grupo({ tipo: 'texto_livre', produto_opcao_item: [item('a', 'Nome')] })
    expect(resolveOptionGroupChoice(g)).toBeNull()
  })

  it('upload_arquivo: fora de escopo, mecanismo próprio', () => {
    const g = grupo({ tipo: 'upload_arquivo', produto_opcao_item: [item('a', 'Arte')] })
    expect(resolveOptionGroupChoice(g)).toBeNull()
  })

  it('exatamente 1 item válido, obrigatório, sem item quebrado: automatic — bug real do TIPO (17/08)', () => {
    const g = grupo({ nome: 'TIPO', produto_opcao_item: [item('masculino', 'Masculino')] })
    expect(resolveOptionGroupChoice(g)).toEqual({
      groupId: 'grupo-1', groupName: 'TIPO', mode: 'automatic', autoItemIds: ['masculino'], askableItems: [],
    })
  })

  it('2+ itens válidos: ask_customer, oferecendo todos', () => {
    const g = grupo({ nome: 'TAMANHO', produto_opcao_item: [item('p', 'P'), item('m', 'M')] })
    const resolucao = resolveOptionGroupChoice(g)
    expect(resolucao?.mode).toBe('ask_customer')
    expect(resolucao?.askableItems).toEqual([
      { id: 'p', nome: 'P', preco_delta: 0 },
      { id: 'm', nome: 'M', preco_delta: 0 },
    ])
  })

  it('1 item válido + 1 item com nome vazio: ask_customer (nunca automatic) — bug real do MATERIAL (17/08)', () => {
    const g = grupo({ nome: 'MATERIAL', produto_opcao_item: [item('poliester', 'Tecido Poliéster'), item('vazio', '')] })
    const resolucao = resolveOptionGroupChoice(g)
    expect(resolucao?.mode).toBe('ask_customer')
    expect(resolucao?.askableItems).toEqual([{ id: 'poliester', nome: 'Tecido Poliéster', preco_delta: 0 }])
  })

  it('item com nome só espaço em branco conta como vazio', () => {
    const g = grupo({ produto_opcao_item: [item('ok', 'Ok'), item('branco', '   ')] })
    expect(resolveOptionGroupChoice(g)?.mode).toBe('ask_customer')
  })

  it('nenhum item válido (todos com nome vazio): invalid_catalog', () => {
    const g = grupo({ nome: 'QUEBRADO', produto_opcao_item: [item('a', ''), item('b', '')] })
    expect(resolveOptionGroupChoice(g)).toEqual({
      groupId: 'grupo-1', groupName: 'QUEBRADO', mode: 'invalid_catalog', autoItemIds: [], askableItems: [],
    })
  })

  it('grupo sem nenhum item cadastrado, mas obrigatório: invalid_catalog', () => {
    const g = grupo({ produto_opcao_item: [] })
    expect(resolveOptionGroupChoice(g)?.mode).toBe('invalid_catalog')
  })

  it('minimo > itens válidos disponíveis (multiple mal configurado): invalid_catalog', () => {
    const g = grupo({ tipo: 'multiple', min_selecoes: 2, max_selecoes: 3, produto_opcao_item: [item('a', 'A')] })
    expect(resolveOptionGroupChoice(g)?.mode).toBe('invalid_catalog')
  })

  it('toggle obrigatório com min_selecoes=0 (padrão) mas 1 item só: automatic — obrigatorio=true força minimo>=1', () => {
    const g = grupo({ tipo: 'toggle', min_selecoes: 0, max_selecoes: 0, produto_opcao_item: [item('unico', 'Único')] })
    expect(resolveOptionGroupChoice(g)?.mode).toBe('automatic')
  })

  it('itens inativos já não chegam aqui (getProductOptions filtra) — não é responsabilidade desta função', () => {
    // Documenta o contrato: esta função confia que produto_opcao_item já veio
    // filtrado por `ativo` (mesmo padrão de getProductOptions.ts).
    const g = grupo({ produto_opcao_item: [item('a', 'A')] })
    expect(resolveOptionGroupChoice(g)?.mode).toBe('automatic')
  })
})

import { describe, it, expect } from 'vitest'
import { checkUnresolvedTechnicalFailure, type AgentToolCallTrace } from './technicalEscalation'

describe('checkUnresolvedTechnicalFailure', () => {
  it('turno sem tool calls: não escala', () => {
    expect(checkUnresolvedTechnicalFailure([])).toEqual({ deveEscalar: false })
  })

  it('turno todo em sucesso: não escala', () => {
    const trace: AgentToolCallTrace[] = [
      { name: 'BuscarProdutos', args: { q: 'pizza' }, result: [{ id: 'p1', nome: 'Pizza' }] },
      { name: 'DefinirItemCarrinho', args: { produto_id: 'p1', quantidade: 2 }, result: { cart: [] } },
    ]
    expect(checkUnresolvedTechnicalFailure(trace)).toEqual({ deveEscalar: false })
  })

  it('produto_id não reconhecido e nunca corrigido no turno: escala (caso real de produção 05/08)', () => {
    const trace: AgentToolCallTrace[] = [
      { name: 'BuscarProdutos', args: { q: 'pizza' }, result: [{ id: 'p1', nome: 'Pizza Cinco Queijos' }] },
      {
        name: 'DefinirItemCarrinho',
        args: { produto_id: 'id-alucinado', quantidade: 2 },
        result: { error: true, message: 'ID de produto não reconhecido nesta conversa.', statusCode: 422 },
      },
    ]
    const check = checkUnresolvedTechnicalFailure(trace)
    expect(check.deveEscalar).toBe(true)
    expect(check.motivo).toContain('id-alucinado')
  })

  it('produto_id falhou e depois foi corrigido no mesmo turno (self-heal): não escala', () => {
    const trace: AgentToolCallTrace[] = [
      {
        name: 'DefinirItemCarrinho',
        args: { produto_id: 'id-alucinado', quantidade: 2 },
        result: { error: true, message: 'ID de produto não reconhecido nesta conversa.', statusCode: 422 },
      },
      { name: 'BuscarProdutos', args: { q: 'pizza' }, result: [{ id: 'p1', nome: 'Pizza Cinco Queijos' }] },
      { name: 'DefinirItemCarrinho', args: { produto_id: 'p1', quantidade: 2 }, result: { cart: [] } },
    ]
    expect(checkUnresolvedTechnicalFailure(trace)).toEqual({ deveEscalar: false })
  })

  it('produto genuinamente indisponível: não escala — é informação de negócio, o modelo já pode contar', () => {
    const trace: AgentToolCallTrace[] = [
      {
        name: 'DefinirItemCarrinho',
        args: { produto_id: 'p1', quantidade: 2 },
        result: { error: true, message: 'Produto indisponível.', statusCode: 422 },
      },
    ]
    expect(checkUnresolvedTechnicalFailure(trace)).toEqual({ deveEscalar: false })
  })

  it('qualquer tool com falha 5xx: sempre escala, mesmo fora do carrinho', () => {
    const trace: AgentToolCallTrace[] = [
      {
        name: 'AtualizarPedido',
        args: { delivery_mode: 'entrega' },
        result: { error: true, message: 'Falha ao atualizar o pedido.', statusCode: 500 },
      },
    ]
    const check = checkUnresolvedTechnicalFailure(trace)
    expect(check.deveEscalar).toBe(true)
    expect(check.motivo).toContain('AtualizarPedido')
  })

  it('erro de negócio comum (409/422 fora do carrinho) não escala sozinho', () => {
    const trace: AgentToolCallTrace[] = [
      {
        name: 'AtualizarPedido',
        args: {},
        result: { error: true, message: 'Endereço fora do raio de entrega.', statusCode: 422 },
      },
    ]
    expect(checkUnresolvedTechnicalFailure(trace)).toEqual({ deveEscalar: false })
  })

  it('duas tentativas de itens diferentes: só o que ficou sem resolver conta', () => {
    const trace: AgentToolCallTrace[] = [
      { name: 'DefinirItemCarrinho', args: { produto_id: 'p1', quantidade: 2 }, result: { cart: [] } },
      {
        name: 'DefinirItemCarrinho',
        args: { produto_id: 'p2', quantidade: 1 },
        result: { error: true, message: 'ID de produto não reconhecido nesta conversa.', statusCode: 422 },
      },
    ]
    const check = checkUnresolvedTechnicalFailure(trace)
    expect(check.deveEscalar).toBe(true)
    expect(check.motivo).toContain('p2')
  })
})

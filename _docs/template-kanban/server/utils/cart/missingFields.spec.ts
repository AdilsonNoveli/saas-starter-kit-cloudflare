import { describe, it, expect } from 'vitest'
import { resolveMissingFields } from './missingFields'
import type { IntegrationCartItem, IntegrationCheckoutState } from '#shared/types/integration'
import type { UploadArquivoRequirement } from '../products/uploadArquivoRequirements'
import type { TextoLivreRequirement } from '../products/textoLivreRequirements'

const emptyCheckout: IntegrationCheckoutState = {
  delivery_mode: null,
  payment_method: null,
  address_id: null,
}

const noFulfillment = { delivery_mode: null, address_id: null }

const pizza: IntegrationCartItem = {
  id: 'cart-item-pizza',
  produto_id: 'pizza-1',
  nome: 'Pizza Calabresa',
  preco_unitario: 45,
  quantidade: 1,
  subtotal: 45,
  opcoes: [],
  fulfillment: noFulfillment,
}

const bolo: IntegrationCartItem = {
  id: 'cart-item-bolo',
  produto_id: 'bolo-1',
  nome: 'Bolo de Aniversário',
  preco_unitario: 80,
  quantidade: 1,
  subtotal: 80,
  opcoes: [],
  target_date: null,
  fulfillment: noFulfillment,
}

describe('resolveMissingFields', () => {
  it('carrinho de pronta entrega sem requirements: só pede modalidade/pagamento', () => {
    const requirements = new Map()
    const missing = resolveMissingFields([pizza], requirements, emptyCheckout)
    expect(missing.map((m) => m.field)).toEqual(['delivery_mode', 'payment_method'])
  })

  it('item com requires_date pendente entra como pendência de item', () => {
    const requirements = new Map([['bolo-1', { requires_date: true }]])
    const missing = resolveMissingFields([bolo], requirements, emptyCheckout)
    expect(missing[0]).toMatchObject({ scope: 'item', field: 'target_date', item_id: 'bolo-1' })
  })

  it('item com requires_date já preenchido não gera pendência', () => {
    const requirements = new Map([['bolo-1', { requires_date: true }]])
    const missing = resolveMissingFields(
      [{ ...bolo, target_date: '2026-08-01' }],
      requirements,
      emptyCheckout,
    )
    expect(missing.find((m) => m.field === 'target_date')).toBeUndefined()
  })

  it('carrinho misto (pizza + bolo) reporta pendência de cada item que exige', () => {
    const requirements = new Map([
      ['pizza-1', { requires_date: false }],
      ['bolo-1', { requires_date: true }],
    ])
    const missing = resolveMissingFields([pizza, bolo], requirements, emptyCheckout)
    const itemFields = missing.filter((m) => m.scope === 'item')
    expect(itemFields).toHaveLength(1)
    expect(itemFields[0]?.item_id).toBe('bolo-1')
  })

  it('entrega sem endereço pede address_id; retirada não pede', () => {
    const requirements = new Map()
    const entrega = resolveMissingFields([pizza], requirements, { ...emptyCheckout, delivery_mode: 'entrega' })
    expect(entrega.map((m) => m.field)).toContain('address_id')

    const retirada = resolveMissingFields([pizza], requirements, { ...emptyCheckout, delivery_mode: 'retirada' })
    expect(retirada.map((m) => m.field)).not.toContain('address_id')
  })

  it('checkout completo (retirada + pagamento) não gera pendência de pedido', () => {
    const requirements = new Map()
    const missing = resolveMissingFields([pizza], requirements, {
      delivery_mode: 'retirada',
      payment_method: 'pix',
      address_id: null,
    })
    expect(missing).toEqual([])
  })

  it('entrega + endereço + pagamento definidos: nada pendente', () => {
    const requirements = new Map()
    const missing = resolveMissingFields([pizza], requirements, {
      delivery_mode: 'entrega',
      payment_method: 'cartao',
      address_id: 'end-1',
    })
    expect(missing).toEqual([])
  })

  describe('resolução de nível (Feature 4.1 — item diverge do pedido)', () => {
    it('pedido retirada + item com override entrega sem endereço: pendência SÓ no item', () => {
      const requirements = new Map()
      const boloEntrega = { ...bolo, delivery_mode: 'entrega' as const }
      const checkout: IntegrationCheckoutState = { delivery_mode: 'retirada', payment_method: 'pix', address_id: null }
      const missing = resolveMissingFields([pizza, boloEntrega], requirements, checkout)
      expect(missing).toEqual([
        { scope: 'item', field: 'address_id', item_id: 'bolo-1', prompt: 'Endereço de entrega para Bolo de Aniversário' },
      ])
    })

    it('item com override entrega e endereço próprio: nada pendente mesmo com pedido em retirada', () => {
      const requirements = new Map()
      const boloEntrega = { ...bolo, delivery_mode: 'entrega' as const, address_id: 'end-bolo' }
      const checkout: IntegrationCheckoutState = { delivery_mode: 'retirada', payment_method: 'pix', address_id: null }
      const missing = resolveMissingFields([pizza, boloEntrega], requirements, checkout)
      expect(missing).toEqual([])
    })

    it('item sem override herda o endereço do pedido (não duplica pendência)', () => {
      const requirements = new Map()
      const checkout: IntegrationCheckoutState = { delivery_mode: 'entrega', payment_method: 'pix', address_id: null }
      const missing = resolveMissingFields([pizza, bolo], requirements, checkout)
      // Uma única pendência de nível pedido — não uma por item.
      expect(missing).toEqual([{ scope: 'order', field: 'address_id', prompt: 'Endereço de entrega' }])
    })
  })

  describe('grupo upload_arquivo obrigatório (migration 114) — mesmo bloqueio de FinalizarPedido que target_date', () => {
    const camisetaPersonalizada: IntegrationCartItem = {
      id: 'cart-item-camiseta',
      produto_id: 'camiseta-1',
      nome: 'Camiseta Personalizada',
      preco_unitario: 60,
      quantidade: 1,
      subtotal: 60,
      opcoes: [],
      fulfillment: noFulfillment,
    }

    const requirementArte: UploadArquivoRequirement = {
      grupoId: 'grupo-arte',
      grupoNome: 'Arte da estampa',
      obrigatorio: true,
      opcaoItemId: 'item-arte-ancora',
      precoDelta: 0,
      arquivoTiposAceitos: ['application/pdf'],
      arquivoTamanhoMaximoMb: 10,
    }

    it('item sem a arte ainda: pendência scope=item, field=arquivo_arte', () => {
      const uploadRequirements = new Map([['camiseta-1', [requirementArte]]])
      const missing = resolveMissingFields([camisetaPersonalizada], new Map(), emptyCheckout, uploadRequirements)
      expect(missing).toContainEqual(expect.objectContaining({ scope: 'item', field: 'arquivo_arte', item_id: 'camiseta-1' }))
    })

    it('item com arquivo_url já anexado (attachPendingArt.ts): sem pendência', () => {
      const uploadRequirements = new Map([['camiseta-1', [requirementArte]]])
      const itemComArte: IntegrationCartItem = {
        ...camisetaPersonalizada,
        opcoes: [{ opcao_item_id: 'item-arte-ancora', nome_congelado: 'Arte da estampa', preco_delta_congelado: 0, arquivo_url: 'https://cdn.example.com/artes-clientes/x.jpg' }],
      }
      const missing = resolveMissingFields([itemComArte], new Map(), emptyCheckout, uploadRequirements)
      expect(missing.find((m) => m.field === 'arquivo_arte')).toBeUndefined()
    })

    it('grupo upload_arquivo com obrigatorio=false: PENDE do mesmo jeito (migration 127 — sempre pelo TIPO do grupo, o flag obrigatorio deixou de gatear isso)', () => {
      const uploadRequirements = new Map([['camiseta-1', [{ ...requirementArte, obrigatorio: false }]]])
      const missing = resolveMissingFields([camisetaPersonalizada], new Map(), emptyCheckout, uploadRequirements)
      expect(missing).toContainEqual(expect.objectContaining({ scope: 'item', field: 'arquivo_arte', item_id: 'camiseta-1' }))
    })

    it('item com deferred:true (migration 127, "enviar depois"): sem pendência mesmo sem arquivo_url', () => {
      const uploadRequirements = new Map([['camiseta-1', [requirementArte]]])
      const itemDiferido: IntegrationCartItem = {
        ...camisetaPersonalizada,
        opcoes: [{ opcao_item_id: 'item-arte-ancora', nome_congelado: 'Arte da estampa', preco_delta_congelado: 0, deferred: true }],
      }
      const missing = resolveMissingFields([itemDiferido], new Map(), emptyCheckout, uploadRequirements)
      expect(missing.find((m) => m.field === 'arquivo_arte')).toBeUndefined()
    })
  })

  describe('grupo texto_livre obrigatório (migration 127) — item entra no carrinho sem o texto, pendência fica pra missing_fields', () => {
    const camisetaPersonalizada: IntegrationCartItem = {
      id: 'cart-item-camiseta',
      produto_id: 'camiseta-1',
      nome: 'Camiseta Personalizada',
      preco_unitario: 60,
      quantidade: 1,
      subtotal: 60,
      opcoes: [],
      fulfillment: noFulfillment,
    }

    const requirementNome: TextoLivreRequirement = {
      grupoId: 'grupo-nome',
      grupoNome: 'Nome / Número na Camisa',
      obrigatorio: true,
      opcaoItemId: 'item-nome-ancora',
      precoDelta: 5,
      textoMaxCaracteres: 20,
      textoPlaceholder: null,
    }

    it('item sem o texto ainda: pendência scope=item, field=texto_personalizacao', () => {
      const textoRequirements = new Map([['camiseta-1', [requirementNome]]])
      const missing = resolveMissingFields([camisetaPersonalizada], new Map(), emptyCheckout, new Map(), textoRequirements)
      expect(missing).toContainEqual(expect.objectContaining({ scope: 'item', field: 'texto_personalizacao', item_id: 'camiseta-1' }))
    })

    it('item com valor_texto já preenchido (inclusive "Sem nome"): sem pendência', () => {
      const textoRequirements = new Map([['camiseta-1', [requirementNome]]])
      const itemComNome: IntegrationCartItem = {
        ...camisetaPersonalizada,
        opcoes: [{ opcao_item_id: 'item-nome-ancora', nome_congelado: 'Nome / Número na Camisa', preco_delta_congelado: 5, valor_texto: 'Sem nome' }],
      }
      const missing = resolveMissingFields([itemComNome], new Map(), emptyCheckout, new Map(), textoRequirements)
      expect(missing.find((m) => m.field === 'texto_personalizacao')).toBeUndefined()
    })

    it('grupo texto_livre com obrigatorio=false: PENDE do mesmo jeito (migration 127 — sempre pelo TIPO do grupo, o flag obrigatorio deixou de gatear isso)', () => {
      const textoRequirements = new Map([['camiseta-1', [{ ...requirementNome, obrigatorio: false }]]])
      const missing = resolveMissingFields([camisetaPersonalizada], new Map(), emptyCheckout, new Map(), textoRequirements)
      expect(missing).toContainEqual(expect.objectContaining({ scope: 'item', field: 'texto_personalizacao', item_id: 'camiseta-1' }))
    })
  })
})

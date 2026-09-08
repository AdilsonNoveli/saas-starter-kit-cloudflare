import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
import { buildSignatureHeader, buildSignedPayload } from './signature'

/**
 * O valor destes casos está em **não** recalcular a assinatura do mesmo jeito
 * que o código a produz. Um teste que usa `buildSignatureHeader` nos dois lados
 * concorda com qualquer bug — inclusive com assinar o payload errado.
 *
 * Por isso a referência aqui é `node:crypto`, uma implementação independente
 * de HMAC-SHA256: se o header casar com ela, casa com o receptor, que também
 * vai usar a biblioteca da linguagem dele.
 */

const SEGREDO = 'segredo-de-assinatura'
const CORPO = JSON.stringify({ evento: 'pedido.criado', data: { pedidoId: 'ped-1' } })
const T = 1_754_179_200

/** Referência independente: como um receptor calcularia. */
function hmacDeReferencia(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

describe('assinatura HMAC do webhook de saída', () => {
  it('produz header no formato t=…,v1=… ', async () => {
    const header = await buildSignatureHeader(SEGREDO, CORPO, T)
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
  })

  it('bate com HMAC-SHA256 calculado por implementação independente', async () => {
    const header = await buildSignatureHeader(SEGREDO, CORPO, T)
    const esperado = hmacDeReferencia(SEGREDO, T, CORPO)

    expect(header).toBe(`t=${T},v1=${esperado}`)
  })

  it('assina "<timestamp>.<corpo>", não o corpo sozinho', async () => {
    const header = await buildSignatureHeader(SEGREDO, CORPO, T)
    const soOCorpo = createHmac('sha256', SEGREDO).update(CORPO).digest('hex')

    expect(header).not.toContain(soOCorpo)
    expect(buildSignedPayload(T, CORPO)).toBe(`${T}.${CORPO}`)
  })

  it('muda quando o corpo muda em um único byte — é isso que dá integridade', async () => {
    const original = await buildSignatureHeader(SEGREDO, CORPO, T)
    const adulterado = await buildSignatureHeader(SEGREDO, CORPO.replace('ped-1', 'ped-2'), T)

    expect(adulterado).not.toBe(original)
  })

  it('muda quando o timestamp muda — é isso que barra replay', async () => {
    const agora = await buildSignatureHeader(SEGREDO, CORPO, T)
    const depois = await buildSignatureHeader(SEGREDO, CORPO, T + 1)

    expect(depois).not.toBe(agora)
  })

  it('muda quando o segredo muda', async () => {
    const comSegredo = await buildSignatureHeader(SEGREDO, CORPO, T)
    const comOutro = await buildSignatureHeader('outro-segredo', CORPO, T)

    expect(comOutro).not.toBe(comSegredo)
  })

  it('usa o relógio atual quando o timestamp não é passado', async () => {
    const antes = Math.floor(Date.now() / 1000)
    const header = await buildSignatureHeader(SEGREDO, CORPO)
    const t = Number(/^t=(\d+),/.exec(header)?.[1])

    expect(t).toBeGreaterThanOrEqual(antes)
    expect(t).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 1)
  })
})

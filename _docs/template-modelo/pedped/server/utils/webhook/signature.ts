/**
 * Assinatura HMAC do webhook de saída (§8.16, defeito 5).
 *
 * O `Authorization: Bearer` prova que **quem enviou conhece o segredo**. Só
 * isso. Ele não amarra nada ao corpo, não tem noção de tempo, e viaja em claro
 * em toda requisição — qualquer proxy, WAF ou log do lado do destino o vê.
 *
 * A assinatura resolve o que o Bearer não resolve:
 *  - **integridade**: o HMAC cobre o corpo exato que saiu; alterar um byte
 *    invalida a prova;
 *  - **frescor**: o timestamp entra no que é assinado, então o destino pode
 *    recusar um POST capturado e reenviado depois da janela;
 *  - **sigilo do segredo**: o segredo nunca sai daqui — sai só a prova.
 *
 * As duas camadas ficam, porque fazem coisas diferentes: o Bearer autentica o
 * canal, a assinatura autentica a mensagem.
 *
 * Formato do header (o mesmo de Stripe/Slack, para que qualquer receptor já
 * saiba verificar):
 *
 *     X-Pedped-Signature: t=1754179200,v1=9f86d081884c7d65…
 *
 * onde `v1` é `HMAC-SHA256(segredo, "<t>.<corpo>")` em hexadecimal minúsculo.
 * O `v` versionado existe para permitir rotação de algoritmo sem quebrar o
 * receptor: dá para emitir `v1` e `v2` no mesmo header durante a virada.
 *
 * **Como o destino verifica** (recomende isto a quem receber):
 *  1. leia `t` e `v1` do header;
 *  2. recuse se `|agora − t|` passar da sua janela (5 min é o usual);
 *  3. recalcule o HMAC sobre `"<t>." + corpo_bruto` — o corpo **como chegou**,
 *     antes de qualquer parse/reserialização, que mudaria os bytes;
 *  4. compare em tempo constante.
 */

/** Nome do header que carrega a assinatura. */
export const SIGNATURE_HEADER = 'X-Pedped-Signature'

/** Janela recomendada ao receptor, em segundos. Documental — quem impõe é ele. */
export const SIGNATURE_TOLERANCE_SECONDS = 300

/**
 * Monta a string efetivamente assinada. Isolada porque é o ponto onde emissor
 * e receptor precisam concordar byte a byte: qualquer diferença aqui (uma
 * reserialização do JSON, um separador trocado) faz a verificação falhar sem
 * que ninguém entenda por quê.
 */
export function buildSignedPayload(timestampSeconds: number, body: string): string {
  return `${timestampSeconds}.${body}`
}

/** Converte o resultado do HMAC em hexadecimal minúsculo. */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Assina o corpo e devolve o valor pronto do header.
 *
 * `body` tem de ser **a mesma string que vai no `fetch`** — assinar um objeto
 * e serializar outro é o erro clássico deste mecanismo, e ele não aparece em
 * teste de unidade que reserializa dos dois lados.
 *
 * Usa WebCrypto (`crypto.subtle`), disponível no runtime de Workers e no Node
 * moderno — sem dependência nova.
 */
export async function buildSignatureHeader(
  secret: string,
  body: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const assinatura = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(buildSignedPayload(timestampSeconds, body)),
  )

  return `t=${timestampSeconds},v1=${toHex(assinatura)}`
}

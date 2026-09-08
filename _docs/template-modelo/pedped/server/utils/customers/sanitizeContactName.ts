/**
 * Sanitiza o nome de exibição do WhatsApp (`contacts[].profile.name`, o
 * "pushname") antes dele virar `clientes.nome` — texto 100% controlado pelo
 * próprio cliente, sem validação nenhuma da Meta além do que o app oficial
 * impõe na hora de digitar (a API não garante nada disso).
 *
 * Dois problemas achados na auditoria de encaminhamento do nome:
 *
 * 1) UX: pushname pode ser emoji puro, o próprio número de telefone, ou vazio
 *    — chamar o cliente por isso é pior do que não chamar por nome nenhum.
 * 2) SEGURANÇA: o nome vira `clienteTxt` dentro do BRIEFING DO SISTEMA
 *    (`buildBriefing.ts`), a seção que o prompt do agente chama de "fonte da
 *    verdade" — superfície de injeção mais perigosa que a fala do cliente no
 *    chat (que a SCOPE_RULES já trata como não-instrução, `guardrails.ts`).
 *    Uma quebra de linha dentro do nome forjaria uma seção nova ali dentro. A
 *    remoção de caracteres de controle abaixo é a defesa que importa de
 *    verdade — o resto é qualidade de dado.
 *
 * Único ponto de chamada: dentro de `findOrCreateCustomer` (DRY — nenhum
 * outro caminho pode gravar `clientes.nome` sem passar por aqui).
 */
const MAX_LEN = 60

/**
 * Remove C0/C1 (inclui \n, \r, \t) e colapsa espaços — impede que o nome
 * injete uma quebra de linha dentro do briefing (a defesa que importa de
 * verdade aqui). Filtra por code point em vez de regex com faixa de controle
 * para não depender de escapes `\uXXXX` sensíveis a transcrição de editor.
 */
function semCaracteresDeControle(texto: string): string {
  let saida = ''
  for (const char of texto) {
    const code = char.codePointAt(0) ?? 0
    const eControle = (code <= 0x1f) || (code >= 0x7f && code <= 0x9f)
    saida += eControle ? ' ' : char
  }
  return saida.replace(/\s+/g, ' ').trim()
}

/** Nome majoritariamente dígitos (o próprio número, por exemplo) não é um nome. */
function pareceTelefoneOuNumero(texto: string): boolean {
  const semEspaco = texto.replace(/\s/g, '')
  const digitos = semEspaco.replace(/\D/g, '')
  return semEspaco.length > 0 && digitos.length >= 6 && digitos.length >= semEspaco.length * 0.6
}

/**
 * `undefined` quando o pushname não serve como nome (vazio, só
 * emoji/símbolo, ou número) — o chamador trata como "nome não veio", igual a
 * quando o campo está ausente no payload.
 */
export function sanitizeContactName(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined

  const limpo = semCaracteresDeControle(raw).slice(0, MAX_LEN).trim()
  if (!limpo) return undefined
  if (!/\p{L}/u.test(limpo)) return undefined
  if (pareceTelefoneOuNumero(limpo)) return undefined

  return limpo
}

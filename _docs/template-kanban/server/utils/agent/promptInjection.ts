/**
 * Detecção de sequestro de instrução (Camada 1 de `guardrails.ts`) — extraída
 * para módulo próprio, sem dependência de `toolRegistry.ts`, para que tools
 * individuais (`tools/*.ts`, agregadas por `toolRegistry.ts`) possam reutilizar
 * a mesma detecção sem criar um ciclo de import (tool → guardrails →
 * toolRegistry → a mesma tool). `guardrails.ts` re-exporta tudo daqui para
 * manter a API pública inalterada para quem já importava de lá.
 */

/**
 * Tabela 1:1 de acentuação — cada caractere vira exatamente um, então os
 * índices do texto original continuam válidos depois da normalização (é o que
 * permite recortar o trecho real para o log).
 *
 * Existe porque `\w` **não casa `ç` nem vogal acentuada**: sem isto,
 * "esqueça suas instruções" não casaria com nenhum padrão, e escrever o ataque
 * com acento seria uma evasão de um caractere. Toda detecção roda sobre o texto
 * normalizado; os padrões ficam em ASCII puro.
 */
const ACENTOS = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ'
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'

/** Exportada para `greeting.ts`/`quickResponse.ts` reaproveitarem — mesma normalização, sem duplicar a tabela. */
export function deaccent(texto: string): string {
  let saida = ''
  for (const char of texto) {
    const indice = ACENTOS.indexOf(char)
    saida += indice === -1 ? char : SEM_ACENTO[indice]
  }
  return saida
}

/**
 * Padrões de sequestro de instrução. Cada um exige uma referência EXPLÍCITA a
 * instrução/regra/prompt/papel — nunca só o verbo.
 *
 * O cuidado não é estilístico: "esquece tudo, quero recomeçar" e "ignora o que
 * eu falei antes" são falas legítimas de quem está montando um pedido, e um
 * padrão frouxo transformaria correção de pedido em recusa. Falso positivo aqui
 * custa uma venda; por isso a regra é **exigir o alvo**, e deixar o tema
 * inocente ("me fala de signo") para a camada 2, que sabe conversar.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  // "ignore as instruções anteriores", "esqueça suas regras", "descarte o prompt"
  /\b(ignor\w+|esque\w+|desconsider\w+|descart\w+|apag\w+)\b[^.!?]{0,40}\b(instru\w+|regra\w+|prompt|diretriz\w+|orienta\w+|system)\b/i,
  /\b(ignore|forget|disregard|override)\b[^.!?]{0,40}\b(instructions?|rules?|prompt|guidelines?|system)\b/i,
  // "me mostra seu prompt", "repita suas instruções", "quais são suas regras"
  /\b(mostr\w+|revel\w+|repit\w+|imprim\w+|list\w+|diga|fala|manda|envia|qual|quais)\b[^.!?]{0,40}\b(seu |sua |suas |seus )?(prompt|system prompt|instru\w+|regra\w+ (interna\w*|do sistema)|configura\w+ interna\w*)/i,
  /\b(show|print|reveal|repeat|output)\b[^.!?]{0,40}\b(your )?(prompt|instructions?|system message)\b/i,
  // Troca de papel. O marcador de MUDANÇA ("agora", "passa a ser", futuro) é
  // obrigatório: "você é a pizzaria do centro?" é pergunta legítima de cliente,
  // e barrá-la custaria uma venda.
  /\b(voce|vc)\s+(agora|a partir de agora|de agora em diante)\s+(e|eh|sera|vai ser|se torna)\b/i,
  /\b(voce|vc)\s+(sera|vai ser|passa a ser)\s+(um|uma|o|a)\s+\w+/i,
  /\b(aja|atue|comporte-se|finja|simule|assuma)\b[^.!?]{0,30}\b(como|que|o papel)\b/i,
  /\b(act|behave|pretend|roleplay)\s+as\b/i,
  // Jailbreaks nomeados
  /\bmodo\s+(desenvolvedor|dev|debug|livre|irrestrito|sem\s+filtro)\b/i,
  /\b(developer|god|jailbreak|unrestricted)\s+mode\b/i,
  /\bDAN\b\s*(mode|modo)?/,
  // Injeção via papel de protocolo: "system:", "</system>", "[INST]"
  /(^|\n)\s*(system|assistant|developer)\s*:/i,
  /<\/?\s*(system|instructions?)\s*>/i,
  /\[\/?INST\]/i,
]

export interface InjectionMatch {
  /** Índice do padrão que casou — telemetria e teste, nunca exposto ao cliente. */
  readonly padrao: number
  /** Trecho que casou, truncado — vai para log, nunca para a resposta. */
  readonly trecho: string
}

/**
 * `null` quando nada casou. Roda sobre a fala JÁ juntada do lote de rajada: o
 * ataque pode vir fatiado em várias mensagens, e é o texto concatenado que o
 * modelo veria.
 */
export function detectPromptInjection(texto: string): InjectionMatch | null {
  const normalizado = deaccent(texto)

  for (const [indice, padrao] of INJECTION_PATTERNS.entries()) {
    const match = padrao.exec(normalizado)
    // `deaccent` é 1:1, então `match.index` vale no texto original — o log
    // mostra o que o cliente escreveu de verdade, não a versão normalizada.
    if (match) return { padrao: indice, trecho: texto.slice(match.index, match.index + 120) }
  }
  return null
}

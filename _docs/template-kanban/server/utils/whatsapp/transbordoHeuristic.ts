/**
 * Item 4 da §7.6 (`_docs/em-andamento.md`) — só a metade determinística do
 * item h/§0.5.2 e da "Camada 3" (§2.3): léxico de fúria no produtor, custo
 * zero, nenhuma chamada a modelo. Pega o caso grosseiro, que é a maioria.
 *
 * **Deliberadamente NÃO implementado aqui** (adiado, mesma lógica do item (j)
 * de `_docs/em-andamento.md`: julgamento sem medição não entra): repetição da
 * mesma frase, "terceira mensagem em N segundos" e paráfrases sem nenhum dos
 * termos abaixo exigem classificação por modelo no consumer — prompt, schema
 * e avaliação de acurácia próprios, nada disso especificado o bastante para
 * implementar sem inventar. Este arquivo cobre só o "caso grosseiro" citado
 * acima — quem escreve, com as próprias palavras, uma das frases da lista.
 *
 * `'humano'`/`'atendente'` e o bloco de pedido explícito de atendimento
 * (2026-08-18) ficam fora do verbatim original da §2.3 — a lista de fúria não
 * cobria pedido EXPLÍCITO de atendimento humano ("quero falar com um
 * humano"), e sem transbordo aqui a mensagem seguia pro agente, que responde
 * seguindo a persona fixa em `FIXED_RULES` ("Você é o atendente humano da
 * loja") — resultado observado em produção: o agente respondia "aqui é
 * atendimento humano" em vez de escalar.
 */

/**
 * Léxico de fúria original (§2.3, verbatim) + pedido explícito de
 * atendimento humano (2026-08-18). Frases sempre sem acento — a normalização
 * abaixo remove diacríticos de ambos os lados antes de comparar, então uma
 * entrada sem acento aqui já cobre a variante acentuada digitada pelo
 * cliente ("robô" bate em `'robo'`, "não" bateria em `'nao'` etc.) sem
 * precisar listar as duas formas.
 */
const TRANSBORDO_LEXICON = [
  // Fúria (§2.3, verbatim — não editorializar estas cinco entradas).
  'cancelar',
  'procon',
  'advogado',
  'reclame aqui',
  'processar',
  // Pedido explícito de atendimento humano — palavras/frases únicas, mesmo
  // estilo do léxico de fúria. Risco de falso positivo em contexto de pedido
  // de comida é baixo para todas: nenhuma aparece naturalmente em pedido,
  // endereço ou pergunta de cardápio.
  'humano',
  'atendente',
  'falar com uma pessoa',
  'falar com pessoa',
  'pessoa de verdade',
  'pessoa real',
  'robo', // cobre "robô" via normalização de acento
  'chatbot',
  'gerente',
  'supervisor',
] as const

/**
 * Combining diacritical marks (U+0300–U+036F) — o que sobra depois de
 * `normalize('NFD')` separar uma letra acentuada em base + marca. Escape
 * `\u{...}` explícito por código, não caractere literal: mais seguro contra
 * mangling de encoding entre editores/SO do que colar o glyph combinante no
 * arquivo.
 */
const COMBINING_MARKS = /[\u{0300}-\u{036f}]/gu

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
}

/** Substring, case-insensitive e sem distinguir acento (normaliza os dois lados). */
export function matchesTransbordoLexicon(texto: string): boolean {
  const normalizado = normalizar(texto)
  return TRANSBORDO_LEXICON.some((termo) => normalizado.includes(normalizar(termo)))
}

/**
 * Confirmação enviada UMA VEZ ao cliente no exato turno em que o léxico
 * dispara o transbordo (`InboundTurnGate.escalatedNow`, `pauseGate.ts`) —
 * nunca a cada mensagem subsequente enquanto já pausado (repetir isso a cada
 * fala seria ruído, não confirmação). Fecha a lacuna de silêncio total: antes
 * desta mudança, o cliente que pedia humano ou ameaçava o PROCON só via a
 * conversa parar de responder, sem nenhum sinal de que foi ouvido.
 */
export const TRANSBORDO_ACK_TEXT = 'Entendido! Já vou chamar um atendente humano da loja pra te ajudar. Só um momento, por favor.'

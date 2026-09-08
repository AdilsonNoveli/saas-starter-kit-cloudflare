/**
 * Item 4 da §7.6 (`_docs/em-andamento.md`) — só a metade determinística do
 * item h/§0.5.2 e da "Camada 3" (§2.3): léxico de fúria no produtor, custo
 * zero, nenhuma chamada a modelo. Pega o caso grosseiro, que é a maioria.
 *
 * **Deliberadamente NÃO implementado aqui** (adiado, mesma lógica do item (j)
 * de `_docs/em-andamento.md`: julgamento sem medição não entra): repetição da
 * mesma frase e "terceira mensagem em N segundos" exigem parâmetro (`N`) que o
 * documento não fixa, e a classificação por modelo no consumer exige prompt e
 * schema próprios, validados antes de rodar em produção — nenhum dos dois
 * está especificado o bastante para implementar sem inventar.
 */

/** Verbatim da §2.3 do documento — não editorializar a lista. */
const TRANSBORDO_LEXICON = ['cancelar', 'procon', 'advogado', 'reclame aqui', 'processar'] as const

/** Substring, case-insensitive — nenhuma das frases tem acento. */
export function matchesTransbordoLexicon(texto: string): boolean {
  const normalizado = texto.toLowerCase()
  return TRANSBORDO_LEXICON.some((termo) => normalizado.includes(termo))
}

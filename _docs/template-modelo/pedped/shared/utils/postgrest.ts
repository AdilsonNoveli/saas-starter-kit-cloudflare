/**
 * Helpers para montar filtros do PostgREST com valores vindos do usuário.
 *
 * O `.or()` do Supabase recebe uma STRING de filtros separados por vírgula, e
 * `cs.{...}` recebe um array literal. Interpolar entrada do usuário direto
 * nessas strings permite que uma vírgula, parêntese ou chave escape do valor e
 * vire uma expressão de filtro adicional — mudando a query executada.
 *
 * Também é um bug funcional antes de ser de segurança: um cliente chamado
 * "Silva, João" quebra a busca.
 *
 * A defesa é a sintaxe de aspas duplas do próprio PostgREST, que permite
 * caracteres reservados dentro do valor. Só `"` e `\` precisam de escape.
 */

/** Escapa `\` e `"` para uso dentro de um valor entre aspas duplas. */
function escapeQuoted(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

/**
 * Valor entre aspas duplas para uso em filtros PostgREST (`or`, `cs`, etc.).
 * Retorna já com as aspas — ex.: `"Silva, João"`.
 */
export function quotePostgrestValue(value: string): string {
  return `"${escapeQuoted(value)}"`
}

/**
 * Escapa os curingas do `LIKE`/`ILIKE` (`%` e `_`) para que sejam tratados como
 * literais. Sem isso, `q = "50%"` viraria curinga e casaria com tudo.
 */
export function escapeLikeWildcards(value: string): string {
  return value
    .replaceAll('\\', String.raw`\\`)
    .replaceAll('%', String.raw`\%`)
    .replaceAll('_', String.raw`\_`)
}

/**
 * Padrão `ilike` pronto e citado, com curingas de substring nas pontas.
 * Ex.: `foo, bar` → `"%foo, bar%"`.
 */
export function ilikeContainsPattern(value: string): string {
  return quotePostgrestValue(`%${escapeLikeWildcards(value)}%`)
}

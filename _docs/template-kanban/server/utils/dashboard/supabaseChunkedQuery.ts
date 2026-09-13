const CHUNK_SIZE_PADRAO = 300

interface ChunkedResult<T> {
  readonly data: T[] | null
  readonly error: { message: string } | null
}

/**
 * Roda `runQuery` em lotes de `ids` (padrão 300) e junta os resultados —
 * evita estourar limite de tamanho de URL do PostgREST em `.in()` com
 * listas grandes (ex.: todos os pedidos de um mês). Compartilhado entre os
 * cards de insights de negócio que consultam `itens_pedido` por lista de
 * `pedido_id`.
 */
export async function fetchInChunks<T>(
  ids: readonly string[],
  runQuery: (chunkIds: string[]) => PromiseLike<ChunkedResult<T>>,
  chunkSize: number = CHUNK_SIZE_PADRAO,
): Promise<T[]> {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize))

  const results = await Promise.all(chunks.map((c) => runQuery(c)))
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)

  return results.flatMap((r) => r.data ?? [])
}

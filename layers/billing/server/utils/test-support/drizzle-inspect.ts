/**
 * Reads the column name and bound value out of a Drizzle `eq(column, value)`
 * condition, without a live database connection. Used only by tests that need
 * to assert *which* column a `.where()` call filtered on — e.g. proving an
 * update is scoped by `providerSubscriptionId` and not `teamId`, the exact
 * distinction a past regression got wrong silently.
 *
 * Reaches into Drizzle's internal `queryChunks` (verified against the
 * installed `drizzle-orm` version — `PgText`/`PgColumn` chunks carry `.name`,
 * `Param` chunks carry `.value`), which is not public API. If a `drizzle-orm`
 * upgrade changes this shape, these tests fail loudly rather than silently
 * asserting on the wrong thing — that failure is the signal to update this
 * helper, not evidence the upgrade broke real behavior.
 */
export function extractEqCondition(
  condition: unknown,
): { column: string; value: unknown } | undefined {
  const chunks = (condition as { queryChunks?: unknown[] } | undefined)
    ?.queryChunks;
  if (!chunks) return undefined;

  const columnChunk = chunks.find(
    (chunk): chunk is { name: string } =>
      typeof (chunk as { name?: unknown })?.name === "string",
  );
  const paramChunk = chunks.find(
    (chunk): chunk is { value: unknown } =>
      chunk !== null &&
      typeof chunk === "object" &&
      "value" in chunk &&
      chunk.constructor?.name === "Param",
  );

  if (!columnChunk) return undefined;
  return { column: columnChunk.name, value: paramChunk?.value };
}

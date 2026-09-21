/**
 * The human-readable message of a thrown value, or `fallback`. Thrown values are
 * `unknown` in TypeScript; tRPC and fetch failures are `Error`s, but anything can be
 * thrown, so this narrows instead of trusting a `catch (error: any)`.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }
  return fallback;
}

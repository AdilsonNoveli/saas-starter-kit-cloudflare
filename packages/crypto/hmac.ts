const encoder = new TextEncoder();

/**
 * HMAC-SHA256 key from a secret string. An empty secret is refused here so no
 * caller can sign or verify with it, whatever the runtime's own rule is; each
 * caller still checks first and throws its own "not configured" message.
 */
function importHmacKey(secret: string) {
  if (!secret) throw new Error("HMAC secret is empty");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function hmacSha256(secret: string, message: string) {
  const key = await importHmacKey(secret);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/** Constant-time check of `signature` against the HMAC of `message`. */
export async function verifyHmacSha256(
  secret: string,
  message: string,
  signature: Uint8Array<ArrayBuffer>,
) {
  if (!secret) return false;
  const key = await importHmacKey(secret);
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(message));
}

/** Constant-time comparison, so a wrong secret leaks nothing through timing. */
export function secretsMatch(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

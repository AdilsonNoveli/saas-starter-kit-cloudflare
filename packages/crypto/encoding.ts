/**
 * Byte encodings shared by the primitives of this package. Each one keeps the
 * exact output of the copy it replaced, because stored values (encrypted TOTP
 * seeds, recovery-code hashes) and signed values (WebSocket tickets, Paddle
 * signatures) were produced with them.
 */

export function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Base64 with `-` and `_` instead of `+` and `/`, and no `=` padding. */
export function toBase64Url(bytes: Uint8Array) {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Throws, like `atob`, when the input is not valid base64url. */
export function fromBase64Url(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return fromBase64(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

/** Lowercase hex, two digits per byte. */
export function toHex(bytes: ArrayBuffer | Uint8Array) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Null unless the input is a non-empty, even-length run of lowercase hex. */
export function fromHex(hex: string) {
  if (!/^(?:[0-9a-f]{2})+$/u.test(hex)) return null;
  return Uint8Array.from(hex.match(/../gu) ?? [], (pair) => Number.parseInt(pair, 16));
}

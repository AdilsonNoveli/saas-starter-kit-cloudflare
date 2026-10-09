import { fromBase64, toBase64 } from "./encoding";

/**
 * Authenticated encryption for the TOTP seeds kept at rest — a platform
 * admin's (PlatformAdmin.mfaSecret) and a regular user's own (User.mfaSecret).
 * Whoever reads a seed out of the database can mint valid 6-digit codes for
 * that account forever, so neither is ever stored in plaintext. Shared
 * implementation, but each caller passes its own encryption key
 * (PLATFORM_ADMIN_ENCRYPTION_KEY / USER_MFA_ENCRYPTION_KEY) — see
 * infra/secret.ts for why those stay separate secrets.
 *
 * Built on Web Crypto (`crypto.subtle`), which workerd exposes natively — no
 * dependency, no hand-rolled cipher. AES-GCM gives confidentiality *and*
 * integrity in one primitive, so a tampered ciphertext fails to decrypt
 * instead of silently yielding garbage.
 *
 * The key material comes from an env-var string of arbitrary length, so it is
 * run through SHA-256 to get the exactly-32 bytes AES-256 requires. This is a
 * key *derivation for length*, not a password stretch: the input is a
 * high-entropy generated secret, not something a human typed, so PBKDF2-style
 * iteration counts would buy nothing here.
 *
 * Storage format: `base64(iv).base64(ciphertext)`. A random 96-bit IV per
 * encryption (the size AES-GCM is specified for) means the same seed
 * encrypted twice produces different ciphertexts, and it travels with the
 * value so no separate column is needed.
 */

async function importAesKey(key: string) {
  if (!key) {
    throw new Error("MFA encryption key is not configured");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(plaintext: string, key: string) {
  const aesKey = await importAesKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptSecret(ciphertext: string, key: string) {
  const [ivPart, dataPart] = ciphertext.split(".");
  if (!ivPart || !dataPart) {
    throw new Error("malformed encrypted secret");
  }
  const aesKey = await importAesKey(key);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    aesKey,
    fromBase64(dataPart),
  );
  return new TextDecoder().decode(plaintext);
}

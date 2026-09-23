const encoder = new TextEncoder();

// Domain-separated so the webhook secret is never used to sign anything else.
const message = (teamId: string) => `nuxfire:paddle-checkout-team:${teamId}`;

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string) => {
  if (!/^(?:[0-9a-f]{2})+$/u.test(hex)) return null;
  return Uint8Array.from(hex.match(/../gu) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );
};

const importKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

export async function signPaddleTeam(secret: string, teamId: string) {
  if (!secret) throw new Error("Paddle webhook secret is not configured");
  const key = await importKey(secret);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message(teamId))));
}

export async function verifyPaddleTeam(
  secret: string,
  teamId: string,
  signature: string,
) {
  if (!secret || !teamId || !signature) return false;
  const bytes = fromHex(signature);
  if (!bytes) return false;
  const key = await importKey(secret);
  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(message(teamId)));
}

// Short-lived, single-purpose ticket handed to the browser instead of the
// long-lived access token cookie: the WebSocket subprotocol handshake is the
// only way to attach a header from the browser's WebSocket API, so whatever
// goes there is exposed to page JS. A 30s HMAC-signed ticket bounds that
// exposure instead of leaking the real session token.
const TICKET_TTL_MS = 30_000;

export interface WsTicketUser {
  id: string;
  email: string;
  name: string;
  image: string;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacSign(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function createWsTicket(secret: string, user: WsTicketUser) {
  const payload = { ...user, exp: Date.now() + TICKET_TTL_MS };
  const payloadB64 = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${signature}`;
}

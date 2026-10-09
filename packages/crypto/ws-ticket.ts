import { fromBase64Url, toBase64Url } from "./encoding";
import { hmacSha256, verifyHmacSha256 } from "./hmac";

// Short-lived, single-purpose ticket handed to the browser instead of the
// long-lived access token cookie: the WebSocket subprotocol handshake is the
// only way to attach a header from the browser's WebSocket API, so whatever
// goes there is exposed to page JS. A 30s HMAC-signed ticket bounds that
// exposure instead of leaking the real session token. Minted by the app
// (/api/auth/ws-ticket) and verified by the Websockets Worker.
export const WS_TICKET_TTL_MS = 30_000;

export interface WsTicketUser {
  id: string;
  email: string;
  name: string;
  image: string;
}

export type WsTicketPayload = WsTicketUser & { exp: number };

// The signature covers the base64url of the JSON text, so the key order of
// `{ ...user, exp }` (id, email, name, image, exp) is part of the format.
export async function createWsTicket(secret: string, user: WsTicketUser) {
  const payload: WsTicketPayload = { ...user, exp: Date.now() + WS_TICKET_TTL_MS };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSha256(secret, payloadB64);
  return `${payloadB64}.${toBase64Url(signature)}`;
}

// Only a payload whose signature verified reaches this check, so its fields were
// written by createWsTicket; the expiry is the one thing left to inspect.
function hasExpiry(payload: unknown): payload is WsTicketPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "exp" in payload &&
    typeof payload.exp === "number"
  );
}

function decodeBase64Url(value: string) {
  try {
    return fromBase64Url(value);
  } catch {
    return null;
  }
}

/** The person the ticket was minted for, or null if it is malformed, forged or expired. */
export async function verifyWsTicket(secret: string, ticket: string) {
  if (!ticket) return null;
  const [payloadB64, signatureB64] = ticket.split(".");
  if (!payloadB64 || !signatureB64) return null;
  const signatureBytes = decodeBase64Url(signatureB64);
  if (!signatureBytes) return null;
  if (!(await verifyHmacSha256(secret, payloadB64, signatureBytes))) return null;
  const payloadBytes = decodeBase64Url(payloadB64);
  if (!payloadBytes) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
  if (!hasExpiry(payload) || payload.exp < Date.now()) return null;
  return payload;
}

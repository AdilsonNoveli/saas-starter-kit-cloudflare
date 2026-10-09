import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WS_TICKET_TTL_MS,
  createWsTicket,
  fromBase64Url,
  hmacSha256,
  toBase64Url,
  verifyWsTicket,
} from "@nuxfire/crypto";
import vectors from "./golden-vectors.json";

const SECRET = "ws-ticket-test-FAKE-secret-not-a-secret";
const NOW = 1_790_000_000_000;
const USER = {
  id: "u_fake_0001",
  email: "fake.person@example.test",
  name: "Fake Person",
  image: "",
};

// Alters one decoded byte and re-encodes, so the change is never absorbed by
// base64url padding bits.
function flipByte(base64Url: string, index: number) {
  const bytes = fromBase64Url(base64Url);
  bytes[index] = (bytes[index] ?? 0) ^ 1;
  return toBase64Url(bytes);
}

async function signedTicket(payload: string) {
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  return `${payloadB64}.${toBase64Url(await hmacSha256(SECRET, payloadB64))}`;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WebSocket ticket", () => {
  // SPECSFY: US-001 FR-001 FR-002 NFR-004 AC-004
  it("returns the person for a fresh ticket, including the old code's tickets", async () => {
    expect(WS_TICKET_TTL_MS).toBe(30_000);
    const ticket = await createWsTicket(SECRET, USER);
    expect(await verifyWsTicket(SECRET, ticket)).toEqual({ ...USER, exp: NOW + WS_TICKET_TTL_MS });

    for (const vector of vectors.wsTickets) {
      vi.setSystemTime(vector.nowMs);
      expect(await verifyWsTicket(vector.secret, vector.ticket)).toEqual({
        ...vector.user,
        exp: vector.nowMs + WS_TICKET_TTL_MS,
      });
    }
  });

  // SPECSFY: US-001 FR-001 FR-002 NFR-004 AC-004
  it("stays valid up to the expiry instant and returns null one millisecond later", async () => {
    const ticket = await createWsTicket(SECRET, USER);
    vi.setSystemTime(NOW + WS_TICKET_TTL_MS);
    expect(await verifyWsTicket(SECRET, ticket)).not.toBeNull();
    vi.setSystemTime(NOW + WS_TICKET_TTL_MS + 1);
    expect(await verifyWsTicket(SECRET, ticket)).toBeNull();
  });

  // SPECSFY: US-001 FR-001 FR-002 NFR-004 AC-004
  it("returns null for a tampered signature, a tampered payload, another secret or a malformed ticket", async () => {
    const ticket = await createWsTicket(SECRET, USER);
    const [payloadB64 = "", signature = ""] = ticket.split(".");
    const forged = toBase64Url(
      new TextEncoder().encode(JSON.stringify({ ...USER, id: "u_fake_9999", exp: NOW + 30_000 })),
    );
    const candidates = [
      `${payloadB64}.${flipByte(signature, 0)}`,
      `${payloadB64}.${flipByte(signature, 31)}`,
      `${payloadB64}.${signature.slice(0, -2)}`,
      `${payloadB64}.${signature}AA`,
      `${flipByte(payloadB64, 7)}.${signature}`,
      `${forged}.${signature}`,
      "",
      "no-dot",
      `${payloadB64}.`,
      `.${signature}`,
      await signedTicket("not json"),
      await signedTicket(JSON.stringify({ ...USER })),
    ];
    for (const candidate of candidates) {
      expect(await verifyWsTicket(SECRET, candidate)).toBeNull();
    }
    expect(await verifyWsTicket("another-FAKE-secret-of-same-size!!", ticket)).toBeNull();
  });

  // SPECSFY: US-001 FR-001 FR-002 NFR-004 AC-004
  it("compares the signature with crypto.subtle.verify or in constant time, never with text equality", () => {
    const sources = readdirSync(import.meta.dirname)
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && file !== "vitest.config.ts")
      .map((file) => readFileSync(join(import.meta.dirname, file), "utf8"));
    const body = sources
      .map((source) => /export\s+(?:async\s+)?function\s+verifyWsTicket\b[\s\S]*?(?=\nexport\s|$)/u.exec(source)?.[0])
      .find((match) => match !== undefined);

    expect(body, "verifyWsTicket source not found in packages/crypto").toBeDefined();
    expect(body).toMatch(/verifyHmacSha256\(|crypto\.subtle\.verify\(|secretsMatch\(/u);
    expect(body).not.toMatch(/[Ss]ignature\s*[!=]==|[!=]==\s*\w*[Ss]ignature/u);
  });
});

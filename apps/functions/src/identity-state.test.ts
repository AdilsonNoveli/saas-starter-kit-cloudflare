import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import {
  Storage,
  type StorageAdapter,
} from "@openauthjs/openauth/storage/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { identityStatePath } from "../../../config";
import { identityState } from "./session-store";
import { memoryKv } from "./test-support/issuer-harness";

// SPEC-0010 (Fase 3b), US-005: the issuer's internal endpoint that tells the app
// what an identity has (providers, password, live sessions). The Gherkin of
// AC-026 (section 6 of the spec) is the reference contract for the cases below.

// auth.ts only uses ./emails for a type; the module itself imports
// `cloudflare:workers`, which does not exist outside the Workers runtime.
vi.mock("./emails", () => ({}));
vi.mock("./sender", () => ({ sender: () => async () => true }));

const ADMIN_SECRET = "test-admin-secret";
const IMPORT_TIMEOUT = 30_000;

const ana = {
  id: "u1",
  name: "Ana",
  email: "ana@example.com",
  image: "",
};
const bruno = {
  id: "u2",
  name: "Bruno",
  email: "bruno@example.com",
  image: "",
};

async function putSession(
  storage: StorageAdapter,
  person: typeof ana,
  token: string,
  sid: string,
) {
  await Storage.set(storage, ["oauth:refresh", `user:${person.id}`, token], {
    type: "user",
    properties: { ...person, sid, provider: "password" },
    subject: `user:${person.id}`,
    redirectURI: "http://localhost/api/auth/callback",
    clientID: "app",
    ttl: { access: 900, refresh: 31_536_000 },
    nextToken: crypto.randomUUID(),
  });
}

/** Ana: password credential, a profile linked to password and Google, two live sessions (sid-a has two records). */
async function seedAna(storage: StorageAdapter) {
  const at = new Date().toISOString();
  await Storage.set(storage, ["users", ana.email], {
    ...ana,
    createdAt: at,
    updatedAt: at,
    accounts: [
      { linkedAt: at, type: "password" },
      { linkedAt: at, type: "google", data: { sub: "g-1" } },
    ],
  });
  await Storage.set(storage, ["email", ana.email, "password"], "scrypt-hash");
  await Storage.set(storage, ["email", ana.email, "subject"], "user:u1");
  await putSession(storage, ana, "a-used", "sid-a");
  await putSession(storage, ana, "a-renewed", "sid-a");
  await putSession(storage, ana, "b", "sid-b");
  // Bruno's session must never show up in Ana's state.
  await putSession(storage, bruno, "z", "sid-z");
}

async function callState(
  kv: KVNamespace,
  headers: Record<string, string>,
  body: Record<string, string>,
) {
  const { default: worker } = await import("./auth");
  type WorkerEnv = Parameters<typeof worker.fetch>[1];
  const env = { AuthKV: kv, ADMIN_SECRET } as unknown as WorkerEnv;
  return worker.fetch(
    new Request(`http://auth.test${identityStatePath}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    env,
    {} as unknown as ExecutionContext,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AC-026 the identity state endpoint requires the secret and tells what the account has", () => {
  // SPECSFY: US-005 FR-013 NFR-001 AC-026
  it(
    "answers 403 without the secret and with a wrong one, and the providers, the password flag and the live sids with the right one",
    async () => {
      expect(identityStatePath).toEqual(expect.stringMatching(/^\/internal\//));
      const kv = memoryKv();
      await seedAna(CloudflareStorage({ namespace: kv }));
      const body = { userId: ana.id, email: ana.email };

      const missing = await callState(kv, {}, body);
      expect(missing.status).toBe(403);

      const wrong = await callState(kv, { "x-admin-secret": "not-the-secret" }, body);
      expect(wrong.status).toBe(403);

      const right = await callState(kv, { "x-admin-secret": ADMIN_SECRET }, body);
      expect(right.status).toBe(200);
      const state = (await right.json()) as {
        providers: string[];
        hasPassword: boolean;
        sids: string[];
      };
      expect([...state.providers].sort()).toEqual(["google", "password"]);
      expect(state.hasPassword).toBe(true);
      expect([...state.sids].sort()).toEqual(["sid-a", "sid-b"]);
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-005 FR-013 NFR-001 AC-026
  it("identityState reads the profile, the credential and the person's refresh records directly from storage", async () => {
    expect(typeof identityState).toBe("function");
    const storage = MemoryStorage();
    await seedAna(storage);

    const state = await identityState(storage, { userId: ana.id, email: ana.email });

    expect([...state.providers].sort()).toEqual(["google", "password"]);
    expect(state.hasPassword).toBe(true);
    expect([...state.sids].sort()).toEqual(["sid-a", "sid-b"]);
  });

  // SPECSFY: US-005 FR-013 NFR-001 AC-026
  it("identityState of a person with no profile, credential or session is empty", async () => {
    expect(typeof identityState).toBe("function");
    const storage = MemoryStorage();
    await seedAna(storage);
    // A record of the revoked sid-b is gone: it no longer counts as live.
    await Storage.remove(storage, ["oauth:refresh", "user:u1", "b"]);

    const nobody = await identityState(storage, {
      userId: "u9",
      email: "nobody@example.com",
    });
    const anaNow = await identityState(storage, { userId: ana.id, email: ana.email });

    expect(nobody).toEqual({ providers: [], hasPassword: false, sids: [] });
    expect(anaNow.sids).toEqual(["sid-a"]);
  });
});

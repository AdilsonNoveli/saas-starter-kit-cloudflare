import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import { decodeJwt } from "jose";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import {
  joinKey,
  Storage,
  type StorageAdapter,
} from "@openauthjs/openauth/storage/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailChangePath } from "../../../config";
import { moveIdentityEmail } from "./session-store";
import {
  createFlows,
  createIssuerHarness,
  memoryKv,
} from "./test-support/issuer-harness";

// SPEC-0010 (Fase 3b), US-005: the issuer moves an identity from one e-mail to
// another (profile, password credential, subject key), ends the other sessions
// and keeps the current one carrying the new address. The Gherkin of AC-027,
// AC-031 and AC-032 (section 6 of the spec) is the reference contract.

// Codes the auth.ts Worker would e-mail during a login by code.
const workerCodes = vi.hoisted(() => new Map<string, string>());

// auth.ts only uses ./emails for a type; the module itself imports
// `cloudflare:workers`, which does not exist outside the Workers runtime.
vi.mock("./emails", () => ({}));
vi.mock("./sender", () => ({
  sender:
    () =>
    async (to: string, _template: string, data: { code?: string } = {}) => {
      if (data.code) workerCodes.set(to.toLowerCase(), data.code);
      return true;
    },
}));

const ADMIN_SECRET = "test-admin-secret";
const FLOW_TIMEOUT = 30_000;
const MINUTE = 60 * 1000;
const OLD = "a@x.com";
const NEW = "b@x.com";

const here = dirname(fileURLToPath(import.meta.url));

const ana = { id: "u1", name: "Ana", email: OLD, image: "" };
const bruno = { id: "u2", name: "Bruno", email: "bruno@x.com", image: "" };

type AccountType = "password" | "code" | "google" | "github";

async function putProfile(
  storage: StorageAdapter,
  person: typeof ana,
  accounts: AccountType[] = ["password"],
) {
  const at = new Date().toISOString();
  await Storage.set(storage, ["users", person.email], {
    ...person,
    createdAt: at,
    updatedAt: at,
    accounts: accounts.map((type) => ({ linkedAt: at, type })),
  });
}

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

/** Ana at a@x.com: password, three sessions (sid-a is the caller's, renewed: two records). Bruno elsewhere. */
async function seedAna(storage: StorageAdapter, accounts?: AccountType[]) {
  await putProfile(storage, ana, accounts);
  await Storage.set(storage, ["email", OLD, "password"], { hash: "h", salt: "s" });
  await Storage.set(storage, ["email", OLD, "subject"], "user:u1");
  await putSession(storage, ana, "a-used", "sid-a");
  await putSession(storage, ana, "a-renewed", "sid-a");
  await putSession(storage, ana, "b", "sid-b");
  await putSession(storage, ana, "c", "sid-c");
  await putProfile(storage, bruno);
  await putSession(storage, bruno, "z", "sid-z");
}

async function refreshEntries(storage: StorageAdapter, userId: string) {
  const entries: Array<[string, { properties: { email: string; sid: string } }]> = [];
  for await (const [key, value] of Storage.scan<{
    properties: { email: string; sid: string };
  }>(storage, ["oauth:refresh", `user:${userId}`])) {
    if (key[1] === `user:${userId}`) entries.push([joinKey(key), value]);
  }
  return entries;
}

/** Everything the identity owns in the store, to prove a refused move touched nothing. */
async function snapshot(storage: StorageAdapter) {
  const all: Array<[string, unknown]> = [];
  for await (const [key, value] of Storage.scan(storage, [])) {
    all.push([joinKey(key), value]);
  }
  return all.sort(([a], [b]) => a.localeCompare(b));
}

async function callEmailChange(
  kv: KVNamespace,
  headers: Record<string, string>,
  body: Record<string, string>,
) {
  const { default: worker } = await import("./auth");
  type WorkerEnv = Parameters<typeof worker.fetch>[1];
  const env = { AuthKV: kv, ADMIN_SECRET } as unknown as WorkerEnv;
  return worker.fetch(
    new Request(`http://auth.test${emailChangePath}`, {
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

describe("AC-027 a confirmed e-mail change moves the identity and keeps the current session", () => {
  // SPECSFY: US-005 FR-013 FR-014 NFR-008 AC-027
  it("moves profile, password credential and subject key to b@x.com with the same id and ends the other sessions", async () => {
    expect(typeof moveIdentityEmail).toBe("function");
    const storage = MemoryStorage();
    await seedAna(storage);

    const result = await moveIdentityEmail(storage, {
      userId: ana.id,
      oldEmail: OLD,
      newEmail: NEW,
      currentSid: "sid-a",
    });

    expect(result).toEqual({ ok: true });
    expect(await Storage.get(storage, ["users", NEW])).toMatchObject({
      id: ana.id,
      email: NEW,
      name: ana.name,
    });
    expect(await Storage.get(storage, ["email", NEW, "password"])).toEqual({
      hash: "h",
      salt: "s",
    });
    expect(await Storage.get(storage, ["email", NEW, "subject"])).toBe("user:u1");
    expect(await Storage.get(storage, ["users", OLD])).toBeUndefined();
    expect(await Storage.get(storage, ["email", OLD, "password"])).toBeUndefined();
    expect(await Storage.get(storage, ["email", OLD, "subject"])).toBeUndefined();

    // Only the caller's session survives, and its records now carry b@x.com.
    const left = await refreshEntries(storage, ana.id);
    expect(left.map(([key]) => key).sort()).toEqual([
      joinKey(["oauth:refresh", "user:u1", "a-renewed"]),
      joinKey(["oauth:refresh", "user:u1", "a-used"]),
    ]);
    for (const [, value] of left) {
      expect(value.properties).toMatchObject({ email: NEW, sid: "sid-a" });
    }
    // Bruno is untouched.
    expect(await refreshEntries(storage, bruno.id)).toHaveLength(1);
    expect(await Storage.get(storage, ["users", bruno.email])).toMatchObject({ id: bruno.id });
  });

  // SPECSFY: US-005 FR-013 FR-014 NFR-008 AC-027
  it(
    "the current session renews into a token that carries b@x.com, and the other sessions fail to renew",
    async () => {
      expect(typeof moveIdentityEmail).toBe("function");
      const harness = createIssuerHarness();
      harness.addPerson(OLD, ana);
      await putProfile(harness.storage, ana);
      await harness.setPassword(OLD, "correct horse");
      const current = await harness.loginWithCode(OLD);
      const second = await harness.loginWithCode(OLD);
      const third = await harness.loginWithCode(OLD);
      const currentSid = (decodeJwt(current.access).properties as { sid: string }).sid;

      const result = await moveIdentityEmail(harness.storage, {
        userId: ana.id,
        oldEmail: OLD,
        newEmail: NEW,
        currentSid,
      });
      expect(result).toEqual({ ok: true });

      vi.advanceTimersByTime(15 * MINUTE + 1000);
      const renewed = await harness.client.refresh(current.refresh);
      if (renewed.err) throw renewed.err;
      const payload = decodeJwt(renewed.tokens?.access || "");
      expect(payload.sub).toBe("user:u1");
      expect(payload.properties).toMatchObject({ id: ana.id, email: NEW, sid: currentSid });
      for (const other of [second, third]) {
        expect((await harness.client.refresh(other.refresh)).err).toBeTruthy();
      }
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-013 FR-014 NFR-008 AC-027
  it(
    "the internal emailChangePath endpoint refuses a call without the secret and moves the identity with it",
    async () => {
      expect(emailChangePath).toEqual(expect.stringMatching(/^\/internal\//));
      const kv = memoryKv();
      const storage = CloudflareStorage({ namespace: kv });
      await seedAna(storage);
      const body = { userId: ana.id, oldEmail: OLD, newEmail: NEW, currentSid: "sid-a" };

      const refused = await callEmailChange(kv, {}, body);
      expect(refused.status).toBe(403);
      expect(await Storage.get(storage, ["users", OLD])).toMatchObject({ id: ana.id });

      const moved = await callEmailChange(kv, { "x-admin-secret": ADMIN_SECRET }, body);
      expect(moved.status).toBe(200);
      expect(await moved.json()).toEqual({ ok: true });
      expect(await Storage.get(storage, ["users", NEW])).toMatchObject({ id: ana.id, email: NEW });
      expect(await refreshEntries(storage, ana.id)).toHaveLength(2);
    },
    FLOW_TIMEOUT,
  );
});

describe("AC-031 a new e-mail already used by someone else changes nothing", () => {
  // SPECSFY: US-005 FR-014 FR-015 AC-031
  it.each([
    ["a profile", ["users", NEW]],
    ["a password credential", ["email", NEW, "password"]],
  ] as const)(
    "refuses with email_taken when b@x.com already exists as %s, moving nothing",
    async (_label, takenKey) => {
      expect(typeof moveIdentityEmail).toBe("function");
      const storage = MemoryStorage();
      await seedAna(storage);
      await Storage.set(storage, [...takenKey], { id: "u3", email: NEW });
      const before = await snapshot(storage);

      // Upper case on the way in: the address is compared without case (FR-015).
      const result = await moveIdentityEmail(storage, {
        userId: ana.id,
        oldEmail: OLD,
        newEmail: "B@X.com",
        currentSid: "sid-a",
      });

      expect(result).toEqual({ ok: false, error: "email_taken" });
      expect(await snapshot(storage)).toEqual(before);
    },
  );

  // SPECSFY: US-005 FR-014 FR-015 AC-031
  it.each(["google", "github"] as const)(
    "refuses with email_managed_by_provider when the profile is linked to %s, moving nothing",
    async (provider) => {
      expect(typeof moveIdentityEmail).toBe("function");
      const storage = MemoryStorage();
      await seedAna(storage, ["password", provider]);
      const before = await snapshot(storage);

      const result = await moveIdentityEmail(storage, {
        userId: ana.id,
        oldEmail: OLD,
        newEmail: NEW,
        currentSid: "sid-a",
      });

      expect(result).toEqual({ ok: false, error: "email_managed_by_provider" });
      expect(await snapshot(storage)).toEqual(before);
    },
  );
});

describe("AC-032 a failure between the issuer and the database heals on the next login", () => {
  // SPECSFY: US-005 FR-014 NFR-008 AC-032
  it(
    "after the issuer moved the e-mail and the User.email write failed, the next login by password or code issues u1 with b@x.com, which the callback writes into User.email",
    async () => {
      expect(typeof moveIdentityEmail).toBe("function");
      workerCodes.clear();
      const kv = memoryKv();
      const storage = CloudflareStorage({ namespace: kv });
      type WorkerEnv = Parameters<typeof import("./auth").default.fetch>[1];
      const env = { AuthKV: kv } as unknown as WorkerEnv;
      const { default: worker } = await import("./auth");
      const auth = createFlows({
        fetch: async (request) =>
          worker.fetch(request, env, {} as unknown as ExecutionContext),
        storage,
        sentCodes: workerCodes,
      });
      await putProfile(storage, ana);
      await auth.setPassword(OLD, "correct horse");
      const before = await auth.loginWithPassword(OLD, "correct horse");
      const currentSid = (decodeJwt(before.access).properties as { sid: string }).sid;

      // The issuer step succeeds...
      expect(
        await moveIdentityEmail(storage, {
          userId: ana.id,
          oldEmail: OLD,
          newEmail: NEW,
          currentSid,
        }),
      ).toEqual({ ok: true });
      // ...and the database step fails: User.email is still the old address.
      const userTable = new Map([[ana.id, { id: ana.id, email: OLD }]]);

      // No login path is lost: password and code both reach the same identity.
      const byPassword = await auth.loginWithPassword(NEW, "correct horse");
      const byCode = await auth.loginWithCode(NEW);
      for (const tokens of [byPassword, byCode]) {
        expect(decodeJwt(tokens.access).sub).toBe("user:u1");
        expect(decodeJwt(tokens.access).properties).toMatchObject({ id: ana.id, email: NEW });
      }

      // The callback upserts User by id and writes the token's e-mail on conflict.
      const callback = readFileSync(
        join(here, "../../app/server/api/auth/callback.ts"),
        "utf8",
      );
      expect(callback).toMatch(/onConflictDoUpdate\(\s*\{\s*target:\s*users\.id/);
      expect(callback).toMatch(/set:\s*\{\s*email:\s*session\.email/);
      const session = decodeJwt(byPassword.access).properties as { id: string; email: string };
      userTable.set(session.id, { ...userTable.get(session.id)!, email: session.email });
      expect(userTable.get(ana.id)?.email).toBe(NEW);
    },
    FLOW_TIMEOUT,
  );
});

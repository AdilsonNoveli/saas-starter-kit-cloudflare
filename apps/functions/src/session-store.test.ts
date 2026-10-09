import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import { decodeJwt } from "jose";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import {
  joinKey,
  Storage,
  type StorageAdapter,
} from "@openauthjs/openauth/storage/storage";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as rootConfig from "../../../config";
import { identityDeletePath, sessionsRevokePath } from "../../../config";
import {
  issueUserSession,
  normalizeEmail,
  rememberPasswordSubject,
  revokeSessions,
  stableSubject,
} from "./session-store";
import { subjects } from "./subjects";
import {
  createFlows,
  createIssuerHarness,
  memoryKv,
} from "./test-support/issuer-harness";

// SPEC-0009 (Fase 3a), US-004: stable token subject and session revocation by
// prefix. The Gherkin of AC-015 to AC-018 and AC-020 (section 6 of the spec) is
// the reference contract for each case below.

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
const IMPORT_TIMEOUT = 30_000;
const FLOW_TIMEOUT = 30_000;

interface SessionProperties {
  id: string;
  name: string;
  email: string;
  image: string;
  sid?: string;
}

/** A refresh record with the shape issuer.js:168-178 writes. */
function refreshRecord(
  userId: string,
  properties: SessionProperties,
  extra: { timeUsed?: number } = {},
) {
  return {
    type: "user",
    properties,
    subject: `user:${userId}`,
    redirectURI: "http://localhost/api/auth/callback",
    clientID: "app",
    ttl: { access: 900, refresh: 31_536_000 },
    nextToken: crypto.randomUUID(),
    ...extra,
  };
}

async function putSession(
  storage: StorageAdapter,
  userId: string,
  token: string,
  properties: SessionProperties,
  extra: { timeUsed?: number } = {},
) {
  await Storage.set(
    storage,
    ["oauth:refresh", `user:${userId}`, token],
    refreshRecord(userId, properties, extra),
  );
}

async function keysUnder(storage: StorageAdapter, prefix: string[]) {
  const keys: string[] = [];
  for await (const [key] of Storage.scan(storage, prefix)) {
    keys.push(joinKey(key));
  }
  return keys;
}

/** Refresh keys of exactly this subject (a plain prefix scan of user:1 would also list user:12). */
async function sessionKeysOf(storage: StorageAdapter, userId: string) {
  const keys = await keysUnder(storage, ["oauth:refresh", `user:${userId}`]);
  return keys.filter((key) => key.split(String.fromCharCode(31))[1] === `user:${userId}`);
}

/**
 * In-memory KVNamespace with the subset CloudflareStorage calls, counting
 * reads (`get`) and listings (`list`) — the cost NFR-005 bounds.
 */
function countingKv() {
  const data = new Map<string, string>();
  const counts = { get: 0, list: 0, prefixes: [] as string[] };
  const kv = {
    async get(key: string, type?: string) {
      counts.get++;
      const value = data.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key: string, value: string) {
      data.set(key, value);
    },
    async delete(key: string) {
      data.delete(key);
    },
    async list(options: { prefix?: string } = {}) {
      counts.list++;
      const prefix = options.prefix ?? "";
      counts.prefixes.push(prefix);
      const keys = [...data.keys()]
        .filter((key) => key.startsWith(prefix))
        .sort()
        .map((name) => ({ name }));
      return { keys, list_complete: true, cursor: "" };
    },
  };
  return {
    kv: kv as unknown as KVNamespace,
    data,
    counts,
    resetCounts() {
      counts.get = 0;
      counts.list = 0;
      counts.prefixes = [];
    },
  };
}

async function callInternal(
  kv: KVNamespace,
  path: string,
  body: Record<string, string>,
) {
  const { default: worker } = await import("./auth");
  type WorkerEnv = Parameters<typeof worker.fetch>[1];
  const env = { AuthKV: kv, ADMIN_SECRET } as unknown as WorkerEnv;
  return worker.fetch(
    new Request(`http://auth.test${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify(body),
    }),
    env,
    {} as unknown as ExecutionContext,
  );
}

const ana = {
  id: "u1",
  name: "Ana",
  email: "ana@example.com",
  image: "https://cdn.test/ana.png",
};
const bruno = {
  id: "u2",
  name: "Bruno",
  email: "bruno@example.com",
  image: "",
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AC-015 stable subject does not change with the profile", () => {
  // SPECSFY: US-004 FR-005 AC-015
  it("derives the subject from the user id alone", () => {
    expect(stableSubject("u1")).toBe("user:u1");
    expect(stableSubject("ckx9k2m3n0000abcd")).toBe("user:ckx9k2m3n0000abcd");
  });

  // SPECSFY: US-004 FR-005 AC-015
  it("refuses a user id that would break the subject:token split of the refresh token", () => {
    expect(() => stableSubject("a:b")).toThrow();
    expect(() => stableSubject("")).toThrow();
  });

  // SPECSFY: US-004 FR-005 AC-015
  it(
    "keeps user:<id> after name, photo and e-mail change and files every session under the same prefix",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, { id: ana.id, name: ana.name, image: ana.image });
      const before = await harness.loginWithCode(ana.email);

      // The profile changes: new name, new photo and a new e-mail.
      harness.addPerson("ana.souza@example.com", {
        id: ana.id,
        name: "Ana Souza",
        image: "https://cdn.test/ana-2.png",
      });
      const after = await harness.loginWithCode("ana.souza@example.com");

      expect(decodeJwt(before.access).sub).toBe("user:u1");
      expect(decodeJwt(after.access).sub).toBe("user:u1");
      expect(before.refresh.startsWith("user:u1:")).toBe(true);
      expect(after.refresh.startsWith("user:u1:")).toBe(true);
      expect(await harness.refreshRecords(ana.id)).toHaveLength(2);
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 AC-015
  it(
    "keeps each session's sid across renewals and gives each login its own sid",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, { id: ana.id, name: ana.name, image: ana.image });
      const first = await harness.loginWithCode(ana.email);
      const second = await harness.loginWithCode(ana.email);

      const firstSid = (decodeJwt(first.access).properties as SessionProperties)
        .sid;
      const secondSid = (
        decodeJwt(second.access).properties as SessionProperties
      ).sid;
      expect(firstSid).toEqual(expect.any(String));
      expect(secondSid).toEqual(expect.any(String));
      expect(firstSid).not.toBe(secondSid);

      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      const renewed = await harness.client.refresh(first.refresh);
      if (renewed.err) throw renewed.err;
      const renewedAgain = await harness.client.refresh(
        renewed.tokens?.refresh || "",
      );
      if (renewedAgain.err) throw renewedAgain.err;

      for (const tokens of [renewed.tokens, renewedAgain.tokens]) {
        const payload = decodeJwt(tokens?.access || "");
        expect(payload.sub).toBe("user:u1");
        expect((payload.properties as SessionProperties).sid).toBe(firstSid);
      }
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 AC-015
  it("round-trips through the refresh token format, whose subject has exactly one colon", () => {
    const token = crypto.randomUUID();
    const refresh = [stableSubject("u1"), token].join(":");
    // Same split the issuer applies to a refresh_token grant (issuer.js:306-309).
    const splits = refresh.split(":");
    expect(splits.pop()).toBe(token);
    expect(splits.join(":")).toBe(stableSubject("u1"));
  });
});

describe("AC-016 every provider issues the stable subject", () => {
  // SPECSFY: US-004 FR-005 FR-006 AC-016
  it.each(["password", "code", "google", "github"] as const)(
    "a %s login issues user:<id> and stores it at the lower-case e-mail subject key",
    async (provider) => {
      const harness = createIssuerHarness();
      const typed = "Ana.Souza@Example.COM";
      harness.addPerson(typed, { id: ana.id, name: ana.name, image: ana.image });
      await harness.setPassword(typed, "correct horse");

      const tokens = await harness.loginWith(provider, typed, "correct horse");

      expect(decodeJwt(tokens.access).sub).toBe("user:u1");
      expect(
        await Storage.get(harness.storage, [
          "email",
          "ana.souza@example.com",
          "subject",
        ]),
      ).toBe("user:u1");
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 FR-006 AC-016
  it.each(["password", "code"] as const)(
    "through the auth.ts Worker, a %s login issues user:<id> and stores it at the lower-case e-mail subject key",
    async (provider) => {
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
      const at = new Date().toISOString();
      await Storage.set(storage, ["users", ana.email], {
        ...ana,
        createdAt: at,
        updatedAt: at,
        accounts: [],
      });
      await auth.setPassword(ana.email, "correct horse");

      const tokens =
        provider === "password"
          ? await auth.loginWithPassword(ana.email, "correct horse")
          : await auth.loginWithCode(ana.email);

      expect(decodeJwt(tokens.access).sub).toBe("user:u1");
      expect(
        await Storage.get(storage, ["email", ana.email, "subject"]),
      ).toBe("user:u1");
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 FR-006 AC-016
  it("overwrites the hash the password provider wrote, without touching the credential", async () => {
    const storage = MemoryStorage();
    // What password.js:37-39 writes inside ctx.subject: the properties hash.
    await Storage.set(storage, ["email", "ana@example.com", "subject"], "user:3f2a9c0d1e7b6a54");
    await Storage.set(storage, ["email", "ana@example.com", "password"], "scrypt-hash");

    await rememberPasswordSubject(storage, "Ana@Example.com", "u1");

    expect(await Storage.get(storage, ["email", "ana@example.com", "subject"])).toBe("user:u1");
    expect(await Storage.get(storage, ["email", "ana@example.com", "password"])).toBe("scrypt-hash");
    expect(await Storage.get(storage, ["email", "Ana@Example.com", "subject"])).toBeUndefined();
  });

  // SPECSFY: US-004 FR-005 FR-006 AC-016
  it("leaves other people's subject keys alone", async () => {
    const storage = MemoryStorage();
    await Storage.set(storage, ["email", bruno.email, "subject"], "user:u2");

    await rememberPasswordSubject(storage, ana.email, ana.id);

    expect(await Storage.get(storage, ["email", bruno.email, "subject"])).toBe("user:u2");
  });
});

describe("AC-017 sign out of the other sessions after a profile change", () => {
  // Three sessions of Ana: the current one (sid-a) just renewed in the same
  // request, so it has two records; sid-b was issued before she changed her
  // name; sid-c before she changed her e-mail. Bruno has one session.
  async function seedAnaAndBruno(storage: StorageAdapter) {
    await putSession(storage, ana.id, "a-used", { ...ana, sid: "sid-a" }, { timeUsed: Date.now() });
    await putSession(storage, ana.id, "a-renewed", { ...ana, sid: "sid-a" });
    await putSession(storage, ana.id, "b", { ...ana, name: "Ana Old", sid: "sid-b" });
    await putSession(storage, ana.id, "c", { ...ana, email: "old@example.com", sid: "sid-c" });
    await putSession(storage, bruno.id, "z", { ...bruno, sid: "sid-z" });
  }

  // SPECSFY: US-004 FR-006 AC-017
  it("removes the other sessions and keeps every record of the caller's sid, including the one just renewed", async () => {
    const storage = MemoryStorage();
    await seedAnaAndBruno(storage);

    const revoked = await revokeSessions(storage, ana.id, { exceptSid: "sid-a" });

    expect(revoked).toBe(2);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toEqual([
      joinKey(["oauth:refresh", "user:u1", "a-renewed"]),
      joinKey(["oauth:refresh", "user:u1", "a-used"]),
    ]);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u2"])).toHaveLength(1);
  });

  // SPECSFY: US-004 FR-006 AC-017
  it("removes a record issued without sid (pre-change format) under the person's prefix", async () => {
    const storage = MemoryStorage();
    await putSession(storage, ana.id, "a", { ...ana, sid: "sid-a" });
    await putSession(storage, ana.id, "legacy", { ...ana });

    expect(await revokeSessions(storage, ana.id, { exceptSid: "sid-a" })).toBe(1);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toEqual([
      joinKey(["oauth:refresh", "user:u1", "a"]),
    ]);
  });

  // SPECSFY: US-004 FR-006 AC-017
  it(
    "answers the internal endpoint with { ok, revoked: 2 } for { userId, exceptSid }",
    async () => {
      const store = countingKv();
      const storage = CloudflareStorage({ namespace: store.kv });
      await seedAnaAndBruno(storage);

      const response = await callInternal(store.kv, sessionsRevokePath, {
        userId: ana.id,
        exceptSid: "sid-a",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, revoked: 2 });
      expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toHaveLength(2);
      expect(await keysUnder(storage, ["oauth:refresh", "user:u2"])).toHaveLength(1);
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-004 FR-006 AC-017
  it(
    "refuses the internal endpoint without exceptSid or onlySid, revoking nothing",
    async () => {
      const store = countingKv();
      const storage = CloudflareStorage({ namespace: store.kv });
      await seedAnaAndBruno(storage);

      const response = await callInternal(store.kv, sessionsRevokePath, {
        userId: ana.id,
      });

      expect(response.status).toBe(400);
      expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toHaveLength(4);
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-018 deleting the identity ends every session", () => {
  async function seedIdentity(storage: StorageAdapter) {
    await putSession(storage, ana.id, "a", { ...ana, sid: "sid-a" });
    // Issued before Ana changed her e-mail: the record carries the old one.
    await putSession(storage, ana.id, "b", { ...ana, email: "old@example.com", sid: "sid-b" });
    await Storage.set(storage, ["users", ana.email], { id: ana.id });
    await Storage.set(storage, ["email", ana.email, "password"], "scrypt-hash");
    await Storage.set(storage, ["email", ana.email, "subject"], "user:u1");
    await putSession(storage, bruno.id, "z", { ...bruno, sid: "sid-z" });
    await Storage.set(storage, ["users", bruno.email], { id: bruno.id });
    await Storage.set(storage, ["email", bruno.email, "password"], "scrypt-hash-2");
    await Storage.set(storage, ["email", bruno.email, "subject"], "user:u2");
  }

  // SPECSFY: US-004 FR-006 AC-018
  it("revokes every session of the person when no sid is spared", async () => {
    const storage = MemoryStorage();
    await seedIdentity(storage);

    expect(await revokeSessions(storage, ana.id)).toBe(2);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toEqual([]);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u2"])).toHaveLength(1);
    // Idempotent: a repeated call (KV listing can lag behind a delete) is harmless.
    expect(await revokeSessions(storage, ana.id)).toBe(0);
  });

  // SPECSFY: US-004 FR-006 AC-018
  it(
    "removes sessions, profile, password credential and subject key through { userId, email } and leaves others intact",
    async () => {
      const store = countingKv();
      const storage = CloudflareStorage({ namespace: store.kv });
      await seedIdentity(storage);

      const response = await callInternal(store.kv, identityDeletePath, {
        userId: ana.id,
        email: "Ana@Example.com",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, revokedSessions: 2 });
      expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toEqual([]);
      expect(await Storage.get(storage, ["users", ana.email])).toBeUndefined();
      expect(await Storage.get(storage, ["email", ana.email, "password"])).toBeUndefined();
      expect(await Storage.get(storage, ["email", ana.email, "subject"])).toBeUndefined();

      expect(await keysUnder(storage, ["oauth:refresh", "user:u2"])).toHaveLength(1);
      expect(await Storage.get(storage, ["users", bruno.email])).toEqual({ id: bruno.id });
      expect(await Storage.get(storage, ["email", bruno.email, "password"])).toBe("scrypt-hash-2");
      expect(await Storage.get(storage, ["email", bruno.email, "subject"])).toBe("user:u2");
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-004 FR-006 AC-018
  it(
    "refuses the internal endpoint without userId, deleting nothing",
    async () => {
      const store = countingKv();
      const storage = CloudflareStorage({ namespace: store.kv });
      await seedIdentity(storage);

      const response = await callInternal(store.kv, identityDeletePath, {
        email: ana.email,
      });

      expect(response.status).toBe(400);
      expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toHaveLength(2);
      expect(await Storage.get(storage, ["users", ana.email])).toEqual({ id: ana.id });
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-020 revocation reads only the person's own keys", () => {
  async function seedCrowd(storage: StorageAdapter) {
    for (let i = 0; i < 1000; i++) {
      // Ids 10..1009 include user:12 and every other id that starts with "1".
      const id = String(i + 10);
      await putSession(storage, id, `t${i}`, {
        id,
        name: `Person ${id}`,
        email: `p${id}@example.com`,
        image: "",
        sid: `sid-${id}`,
      });
    }
    for (const token of ["x", "y", "z"]) {
      await putSession(storage, "1", token, {
        id: "1",
        name: "Target",
        email: "target@example.com",
        image: "",
        sid: `sid-1-${token}`,
      });
    }
  }

  // SPECSFY: US-004 FR-006 NFR-005 AC-020
  it("lists one prefix and reads exactly the 3 target keys among 1000 others", async () => {
    const store = countingKv();
    const storage = CloudflareStorage({ namespace: store.kv });
    await seedCrowd(storage);
    store.resetCounts();

    expect(await revokeSessions(storage, "1")).toBe(3);

    expect(store.counts.list).toBe(1);
    expect(store.counts.prefixes).toEqual([
      joinKey(["oauth:refresh", "user:1", ""]),
    ]);
    expect(store.counts.get).toBe(3);
    expect(store.data.size).toBe(1000);
  });

  // SPECSFY: US-004 FR-006 NFR-005 AC-020
  it("never reaches user:12 from user:1, even over a storage whose scan is a plain prefix match", async () => {
    // MemoryStorage.scan matches "user:1" against "user:12" (memory.js scan has
    // no trailing separator), unlike CloudflareStorage.scan.
    const storage = MemoryStorage();
    await seedCrowd(storage);

    expect(await revokeSessions(storage, "1", { exceptSid: "none" })).toBe(3);

    expect(await sessionKeysOf(storage, "1")).toEqual([]);
    expect(await sessionKeysOf(storage, "12")).toHaveLength(1);
    expect(await keysUnder(storage, ["oauth:refresh"])).toHaveLength(1000);
  });

  // SPECSFY: US-004 FR-006 NFR-005 AC-020
  it("reads nothing beyond the listing when the person has no session", async () => {
    const store = countingKv();
    const storage = CloudflareStorage({ namespace: store.kv });
    await seedCrowd(storage);
    store.resetCounts();

    expect(await revokeSessions(storage, "9999")).toBe(0);
    expect(store.counts.get).toBe(0);
    expect(store.counts.list).toBe(1);
  });
});

// SPEC-0010 (Fase 3b). The Gherkin of AC-022 and AC-033 (section 6 of
// specs/defined/0010-fase-3b-perfil-preferencias-sessoes-onboarding/spec.md) is
// the reference contract for the cases below.

const here = dirname(fileURLToPath(import.meta.url));
const authSource = () => readFileSync(join(here, "auth.ts"), "utf8");

describe("AC-022 signing out of the other sessions goes through the same issuer endpoint", () => {
  // Ana has three sessions: sid-a (the caller, renewed in this request, so two
  // records), sid-b and sid-c. Bruno has one.
  async function seedThreeSessions(storage: StorageAdapter) {
    await putSession(storage, ana.id, "a-used", { ...ana, sid: "sid-a" }, { timeUsed: Date.now() });
    await putSession(storage, ana.id, "a-renewed", { ...ana, sid: "sid-a" });
    await putSession(storage, ana.id, "b", { ...ana, sid: "sid-b" });
    await putSession(storage, ana.id, "c", { ...ana, sid: "sid-c" });
    await putSession(storage, bruno.id, "z", { ...bruno, sid: "sid-z" });
  }

  // SPECSFY: US-004 FR-011 FR-017 AC-022
  it("revokeSessions with onlySid removes every record of that one session and nothing else", async () => {
    const storage = MemoryStorage();
    await seedThreeSessions(storage);
    await putSession(storage, ana.id, "b-renewed", { ...ana, sid: "sid-b" });

    const revoked = await revokeSessions(storage, ana.id, { onlySid: "sid-b" });

    expect(revoked).toBe(2);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toEqual([
      joinKey(["oauth:refresh", "user:u1", "a-renewed"]),
      joinKey(["oauth:refresh", "user:u1", "a-used"]),
      joinKey(["oauth:refresh", "user:u1", "c"]),
    ]);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u2"])).toHaveLength(1);
    // A sid the person does not have revokes nothing.
    expect(await revokeSessions(storage, ana.id, { onlySid: "sid-z" })).toBe(0);
    expect(await keysUnder(storage, ["oauth:refresh", "user:u2"])).toHaveLength(1);
  });

  // SPECSFY: US-004 FR-011 FR-017 AC-022
  it("config.ts exports sessionsRevokePath and no longer exports signOutOthersPath", () => {
    expect(sessionsRevokePath).toEqual(expect.stringMatching(/^\/internal\//));
    expect(sessionsRevokePath).not.toBe(identityDeletePath);
    expect("signOutOthersPath" in rootConfig).toBe(false);
  });

  // SPECSFY: US-004 FR-011 FR-017 AC-022
  it("auth.ts serves one revocation endpoint for both modes and no sign-out-others route", () => {
    const source = authSource();
    expect(source).toContain("sessionsRevokePath");
    expect(source).not.toContain("signOutOthersPath");
    expect(source).not.toMatch(/function\s+signOutOtherSessions\b/);
  });

  // SPECSFY: US-004 FR-011 FR-017 AC-022
  it(
    "the same internal endpoint accepts all-but-this-one (exceptSid), sparing the caller's sid",
    async () => {
      expect(sessionsRevokePath).toEqual(expect.any(String));
      const store = countingKv();
      const storage = CloudflareStorage({ namespace: store.kv });
      await seedThreeSessions(storage);

      const response = await callInternal(store.kv, sessionsRevokePath, {
        userId: ana.id,
        exceptSid: "sid-a",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, revoked: 2 });
      expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toEqual([
        joinKey(["oauth:refresh", "user:u1", "a-renewed"]),
        joinKey(["oauth:refresh", "user:u1", "a-used"]),
      ]);
      expect(await keysUnder(storage, ["oauth:refresh", "user:u2"])).toHaveLength(1);
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-004 FR-011 FR-017 AC-022
  it(
    "the same internal endpoint ends one session (onlySid) and refuses a call with neither sid",
    async () => {
      expect(sessionsRevokePath).toEqual(expect.any(String));
      const store = countingKv();
      const storage = CloudflareStorage({ namespace: store.kv });
      await seedThreeSessions(storage);

      const one = await callInternal(store.kv, sessionsRevokePath, {
        userId: ana.id,
        onlySid: "sid-c",
      });
      expect(one.status).toBe(200);
      expect(await one.json()).toEqual({ ok: true, revoked: 1 });
      expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toHaveLength(3);

      // Without either sid the call would become "sign out everywhere".
      const neither = await callInternal(store.kv, sessionsRevokePath, {
        userId: ana.id,
      });
      expect(neither.status).toBe(400);
      expect(await keysUnder(storage, ["oauth:refresh", "user:u1"])).toHaveLength(3);
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-033 the e-mail is normalized to lower case at the issuer's entry", () => {
  // SPECSFY: US-005 FR-005 FR-015 AC-033
  it("normalizeEmail lower-cases the address", () => {
    expect(typeof normalizeEmail).toBe("function");
    expect(normalizeEmail("Ana@Exemplo.com")).toBe("ana@exemplo.com");
    expect(normalizeEmail("ANA@EXEMPLO.COM")).toBe("ana@exemplo.com");
    expect(normalizeEmail("ana@exemplo.com")).toBe("ana@exemplo.com");
  });

  // SPECSFY: US-005 FR-005 FR-015 AC-033
  it(
    "through the auth.ts Worker, a code login as Ana@Exemplo.com and a password login as ana@exemplo.com land on the same profile",
    async () => {
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
      await auth.setPassword("ana@exemplo.com", "correct horse");

      // First login ever: this one creates the profile.
      const byCode = await auth.loginWithCode("Ana@Exemplo.com");
      const byPassword = await auth.loginWithPassword(
        "ana@exemplo.com",
        "correct horse",
      );

      expect(await Storage.get(storage, ["users", "Ana@Exemplo.com"])).toBeUndefined();
      const profile = (await Storage.get(storage, ["users", "ana@exemplo.com"])) as
        | { id: string; email: string }
        | undefined;
      expect(profile?.email).toBe("ana@exemplo.com");
      expect(decodeJwt(byCode.access).sub).toBe(`user:${profile?.id}`);
      expect(decodeJwt(byPassword.access).sub).toBe(`user:${profile?.id}`);

      // Each token says which provider opened the session.
      expect(decodeJwt(byCode.access).properties).toMatchObject({
        email: "ana@exemplo.com",
        provider: "code",
      });
      expect(decodeJwt(byPassword.access).properties).toMatchObject({
        email: "ana@exemplo.com",
        provider: "password",
      });
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-005 FR-015 AC-033
  it("issueUserSession hands the issuer the lower-case e-mail and files the subject key under it", async () => {
    const storage = MemoryStorage();
    const issued: Array<Record<string, unknown>> = [];
    const ctx = {
      async subject(_type: "user", properties: Record<string, unknown>) {
        issued.push(properties);
        return new Response("ok");
      },
    };

    await issueUserSession(
      ctx as unknown as Parameters<typeof issueUserSession>[0],
      storage,
      { ...ana, email: "Ana@Exemplo.com", provider: "code" } as unknown as Parameters<
        typeof issueUserSession
      >[2],
    );

    expect(issued).toHaveLength(1);
    expect(issued[0]?.email).toBe("ana@exemplo.com");
    expect(await Storage.get(storage, ["email", "ana@exemplo.com", "subject"])).toBe("user:u1");
  });

  // SPECSFY: US-005 FR-005 FR-015 AC-033
  it("subjects.user requires provider: a token without it does not verify", async () => {
    const withoutProvider = { ...ana, sid: "sid-a" };
    const withProvider = { ...withoutProvider, provider: "password" };

    const missing = await subjects.user["~standard"].validate(withoutProvider);
    const present = await subjects.user["~standard"].validate(withProvider);

    expect(missing.issues?.length ?? 0).toBeGreaterThan(0);
    expect(present.issues).toBeUndefined();
  });
});

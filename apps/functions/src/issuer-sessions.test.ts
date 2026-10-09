import type { ExecutionContext } from "@cloudflare/workers-types";
import { decodeJwt } from "jose";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { Storage } from "@openauthjs/openauth/storage/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_TTL_SECONDS } from "../../../config";
import worker from "./auth";
import { revokeSessions } from "./session-store";
import { subjects } from "./subjects";
import {
  createFlows,
  createIssuerHarness,
  memoryKv,
  type TokenPair,
} from "./test-support/issuer-harness";

// SPEC-0009 (Fase 3a), US-004 and US-005: what the real OpenAuth issuer does
// with the stable subject, the session sid and the 15-minute access token. The
// Gherkin of AC-019 and AC-021 to AC-023 (section 6 of the spec) is the
// reference contract for each case below.
//
// Most cases run on the issuer harness (real `issuer()` over MemoryStorage with
// the `success` order of section 8). The cases named "through the auth.ts
// Worker" drive the production Worker over an in-memory AuthKV, so they hold
// only once auth.ts itself issues user:<id>, sid and ACCESS_TOKEN_TTL_SECONDS.

// Codes the auth.ts Worker would e-mail; the harness captures its own.
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

const FLOW_TIMEOUT = 30_000;
const MINUTE = 60 * 1000;

type Client = ReturnType<typeof createIssuerHarness>["client"];

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

function sidOf(access: string) {
  return (decodeJwt(access).properties as { sid?: string }).sid;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function renew(client: Client, refresh: string): Promise<TokenPair> {
  const renewed = await client.refresh(refresh);
  if (renewed.err) throw renewed.err;
  if (!renewed.tokens) throw new Error("refresh returned no tokens");
  return renewed.tokens;
}

/** The production Worker of auth.ts over an in-memory AuthKV. */
function authWorker() {
  workerCodes.clear();
  const kv = memoryKv();
  const env = { AuthKV: kv } as unknown as Parameters<typeof worker.fetch>[1];
  const ctx = {} as unknown as ExecutionContext;
  const storage = CloudflareStorage({ namespace: kv });
  const flows = createFlows({
    fetch: async (request) => worker.fetch(request, env, ctx),
    storage,
    sentCodes: workerCodes,
  });
  return {
    ...flows,
    /** An existing profile, so `success` neither creates an id nor sends the welcome e-mail. */
    async addUser(person: typeof ana) {
      const at = new Date().toISOString();
      await Storage.set(storage, ["users", person.email], {
        ...person,
        createdAt: at,
        updatedAt: at,
        accounts: [],
      });
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AC-019 /password/change ends the sessions, whatever the login", () => {
  // SPECSFY: US-004 FR-005 FR-006 AC-019
  it(
    "ends the session opened by code and the one opened by password when /password/change completes",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      await harness.setPassword(ana.email, "old secret");
      const byCode = await harness.loginWithCode(ana.email);
      const byPassword = await harness.loginWithPassword(ana.email, "old secret");
      expect(
        await Storage.get(harness.storage, ["email", ana.email, "subject"]),
      ).toBe("user:u1");

      const response = await harness.changePassword(ana.email, "new secret");

      expect(response.status).toBe(302);
      expect(await harness.refreshRecords(ana.id)).toEqual([]);
      for (const tokens of [byCode, byPassword]) {
        expect((await harness.client.refresh(tokens.refresh)).err).toBeTruthy();
      }
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 FR-006 AC-019
  it(
    "ends the sessions of a person who only ever logged in by code, including one opened before a name change",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      await harness.setPassword(ana.email, "old secret");
      const beforeRename = await harness.loginWithCode(ana.email);
      harness.addPerson(ana.email, { ...ana, name: "Ana Souza" });
      const afterRename = await harness.loginWithCode(ana.email);
      expect(await harness.refreshRecords(ana.id)).toHaveLength(2);

      await harness.changePassword(ana.email, "new secret");

      expect(await harness.refreshRecords(ana.id)).toEqual([]);
      for (const tokens of [beforeRename, afterRename]) {
        expect((await harness.client.refresh(tokens.refresh)).err).toBeTruthy();
      }
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 FR-006 AC-019
  it(
    "keeps other people's sessions, refuses the old password and opens a fresh session with the new one",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      harness.addPerson(bruno.email, bruno);
      await harness.setPassword(ana.email, "old secret");
      await harness.loginWithCode(ana.email);
      const brunoSession = await harness.loginWithCode(bruno.email);

      await harness.changePassword(ana.email, "new secret");

      vi.advanceTimersByTime(15 * MINUTE + 1000);
      await expect(renew(harness.client, brunoSession.refresh)).resolves.toBeTruthy();
      await expect(
        harness.loginWithPassword(ana.email, "old secret"),
      ).rejects.toThrow(/login did not finish/);
      const fresh = await harness.loginWithPassword(ana.email, "new secret");
      expect(decodeJwt(fresh.access).sub).toBe("user:u1");
      expect(
        await Storage.get(harness.storage, ["email", ana.email, "subject"]),
      ).toBe("user:u1");
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 FR-006 AC-019
  it(
    "leaves the sessions alone when the e-mail has no password credential (password.js:174-180)",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const session = await harness.loginWithCode(ana.email);

      await harness.changePassword(ana.email, "new secret");

      expect(await harness.refreshRecords(ana.id)).toHaveLength(1);
      await expect(renew(harness.client, session.refresh)).resolves.toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-004 FR-005 FR-006 AC-019
  it(
    "through the auth.ts Worker, ends the code sessions of a person with a password",
    async () => {
      const auth = authWorker();
      await auth.addUser(ana);
      await auth.setPassword(ana.email, "old secret");
      const phone = await auth.loginWithCode(ana.email);
      const laptop = await auth.loginWithCode(ana.email);
      expect(decodeJwt(phone.access).sub).toBe("user:u1");
      expect(
        await Storage.get(auth.storage, ["email", ana.email, "subject"]),
      ).toBe("user:u1");

      await auth.changePassword(ana.email, "new secret");

      expect(await auth.refreshRecords(ana.id)).toEqual([]);
      for (const tokens of [phone, laptop]) {
        expect((await auth.client.refresh(tokens.refresh)).err).toBeTruthy();
      }
    },
    FLOW_TIMEOUT,
  );
});

describe("AC-021 15-minute access token renewed by the refresh token", () => {
  // SPECSFY: US-005 FR-007 AC-021
  it(
    "signs the access token for ACCESS_TOKEN_TTL_SECONDS, which is 15 minutes",
    async () => {
      expect(ACCESS_TOKEN_TTL_SECONDS).toBe(15 * 60);
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);

      const tokens = await harness.loginWithCode(ana.email);

      expect(decodeJwt(tokens.access).exp).toBe(
        nowSeconds() + ACCESS_TOKEN_TTL_SECONDS,
      );
      const verified = await harness.client.verify(subjects, tokens.access);
      expect(verified.err).toBeUndefined();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 AC-021
  it(
    "expires the old JWT after 15 minutes and renews it with the refresh token into a new pair of the same session",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const login = await harness.loginWithCode(ana.email);

      vi.advanceTimersByTime(15 * MINUTE - 1000);
      expect((await harness.client.verify(subjects, login.access)).err).toBeUndefined();

      vi.advanceTimersByTime(2000);
      expect((await harness.client.verify(subjects, login.access)).err).toBeTruthy();

      const renewed = await harness.client.verify(subjects, login.access, {
        refresh: login.refresh,
      });
      if (renewed.err) throw renewed.err;
      expect(renewed.tokens?.access).toBeTruthy();
      expect(renewed.tokens?.access).not.toBe(login.access);
      expect(renewed.tokens?.refresh).not.toBe(login.refresh);
      expect(renewed.subject.properties).toMatchObject({
        id: ana.id,
        sid: sidOf(login.access),
      });
      const payload = decodeJwt(renewed.tokens?.access || "");
      expect(payload.sub).toBe("user:u1");
      expect(payload.exp).toBe(nowSeconds() + ACCESS_TOKEN_TTL_SECONDS);
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 AC-021
  it(
    "keeps renewing the same session over consecutive 15-minute cycles",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const login = await harness.loginWithCode(ana.email);
      const sid = sidOf(login.access);

      let current = login;
      for (let cycle = 0; cycle < 3; cycle++) {
        vi.advanceTimersByTime(15 * MINUTE + 1000);
        expect((await harness.client.verify(subjects, current.access)).err).toBeTruthy();
        current = await renew(harness.client, current.refresh);
        expect(sidOf(current.access)).toBe(sid);
      }
      expect((await harness.client.verify(subjects, current.access)).err).toBeUndefined();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 AC-021
  it(
    "through the auth.ts Worker, signs the access token for ACCESS_TOKEN_TTL_SECONDS with user:<id> and a sid",
    async () => {
      const auth = authWorker();
      await auth.addUser(ana);

      const tokens = await auth.loginWithCode(ana.email);

      const payload = decodeJwt(tokens.access);
      expect(payload.exp).toBe(nowSeconds() + ACCESS_TOKEN_TTL_SECONDS);
      expect(payload.sub).toBe("user:u1");
      expect(sidOf(tokens.access)).toEqual(expect.any(String));
    },
    FLOW_TIMEOUT,
  );
});

describe("AC-022 a revoked refresh ends the session", () => {
  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it(
    "fails the next renewal of a session removed by signing out of the other sessions and keeps the caller's",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const current = await harness.loginWithCode(ana.email);
      const other = await harness.loginWithCode(ana.email);

      expect(
        await revokeSessions(harness.storage, ana.id, {
          exceptSid: sidOf(current.access),
        }),
      ).toBe(1);
      vi.advanceTimersByTime(15 * MINUTE + 1000);

      const otherRenewal = await harness.client.verify(subjects, other.access, {
        refresh: other.refresh,
      });
      expect(otherRenewal.err).toBeTruthy();
      const currentRenewal = await harness.client.verify(subjects, current.access, {
        refresh: current.refresh,
      });
      expect(currentRenewal.err).toBeUndefined();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it(
    "ends a revoked session that renewed less than 60 seconds before the revocation",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const current = await harness.loginWithCode(ana.email);
      const other = await harness.loginWithCode(ana.email);
      vi.advanceTimersByTime(15 * MINUTE + 1000);
      const otherRenewed = await renew(harness.client, other.refresh);

      // The spent record (inside its reuse window) and the new one both go.
      expect(
        await revokeSessions(harness.storage, ana.id, {
          exceptSid: sidOf(current.access),
        }),
      ).toBe(2);

      expect((await harness.client.refresh(other.refresh)).err).toBeTruthy();
      expect((await harness.client.refresh(otherRenewed.refresh)).err).toBeTruthy();
      await expect(renew(harness.client, current.refresh)).resolves.toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it(
    "lets a revoked session's access token live at most 15 minutes",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const session = await harness.loginWithCode(ana.email);

      expect(await revokeSessions(harness.storage, ana.id)).toBe(1);

      vi.advanceTimersByTime(15 * MINUTE - 1000);
      expect((await harness.client.verify(subjects, session.access)).err).toBeUndefined();
      vi.advanceTimersByTime(2000);
      const renewal = await harness.client.verify(subjects, session.access, {
        refresh: session.refresh,
      });
      expect(renewal.err).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );
});

describe("AC-023 simultaneous renewals do not end the session", () => {
  // SPECSFY: US-005 FR-007 NFR-005 AC-023
  it(
    "renews twice at once with the same refresh token and both pairs are valid",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const login = await harness.loginWithCode(ana.email);
      vi.advanceTimersByTime(15 * MINUTE + 1000);

      const [first, second] = await Promise.all([
        renew(harness.client, login.refresh),
        renew(harness.client, login.refresh),
      ]);

      for (const pair of [first, second]) {
        const verified = await harness.client.verify(subjects, pair.access);
        expect(verified.err).toBeUndefined();
        expect(sidOf(pair.access)).toBe(sidOf(login.access));
      }
      expect((await harness.refreshRecords(ana.id)).length).toBeGreaterThan(0);
      await expect(renew(harness.client, first.refresh)).resolves.toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-023
  it(
    "accepts the same refresh token again 59 seconds later without invalidating any record of the person",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const login = await harness.loginWithCode(ana.email);
      const otherDevice = await harness.loginWithCode(ana.email);
      vi.advanceTimersByTime(15 * MINUTE + 1000);

      const first = await renew(harness.client, login.refresh);
      vi.advanceTimersByTime(59 * 1000);
      const second = await renew(harness.client, login.refresh);

      // issuer.js:317-336: inside the window the reuse returns the same next token.
      expect(second.refresh).toBe(first.refresh);
      expect((await harness.client.verify(subjects, second.access)).err).toBeUndefined();
      await expect(renew(harness.client, otherDevice.refresh)).resolves.toBeTruthy();
      await expect(renew(harness.client, first.refresh)).resolves.toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-023
  it(
    "refuses the spent refresh token once the 60-second reuse window is over",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      const login = await harness.loginWithCode(ana.email);
      vi.advanceTimersByTime(15 * MINUTE + 1000);
      await renew(harness.client, login.refresh);

      vi.advanceTimersByTime(61 * 1000);

      expect((await harness.client.refresh(login.refresh)).err).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-023
  it(
    "invalidates every record of the person, across sessions and a profile change, when the issuer detects a reuse after the window",
    async () => {
      const harness = createIssuerHarness();
      harness.addPerson(ana.email, ana);
      harness.addPerson(bruno.email, bruno);
      const login = await harness.loginWithCode(ana.email);
      harness.addPerson(ana.email, { ...ana, name: "Ana Souza" });
      const renamed = await harness.loginWithCode(ana.email);
      const brunoSession = await harness.loginWithCode(bruno.email);
      vi.advanceTimersByTime(15 * MINUTE + 1000);
      await renew(harness.client, login.refresh);

      // A spent record still on file after its 60 s window, as the issuer keeps
      // it when `ttl.retention` is above zero (issuer.js:321-325). With the
      // default retention of 0 the record expires with the window instead.
      const token = login.refresh.split(":").pop() || "";
      const key = ["oauth:refresh", "user:u1", token];
      const spent = await Storage.get(harness.storage, key);
      vi.advanceTimersByTime(61 * 1000);
      await Storage.set(harness.storage, key, spent);

      expect((await harness.client.refresh(login.refresh)).err).toBeTruthy();
      expect(await harness.refreshRecords(ana.id)).toEqual([]);
      expect((await harness.client.refresh(renamed.refresh)).err).toBeTruthy();
      await expect(renew(harness.client, brunoSession.refresh)).resolves.toBeTruthy();
    },
    FLOW_TIMEOUT,
  );
});

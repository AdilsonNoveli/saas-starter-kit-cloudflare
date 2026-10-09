import {
  InvalidAccessTokenError,
  InvalidRefreshTokenError,
  InvalidSubjectError,
} from "@openauthjs/openauth/error";
import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SPEC-0009 (Fase 3a), US-005, AC-022 (app side, DEC-013): when the issuer
// refuses the session, getUserSession clears both auth cookies and returns
// nothing, so the existing middleware sends the person to the login.

const verify = vi.hoisted(() => vi.fn());

// The client is the seam: the real one would fetch the issuer's JWKS.
vi.mock("@openauthjs/openauth/client", () => ({
  createClient: () => ({ verify }),
}));
// The schema barrel is heavy to load. The tables only need to be distinct
// objects the fake database below can tell apart (SPEC-0010 AC-019 cases).
vi.mock("@nuxfire/functions/schema", () => ({
  users: { id: "User.id" },
  userPreferences: { userId: "UserPreference.userId" },
  userSessions: { id: "UserSession.id" },
}));

// Importing the module can take longer than the 5 s default when the whole suite runs in parallel.
const IMPORT_TIMEOUT = 30_000;

const ACCESS_COOKIE = "nuxfire-access-token";
const REFRESH_COOKIE = "nuxfire-refresh-token";

const cookieJar = new Map<string, string>();
const getCookie = vi.fn((_event: H3Event, name: string) => cookieJar.get(name));
const setCookie = vi.fn();
const deleteCookie = vi.fn();

function requestEvent() {
  return { context: {} } as unknown as H3Event;
}

function properties() {
  return {
    id: "u1",
    name: "Ana",
    email: "ana@example.com",
    image: "",
    sid: "sid-a",
  };
}

beforeEach(() => {
  cookieJar.clear();
  cookieJar.set(ACCESS_COOKIE, "expired-access");
  cookieJar.set(REFRESH_COOKIE, "user:u1:revoked-token");
  verify.mockReset();
  getCookie.mockClear();
  setCookie.mockClear();
  deleteCookie.mockClear();
  vi.stubGlobal("getCookie", getCookie);
  vi.stubGlobal("setCookie", setCookie);
  vi.stubGlobal("deleteCookie", deleteCookie);
  vi.stubGlobal("useRuntimeConfig", () => ({
    public: { authUrl: "http://auth.test", authClientID: "app" },
  }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function clearedCookieNames() {
  return deleteCookie.mock.calls.map(([, name]) => name).sort();
}

describe("AC-022 getUserSession ends a refused session", () => {
  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it(
    "clears the access and refresh cookies and returns nothing when the renewal is refused",
    async () => {
      verify.mockResolvedValue({ err: new InvalidRefreshTokenError() });
      const { getUserSession } = await import("./auth");
      const event = requestEvent();

      const session = await getUserSession(event);

      expect(session).toBeUndefined();
      expect(verify).toHaveBeenCalledWith(expect.anything(), "expired-access", {
        refresh: "user:u1:revoked-token",
      });
      expect(clearedCookieNames()).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
      for (const [calledEvent, , options] of deleteCookie.mock.calls) {
        expect(calledEvent).toBe(event);
        // Same path the cookies were set with (setTokens), or the browser keeps them.
        expect(options).toEqual(expect.objectContaining({ path: "/" }));
      }
      expect(setCookie).not.toHaveBeenCalled();
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it.each([
    ["an expired token without a valid refresh", () => new InvalidAccessTokenError()],
    ["a token without sid (issued before the change)", () => new InvalidSubjectError()],
  ])(
    "clears both cookies for %s",
    async (_case, error) => {
      verify.mockResolvedValue({ err: error() });
      const { getUserSession } = await import("./auth");

      expect(await getUserSession(requestEvent())).toBeUndefined();
      expect(clearedCookieNames()).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it(
    "also clears the cookies when explicitly passed tokens fail verification",
    async () => {
      verify.mockResolvedValue({ err: new InvalidRefreshTokenError() });
      const { getUserSession } = await import("./auth");

      const session = await getUserSession(
        requestEvent(),
        "callback-access",
        "user:u1:callback-refresh",
      );

      expect(session).toBeUndefined();
      expect(clearedCookieNames()).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it(
    "keeps the cookies and rewrites them with the renewed pair when the renewal succeeds",
    async () => {
      verify.mockResolvedValue({
        aud: "app",
        subject: { type: "user", properties: properties() },
        tokens: { access: "new-access", refresh: "user:u1:new-token" },
      });
      const { getUserSession } = await import("./auth");

      const session = await getUserSession(requestEvent());

      expect(session).toEqual(properties());
      expect(deleteCookie).not.toHaveBeenCalled();
      expect(setCookie).toHaveBeenCalledWith(
        expect.anything(),
        ACCESS_COOKIE,
        "new-access",
        expect.objectContaining({ path: "/" }),
      );
      expect(setCookie).toHaveBeenCalledWith(
        expect.anything(),
        REFRESH_COOKIE,
        "user:u1:new-token",
        expect.objectContaining({ path: "/", httpOnly: true }),
      );
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-005 FR-007 NFR-005 AC-022
  it(
    "neither verifies nor touches cookies when there is no access token",
    async () => {
      cookieJar.clear();
      const { getUserSession } = await import("./auth");

      expect(await getUserSession(requestEvent())).toBeUndefined();
      expect(verify).not.toHaveBeenCalled();
      expect(deleteCookie).not.toHaveBeenCalled();
    },
    IMPORT_TIMEOUT,
  );
});

// SPEC-0010 (Fase 3b), US-004, AC-019 (DEC-003, DEC-008): the session row's
// lastUsedAt/expiresAt move once per renewal (touchSession, auto-imported from
// layers/account/server/utils/session-registry.ts like the other server
// utils), never on a request whose access token is still valid; and getUser
// carries the preferences row inside the Promise.all it already runs.

type Read = { table: unknown; via: string };

function fakeDatabase(rows: Map<unknown, unknown[]>, queryRows: Record<string, unknown[]> = {}) {
  const reads: Read[] = [];
  const writes: string[] = [];
  const result = (table: unknown, via: string) => {
    reads.push({ table, via });
    const value = Promise.resolve(rows.get(table) ?? []);
    return Object.assign(value, { limit: () => value });
  };
  const db = {
    select: () => ({ from: (table: unknown) => ({ where: () => result(table, "select") }) }),
    query: new Proxy(
      {},
      {
        get: (_target, name: string) => ({
          findMany: async () => {
            reads.push({ table: name, via: "query" });
            return queryRows[name] ?? [];
          },
          findFirst: async () => {
            reads.push({ table: name, via: "query" });
            return (queryRows[name] ?? [])[0];
          },
        }),
      },
    ),
    insert: () => {
      writes.push("insert");
      throw new Error("unexpected insert");
    },
    update: () => {
      writes.push("update");
      throw new Error("unexpected update");
    },
    delete: () => {
      writes.push("delete");
      throw new Error("unexpected delete");
    },
  };
  return { db, reads, writes };
}

describe("AC-019 lastUsedAt moves on renewal, not on every request", () => {
  // SPECSFY: US-004 FR-010 NFR-003 AC-019
  it(
    "touches the session once when the refresh renews the access, and writes nothing while the access is valid",
    async () => {
      const touchSession = vi.fn(async () => {});
      const fake = fakeDatabase(new Map());
      const useDB = vi.fn(() => fake.db);
      vi.stubGlobal("touchSession", touchSession);
      vi.stubGlobal("useDB", useDB);
      const { getUserSession } = await import("./auth");

      // Valid access token: the issuer returns no new tokens.
      cookieJar.set(ACCESS_COOKIE, "valid-access");
      verify.mockResolvedValue({ aud: "app", subject: { type: "user", properties: properties() } });
      expect(await getUserSession(requestEvent())).toEqual(properties());
      expect(touchSession).not.toHaveBeenCalled();
      expect(useDB).not.toHaveBeenCalled();
      expect(fake.writes).toEqual([]);

      // Expired access renewed by the refresh token.
      cookieJar.set(ACCESS_COOKIE, "expired-access");
      verify.mockResolvedValue({
        aud: "app",
        subject: { type: "user", properties: properties() },
        tokens: { access: "new-access", refresh: "user:u1:new-token" },
      });
      expect(await getUserSession(requestEvent())).toEqual(properties());
      expect(touchSession).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(touchSession.mock.calls[0])).toContain("sid-a");
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-004 FR-010 NFR-003 AC-019
  it(
    "returns the preferences row (or null) from getUser with no read outside the existing Promise.all",
    async () => {
      const schema = await import("@nuxfire/functions/schema");
      const tables = schema as unknown as Record<string, unknown>;
      const profile = { id: "u1", name: "Ana", email: "ana@example.com", image: "", mfaEnabledAt: null };
      const preferences = {
        userId: "u1",
        locale: "es",
        timeZone: "America/Sao_Paulo",
        theme: "dark",
        dateFormat: "DMY",
        nameOrder: "WESTERN",
        onboardedAt: new Date("2026-09-01T10:00:00.000Z"),
      };
      vi.stubGlobal("touchSession", vi.fn(async () => {}));
      vi.stubGlobal("isActivePlatformAdmin", vi.fn(async () => false));
      cookieJar.set(ACCESS_COOKIE, "valid-access");
      verify.mockResolvedValue({ aud: "app", subject: { type: "user", properties: properties() } });
      const { getUser } = await import("./auth");

      const withRow = fakeDatabase(
        new Map<unknown, unknown[]>([
          [tables.users, [profile]],
          [tables.userPreferences, [preferences]],
        ]),
        { userPreferences: [preferences] },
      );
      vi.stubGlobal("useDB", () => withRow.db);
      const user = await getUser(requestEvent());
      expect(user).toMatchObject({ id: "u1", sid: "sid-a", preferences: expect.objectContaining({ locale: "es", theme: "dark" }) });
      // User, permissions (teamMemberships) and the preferences row: one read each.
      expect(withRow.reads).toHaveLength(3);
      expect(withRow.writes).toEqual([]);

      const withoutRow = fakeDatabase(new Map<unknown, unknown[]>([[tables.users, [profile]]]));
      vi.stubGlobal("useDB", () => withoutRow.db);
      const newcomer = await getUser(requestEvent());
      expect(newcomer).toHaveProperty("preferences", null);
      expect(withoutRow.reads).toHaveLength(3);
    },
    IMPORT_TIMEOUT,
  );
});

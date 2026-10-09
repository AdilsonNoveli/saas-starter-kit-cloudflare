import { describe, expect, it, vi } from "vitest";
import type { Audit, AuditEvent, IssuerClient } from "./ports";
import { listSessions, revokeSession, signOutOthers } from "./sessions";

// SPEC-0010 (Fase 3b), DEC-008, DEC-009 and DEC-018: the sessions service gets the
// table, the issuer client and the audit writer as parameters. The fakes below keep
// the state in memory: the issuer holds the sids whose refresh record is alive, so
// revoking a sid there is what makes its renewal fail.
type SessionRow = {
  id: string;
  userId: string;
  browser: string;
  os: string;
  country: string | null;
  region: string | null;
  city: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
};

const USER_ID = "u1";
const EMAIL = "ana@exemplo.com";

function row(id: string, lastUsedAt: string): SessionRow {
  return {
    id,
    userId: USER_ID,
    browser: "Firefox",
    os: "Windows",
    country: "BR",
    region: "SP",
    city: "São Paulo",
    createdAt: new Date("2026-10-01T12:00:00Z"),
    lastUsedAt: new Date(lastUsedAt),
    expiresAt: new Date("2026-11-05T12:00:00Z"),
  };
}

function harness(rows: SessionRow[], liveSids: string[]) {
  const table = new Map(rows.map((r) => [r.id, r]));
  const live = new Set(liveSids);
  const repo = {
    listByUser: vi.fn(async (userId: string) => [...table.values()].filter((r) => r.userId === userId)),
    deleteBySid: vi.fn(async (_userId: string, sid: string) => {
      table.delete(sid);
    }),
    deleteExcept: vi.fn(async (_userId: string, sid: string) => {
      for (const id of [...table.keys()]) if (id !== sid) table.delete(id);
    }),
  };
  const issuer = {
    identityState: vi.fn<IssuerClient["identityState"]>(async () => ({
      providers: ["password"],
      hasPassword: true,
      sids: [...live],
    })),
    revokeSessions: vi.fn<IssuerClient["revokeSessions"]>(async ({ onlySid, exceptSid }) => {
      let revoked = 0;
      for (const sid of [...live]) {
        if ((onlySid && sid === onlySid) || (exceptSid && sid !== exceptSid)) {
          live.delete(sid);
          revoked += 1;
        }
      }
      return { revoked };
    }),
    changeEmail: vi.fn<IssuerClient["changeEmail"]>(async () => ({ ok: true })),
  } satisfies IssuerClient;
  const audit = { record: vi.fn<Audit["record"]>(async () => {}) } satisfies Audit;
  return { deps: { repo, issuer, audit }, repo, issuer, audit, table, live };
}

// A refusal may come back as `{ error }` or as a thrown error: either way it has a code.
async function errorOf(run: Promise<unknown>): Promise<string | undefined> {
  try {
    const result = await run;
    if (result && typeof result === "object" && "error" in result) return String(result.error);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("listSessions", () => {
  // SPECSFY: US-004 FR-011 FR-013 NFR-003 AC-020
  it("lists only the sessions alive in the issuer, marks the current one and puts the most recent first, with one issuer scan and one table read", async () => {
    const h = harness(
      [row("s1", "2026-10-06T10:00:00Z"), row("s2", "2026-10-06T11:00:00Z"), row("s3", "2026-10-06T12:00:00Z")],
      ["s1", "s2", "s9"],
    );

    const sessions = await listSessions(h.deps, { userId: USER_ID, email: EMAIL, currentSid: "s1" });

    expect(sessions.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(sessions.find((s) => s.id === "s1")?.current).toBe(true);
    expect(sessions.find((s) => s.id === "s2")?.current).toBe(false);
    expect(h.issuer.identityState).toHaveBeenCalledTimes(1);
    expect(h.issuer.identityState).toHaveBeenCalledWith({ userId: USER_ID, email: EMAIL });
    expect(h.repo.listByUser).toHaveBeenCalledTimes(1);
    expect(h.repo.listByUser).toHaveBeenCalledWith(USER_ID);
    for (const session of sessions) expect(session).not.toHaveProperty("ip");
  });

  // SPECSFY: US-004 FR-011 FR-013 AC-023
  it("hides a row whose refresh record the issuer removed when the password was reset", async () => {
    const h = harness([row("s1", "2026-10-06T10:00:00Z"), row("s4", "2026-10-06T12:00:00Z")], ["s1"]);

    const sessions = await listSessions(h.deps, { userId: USER_ID, email: EMAIL, currentSid: "s1" });

    expect(h.table.has("s4")).toBe(true);
    expect(sessions.map((s) => s.id)).toEqual(["s1"]);
    expect(sessions[0]?.current).toBe(true);
  });
});

describe("revokeSession", () => {
  // SPECSFY: US-004 FR-011 FR-017 AC-021
  it("ends the second session in the issuer and the table, keeps the first, audits it and refuses to end the current one", async () => {
    const h = harness([row("s1", "2026-10-06T10:00:00Z"), row("s2", "2026-10-06T11:00:00Z")], ["s1", "s2"]);

    expect(await errorOf(revokeSession(h.deps, { userId: USER_ID, sid: "s2", currentSid: "s1" }))).toBeUndefined();

    expect(h.issuer.revokeSessions).toHaveBeenCalledTimes(1);
    expect(h.issuer.revokeSessions).toHaveBeenCalledWith({ userId: USER_ID, onlySid: "s2" });
    expect(h.repo.deleteBySid).toHaveBeenCalledWith(USER_ID, "s2");
    expect(h.live.has("s2")).toBe(false);
    expect(h.live.has("s1")).toBe(true);
    expect(h.table.has("s2")).toBe(false);
    expect(h.table.has("s1")).toBe(true);
    expect(h.audit.record).toHaveBeenCalledTimes(1);
    expect(h.audit.record.mock.calls[0]?.[0]).toMatchObject({ actorUserId: USER_ID });

    const after = await listSessions(h.deps, { userId: USER_ID, email: EMAIL, currentSid: "s1" });
    expect(after.map((s) => s.id)).toEqual(["s1"]);

    expect(await errorOf(revokeSession(h.deps, { userId: USER_ID, sid: "s1", currentSid: "s1" }))).toEqual(expect.any(String));
    expect(h.issuer.revokeSessions).toHaveBeenCalledTimes(1);
    expect(h.repo.deleteBySid).toHaveBeenCalledTimes(1);
    expect(h.audit.record).toHaveBeenCalledTimes(1);
    expect(h.live.has("s1")).toBe(true);
    expect(h.table.has("s1")).toBe(true);
  });
});

describe("audit of the session actions", () => {
  // SPECSFY: US-004 US-005 FR-017 NFR-002 AC-043
  it("records one event per action, with no e-mail in the metadata and no IP", async () => {
    const h = harness(
      [row("s1", "2026-10-06T10:00:00Z"), row("s2", "2026-10-06T11:00:00Z"), row("s3", "2026-10-06T12:00:00Z")],
      ["s1", "s2", "s3"],
    );

    await revokeSession(h.deps, { userId: USER_ID, sid: "s2", currentSid: "s1" });
    expect(h.audit.record).toHaveBeenCalledTimes(1);

    await signOutOthers(h.deps, { userId: USER_ID, currentSid: "s1" });
    expect(h.audit.record).toHaveBeenCalledTimes(2);
    expect(h.issuer.revokeSessions).toHaveBeenLastCalledWith({ userId: USER_ID, exceptSid: "s1" });
    expect(h.repo.deleteExcept).toHaveBeenCalledWith(USER_ID, "s1");
    expect([...h.live]).toEqual(["s1"]);
    expect([...h.table.keys()]).toEqual(["s1"]);

    const events: AuditEvent[] = h.audit.record.mock.calls.map(([event]) => event);
    expect(new Set(events.map((event) => event.action)).size).toBe(2);
    for (const event of events) {
      expect(event.actorUserId).toBe(USER_ID);
      expect(event).not.toHaveProperty("ip");
      const metadata = JSON.stringify(event.metadata ?? {});
      expect(metadata).not.toContain("@");
      expect(metadata).not.toContain(EMAIL);
    }
  });
});

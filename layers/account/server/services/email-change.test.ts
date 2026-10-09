import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { Audit, AuditEvent, IssuerClient } from "./ports";
import { confirmEmailChange, emailChangeStatus, requestEmailChange } from "./email-change";

// SPEC-0010 (Fase 3b), DEC-010, DEC-011 and DEC-018: the e-mail change service gets the
// table, the issuer client, the e-mail sender, the rate limit, the HMAC key and the
// clock as parameters. The fakes keep the pending request in memory, so the codes the
// service sends are the only way to learn them, exactly as for the person.
type ChangeRequestRow = {
  userId: string;
  newEmail: string;
  currentCodeHash: string;
  newCodeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
};
type RateRule = { limit: number; windowSeconds: number };
type SessionProvider = "password" | "code" | "google" | "github";

const USER_ID = "u1";
const OLD = "a@x.com";
const NEW = "b@x.com";
const HASH_KEY = "email-change-test-key-with-enough-length";

function harness(options: { providers?: string[]; hasPassword?: boolean; takenInDb?: string[]; limit?: number } = {}) {
  let now = new Date("2026-10-06T12:00:00Z");
  const requests = new Map<string, ChangeRequestRow>();
  const taken = new Set(options.takenInDb ?? []);
  const counters = new Map<string, number>();
  const repo = {
    findRequest: vi.fn(async (userId: string) => requests.get(userId) ?? null),
    saveRequest: vi.fn(async (row: ChangeRequestRow) => {
      requests.set(row.userId, { ...row });
    }),
    bumpAttempts: vi.fn(async (userId: string) => {
      const request = requests.get(userId);
      if (!request) return 0;
      request.attempts += 1;
      return request.attempts;
    }),
    deleteRequest: vi.fn(async (userId: string) => {
      requests.delete(userId);
    }),
    userEmailTaken: vi.fn(async (email: string) => taken.has(email.toLowerCase())),
    setUserEmail: vi.fn(async (_userId: string, _email: string) => {}),
  };
  const issuer = {
    identityState: vi.fn<IssuerClient["identityState"]>(async () => ({
      providers: options.providers ?? ["password"],
      hasPassword: options.hasPassword ?? true,
      sids: ["s1", "s2", "s3"],
    })),
    revokeSessions: vi.fn<IssuerClient["revokeSessions"]>(async () => ({ revoked: 0 })),
    changeEmail: vi.fn<IssuerClient["changeEmail"]>(async () => ({ ok: true })),
  } satisfies IssuerClient;
  const audit = { record: vi.fn<Audit["record"]>(async () => {}) } satisfies Audit;
  const sendEmail = vi.fn(async (_to: string, _template: string, _props: { code: string }) => {});
  const rateLimit = vi.fn(async (key: string, rule: RateRule) => {
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    const limit = options.limit ?? rule.limit;
    return { allowed: count <= limit, count, limit };
  });
  const deps = { repo, issuer, audit, sendEmail, rateLimit, hashKey: HASH_KEY, now: () => now };
  return {
    deps,
    repo,
    issuer,
    audit,
    sendEmail,
    rateLimit,
    requests,
    advanceMinutes(minutes: number) {
      now = new Date(now.getTime() + minutes * 60_000);
    },
    codeSentTo(email: string): string {
      const call = [...sendEmail.mock.calls].reverse().find(([to]) => to === email);
      if (!call) throw new Error(`no code sent to ${email}`);
      return call[2].code;
    },
  };
}

type Harness = ReturnType<typeof harness>;

function request(h: Harness, sessionProvider: SessionProvider = "password", newEmail = NEW) {
  return requestEmailChange(h.deps, { userId: USER_ID, email: OLD, sessionProvider, newEmail });
}

function confirm(h: Harness, currentCode: string, newCode: string) {
  return confirmEmailChange(h.deps, { userId: USER_ID, email: OLD, currentSid: "s1", currentCode, newCode });
}

const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

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

function expectNothingMoved(h: Harness) {
  expect(h.issuer.changeEmail).not.toHaveBeenCalled();
  expect(h.issuer.revokeSessions).not.toHaveBeenCalled();
  expect(h.repo.setUserEmail).not.toHaveBeenCalled();
}

function expectNoRawEmail(events: AuditEvent[]) {
  for (const event of events) {
    const metadata = JSON.stringify(event.metadata ?? {});
    expect(metadata).not.toContain("@");
    expect(metadata).not.toContain(OLD);
    expect(metadata).not.toContain(NEW);
  }
}

describe("confirmEmailChange refusals", () => {
  // SPECSFY: US-005 FR-014 NFR-001 AC-028
  it("leaves everything unchanged on a wrong or expired code and drops the request on the fifth wrong attempt", async () => {
    // Wrong code: invalid_code, nothing moves, the request stays.
    const wrongCase = harness();
    expect(await errorOf(request(wrongCase))).toBeUndefined();
    const current = wrongCase.codeSentTo(OLD);
    const next = wrongCase.codeSentTo(NEW);
    expect(await errorOf(confirm(wrongCase, wrong(current), next))).toBe("invalid_code");
    expectNothingMoved(wrongCase);
    expect(wrongCase.requests.has(USER_ID)).toBe(true);

    // Expired code: both codes right, sixteen minutes later.
    const expiredCase = harness();
    await request(expiredCase);
    expiredCase.advanceMinutes(16);
    expect(
      await errorOf(confirm(expiredCase, expiredCase.codeSentTo(OLD), expiredCase.codeSentTo(NEW))),
    ).toBe("code_expired");
    expectNothingMoved(expiredCase);

    // Five wrong attempts: the fifth invalidates the request, and the right codes no longer work.
    const exhausted = harness();
    await request(exhausted);
    const right = { current: exhausted.codeSentTo(OLD), next: exhausted.codeSentTo(NEW) };
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const codes = attempt % 2 === 0 ? [right.current, wrong(right.next)] : [wrong(right.current), right.next];
      expect(await errorOf(confirm(exhausted, codes[0] ?? "", codes[1] ?? ""))).toBe("invalid_code");
      expect(exhausted.requests.has(USER_ID)).toBe(attempt < 5);
    }
    expect(exhausted.repo.deleteRequest).toHaveBeenCalledWith(USER_ID);
    expect(await errorOf(confirm(exhausted, right.current, right.next))).toEqual(expect.any(String));
    expectNothingMoved(exhausted);
  });
});

describe("e-mail owned by a provider", () => {
  // SPECSFY: US-005 FR-009 FR-013 FR-014 AC-030
  it("refuses a Google session and a password session with a linked GitHub account, and shows the e-mail as read-only", async () => {
    const google = harness({ providers: ["google"], hasPassword: false });
    expect(await errorOf(request(google, "google"))).toBe("email_managed_by_provider");
    expect(google.sendEmail).not.toHaveBeenCalled();
    expect(google.repo.saveRequest).not.toHaveBeenCalled();
    expect(
      await emailChangeStatus(google.deps, { userId: USER_ID, email: OLD, sessionProvider: "google" }),
    ).toMatchObject({ editable: false });

    const linkedGithub = harness({ providers: ["password", "github"], hasPassword: true });
    expect(await errorOf(request(linkedGithub, "password"))).toBe("email_managed_by_provider");
    expect(linkedGithub.sendEmail).not.toHaveBeenCalled();
    expect(linkedGithub.repo.saveRequest).not.toHaveBeenCalled();
    expect(
      await emailChangeStatus(linkedGithub.deps, { userId: USER_ID, email: OLD, sessionProvider: "password" }),
    ).toMatchObject({ editable: false });

    // Control: a password-only identity may change it.
    const passwordOnly = harness({ providers: ["password"], hasPassword: true });
    expect(
      await emailChangeStatus(passwordOnly.deps, { userId: USER_ID, email: OLD, sessionProvider: "password" }),
    ).toMatchObject({ editable: true });
  });
});

describe("requestEmailChange limits and codes", () => {
  // SPECSFY: US-005 FR-014 NFR-001 AC-034
  it("limits requests per userId, sends one code to each address, stores only HMACs, and the procedure inherits the MFA gate", async () => {
    const h = harness();

    expect(await errorOf(request(h))).toBeUndefined();
    expect(h.sendEmail).toHaveBeenCalledTimes(2);
    expect(h.sendEmail).toHaveBeenCalledWith(OLD, "VerificationCode", expect.objectContaining({ code: expect.stringMatching(/^\d{6}$/u) }));
    expect(h.sendEmail).toHaveBeenCalledWith(NEW, "VerificationCode", expect.objectContaining({ code: expect.stringMatching(/^\d{6}$/u) }));
    const stored = h.requests.get(USER_ID);
    expect(stored).toMatchObject({ userId: USER_ID, newEmail: NEW, attempts: 0 });
    expect(stored?.currentCodeHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(stored?.newCodeHash).toMatch(/^[0-9a-f]{64}$/u);
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain(`"${h.codeSentTo(OLD)}"`);
    expect(serialized).not.toContain(`"${h.codeSentTo(NEW)}"`);

    const [key, rule] = h.rateLimit.mock.calls[0] ?? [];
    expect(key).toContain(USER_ID);
    expect(rule?.limit).toBeLessThan(11);
    expect(rule?.windowSeconds).toBeGreaterThanOrEqual(900);

    const outcomes = [];
    for (let i = 2; i <= 11; i += 1) outcomes.push(await errorOf(request(h)));
    const limit = rule?.limit ?? 0;
    expect(outcomes.at(-1)).toBe("too_many_requests");
    expect(outcomes.filter((code) => code === "too_many_requests")).toHaveLength(11 - limit);
    expect(h.sendEmail).toHaveBeenCalledTimes(2 * limit);
    expect(h.rateLimit.mock.calls.every(([k]) => k === key)).toBe(true);

    // MFA: the tRPC procedure is a protectedProcedure, which already demands the MFA proof.
    const procedure = fileURLToPath(new URL("../trpc/email-change.ts", import.meta.url));
    expect(existsSync(procedure)).toBe(true);
    expect(readFileSync(procedure, "utf8")).toMatch(/\bprotectedProcedure\b/u);
  });
});

describe("emailChangeStatus and the happy path", () => {
  // SPECSFY: US-005 FR-009 FR-013 AC-015
  it("reports hasPassword for a password identity and not for a Google-only one", async () => {
    const withPassword = harness({ providers: ["password"], hasPassword: true });
    expect(
      await emailChangeStatus(withPassword.deps, { userId: USER_ID, email: OLD, sessionProvider: "password" }),
    ).toMatchObject({ hasPassword: true });
    expect(withPassword.issuer.identityState).toHaveBeenCalledWith({ userId: USER_ID, email: OLD });

    const googleOnly = harness({ providers: ["google"], hasPassword: false });
    expect(
      await emailChangeStatus(googleOnly.deps, { userId: USER_ID, email: OLD, sessionProvider: "google" }),
    ).toMatchObject({ hasPassword: false });
  });

  // SPECSFY: US-005 FR-009 FR-013 AC-015
  it("with both codes right, moves the issuer first, then User.email, drops the request and audits without raw e-mail", async () => {
    const h = harness();
    await request(h);
    expect(h.audit.record).toHaveBeenCalledTimes(1);

    expect(await errorOf(confirm(h, h.codeSentTo(OLD), h.codeSentTo(NEW)))).toBeUndefined();

    expect(h.issuer.changeEmail).toHaveBeenCalledWith({ userId: USER_ID, oldEmail: OLD, newEmail: NEW, currentSid: "s1" });
    expect(h.repo.setUserEmail).toHaveBeenCalledWith(USER_ID, NEW);
    const issuerOrder = h.issuer.changeEmail.mock.invocationCallOrder[0] ?? Infinity;
    const dbOrder = h.repo.setUserEmail.mock.invocationCallOrder[0] ?? -Infinity;
    expect(issuerOrder).toBeLessThan(dbOrder);
    expect(h.requests.has(USER_ID)).toBe(false);
    expect(h.audit.record).toHaveBeenCalledTimes(2);
    expectNoRawEmail(h.audit.record.mock.calls.map(([event]) => event));
  });

  // SPECSFY: US-005 FR-009 FR-013 AC-015
  it("refuses the same address and an address already taken in the database or in the issuer, sending no code", async () => {
    const same = harness();
    expect(await errorOf(request(same, "password", "A@X.com"))).toBe("email_unchanged");
    expect(same.sendEmail).not.toHaveBeenCalled();
    expect(same.repo.saveRequest).not.toHaveBeenCalled();

    const takenInDb = harness({ takenInDb: [NEW] });
    expect(await errorOf(request(takenInDb))).toBe("email_taken");
    expect(takenInDb.sendEmail).not.toHaveBeenCalled();
    expect(takenInDb.repo.saveRequest).not.toHaveBeenCalled();

    const takenInIssuer = harness();
    await request(takenInIssuer);
    takenInIssuer.issuer.changeEmail.mockResolvedValueOnce({ ok: false, error: "email_taken" });
    expect(
      await errorOf(confirm(takenInIssuer, takenInIssuer.codeSentTo(OLD), takenInIssuer.codeSentTo(NEW))),
    ).toBe("email_taken");
    expect(takenInIssuer.repo.setUserEmail).not.toHaveBeenCalled();
  });
});

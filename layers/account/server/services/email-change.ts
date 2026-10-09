import {
  EMAIL_CHANGE_MAX_ATTEMPTS,
  EMAIL_CHANGE_TTL_MINUTES,
  generateEmailChangeCode,
  hashEmailChangeCode,
  verifyEmailChangeCode,
} from "../utils/email-change-code";
import type { Audit, Clock, IssuerClient } from "./ports";

// The e-mail change (SPEC-0010, FR-014, DEC-010, DEC-011). One pending request
// per person, holding only the HMAC of two six-digit codes: one sent to the
// current address, one to the new. Once both are right, the issuer moves the
// identity first and `User.email` follows; a failure in between heals on the
// next login, which rewrites `User.email` from the token.

export type EmailChangeRequestRow = {
  userId: string;
  newEmail: string;
  currentCodeHash: string;
  newCodeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
};

export type EmailChangeDeps = {
  repo: {
    findRequest(userId: string): Promise<EmailChangeRequestRow | null>;
    /** Replaces any earlier request of the same person. */
    saveRequest(row: EmailChangeRequestRow): Promise<void>;
    /** Returns the new attempt count. */
    bumpAttempts(userId: string): Promise<number>;
    deleteRequest(userId: string): Promise<void>;
    userEmailTaken(email: string): Promise<boolean>;
    setUserEmail(userId: string, email: string): Promise<void>;
  };
  issuer: IssuerClient;
  audit: Audit;
  sendEmail(to: string, template: "VerificationCode", props: { code: string }): Promise<unknown>;
  rateLimit(key: string, rule: { limit: number; windowSeconds: number }): Promise<{ allowed: boolean }>;
  hashKey: string;
  now: Clock;
};

/** Requests per person per window; the eleventh in fifteen minutes is always refused. */
const REQUEST_RULE = { limit: 5, windowSeconds: 15 * 60 };

// The address of a password or code login belongs to the person; the address of
// a Google or GitHub account belongs to the provider, and moving it would make
// the next login with that provider create another identity.
const SELF_MANAGED_PROVIDERS: ReadonlySet<string> = new Set(["password", "code"]);
const EXTERNAL_PROVIDERS: ReadonlySet<string> = new Set(["google", "github"]);

const normalize = (email: string) => email.trim().toLowerCase();

async function identityFacts(
  deps: EmailChangeDeps,
  input: { userId: string; email: string; sessionProvider: string },
) {
  const state = await deps.issuer.identityState({ userId: input.userId, email: input.email });
  const editable =
    SELF_MANAGED_PROVIDERS.has(input.sessionProvider) &&
    !state.providers.some((provider) => EXTERNAL_PROVIDERS.has(provider));
  return { editable, hasPassword: state.hasPassword };
}

export async function emailChangeStatus(
  deps: EmailChangeDeps,
  input: { userId: string; email: string; sessionProvider: string },
): Promise<{ editable: boolean; hasPassword: boolean }> {
  return identityFacts(deps, input);
}

export async function requestEmailChange(
  deps: EmailChangeDeps,
  input: { userId: string; email: string; sessionProvider: string; newEmail: string },
): Promise<
  | { ok: true }
  | { error: "too_many_requests" | "email_unchanged" | "email_managed_by_provider" | "email_taken" }
> {
  // First, so neither the issuer nor the database can be probed past the limit.
  const { allowed } = await deps.rateLimit(`email-change:${input.userId}`, REQUEST_RULE);
  if (!allowed) return { error: "too_many_requests" };

  const newEmail = normalize(input.newEmail);
  if (newEmail === normalize(input.email)) return { error: "email_unchanged" };

  const { editable } = await identityFacts(deps, input);
  if (!editable) return { error: "email_managed_by_provider" };
  if (await deps.repo.userEmailTaken(newEmail)) return { error: "email_taken" };

  const now = deps.now();
  const currentCode = generateEmailChangeCode();
  const newCode = generateEmailChangeCode();
  const base = { userId: input.userId, newEmail };
  await deps.repo.saveRequest({
    userId: input.userId,
    newEmail,
    currentCodeHash: await hashEmailChangeCode(deps.hashKey, { ...base, side: "current", code: currentCode }),
    newCodeHash: await hashEmailChangeCode(deps.hashKey, { ...base, side: "new", code: newCode }),
    attempts: 0,
    expiresAt: new Date(now.getTime() + EMAIL_CHANGE_TTL_MINUTES * 60_000),
    createdAt: now,
  });
  await deps.sendEmail(input.email, "VerificationCode", { code: currentCode });
  await deps.sendEmail(newEmail, "VerificationCode", { code: newCode });
  await deps.audit.record({
    action: "user.email_change.request",
    actorUserId: input.userId,
    targetId: input.userId,
  });
  return { ok: true };
}

export async function confirmEmailChange(
  deps: EmailChangeDeps,
  input: { userId: string; email: string; currentSid: string; currentCode: string; newCode: string },
): Promise<
  | { ok: true }
  | { error: "code_expired" | "invalid_code" | "email_taken" | "email_managed_by_provider" }
> {
  const request = await deps.repo.findRequest(input.userId);
  // No request left (never made, used, exhausted or expired): a new one is needed.
  if (!request) return { error: "code_expired" };
  if (deps.now().getTime() >= request.expiresAt.getTime()) {
    await deps.repo.deleteRequest(input.userId);
    return { error: "code_expired" };
  }

  // Both sides are checked every time, and the answer does not say which failed.
  const base = { userId: input.userId, newEmail: request.newEmail };
  const [currentOk, newOk] = await Promise.all([
    verifyEmailChangeCode(deps.hashKey, { ...base, side: "current", code: input.currentCode, hash: request.currentCodeHash }),
    verifyEmailChangeCode(deps.hashKey, { ...base, side: "new", code: input.newCode, hash: request.newCodeHash }),
  ]);
  if (!currentOk || !newOk) {
    const attempts = await deps.repo.bumpAttempts(input.userId);
    if (attempts >= EMAIL_CHANGE_MAX_ATTEMPTS) await deps.repo.deleteRequest(input.userId);
    return { error: "invalid_code" };
  }

  // The codes are spent whatever the issuer answers.
  const moved = await deps.issuer.changeEmail({
    userId: input.userId,
    oldEmail: input.email,
    newEmail: request.newEmail,
    currentSid: input.currentSid,
  });
  await deps.repo.deleteRequest(input.userId);
  if (!moved.ok) return { error: moved.error };

  await deps.repo.setUserEmail(input.userId, request.newEmail);
  await deps.audit.record({
    action: "user.email_change.confirm",
    actorUserId: input.userId,
    targetId: input.userId,
  });
  return { ok: true };
}

import type { SessionRecord } from "../utils/session-registry";
import type { Audit, IssuerClient } from "./ports";

// The session list and the two ways to end sessions (SPEC-0010, DEC-008, DEC-009).
// The `UserSession` table holds only what a row shows; the issuer's refresh
// records say which sessions are still alive, so the list keeps only the rows
// whose `sid` the issuer returns and every revocation goes through the issuer
// before the rows are deleted.

export type SessionsDeps = {
  repo: {
    listByUser(userId: string): Promise<SessionRecord[]>;
    deleteBySid(userId: string, sid: string): Promise<void>;
    deleteExcept(userId: string, sid: string): Promise<void>;
  };
  issuer: IssuerClient;
  audit: Audit;
};

export type SessionView = Omit<SessionRecord, "userId"> & { current: boolean };

export async function listSessions(
  deps: SessionsDeps,
  input: { userId: string; email: string; currentSid: string },
): Promise<SessionView[]> {
  // One prefix scan in the issuer and one table read, side by side.
  const [{ sids }, rows] = await Promise.all([
    deps.issuer.identityState({ userId: input.userId, email: input.email }),
    deps.repo.listByUser(input.userId),
  ]);
  const live = new Set(sids);
  return rows
    .filter((row) => live.has(row.id))
    .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
    .map((row) => ({
      id: row.id,
      browser: row.browser,
      os: row.os,
      country: row.country,
      region: row.region,
      city: row.city,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      current: row.id === input.currentSid,
    }));
}

/** Ends one session other than the caller's; the caller uses "Sair" for its own. */
export async function revokeSession(
  deps: SessionsDeps,
  input: { userId: string; sid: string; currentSid: string },
): Promise<{ revoked: number } | { error: "cannot_revoke_current_session" }> {
  if (input.sid === input.currentSid) return { error: "cannot_revoke_current_session" };
  const { revoked } = await deps.issuer.revokeSessions({ userId: input.userId, onlySid: input.sid });
  await deps.repo.deleteBySid(input.userId, input.sid);
  await deps.audit.record({
    action: "user.session.revoke",
    actorUserId: input.userId,
    targetId: input.sid,
    metadata: { revoked },
  });
  return { revoked };
}

/** Ends every session of the person but the caller's. */
export async function signOutOthers(
  deps: SessionsDeps,
  input: { userId: string; currentSid: string },
): Promise<{ revoked: number }> {
  const { revoked } = await deps.issuer.revokeSessions({ userId: input.userId, exceptSid: input.currentSid });
  await deps.repo.deleteExcept(input.userId, input.currentSid);
  await deps.audit.record({
    action: "user.session.sign_out_others",
    actorUserId: input.userId,
    targetId: input.currentSid,
    metadata: { revoked },
  });
  return { revoked };
}

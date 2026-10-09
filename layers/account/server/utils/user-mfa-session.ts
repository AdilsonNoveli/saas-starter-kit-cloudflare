import type { H3Event, SessionConfig } from "h3";
import { unsealSession, updateSession } from "h3";

/**
 * Proof that a regular user's browser passed a TOTP challenge for *this*
 * login. Unlike the platform-admin elevated session
 * (platform-mfa-session.ts), this is deliberately long-lived rather than
 * re-challenged on a timer: end-user 2FA here means "verify once per login,
 * like GitHub or Google", not "re-prove it every 30 minutes while working" —
 * the latter would be an admin-console-grade gate applied to everyday use of
 * the whole app.
 *
 * The value is a sealed (signed + encrypted) h3 session, same mechanism as
 * the platform-admin one — iron-webcrypto under the hood, nothing hand-rolled.
 *
 * `nuxfire-` prefix like every other auth cookie in server/utils/auth.ts, but
 * distinct from both `-access-token`/`-refresh-token` and
 * `-platform-mfa-verified` so none of the three can ever collide.
 */
export const USER_MFA_COOKIE_NAME = "nuxfire-mfa-verified";

// Matches setTokens()'s access/refresh cookie lifetime (server/utils/auth.ts)
// — this cookie is meant to outlive the login it was issued for, not expire
// on its own schedule. Logging out (deleteAccount, session.delete.ts) clears
// it explicitly; it is never relied on to lapse mid-session.
const USER_MFA_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface UserMfaSessionData extends Record<string, unknown> {
  userId: string;
  verifiedAt: number;
}

function sessionConfig(event: H3Event): SessionConfig {
  const { userMfaSessionSecret } = useRuntimeConfig(event);
  // iron requires at least 32 characters of key material; a short or missing
  // secret must fail loudly rather than degrade into a weakly sealed cookie.
  if (!userMfaSessionSecret || userMfaSessionSecret.length < 32) {
    throw new Error(
      "user MFA session secret is missing or shorter than 32 characters (NUXT_USER_MFA_SESSION_SECRET)",
    );
  }
  return {
    name: USER_MFA_COOKIE_NAME,
    password: userMfaSessionSecret,
    maxAge: USER_MFA_MAX_AGE_SECONDS,
    // Cookie only, for the same reason as platform-mfa-session.ts: h3 also
    // accepts a sealed session via an `x-...-session` request header, which
    // would let a value leaked out of one context be replayed from anywhere.
    sessionHeader: false,
    cookie: {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    },
  };
}

/**
 * Read-only check. Returns null for "absent, expired or tampered with" —
 * every one of those is the same answer to the caller (not verified).
 *
 * Deliberately not `useSession`/`getSession`: those mint and set a brand-new
 * session cookie when none is present, which is the wrong side effect for a
 * request that is about to be rejected.
 */
export async function getUserMfaSession(
  event: H3Event,
): Promise<UserMfaSessionData | null> {
  const sealed = getCookie(event, USER_MFA_COOKIE_NAME);
  if (!sealed) return null;
  try {
    const unsealed = await unsealSession(event, sessionConfig(event), sealed);
    const data = unsealed.data as Partial<UserMfaSessionData> | undefined;
    if (!data?.userId) return null;
    return {
      userId: data.userId,
      verifiedAt: Number(data.verifiedAt ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Issue a fresh verified session after a successful TOTP check (enrollment
 * or a later challenge). Primed in the event context before sealing rather
 * than going through `useSession().update()`, for the same reason
 * platform-mfa-session.ts does: that path would inherit any stale cookie's
 * original `createdAt` instead of starting a fresh one.
 */
export async function startUserMfaSession(event: H3Event, userId: string) {
  const config = sessionConfig(event);
  const now = Date.now();
  event.context.sessions ??= {};
  event.context.sessions[USER_MFA_COOKIE_NAME] = {
    id: crypto.randomUUID(),
    createdAt: now,
    data: { userId, verifiedAt: now } satisfies UserMfaSessionData,
  };
  await updateSession(event, config);
}

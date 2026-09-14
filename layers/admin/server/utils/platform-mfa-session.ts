import type { H3Event, SessionConfig } from "h3";
import { unsealSession, updateSession } from "h3";

/**
 * The "elevated session" that sits on top of a normal login for platform
 * admins: proof that this browser passed a TOTP challenge recently, not just
 * that it holds a valid access token. It is deliberately short-lived, so an
 * admin session left open all day stops being enough on its own.
 *
 * The value is a sealed (signed + encrypted) h3 session — iron-webcrypto
 * under the hood, which ships with h3 and runs on workerd. Nothing here
 * hand-rolls an HMAC or a token format.
 *
 * The name carries the same `nuxfire-` prefix as the auth cookies in
 * server/utils/auth.ts, but is deliberately distinct from
 * `-access-token`/`-refresh-token` so it can never collide with
 * setTokens()/getTokens().
 */
export const PLATFORM_MFA_COOKIE_NAME =
  "nuxfire-platform-mfa-verified";

const PLATFORM_MFA_MAX_AGE_SECONDS = 30 * 60;

export interface PlatformMfaSessionData extends Record<string, unknown> {
  platformAdminId: string;
  verifiedAt: number;
}

function sessionConfig(event: H3Event): SessionConfig {
  const { platformMfaSessionSecret } = useRuntimeConfig(event);
  // iron requires at least 32 characters of key material; a short or missing
  // secret must fail loudly rather than degrade into a weakly sealed cookie.
  if (!platformMfaSessionSecret || platformMfaSessionSecret.length < 32) {
    throw new Error(
      "platform MFA session secret is missing or shorter than 32 characters (NUXT_PLATFORM_MFA_SESSION_SECRET)",
    );
  }
  return {
    name: PLATFORM_MFA_COOKIE_NAME,
    password: platformMfaSessionSecret,
    maxAge: PLATFORM_MFA_MAX_AGE_SECONDS,
    // Cookie only. h3 otherwise also accepts the sealed session from an
    // `x-...-session` request header, which would let a sealed value leaked
    // out of one context be replayed from anywhere.
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
 * every one of those is the same answer to the caller (not elevated), and
 * `unsealSession` enforces the TTL itself via the sealed `createdAt`.
 *
 * Deliberately not `useSession`/`getSession`: those mint and set a brand-new
 * session cookie when none is present, which is the wrong side effect for a
 * request that is about to be rejected with FORBIDDEN.
 */
export async function getPlatformMfaSession(
  event: H3Event,
): Promise<PlatformMfaSessionData | null> {
  const sealed = getCookie(event, PLATFORM_MFA_COOKIE_NAME);
  if (!sealed) return null;
  try {
    const unsealed = await unsealSession(event, sessionConfig(event), sealed);
    const data = unsealed.data as Partial<PlatformMfaSessionData> | undefined;
    if (!data?.platformAdminId) return null;
    return {
      platformAdminId: data.platformAdminId,
      verifiedAt: Number(data.verifiedAt ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Issue a fresh elevated session after a successful TOTP verification.
 *
 * The session object is primed in the event context before sealing rather
 * than going through `useSession().update()`: that path would unseal any
 * cookie still on the request and keep its original `createdAt`, which is
 * what the TTL is measured from — so a re-verification would inherit the old
 * expiry instead of getting a full 30 minutes.
 */
export async function startPlatformMfaSession(
  event: H3Event,
  platformAdminId: string,
) {
  const config = sessionConfig(event);
  const now = Date.now();
  event.context.sessions ??= {};
  event.context.sessions[PLATFORM_MFA_COOKIE_NAME] = {
    id: crypto.randomUUID(),
    createdAt: now,
    data: { platformAdminId, verifiedAt: now } satisfies PlatformMfaSessionData,
  };
  await updateSession(event, config);
}

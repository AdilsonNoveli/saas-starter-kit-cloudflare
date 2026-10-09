import { subjects } from "@nuxfire/functions/subjects";
import { type Client, createClient } from "@openauthjs/openauth/client";
import type { H3Event } from "h3";
import { eq } from "drizzle-orm";
import { userPreferences, users } from "@nuxfire/functions/schema";

type AuthBinding = { fetch: typeof fetch };
let _client: Client;
let _authBinding: AuthBinding | undefined;

export const getClient = (event: H3Event) => {
  // Re-read the binding on every call, not just when the client is first
  // built: bindings hang off the H3 event, and the first call inside an
  // isolate can arrive through an internal dispatch that doesn't carry
  // them. Caching a client that captured "no binding" would pin that
  // whole isolate to the slow public-URL path for good.
  const binding = (
    event.context as { cloudflare?: { env?: { Auth?: AuthBinding } } }
  )?.cloudflare?.env?.Auth;
  if (binding) _authBinding = binding;
  if (_client) return _client;
  // A plain fetch() from this Worker to Auth's own public Custom Domain URL
  // is unreliable (observed directly: 400-700ms from outside this account's
  // Workers, 6s+ timeouts/hangs from inside another Worker on the same
  // account) — Cloudflare's own best practices call this out explicitly:
  // Worker-to-Worker calls should go through a service binding, not a
  // public URL (see infra/app.ts's `link: [auth]`). The binding still
  // routes by URL internally, so `issuer` stays the real hostname — only
  // the transport changes.
  return (_client = createClient({
    issuer: useRuntimeConfig(event).public.authUrl,
    clientID: useRuntimeConfig(event).public.authClientID,
    // Resolved at call time, not capture time, for the reason above.
    fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
      _authBinding
        ? _authBinding.fetch(input, init)
        : fetch(input, init)) as typeof fetch,
  }));
};

// Sliding: every renewal re-issues both cookies (getUserSession), so this is
// an idle timeout, not an absolute session length. It is deliberately longer
// than the 15-minute access token (ACCESS_TOKEN_TTL_SECONDS in config.ts): the
// expired JWT has to stay in the cookie next to the refresh token that renews it.
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const setTokens = (event: H3Event, access: string, refresh: string) => {
  setCookie(event, "nuxfire-access-token", access, {
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    // access token is also used by websockets
    // in the browser so can't be httpOnly
    httpOnly: false,
  });
  setCookie(event, "nuxfire-refresh-token", refresh, {
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
  });
};

export const getTokens = (event: H3Event) => {
  const access = getCookie(event, "nuxfire-access-token") || "";
  const refresh = getCookie(event, "nuxfire-refresh-token") || "";
  return { access, refresh };
};

export async function getUser(event: H3Event) {
  if (event.context.user) return event.context.user;
  const session = await getUserSession(event);
  event.context.user = {};
  if (session) {
    // By subject id, matching the upsert in api/auth/callback.ts and the
    // permissions lookup below. Reading the profile by email while the
    // permissions were read by id was how the two could disagree.
    const [[user], { permissions, teams }, isPlatformAdmin, [preferences]] = await Promise.all(
      [
        // Explicit column list, `mfaSecret` deliberately excluded: this
        // query's result ends up spread into /api/auth/session's response
        // verbatim, and that encrypted TOTP seed must never reach the
        // browser. mfaEnabledAt is safe (not a secret) and reduced to a
        // boolean below, the same treatment isActivePlatformAdmin() gives
        // platform-admin status.
        useDB()
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            mfaEnabledAt: users.mfaEnabledAt,
          })
          .from(users)
          .where(eq(users.id, session.id)),
        getUserPermissions(session.id),
        // Deliberately a boolean and nothing else — see
        // isActivePlatformAdmin(). Whether the elevated MFA challenge has been
        // passed is *not* part of this payload: that lives in the short-lived
        // platform_mfa_verified cookie, and copying it here would turn a
        // 30-minute window into a whole login session.
        isActivePlatformAdmin(session.id),
        // SPEC-0010 (DEC-003): read here, inside the same round trip, so the
        // session carries the row; its absence is what sends the person to
        // /onboarding. None of these columns is secret.
        useDB()
          .select({
            userId: userPreferences.userId,
            locale: userPreferences.locale,
            timeZone: userPreferences.timeZone,
            theme: userPreferences.theme,
            dateFormat: userPreferences.dateFormat,
            nameOrder: userPreferences.nameOrder,
            onboardedAt: userPreferences.onboardedAt,
          })
          .from(userPreferences)
          .where(eq(userPreferences.userId, session.id)),
      ],
    );
    // Without the fallback, a session whose users row is missing produced an
    // object with no `id`, which /api/auth/session reports as 401 — and the
    // global middleware turns that into an endless redirect to /authorize
    // with no way out. The token is valid, so trust its identity.
    const { mfaEnabledAt, ...profile } = user ?? {
      id: session.id,
      email: session.email,
      name: session.name || null,
      image: session.image || null,
      mfaEnabledAt: null,
    };
    event.context.user = {
      ...profile,
      // Names this login, so account.signOutOtherSessions can spare it.
      sid: session.sid,
      // How this login was made (password, code, google, github): the e-mail
      // change is only offered to the first two, whose address the person owns.
      provider: session.provider,
      permissions,
      teams,
      isPlatformAdmin,
      // Whether *this specific login* has already passed a TOTP challenge is
      // not part of this payload, same reasoning as isPlatformAdmin above —
      // that lives in the nuxfire-mfa-verified cookie
      // (user-mfa-session.ts) and is read by protectedProcedure and
      // /api/mfa/status, not cached here.
      mfaEnabled: Boolean(mfaEnabledAt),
      preferences: preferences ?? null,
    };
  }
  return event.context.user;
}

export async function getUserSession(
  event: H3Event,
  accessToken = "",
  refreshToken = "",
) {
  const cookies = getTokens(event);
  // Explicitly passed tokens win over the cookie. The auth callback calls
  // this right after exchanging a code for a brand-new pair, while the
  // browser is still sending the cookie from a previous session — with the
  // cookie taking precedence, that stale token is what got verified, and if
  // it was expired or signed by a since-rotated key the verification failed,
  // the user row was never written, and the app bounced straight back to
  // /authorize despite the login having succeeded.
  const access = accessToken || cookies.access;
  const refresh = refreshToken || cookies.refresh;
  // No token at all — the overwhelmingly common case, since every
  // logged-out visitor hits this on their very first page. client.verify()
  // fetches the issuer's JWKS *before* it ever looks at the token, so
  // without this guard a visitor with nothing to verify still pays a full
  // round trip to the Auth worker (plus its KV reads) just to be told what
  // we already know here. That was the bulk of the wait before the login
  // page appeared.
  if (!access) return;
  const client = getClient(event);
  const verified = await client.verify(subjects, access, { refresh });
  if (!verified.err) {
    if (verified.tokens) {
      setTokens(event, verified.tokens.access, verified.tokens.refresh);
      // SPEC-0010 (DEC-008): the session row slides once per renewal (about
      // every 15 minutes), never on a request whose access is still valid.
      // Metadata only, so a failure is logged and the request goes on.
      try {
        await touchSession(verified.subject.properties.sid);
      } catch (error) {
        const err = error as { message?: string; name?: string; stack?: string };
        console.error("session touch failed", {
          message: err?.message,
          name: err?.name,
          stack: err?.stack,
        });
      }
    }
    return verified.subject.properties;
  }
  console.error("session verify failed", {
    name: (verified.err as { name?: string })?.name,
    hadAccessToken: !!access,
    hadRefreshToken: !!refresh,
    fromCookie: !accessToken,
  });
  // A refused token stays refused: left in place, the browser would present
  // it on every request and pay a round trip to the issuer each time. Same
  // path as setTokens, or the browser keeps them.
  deleteCookie(event, "nuxfire-access-token", { path: "/" });
  deleteCookie(event, "nuxfire-refresh-token", { path: "/" });
}

export async function getUserPermissions(userId: string) {
  const db = useDB();
  const permissions: Record<string, string[]> = {};
  const teams: string[] = [];
  try {
    const memberships = await db.query.teamMemberships.findMany({
      where: (teamMemberships, { eq }) => eq(teamMemberships.userId, userId),
      with: {
        role: {
          with: {
            permissions: {
              columns: {
                action: true,
              },
            },
          },
        },
      },
    });
    for (const membership of memberships) {
      const teamId = membership.teamId;
      const teamPermissions = membership.role.permissions.map((p) => p.action);
      permissions[teamId] = teamPermissions;
      teams.push(teamId);
    }
  } catch (error) {
    // Guardrail, NOT a fix. What actually made this query fail was the
    // Postgres client being shared across requests — see the comment in
    // server/utils/db.ts; it failed on roughly every second request until
    // that was corrected. This block only exists so that a future database
    // problem degrades to "no permissions" instead of escaping
    // /api/auth/session as an unhandled 500, which the global auth
    // middleware reads as "logged out" and turns into an endless redirect
    // to /authorize. If this ever logs, treat it as a real bug to chase,
    // not as expected behaviour. Drizzle wraps the driver error, so the
    // part worth reading is on `cause`.
    const err = error as {
      message?: string;
      cause?: {
        message?: string;
        code?: string;
        detail?: string;
        name?: string;
      };
    };
    console.error("getUserPermissions failed", {
      userId,
      message: err?.message,
      causeName: err?.cause?.name,
      causeCode: err?.cause?.code,
      causeMessage: err?.cause?.message,
      causeDetail: err?.cause?.detail,
    });
  }
  return { permissions, teams };
}

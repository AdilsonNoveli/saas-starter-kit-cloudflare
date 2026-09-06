import { subjects } from "@movimenta-bairro/functions/subjects";
import { type Client, createClient } from "@openauthjs/openauth/client";
import type { H3Event } from "h3";
import { eq } from "drizzle-orm";
import { users } from "@movimenta-bairro/functions/schema";

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

export const setTokens = (event: H3Event, access: string, refresh: string) => {
  setCookie(event, "movimenta-bairro-access-token", access, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    // access token is also used by websockets
    // in the browser so can't be httpOnly
    httpOnly: false,
  });
  setCookie(event, "movimenta-bairro-refresh-token", refresh, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
  });
};

export const getTokens = (event: H3Event) => {
  const access = getCookie(event, "movimenta-bairro-access-token") || "";
  const refresh = getCookie(event, "movimenta-bairro-refresh-token") || "";
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
    const [[user], { permissions, teams }, isPlatformAdmin] = await Promise.all(
      [
        useDB().select().from(users).where(eq(users.id, session.id)),
        getUserPermissions(session.id),
        // Deliberately a boolean and nothing else — see
        // isActivePlatformAdmin(). Whether the elevated MFA challenge has been
        // passed is *not* part of this payload: that lives in the short-lived
        // platform_mfa_verified cookie, and copying it here would turn a
        // 30-minute window into a whole login session.
        isActivePlatformAdmin(session.id),
      ],
    );
    // Without the fallback, a session whose users row is missing produced an
    // object with no `id`, which /api/auth/session reports as 401 — and the
    // global middleware turns that into an endless redirect to /authorize
    // with no way out. The token is valid, so trust its identity.
    event.context.user = {
      ...(user ?? {
        id: session.id,
        email: session.email,
        name: session.name || null,
        image: session.image || null,
      }),
      permissions,
      teams,
      isPlatformAdmin,
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
    }
    return verified.subject.properties;
  }
  console.error("session verify failed", {
    name: (verified.err as { name?: string })?.name,
    hadAccessToken: !!access,
    hadRefreshToken: !!refresh,
    fromCookie: !accessToken,
  });
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

import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { Storage } from "@openauthjs/openauth/storage/storage";
import {
  PasswordProvider,
  ScryptHasher,
} from "@openauthjs/openauth/provider/password";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { GoogleProvider } from "@openauthjs/openauth/provider/google";
import type { Oauth2Token } from "@openauthjs/openauth/provider/oauth2";
import { ofetch } from "ofetch";
import { createId } from "@paralleldrive/cuid2";
import { subjects } from "./subjects";
import { clientIp, rateLimit } from "./rate-limit";
import type { ExecutionContext, KVNamespace } from "@cloudflare/workers-types";
import type { FullUser } from "./subjects";
import { sender } from "./sender";
import { EmailsWorker } from "./emails";
import {
  authEmail,
  identityDeletePath,
  seedAccountPath,
  signOutOthersPath,
} from "../../../config";

let environment: Env;

async function sendVerificationCode(email: string, code: string) {
  const sendEmail = sender(environment.Emails);
  await sendEmail(authEmail, email, "VerificationCode", {
    code,
  });
}

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  Emails: EmailsWorker;
  AuthKV: KVNamespace;
  DEV_URL?: string;
  /**
   * Shared with the app Worker (infra/auth.ts) to authorise
   * identityDeletePath, signOutOthersPath and seedAccountPath.
   */
  ADMIN_SECRET?: string;
}

/**
 * The real shape `issuer()`'s `success` callback hands back for each of our
 * four providers, per their own `Provider<Properties>` declarations
 * (password.d.ts, code.d.ts, github.d.ts, google.d.ts). `issuer()`'s own
 * inferred `Result` type is wider than this — the github/google entries are
 * only conditionally spread into `providers` (`githubEnabled ? {...} : {}`),
 * and a conditional type distributing over an optional record property
 * produces `T | {}` rather than just `T`, so TypeScript's inferred type
 * loses `tokenset`/`claims`/`email` on every branch and adds a spurious
 * `undefined` to the union. This is what the callback actually receives at
 * runtime — asserted once here instead of narrowing (or silencing) every
 * property access below.
 */
type AuthSuccessValue =
  | { provider: "password"; email: string }
  | { provider: "code"; claims: Record<string, string> }
  | { provider: "github"; tokenset: Oauth2Token; clientID: string }
  | { provider: "google"; tokenset: Oauth2Token; clientID: string };

/** Constant-time comparison, so a wrong secret leaks nothing through timing. */
function secretsMatch(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Erases an identity: its credentials and every session issued to it.
 *
 * This has to happen inside this Worker, because AuthKV is bound here and
 * nowhere else — which is the point. The app owns profiles, the issuer owns
 * credentials and sessions, so the app asks for the erasure through its
 * service binding rather than reaching into this store
 * (apps/app/server/trpc/routers/account.ts).
 *
 * This Worker answers on a public custom domain, so arriving over the
 * binding proves nothing on its own: the shared secret is what authorises
 * the call. The path itself lives in the shared root config.ts.
 */
async function deleteIdentity(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  // No secret configured means the deploy is misconfigured. Refuse rather
  // than fall back to an unauthenticated erasure endpoint.
  if (!env.ADMIN_SECRET) {
    console.error("identity delete: ADMIN_SECRET is not configured");
    return new Response("Not configured", { status: 503 });
  }
  const presented = request.headers.get("x-admin-secret") || "";
  if (!secretsMatch(presented, env.ADMIN_SECRET)) {
    console.error("identity delete: rejected, secret mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
  } | null;
  const email = body?.email?.toLowerCase();
  if (!email) {
    return new Response("Missing email", { status: 400 });
  }

  const storage = CloudflareStorage({ namespace: env.AuthKV });

  // Sessions first. A refresh token keeps minting access tokens on its own,
  // so removing the password while leaving them in place would revoke
  // nothing. The subject each token is filed under is a hash of the
  // properties at issue time (see resolveSubject in the issuer) and cannot
  // be recomputed reliably here, so match on the email each record carries.
  let revokedSessions = 0;
  for await (const [key, value] of Storage.scan(storage, ["oauth:refresh"])) {
    const properties = (value as { properties?: { email?: string } })
      ?.properties;
    if (properties?.email?.toLowerCase() === email) {
      await Storage.remove(storage, key);
      revokedSessions++;
    }
  }

  await Storage.remove(storage, ["email", email, "password"]);
  await Storage.remove(storage, ["email", email, "subject"]);
  await Storage.remove(storage, ["users", email]);

  console.log("identity deleted", { email, revokedSessions });
  return Response.json({ ok: true, revokedSessions });
}

/**
 * Revokes every refresh token issued to an identity except the one the
 * caller is currently using — "sign out of all other sessions".
 *
 * OpenAuth's own `invalidate(subject)` (issuer.js) only ever revokes
 * everything for a resolved subject hash, and that hash is recomputed from
 * the *current* subject properties (id/name/email/image) — if the profile
 * changed since a token was issued (e.g. updateProfile changing `name`),
 * the hash no longer matches the token's own subject and nothing gets
 * revoked. Matching on `properties.email` — the same tolerant approach
 * deleteIdentity already uses above — is the reliable option.
 *
 * The refresh token a client holds is literally `"{subject}:{token}"`, and
 * the KV key it lives under is `["oauth:refresh", subject, token]` (see
 * grant handling in @openauthjs/openauth's issuer.js). That format is what
 * lets this function recognise — and skip — the caller's own session while
 * revoking every other one filed under the same email.
 */
async function signOutOtherSessions(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!env.ADMIN_SECRET) {
    console.error("sign-out-others: ADMIN_SECRET is not configured");
    return new Response("Not configured", { status: 503 });
  }
  const presented = request.headers.get("x-admin-secret") || "";
  if (!secretsMatch(presented, env.ADMIN_SECRET)) {
    console.error("sign-out-others: rejected, secret mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    currentRefreshToken?: string;
  } | null;
  const email = body?.email?.toLowerCase();
  const currentRefreshToken = body?.currentRefreshToken || "";
  if (!email) {
    return new Response("Missing email", { status: 400 });
  }

  // Same split the issuer itself uses when redeeming a refresh_token grant:
  // everything before the last ":" is the subject, the tail is the token.
  const splits = currentRefreshToken.split(":");
  const currentToken = splits.pop();
  const currentSubject = splits.join(":");
  const currentKey = JSON.stringify([
    "oauth:refresh",
    currentSubject,
    currentToken,
  ]);

  const storage = CloudflareStorage({ namespace: env.AuthKV });

  let revoked = 0;
  for await (const [key, value] of Storage.scan(storage, ["oauth:refresh"])) {
    if (JSON.stringify(key) === currentKey) continue;
    const properties = (value as { properties?: { email?: string } })
      ?.properties;
    if (properties?.email?.toLowerCase() === email) {
      await Storage.remove(storage, key);
      revoked++;
    }
  }

  console.log("signed out other sessions", { email, revoked });
  return Response.json({ ok: true, revoked });
}

/**
 * Creates — or resets — an identity with a password chosen by the caller.
 *
 * The mirror image of deleteIdentity, and it exists for the same structural
 * reason: AuthKV is bound to this Worker and nowhere else, so the demo-account
 * seed script (apps/functions/src/database/seed/demo-accounts.ts) — which
 * runs as a plain `bun run` process with only Postgres credentials — cannot
 * write a credential itself. It asks here instead.
 *
 * Writes exactly what PasswordProvider's own register flow writes, so an
 * account seeded here is indistinguishable from one signed up through the UI:
 *  - ["email", email, "password"] → the ScryptHasher digest, the same hasher
 *    PasswordProvider defaults to and therefore the same one /password/authorize
 *    will verify against.
 *  - ["users", email] → the profile record the issuer's `success` callback
 *    builds, whose `id` becomes the OAuth subject id and, after the first
 *    login, the User.id row in Postgres.
 *
 * Idempotent on purpose — running the seed twice must not fail, and must not
 * mint a second id for an address that already has one: a new id would leave
 * the existing Postgres profile (and every TeamMembership pointing at it)
 * orphaned behind an identity that no longer resolves to it.
 *
 * As sensitive as deleteIdentity — it hands out a working password for an
 * arbitrary address — so it carries the exact same shared-secret gate.
 */
async function seedAccount(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!env.ADMIN_SECRET) {
    console.error("identity seed: ADMIN_SECRET is not configured");
    return new Response("Not configured", { status: 503 });
  }
  const presented = request.headers.get("x-admin-secret") || "";
  if (!secretsMatch(presented, env.ADMIN_SECRET)) {
    console.error("identity seed: rejected, secret mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
  } | null;
  const email = body?.email?.toLowerCase();
  const password = body?.password;
  if (!email || !password) {
    return new Response("Missing email or password", { status: 400 });
  }

  const storage = CloudflareStorage({ namespace: env.AuthKV });

  // PasswordProvider's default hasher. Using anything else here would produce
  // a record /password/authorize cannot verify.
  const hasher = ScryptHasher();
  await Storage.set(
    storage,
    ["email", email, "password"],
    await hasher.hash(password),
  );

  const now = new Date().toISOString();
  const existing = (await Storage.get(storage, ["users", email])) as
    FullUser | undefined;
  const user: FullUser = existing
    ? {
        ...existing,
        email,
        name: body?.name || existing.name || "",
        updatedAt: now,
      }
    : {
        id: createId(),
        email,
        name: body?.name || "",
        image: "",
        createdAt: now,
        updatedAt: now,
        accounts: [],
      };
  await Storage.set(storage, ["users", email], user);

  console.log("identity seeded", { email, created: !existing });
  return Response.json({ id: user.id, email: user.email, created: !existing });
}

/**
 * The only issuer routes that accept a credential — a password, or a pin
 * code — and therefore the only ones with a brute-force vector. Keyed by the
 * exact pathname the issuer mounts each provider under (`app.route(`/${name}`,
 * ...)` in @openauthjs/openauth's issuer.js, with the routes themselves
 * declared in provider/password.js and provider/code.js).
 *
 * The OAuth providers (`/github/*`, `/google/*`) are deliberately absent:
 * they carry no secret of ours to guess, and throttling them would only break
 * legitimate redirects back from the identity provider.
 *
 * `page` is where the browser gets sent when the limit trips — the same page
 * each provider callback below already redirects to, so a throttled user lands
 * on the form they came from rather than a raw error body.
 */
const CREDENTIAL_ROUTES = {
  // POST /password/authorize verifies the password (login).
  "/password/authorize": { page: "/login", limit: 5, windowSeconds: 5 * 60 },
  // POST /password/register sends and verifies the sign-up email code.
  "/password/register": { page: "/signup", limit: 5, windowSeconds: 15 * 60 },
  // POST /password/change sends and verifies the reset email code.
  "/password/change": {
    page: "/forgot-password",
    limit: 5,
    windowSeconds: 15 * 60,
  },
  // POST /code/authorize sends and verifies the passwordless email code.
  "/code/authorize": { page: "/login", limit: 5, windowSeconds: 15 * 60 },
} as const;

/**
 * Fixed-window rate limit (IP + email) on credential submission.
 *
 * This runs *before* the issuer, not inside the provider callbacks, because
 * the callbacks can't enforce anything: `login`/`register`/`change`/`request`
 * are the providers' UI renderers, invoked by password.js/code.js only
 * *after* the credential has already been checked, and never at all on a
 * successful check (`ctx.success` returns straight from the route). Counting
 * there would still pay the scrypt verify on every attempt and would still
 * let the guess that finally lands through — so the gate has to sit in front
 * of the route, where refusing costs nothing and applies to every attempt.
 *
 * Returns a redirect when the caller is over the limit, `undefined` when the
 * request should proceed untouched.
 */
async function enforceCredentialRateLimit(
  request: Request,
  env: Env,
): Promise<Response | undefined> {
  if (request.method !== "POST") return;
  const url = new URL(request.url);
  const rule =
    CREDENTIAL_ROUTES[url.pathname as keyof typeof CREDENTIAL_ROUTES];
  if (!rule) return;

  // Clone before reading: the issuer parses this same body afterwards, and a
  // request body can only be consumed once.
  const form = await request
    .clone()
    .formData()
    .catch(() => null);
  // The code-verification steps carry no email (the flow keeps it in the
  // provider's encrypted state), so those attempts share one bucket per IP —
  // which is what limits pin-code guessing.
  const email = form?.get("email")?.toString().toLowerCase() || "-";
  const ip = clientIp(request);

  const { allowed, count } = await rateLimit(
    env.AuthKV,
    `auth:${url.pathname}:${ip}:${email}`,
    rule,
  );
  if (allowed) return;

  console.warn("auth rate limit exceeded", {
    path: url.pathname,
    ip,
    email,
    count,
    limit: rule.limit,
  });

  const devUrl = env.DEV_URL || "";
  const redirect = new URL(devUrl || url.origin);
  redirect.pathname = rule.page;
  if (devUrl) redirect.searchParams.set("origin", url.origin);
  if (email !== "-") redirect.searchParams.set("email", email);
  redirect.searchParams.set("err", "too_many_requests");
  return new Response("", {
    status: 302,
    headers: {
      Location: redirect.toString(),
      "Retry-After": String(rule.windowSeconds),
    },
  });
}

// Deliberately built per request, NOT cached across requests. issuer()
// eagerly kicks off the KV reads for the signing/encryption keys and holds
// them as pending promises. Caching that object across requests is the
// anti-pattern Cloudflare documents at
// developers.cloudflare.com/workers/observability/errors ("Cannot perform
// I/O on behalf of a different request"): the isolate is reused, but the
// I/O those promises depend on is torn down when the request that started
// it ends. A first request that doesn't await them (GET
// /.well-known/oauth-authorization-server returns in 0ms without touching
// the keys) leaves them pending forever, and every later request on that
// isolate that *does* await them — GET /.well-known/jwks.json, every token
// issue — hangs indefinitely. That was the ~10s stall on every session
// check for anyone carrying a cookie.
//
// The cost of rebuilding per request is now small: keys.js resolves the
// current key through a "current" pointer (two KV gets), and
// legacySigningKeys does no I/O at all.
function getIssuer(env: Env) {
  const storage = CloudflareStorage({
    namespace: env.AuthKV,
  });
  const devUrl = env.DEV_URL || "";
  // Only registered when real credentials are actually configured — an
  // empty client secret still constructs a working-looking provider that
  // fails at OAuth-exchange time, not at startup, so a truthy check here
  // is the only thing that keeps a misconfigured provider from ever being
  // offered. The apps/login UI mirrors this same truthiness via
  // NUXT_PUBLIC_GITHUB_AUTH_ENABLED/NUXT_PUBLIC_GOOGLE_AUTH_ENABLED (see
  // infra/auth.ts) so the buttons only render when this branch is taken.
  const githubEnabled = Boolean(
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET,
  );
  const googleEnabled = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  );

  return issuer({
    storage,
    subjects,
    async select(_providers, req) {
      const redirect = new URL(devUrl || new URL(req.url).origin);
      redirect.pathname = "/login";
      if (devUrl) redirect.searchParams.set("origin", new URL(req.url).origin);
      return new Response("", {
        status: 302,
        headers: {
          Location: redirect.toString(),
        },
      });
    },
    providers: {
      password: PasswordProvider({
        async sendCode(email, code) {
          await sendVerificationCode(email, code);
        },
        async login(req, form, err) {
          const redirect = new URL(devUrl || new URL(req.url).origin);
          redirect.pathname = "/login";
          if (devUrl)
            redirect.searchParams.set("origin", new URL(req.url).origin);
          const email = form?.get("email");
          if (email) redirect.searchParams.set("email", email);
          if (err?.type) redirect.searchParams.set("err", err?.type);
          // password.js's own POST /authorize handler always returns a
          // 302 (success redirects to the app callback, failure redirects
          // back here) — wrangler tail can't tell them apart from status
          // code alone, so log the outcome explicitly.
          console.log("password login callback", {
            email,
            errType: err?.type ?? null,
          });
          return new Response("", {
            status: 302,
            headers: {
              Location: redirect.toString(),
            },
          });
        },
        async register(req, state, form, err) {
          const redirect = new URL(devUrl || new URL(req.url).origin);
          redirect.pathname = "/signup";
          if (devUrl)
            redirect.searchParams.set("origin", new URL(req.url).origin);
          const email = form?.get("email");
          if (email) redirect.searchParams.set("email", email);
          if (state?.type) redirect.searchParams.set("state", state?.type);
          if (err?.type) redirect.searchParams.set("err", err?.type);
          // Same reason as the login callback below: this handler answers
          // with a 302 whether the step advanced or failed, so the status
          // code alone tells you nothing in wrangler tail. Record what
          // actually arrived — an err of "invalid_email" with hasEmail
          // false means the field reached the server empty, which is a
          // client-side problem, not a rejected address.
          console.log("password register callback", {
            action: form?.get("action") ?? null,
            hasEmail: !!email,
            stateType: state?.type ?? null,
            errType: err?.type ?? null,
          });
          return new Response("", {
            status: 302,
            headers: {
              Location: redirect.toString(),
            },
          });
        },
        async change(req, state, form, err) {
          const redirect = new URL(devUrl || new URL(req.url).origin);
          redirect.pathname = "/forgot-password";
          if (devUrl)
            redirect.searchParams.set("origin", new URL(req.url).origin);
          const email = form?.get("email");
          if (email) redirect.searchParams.set("email", email);
          if (state?.type) redirect.searchParams.set("state", state?.type);
          if (err?.type) redirect.searchParams.set("err", err?.type);
          return new Response("", {
            status: 302,
            headers: {
              Location: redirect.toString(),
            },
          });
        },
      }),
      code: CodeProvider({
        async request(req, state, form, err) {
          const redirect = new URL(devUrl || new URL(req.url).origin);
          redirect.pathname = "/login";
          if (devUrl)
            redirect.searchParams.set("origin", new URL(req.url).origin);
          const email = form?.get("email") || (state as any)?.claims?.email;
          if (email) redirect.searchParams.set("email", email);
          if (state?.type) redirect.searchParams.set("state", state?.type);
          if (err?.type) redirect.searchParams.set("err", err?.type);
          return new Response("", {
            status: 302,
            headers: {
              Location: redirect.toString(),
            },
          });
        },
        async sendCode(claims, code) {
          await sendVerificationCode(claims.email, code);
        },
      }),
      // `condition && {...}` types the spread as `Provider | false` (the
      // `false` branch leaks into the inferred `Providers` record), which
      // then pollutes `issuer()`'s `Result` union with an extra `undefined`
      // case — every `value.provider === "..."` narrowing below saw `value`
      // as possibly undefined because of this, not because it actually can
      // be. `condition ? {...} : {}` keeps both branches as real objects.
      ...(githubEnabled
        ? {
            github: GithubProvider({
              clientID: environment.GITHUB_CLIENT_ID,
              clientSecret: environment.GITHUB_CLIENT_SECRET,
              scopes: ["read:user", "user:email"],
            }),
          }
        : {}),
      ...(googleEnabled
        ? {
            google: GoogleProvider({
              clientID: environment.GOOGLE_CLIENT_ID,
              clientSecret: environment.GOOGLE_CLIENT_SECRET,
              scopes: ["openid", "email", "profile"],
            }),
          }
        : {}),
    },
    success: async (ctx, rawValue) => {
      const value = rawValue as AuthSuccessValue;
      async function getUserObject(): Promise<{
        email: string;
        name?: string;
        image?: string;
        data?: object;
      }> {
        if (value.provider === "code") {
          return { email: value.claims.email };
        } else if (value.provider === "google") {
          const accessToken = value.tokenset.access;
          const data = await ofetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
          return {
            email: data.email as string,
            name: data.name as string,
            image: data.picture as string,
            data,
          };
        } else if (value.provider === "github") {
          const accessToken = value.tokenset.access;
          const data = await ofetch("https://api.github.com/user", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "nuxfire",
            },
          });
          if (!data.email) {
            const emails = (await ofetch("https://api.github.com/user/emails", {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "nuxfire",
              },
            })) as any[];
            data.email = (emails.find((email) => email.primary) || emails[0])
              ?.email;
          }
          return {
            email: data.email as string,
            name: data.name as string,
            image: data.avatar_url as string,
            data,
          };
        }
        return { email: value.email };
      }

      try {
        const userObject = await getUserObject();
        const now = new Date().toISOString();
        const existing = (await storage.get([
          "users",
          userObject.email,
        ])) as FullUser;
        let user;
        if (existing) {
          user = existing;
          if (!user.email && userObject.email) user.email = userObject.email;
          if (!user.name && userObject.name) user.name = userObject.name;
          if (!user.image && userObject.image) user.image = userObject.image;
          user.updatedAt = now;
          const existingAccount = user.accounts.find(
            (acc) => acc.type === value.provider,
          );
          if (existingAccount) {
            existingAccount.data = userObject.data;
          } else {
            user.accounts.push({
              linkedAt: now,
              type: value.provider,
              data: userObject.data,
            });
          }
        } else {
          user = {
            id: createId(),
            email: userObject.email,
            name: userObject.name || "",
            image: userObject.image || "",
            createdAt: now,
            updatedAt: now,
            accounts: [
              {
                linkedAt: now,
                type: value.provider,
                data: userObject.data,
              },
            ],
          };
          const sendEmail = sender(environment.Emails);
          await sendEmail(authEmail, userObject.email, "Welcome", {
            username: userObject.name || "User",
          });
        }
        await storage.set(["users", user.email], user);
        return ctx.subject("user", {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        });
      } catch (err) {
        // Error instances serialize to `{}` in Workers structured logs
        // (message/stack/name are non-enumerable) — pull them out
        // explicitly so wrangler tail shows the real failure reason
        // instead of an empty object. Same fix already applied to
        // emails.ts, sender.ts, and app/server/api/auth/callback.ts.
        const e = err as { message?: string; name?: string; stack?: string };
        console.error("err in success", {
          message: e?.message,
          name: e?.name,
          stack: e?.stack,
        });
        throw new Error("Something went wrong");
      }
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    environment = env;
    const pathname = new URL(request.url).pathname;
    if (pathname === identityDeletePath) {
      return deleteIdentity(request, env);
    }
    if (pathname === signOutOthersPath) {
      return signOutOtherSessions(request, env);
    }
    if (pathname === seedAccountPath) {
      return seedAccount(request, env);
    }
    const throttled = await enforceCredentialRateLimit(request, env);
    if (throttled) return throttled;
    return getIssuer(env).fetch(request, env, ctx);
  },
};

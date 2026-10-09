import * as path from "node:path";
import { flags } from "#nuxfire/config";
import { secret } from "./secret";
import { emails } from "./emails";
import { authDomain, authUrl } from "./dns";
import { COMPATIBILITY } from "./utils/constants";
import { build } from "./utils/builder";
import { branding } from "./branding";

export const clientID = new random.RandomUuid("AppAuthClientID");
const kv = new sst.cloudflare.Kv("AuthKV");

// Authorises the app Worker's account-deletion call into this Worker's
// IDENTITY_DELETE_PATH (apps/functions/src/auth.ts). AuthKV is bound
// only here, so erasing credentials and sessions has to be asked for rather
// than done directly — and since this Worker answers on a public domain,
// arriving over the service binding proves nothing on its own. Generated
// per stage and never checked in.
export const adminSecret = new random.RandomUuid("AuthAdminSecret");

// Whether real credentials exist, not just "the flag is on" — flags.ts only
// says the developer wants a provider available once it's set up, it
// doesn't mean a value has actually been loaded via `sst secret load` yet.
// apps/functions/src/auth.ts checks the exact same truthiness at
// request time to decide whether to register the provider at all — this
// is that same decision, made at build time, so the static login UI can
// hide a button that would otherwise error the moment it's clicked.
// command.local.Command's `environment` is string-valued only (real
// process env vars) — stringify the boolean explicitly rather than let
// Pulumi coerce it implicitly.
const githubAuthEnabled = flags.githubAuth
  ? $resolve([
      secret.GithubClientID!.value,
      secret.GithubClientSecret!.value,
    ]).apply(([id, secretValue]) => String(!!id && !!secretValue))
  : "false";
const googleAuthEnabled = flags.googleAuth
  ? $resolve([
      secret.GoogleClientID!.value,
      secret.GoogleClientSecret!.value,
    ]).apply(([id, secretValue]) => String(!!id && !!secretValue))
  : "false";

// apps/login is a static build (`nuxt generate`) served as this Worker's
// static assets — the OpenAuth issuer itself (apps/functions/src/auth.ts)
// handles every dynamic route, falling through to the static files for the
// login/signup/forgot-password pages.
const built = await build("AuthFrontend", {
  dir: "apps/login",
  environment: {
    // BRAND_NAME from scripts/branding.ts, baked into the static login pages at build time.
    NUXT_PUBLIC_BRAND_NAME: branding.name,
    NUXT_PUBLIC_GITHUB_AUTH_ENABLED: githubAuthEnabled,
    NUXT_PUBLIC_GOOGLE_AUTH_ENABLED: googleAuthEnabled,
  },
});

export const auth = new sst.cloudflare.Worker(
  "Auth",
  {
    // relative — see infra/emails.ts for why
    handler: "apps/functions/src/auth.ts",
    domain: authDomain,
    compatibility: COMPATIBILITY,
    assets: {
      directory: path.resolve("apps/login", ".output/public"),
    },
    link: [
      kv,
      emails,
      secret.GithubClientID,
      secret.GithubClientSecret,
      secret.GoogleClientID,
      secret.GoogleClientSecret,
    ].filter(Boolean),
    environment: {
      ADMIN_SECRET: adminSecret.result,
      ...($dev ? { DEV_URL: "http://localhost:3001" } : {}),
    },
  },
  { dependsOn: [built] },
);

export const outputs = {
  Auth: authUrl.properties.value,
};

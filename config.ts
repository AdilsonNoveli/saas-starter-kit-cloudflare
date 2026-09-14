// this is the domain where the 'production' environment is deployed
export const prodDomain = "nuxfire.com";

// all other stages are deployed to the devDomain
// for example, in this config, the stage 'tanay' would be deployed to:
// tanay.dev.nuxfire.com
export const devDomain = "dev.nuxfire.com";

// this email is used by the auth service for
// sending codes, welcome email, and invitations
export const authEmail = {
  name: "NuxFire",
  address: "contato@nuxfire.com",
};
export const authEmailDomain = "nuxfire.com";

// Path on the auth Worker that erases an identity — credentials and every
// session. It lives here because both sides have to agree on it: the auth
// Worker serves it (apps/functions/src/auth.ts) and the app Worker calls
// it over its service binding (apps/app/server/trpc/routers/account.ts).
export const identityDeletePath = "/internal/identity/delete";

// Path on the auth Worker that revokes every refresh token for an identity
// except the one presented by the caller — "sign out of all other sessions".
// Same reasoning as identityDeletePath: both sides must agree on the route.
export const signOutOthersPath = "/internal/identity/sign-out-others";

// Path on the auth Worker that creates (or resets) an identity with a known
// password. Same reasoning as the two paths above: AuthKV is bound only to the
// auth Worker, so anything outside it — here, the manual demo-account seed
// script (apps/functions/src/database/seed-demo-accounts.ts) — has to ask
// for the credential to be written rather than write it itself.
export const seedAccountPath = "/internal/identity/seed";

// Nuxt Layers the Composition Root (apps/app/nuxt.config.ts) extends.
// Deliberately separate from `flags` below: `flags` provisions Cloudflare
// resources in infra/*.ts, this decides which domain layers are compiled into
// the app at all. See _docs/REFATORE_ARCHITETURE.md, "Composição".
export const layers = {
  // Core layers — always extended, never toggleable: every tenant of this
  // SaaS needs them. Listed here (rather than hardcoded in nuxt.config.ts) so
  // they feed the exact same `activeLayerNames` set that drives `extends`, the
  // generated tRPC composition and the generated sidebar navigation. A core
  // layer needs no hand-written import anywhere; adding its name here is all.
  // With `admin` (Fase 3 passo 4, the last extraction) this list is complete:
  // apps/app holds no domain logic any more, only the Composition Root.
  core: ["teams", "billing", "notifications", "admin"] as string[],

  // Feature layers — toggleable per build/deploy. `false` drops the layer's
  // pages, components and Nuxt config from the bundle entirely; it does NOT
  // drop its tables from the database schema (see section 4 of the plan —
  // orphan data is intentional, "disabled" means "out of the UI", not "erased").
  features: {
    kanban: true,
  } satisfies Record<string, boolean>,
};

// enable/disable features/3rd-party integrations
export const flags: {
  stripe?: boolean;
  paddle?: boolean;
  googleAuth?: boolean;
  githubAuth?: boolean;
  resend?: boolean;
  mailgun?: boolean;
  ses?: boolean;
  sparkPost?: boolean;
  smtp?: boolean;
  websockets?: boolean;
  cron?: boolean;
  jobsQueue?: boolean;
} = {
  // payments with stripe
  stripe: true,
  // payments with paddle
  paddle: true,

  // oauth
  githubAuth: true,
  googleAuth: true,

  // email providers
  resend: true,
  smtp: false,
  ses: false,
  sparkPost: false,
  mailgun: false,

  // websockets with Cloudflare Durable Objects (requires Workers Paid)
  websockets: true,

  // async job processing with Cloudflare Queues (requires Workers Paid)
  jobsQueue: true,
};

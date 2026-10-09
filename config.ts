// The identity of the installation — product name, production domain and the
// full sender e-mail — is NOT here. It lives in the BRAND_* variables of the
// stage's env file (.env.stage / .env.production, "Branding" section of
// .env.example) and is loaded and validated by scripts/branding.ts, the single
// place that reads it. This file keeps only code-level configuration.

// Path on the auth Worker that erases an identity — credentials and every
// session. It lives here because both sides have to agree on it: the auth
// Worker serves it (apps/functions/src/auth.ts) and the app Worker calls
// it over its service binding (layers/account/server/trpc/account.ts).
export const identityDeletePath = "/internal/identity/delete";

// Path on the auth Worker that revokes the refresh tokens of an identity, in
// one of two modes: `onlySid` ends that one session, `exceptSid` ends every
// session but the caller's ("sign out of all other sessions"). Same reasoning
// as identityDeletePath: both sides must agree on the route.
export const sessionsRevokePath = "/internal/identity/sessions/revoke";

// Path on the auth Worker that tells what an identity has: the providers
// linked to its profile, whether a password credential exists and the sids
// with a live refresh record. Same reasoning as identityDeletePath.
export const identityStatePath = "/internal/identity/state";

// Path on the auth Worker that moves an identity to a new e-mail (profile,
// password credential and subject key, same id), keeps the caller's session
// carrying the new address and ends the others. Same reasoning as
// identityDeletePath.
export const emailChangePath = "/internal/identity/email";

// Lifetime of the access token the auth Worker issues. A revoked session keeps
// working at most this long, because the next renewal finds no refresh record.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

// Path on the auth Worker that creates (or resets) an identity with a known
// password. Same reasoning as the paths above: AuthKV is bound only to the
// auth Worker, so anything outside it — here, the manual demo-account seed
// script (apps/functions/src/database/seed/demo-accounts.ts) — has to ask
// for the credential to be written rather than write it itself.
export const seedAccountPath = "/internal/identity/seed";

// Nuxt Layers the Composition Root (apps/app/nuxt.config.ts) extends.
// Deliberately separate from `flags` below: `flags` provisions Cloudflare
// resources in infra/*.ts, this decides which domain layers are compiled into
// the app at all. See nuxfire-layers.md.
export const layers = {
  // Core layers — always extended, never toggleable: every tenant of this
  // SaaS needs them. Listed here (rather than hardcoded in nuxt.config.ts) so
  // they feed the exact same `activeLayerNames` set that drives `extends`, the
  // generated tRPC composition and the generated sidebar navigation. A core
  // layer needs no hand-written import anywhere; adding its name here is all.
  // With `admin` (Fase 3 passo 4, the last extraction) this list is complete:
  // apps/app holds no domain logic any more, only the Composition Root.
  //
  // "Core" here means activation only — it does NOT mean "shares the base's
  // migration history." Whether a core layer's tables live in the base's own
  // `apps/functions/src/database/migrations/` or in its own independent
  // `layers/<name>/migrations/` is decided per-layer, by the shape of its
  // foreign keys against `core-schema.ts` (SPEC-0006, 2026-09-28): a
  // one-directional FK into base (or none) can split — every `layers.core`
  // entry does today (`admin`, `notifications`, and `teams` since
  // 2026-09-28, once `Job`/`DeadLetterRecord` moved into `layers/teams`
  // itself and stopped forcing a bidirectional cycle), exactly like the
  // toggleable `kanban`/`billing` below. See
  // apps/functions/src/database/MIGRATIONS.md and
  // fireskill-specialist-drizzle/references/new-table-recipe.md.
  // `account` comes last and owns its own migration history since SPEC-0010
  // (`layers/account/migrations/`), which the deploy loop applies after the
  // others.
  core: ["teams", "notifications", "admin", "account"] as string[],

  // Feature layers — toggleable per build/deploy. `false` drops the layer's
  // pages, components and Nuxt config from the bundle, AND its migration
  // history from the next deploy: each feature layer owns its own migration
  // history (`layers/<name>/drizzle.config.ts`, `layers/<name>/migrations/`),
  // separate from the base history in `apps/functions/src/database/
  // migrations/`, applied by its own `drizzle-kit migrate` in
  // `infra/utils/nuxt.ts`, gated on the flag here — a layer that was never
  // turned on never reaches the database, not even as an empty table. This
  // is a per-deploy toggle, not a runtime schema diff: flipping an
  // already-deployed layer off does not generate a DROP for its tables
  // (nothing diffs the two histories against each other); their data is
  // simply no longer migrated or seeded. See apps/functions/src/database/
  // MIGRATIONS.md for the split and its bootstrap procedure.
  //
  // `billing` moved here from `core` in SPEC-0005: `Team.planId` is nullable
  // and `layers/teams` no longer imports `@nuxfire/layer-billing` (a base
  // layer must never import a feature layer — enforced by
  // scripts/layer-dependency-direction.test.ts), so billing can now be
  // turned off without breaking team creation or invites.
  //
  // `as const`, not `satisfies Record<string, boolean>`: a plain object
  // literal widens `true`/`false` properties to `boolean`, which is exactly
  // what breaks `apps/app/server/trpc/routers/index.ts`'s
  // `layers.features.billing ? mergeRouters(...) : layerRouters.admin` —
  // TypeScript cannot narrow a runtime `boolean` at the type level, so the
  // client-facing `admin.plans`/`admin.pendingPurchases` types silently
  // disappeared (caught by `bun run typecheck` in apps/app, not assumed).
  // `as const` keeps each flag's literal type, so flipping one here is a
  // compile-time signal for every file that assumed it — exactly what should
  // happen when a fork actually turns billing off.
  features: {
    kanban: true,
    billing: true,
  } as const,
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

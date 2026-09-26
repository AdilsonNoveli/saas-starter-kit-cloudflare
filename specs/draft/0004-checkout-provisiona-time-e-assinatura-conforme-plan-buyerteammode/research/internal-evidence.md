# Internal evidence for SPEC-0004

Provenance notes for the R-001–R-005 findings in `spec.md` section 2. All evidence is live repository code read directly on 2026-09-26; no external sources were consulted (see R-002 for the one adjacent spec this checks against). This file exists only to satisfy the framework's research-indexing check — the normative findings and their consequences live in `spec.md`, not here.

## R-001 — Existing checkout requires an existing team

- `layers/billing/server/trpc/stripe.ts`: `createStripeCheckoutSession` is `protectedProcedure`, input includes `teamId`, and the handler looks up `teamMemberships` for `(input.teamId, user.id)` before creating a Stripe customer/session.
- `layers/billing/server/api/webhooks/paddle.post.ts`: the `SubscriptionCreated`/`Updated`/`Canceled` case reads `team_id` from `customData` and calls `verifyPaddleTeam`, whose signature was produced at checkout time by code that already assumed a team existed.

## R-002 — SPEC-0003 Phase 7 is a different, unrelated checkout

- `specs/draft/0003-landing-refactor-one-offer/spec.md` section 1: "Ownership of the code sold" (R-002 in that spec), the owner's price (R$497 regular / R$97 launch), "the license page did not name the real seller and licensor".
- `apps/web/app/utils/offer.ts`: `Offer.launchPrice` doc comment reads "Price for the first `launchLimit` licenses"; `Offer.checkoutUrl` doc comment reads "https address of the checkout, or an empty string while there is none" and is a plain external URL, not a tRPC call into `layers/billing`.

## R-003 — Invite acceptance requires an existing session

- `layers/teams/server/trpc/invites.ts`: `acceptInvite` is `protectedProcedure`; its only identity check is `invite.email !== user.email`; nothing in this file creates a `User` row.
- `layers/teams/app/pages/invite/[[id]].vue`: `definePageMeta({ auth: false })`; `acceptInvite()` wraps the mutation call in `try { ... } catch { // accept invite failed }` with no user-visible error handling.

## R-004 — No team-less path to write a Subscription today

- `layers/billing/server/utils/stripe/subscription-sync.ts`: `syncStripeSubscription` reads `customer.metadata.team_id` to resolve `teamId`.
- `layers/billing/server/utils/billing/subscription-repository.ts`: `SubscriptionUpsertInput.teamId: string` (required, non-nullable).

## R-005 — "Member" is a ready-to-use system role

- `layers/teams/server/utils/roles.ts`: `ensureSystemRoles()` seeds Owner/Admin/Member together, guarded by "any system role exists".
- `layers/teams/server/trpc/teams.ts`: `create` looks up `roles.findFirst({ where: and(eq(role.name, "Owner"), eq(role.isSystemRole, true)) })` — the same lookup shape this spec's `buyer-provisioning.ts` reuses for "Owner" (`NEW_TEAM`) and "Member" (`EXISTING_TEAM`).

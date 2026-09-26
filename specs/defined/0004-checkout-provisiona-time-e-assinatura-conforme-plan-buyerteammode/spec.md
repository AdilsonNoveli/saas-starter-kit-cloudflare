# Integrated Specification: Checkout provisiona time e assinatura conforme Plan.buyerTeamMode

| Field | Value |
| --- | --- |
| Format | Specsfy/2.0 |
| ID | SPEC-0004 |
| Slug | 0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode |
| Status | Defined |
| Effort | 6 |
| Effort updated at | 2026-09-26 |
| Effort rationale | New checkout entry point (no existing team), a new persisted entity (pending purchase), a new claim journey with two Vue pages, and edits to both provider webhook handlers; comparable in size to the two-provider webhook work already in `layers/billing`. |
| ClickUp Task | |
| Milestones | |
| Definition Gate | Passed |
| Plan Gate | Pending |
| Delivery Gate | Pending |
| Evidence Contract | 1 |
| Human Interface | Yes |
| Updated at | 2026-09-26 |

## Act I — Define

### 1. Problem and Outcome

#### Problem

`layers/billing` already has working Stripe and Paddle checkout, webhooks, an idempotency ledger, and subscription sync — but only for a buyer who is already authenticated and already a member of the team paying (`createStripeCheckoutSession` is `protectedProcedure` and verifies `teamMemberships`; the Paddle flow signs `team_id` at checkout time from a membership check). `Plan.buyerTeamMode`/`buyerTeamId` (implemented and committed in `b48e2ba`) exist specifically for the opposite case — a buyer who does **not** yet belong to the team they should land in, either because no team exists yet (`NEW_TEAM`) or because they are not a member of the admin-chosen destination (`EXISTING_TEAM`). No code path can start a checkout for that buyer, so `Plan.buyerTeamMode` is stored and editable in `/admin/plans` but has no effect on a real purchase: no team or membership is ever created, and `Team.planId` is never updated by a payment (confirmed in `fireskills/specialists/fireskill-specialist-billing/references/nuxfire-billing.md:39` and `.fireskills/PROJECT.md` "Boundaries and Non-Goals").

#### Desired Outcome

A visitor with no account and no team can pay for a plan (Stripe or Paddle) using only an email address. Once the payment is confirmed, the platform emails a claim link; when the buyer opens it and creates an account or logs in with that same email, the system finishes what the admin configured for that plan — a brand-new team with the buyer as Owner, or membership in the chosen existing team as Member — and the team's plan and subscription become active. A destination that is no longer valid at claim time is refused safely, with nothing created and the case left visible to the platform admin.

#### Success Metrics

- 100% of `NEW_TEAM` and `EXISTING_TEAM` claims that pass validation result in exactly one team/membership and one active `Subscription` row for the purchased plan (verified by `AC-001`, `AC-002`, `AC-019`).
- 0 duplicate teams, memberships, or `Subscription` rows created from a redelivered webhook event or a repeated claim click (verified by `AC-007`, `AC-022`).
- 0 destinations silently substituted when `EXISTING_TEAM`'s team is missing or suspended — every such case is refused and visible in `/admin` (verified by `AC-004`, `AC-009`, `AC-017`, `AC-018`).

### 2. Research and Clarifications

This spec's research is entirely internal (live repository code, read directly), not the kind of externally-sourced, budget-tracked claim the ResearchClaim contract in `references/mcr-10.md` governs — that contract is reserved for claims about the outside world (market, competitors, third-party API behavior). Findings below cite repository paths directly, per Core Rule 1 ("Code supersedes documentation").

- **R-001**: Can the existing Stripe/Paddle checkout be reused as-is for a buyer with no team? → No. `layers/billing/server/trpc/stripe.ts`'s `createStripeCheckoutSession` is `protectedProcedure`, requires `input.teamId` and a matching `teamMemberships` row; `layers/billing/server/api/webhooks/paddle.post.ts` signs `team_id` at checkout time against the same kind of membership check. This spec adds a second, parallel checkout-start path instead of relaxing the existing one, so the already-onboarded team's upgrade flow keeps its membership check unchanged.
- **R-002**: Is this checkout the one referenced by `specs/draft/0003-landing-refactor-one-offer/spec.md` "Phase 7 — Later spec"? → No. That spec's section 1 ("Ownership of the code sold", price R$497/97) and `apps/web/app/utils/offer.ts` (`launchPrice`, "Price for the first `launchLimit` licenses") show it sells a one-time license to the Nuxfire codebase itself, reading `landing.offer` (a constant, not a table) — unrelated to `Plan`/`Team`/`Subscription`. This spec has no dependency on SPEC-0003; the earlier inbox capture (`specs/inbox/2026-09-25-232621-...md`) linking the two was corrected in `specs/backlog/0007-...md` before this spec was opened.
- **R-003**: Is there a precedent in this codebase for "grant access by e-mail before the recipient has an account"? → Partial, not directly reusable. `layers/teams/server/trpc/invites.ts`'s `acceptInvite` is `protectedProcedure` and never creates a `User`; it only compares `invite.email !== user.email` against an already-authenticated session. `layers/teams/app/pages/invite/[[id]].vue` opts out of forced auth (`auth: false`) but its "Accept" button calls the protected mutation inside an empty `catch`, so a logged-out visitor who clicks it sees nothing happen. This spec does not copy that silent-failure shape; the claim page is a normal protected page instead (DEC-002).
- **R-004**: How is a team resolved at webhook time for a buyer who has none yet? → It cannot be, today. `layers/billing/server/utils/stripe/subscription-sync.ts` resolves `teamId` from `customer.metadata.team_id`, and `subscription-repository.ts`'s `SubscriptionUpsertInput.teamId` is required and non-nullable. The webhook must record enough to finish the write later, once a team exists (section 8).
- **R-005**: Is "Member" available as a role to grant without extra setup? → Yes. `layers/teams/server/utils/roles.ts`'s `ensureSystemRoles()` seeds "Owner", "Admin", and "Member" together as `isSystemRole: true`; `layers/teams/server/trpc/teams.ts`'s `teams.create` already looks up "Owner" the same way this spec's claim procedure looks up "Member"/"Owner".

#### Consulted Sources and Context

- `layers/billing/server/trpc/stripe.ts`, `layers/billing/server/api/webhooks/stripe.post.ts`, `layers/billing/server/api/webhooks/paddle.post.ts`, `layers/billing/server/utils/stripe/subscription-sync.ts`, `layers/billing/server/utils/billing/{event-ledger,subscription-repository,paddle-team-signature}.ts`, `layers/billing/server/database/schema.ts`, `layers/billing/shared/types/enums.ts`.
- `layers/teams/server/trpc/{teams,invites}.ts`, `layers/teams/server/database/schema.ts`, `layers/teams/server/utils/roles.ts`, `layers/teams/app/pages/invite/[[id]].vue`, `layers/teams/app/middleware/invite.ts`.
- `apps/app/app/middleware/0.auth.global.ts` (global auth redirect, `auth: false` opt-out).
- `apps/app/server/trpc/routers/public.ts` (existing precedent for a `publicProcedure` mutation that writes to the database, `addToWaitlist`).
- `fireskills/specialists/fireskill-specialist-billing/references/nuxfire-billing.md`, `.fireskills/PROJECT.md`.
- `specs/backlog/0007-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode.md` (promoted backlog item), `specs/inbox/2026-09-25-{200250,232621}-...md`.
- No external (non-repository) sources consulted.

#### Consulted Documentation

- Stripe Checkout/webhooks and Paddle Node SDK behavior verified only against this repository's own usage (`stripe.ts`, `stripe.post.ts`, `paddle.post.ts`); no external API documentation fetched.

#### Stored research artifacts

- `specs/defined/0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode/research/internal-evidence.md`: provenance notes for R-001–R-005, pinning the exact repository files/behaviors each finding rests on as of 2026-09-26. No external (non-repository) artifacts were consulted.

#### Resolved Questions

- **Q**: Which providers does this checkout cover? → **A**: Stripe and Paddle, the two already wired.
- **Q**: What role does the buyer get in `EXISTING_TEAM`? → **A**: Member (system role), always.
- **Q**: Does this spec handle a team that already has a paid plan receiving a new purchase (upgrade/re-purchase)? → **A**: Out of scope; this spec only activates a destination that has no paid plan yet.
- **Q**: Does "license delivery" (SPEC-0003 Phase 7 wording) apply here? → **A**: No — see R-002; that checkout is unrelated to `Plan`.
- **Q**: Does the buyer create an account before or after paying? → **A**: After. Checkout collects only an e-mail; the buyer creates an account or logs in afterward to claim the purchase.
- **Q**: How does the claim page handle a logged-out buyer? → **A**: The claim page is a normal protected page (no `auth: false`); the existing global auth middleware sends a logged-out visitor through OpenAuth and back to the same URL (see DEC-002).
- **Q**: Does a `NEW_TEAM` claim ask for a team name? → **A**: Yes, a small form (name + suggested slug) at claim time, validated the same way as `teams.create`.
- **Q**: What happens to a paid purchase that is never claimed? → **A**: It expires 30 days after creation (matching `TeamInvite`'s existing 30-day expiry) and stays visible to the platform admin as unresolved.

#### Open Questions

- None blocking. `DEC-001`–`DEC-004` record technical choices made during this stage; none of them changes scope, data exposed, or who can act.

### 3. Scope and Actors

#### In Scope

- A new checkout-start path (Stripe and Paddle) usable without an existing session or team, for a `Plan` that is not archived.
- Refusing checkout start when the plan's `buyerTeamMode` is `EXISTING_TEAM` and `buyerTeamId` does not resolve to an active (non-suspended) team at that moment.
- A `PendingPurchase` record linking the checkout attempt to an e-mail, created before redirecting to the provider's hosted checkout page.
- Extending both webhook handlers to recognize a pending-purchase checkout (as opposed to the existing team-upgrade checkout) and record the confirmed subscription on the `PendingPurchase` instead of writing a `Subscription` row directly.
- A one-time claim e-mail sent once the payment/subscription is confirmed.
- A protected claim page and `claimPurchase` procedure that, for an authenticated user whose e-mail matches the pending purchase: creates a new team (Owner) for `NEW_TEAM`, or adds the user as Member and updates `Team.planId` for `EXISTING_TEAM` — re-validating the destination at claim time — and writes the `Subscription` row via the existing `upsertSubscription`.
- Idempotency: a redelivered webhook event never sends a second claim e-mail or creates a second `Subscription` row for the same provider subscription; a repeated or concurrent claim attempt never creates more than one team/membership.
- 30-day expiry of an unclaimed pending purchase and a read-only `/admin` listing of pending purchases (all statuses, with the rejection/expiry reason visible).

#### Out of Scope

- Any change to the existing `createStripeCheckoutSession` / Paddle in-app upgrade flow for a user who already has a team.
- Re-purchase, upgrade, or downgrade of a team that already has an active paid plan (`Team.planId` pointing at a non-Free, non-archived plan with an `ACTIVE`/`TRIALING` subscription). A new payment for such a destination is out of scope for this spec.
- The SPEC-0003 "Phase 7" Nuxfire-license checkout (unrelated; see R-002).
- Any UI for browsing/choosing a plan to buy (the checkout-start page takes a `planId` it already has, e.g. from a link the admin or a future marketing page provides).
- Resending a claim e-mail, or any reminder before/at expiry.
- Refunds, cancellations, or any change triggered by an expired or rejected pending purchase beyond making it visible in `/admin`.
- Changing the buyer's role after the claim (always Member for `EXISTING_TEAM`, always Owner for `NEW_TEAM`).

#### Actors

- **Buyer**: an unauthenticated visitor at checkout time; after payment, either a new or existing platform user who claims the purchase with the same e-mail. Goal: pay once and end up with working access to the purchased plan.
- **Platform admin**: already configures `Plan.buyerTeamMode`/`buyerTeamId` in `/admin/plans` (existing, `platformAdminProcedure`). Goal, added by this spec: see which pending purchases failed to provision or expired unclaimed.
- **Stripe / Paddle** (external systems): payment providers; source of the webhook events this spec extends.

### 4. Project Principles and Constraints

- **PR-001**: No partial provisioning. A claim either fully succeeds (team/membership + `Team.planId` + `Subscription`) or creates nothing; there is no state where a team exists without its plan, or a membership exists without the team's plan being updated.
- **PR-002**: Reuse the existing single write path for subscriptions (`upsertSubscription`, keyed by `providerSubscriptionId`) rather than a second insert path, per the rationale already documented on that function.
- **PR-003**: The claim link's authority comes from matching the authenticated session's e-mail against the pending purchase's e-mail — the same check `acceptInvite` already performs — not from the link id alone being hard to guess.
- **PR-004**: Every schema change ships as a versioned `drizzle-kit` migration (`bun run generate-migrations` in `apps/functions`), not a hand-edit of `0000_init.sql` (see DEC-004).

### 5. User Stories

#### US-001 — Buyer starts a checkout without an existing team (P1)

As a visitor with no account, I want to pay for a plan by only giving my e-mail, so that I do not have to create an account or a team before paying.

**Why P1**: without this, `Plan.buyerTeamMode` has no way to ever be exercised by a real payment.
**Independent Test**: call `checkout.startBuyerCheckout` (public) with a valid, non-archived plan id and an e-mail; assert a provider checkout URL is returned and one `PendingPurchase` row exists with `status = PENDING`.
**Requirements**: FR-001, FR-002, FR-003

#### US-002 — Buyer claims a paid purchase and is provisioned (P1)

As a buyer who has paid, I want to create an account or log in with the e-mail I paid with and finish getting access, so that my payment turns into a working team and plan.

**Why P1**: this is the step that actually consumes `Plan.buyerTeamMode`; without it, US-001 collects money without granting access.
**Independent Test**: with a `PendingPurchase` whose subscription is confirmed, call `checkout.claimPurchase` as a user whose e-mail matches; assert the correct team/membership exists and `Team.planId`/`Subscription` reflect the purchased plan.
**Requirements**: FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-012

#### US-003 — Platform admin sees purchases that did not finish (P2)

As the platform admin, I want to see paid purchases that were rejected or expired unclaimed, so that I can follow up manually.

**Why P2**: does not block a successful buyer journey, but without it a failed `EXISTING_TEAM` claim (money taken, no access granted) is invisible.
**Independent Test**: with a rejected and an expired `PendingPurchase` in the database, load `/admin`'s pending-purchases list as a platform admin and see both, each with its reason.
**Requirements**: FR-011

### 6. Acceptance BDD Scenarios

#### AC-001 — Happy path, NEW_TEAM

**Covers**: US-001, US-002, FR-001, FR-003, FR-004, FR-005, FR-006, FR-009, NFR-001

```gherkin
@US-001 @US-002 @FR-001 @FR-003 @FR-004 @FR-005 @FR-006 @FR-009 @NFR-001 @AC-001
Feature: Checkout without a team, NEW_TEAM destination

  Scenario: A visitor pays for a NEW_TEAM plan and claims it into a brand-new team
    Given a Plan "Starter" with buyerTeamMode NEW_TEAM and isArchived false
    When a visitor calls startBuyerCheckout with that plan id and email "buyer@example.com"
    And the provider confirms the subscription is active
    And "buyer@example.com" creates an account and calls claimPurchase with team name "Acme" and slug "acme"
    Then a team "Acme" exists with the buyer as Owner
    And Team.planId is "Starter"
    And a Subscription row exists for that team with the confirmed providerSubscriptionId
```

#### AC-002 — Happy path, EXISTING_TEAM

**Covers**: US-001, US-002, FR-001, FR-003, FR-004, FR-005, FR-007, FR-009, NFR-001

```gherkin
@US-001 @US-002 @FR-001 @FR-003 @FR-004 @FR-005 @FR-007 @FR-009 @NFR-001 @AC-002
Feature: Checkout without a team, EXISTING_TEAM destination

  Scenario: A visitor pays for an EXISTING_TEAM plan and claims membership
    Given a Plan "Support Seat" with buyerTeamMode EXISTING_TEAM and buyerTeamId of an ACTIVE team "Client Co"
    When a visitor calls startBuyerCheckout with that plan id and email "buyer@example.com"
    And the provider confirms the subscription is active
    And "buyer@example.com" creates an account and calls claimPurchase
    Then "buyer@example.com" is a Member of "Client Co"
    And Team.planId of "Client Co" is "Support Seat"
    And a Subscription row exists for "Client Co" with the confirmed providerSubscriptionId
```

#### AC-003 — Checkout refused, EXISTING_TEAM destination already invalid at start (removed)

**Covers**: US-001, FR-001, FR-002

```gherkin
@US-001 @FR-001 @FR-002 @AC-003
Feature: Checkout refused when the destination cannot receive a buyer

  Scenario: startBuyerCheckout refuses a plan whose EXISTING_TEAM was deleted
    Given a Plan "Support Seat" with buyerTeamMode EXISTING_TEAM and buyerTeamId null (the team was deleted)
    When a visitor calls startBuyerCheckout with that plan id and email "buyer@example.com"
    Then the call fails with a clear error
    And no PendingPurchase row is created
    And no provider checkout session is created
```

#### AC-004 — Claim refused, EXISTING_TEAM destination suspended before claim

**Covers**: US-002, FR-008, NFR-003

```gherkin
@US-002 @FR-008 @NFR-003 @AC-004
Feature: Claim refused when the destination became invalid after payment

  Scenario: claimPurchase refuses an EXISTING_TEAM destination suspended after checkout started
    Given a confirmed PendingPurchase for Plan "Support Seat" (EXISTING_TEAM, team "Client Co")
    And "Client Co" was suspended after the purchase was made
    When "buyer@example.com" calls claimPurchase
    Then the call fails with a clear error
    And "buyer@example.com" is not added to "Client Co"
    And Team.planId of "Client Co" is unchanged
    And the PendingPurchase status becomes REJECTED with a recorded reason
```

#### AC-005 — Claim rejected, wrong e-mail

**Covers**: US-002, FR-005, FR-010, NFR-001

```gherkin
@US-002 @FR-005 @FR-010 @NFR-001 @AC-005
Feature: Claim requires the paying e-mail

  Scenario: claimPurchase rejects a session whose e-mail does not match the purchase
    Given a confirmed PendingPurchase for email "buyer@example.com"
    When a user authenticated as "someoneelse@example.com" calls claimPurchase for it
    Then the call fails with a FORBIDDEN error
    And the PendingPurchase status remains PENDING
```

#### AC-006 — Claim rejected, already claimed

**Covers**: US-002, FR-010, NFR-002

```gherkin
@US-002 @FR-010 @NFR-002 @AC-006
Feature: A pending purchase can be claimed only once

  Scenario: claimPurchase rejects a purchase whose status is already CLAIMED
    Given a PendingPurchase with status CLAIMED
    When "buyer@example.com" calls claimPurchase for it again
    Then the call fails with a clear "already claimed" error
    And no second team, membership, or Subscription is created
```

#### AC-007 — Webhook redelivery does not duplicate

**Covers**: FR-004, FR-012, NFR-002

```gherkin
@FR-004 @FR-012 @NFR-002 @AC-007
Feature: Webhook redelivery is idempotent for a pending purchase

  Scenario: The same subscription-confirmation event delivered twice sends one claim e-mail
    Given a PendingPurchase with status PENDING and no confirmed subscription yet
    When the provider webhook delivers the subscription-active event for it
    And the same event is redelivered
    Then exactly one claim e-mail was sent
    And the PendingPurchase has exactly one recorded providerSubscriptionId
```

#### AC-008 — Delayed payment method does not claim early

**Covers**: FR-004

```gherkin
@FR-004 @AC-008
Feature: A delayed payment method does not send a claim link before money moves

  Scenario: checkout.session.completed with an unpaid delayed payment method sends no claim e-mail yet
    Given a PendingPurchase created from a Stripe checkout using a delayed payment method
    When Stripe delivers checkout.session.completed with payment_status "unpaid"
    Then no claim e-mail is sent
    And the PendingPurchase status remains PENDING with no confirmed subscription

  Scenario: async_payment_succeeded later sends the claim e-mail
    Given the PendingPurchase from the previous scenario
    When Stripe delivers checkout.session.async_payment_succeeded for the same session
    Then exactly one claim e-mail is sent
```

#### AC-009 — Unclaimed purchase expires and is visible to the admin

**Covers**: US-003, FR-011, NFR-003

```gherkin
@US-003 @FR-011 @NFR-003 @AC-009
Feature: An unclaimed purchase expires and stays visible

  Scenario: A PendingPurchase older than 30 days with no claim is treated as expired
    Given a confirmed PendingPurchase created 31 days ago with status PENDING
    When the platform admin opens the pending-purchases list in /admin
    Then it is shown with status EXPIRED
    And a later claim attempt on it fails with a clear "expired" error
```

#### AC-010 — Claim when the buyer is already a member of the destination

**Covers**: US-002, FR-007

```gherkin
@US-002 @FR-007 @AC-010
Feature: Claiming into a team the buyer already belongs to

  Scenario: claimPurchase updates the plan without duplicating membership
    Given a confirmed PendingPurchase for Plan "Support Seat" (EXISTING_TEAM, team "Client Co")
    And "buyer@example.com" is already a Member of "Client Co"
    When "buyer@example.com" calls claimPurchase
    Then "buyer@example.com" remains a single Member row for "Client Co"
    And Team.planId of "Client Co" is "Support Seat"
```

#### AC-011 — Tampered Paddle pending-purchase signature rejected

**Covers**: FR-001, FR-003, NFR-001

```gherkin
@FR-001 @FR-003 @NFR-001 @AC-011
Feature: Paddle pending-purchase linkage is signed

  Scenario: The Paddle webhook rejects a pending_purchase_id whose signature does not verify
    Given a Paddle subscription event whose customData carries a pending_purchase_id and an invalid signature
    When the Paddle webhook handler processes it
    Then the event is rejected
    And the referenced PendingPurchase is not updated
```

#### AC-012 — Checkout refused, plan archived

**Covers**: FR-001, FR-002

```gherkin
@FR-001 @FR-002 @AC-012
Feature: Checkout refused for a plan that is not purchasable

  Scenario: startBuyerCheckout refuses an archived plan
    Given a Plan "Old Plan" with isArchived true
    When a visitor calls startBuyerCheckout with that plan id and an email
    Then the call fails with a clear error
    And no PendingPurchase row is created
```

#### AC-013 — Checkout refused, EXISTING_TEAM destination suspended at start

**Covers**: FR-002

```gherkin
@FR-002 @AC-013
Feature: Checkout refused when the destination is already suspended

  Scenario: startBuyerCheckout refuses a plan whose EXISTING_TEAM is suspended
    Given a Plan "Support Seat" with buyerTeamMode EXISTING_TEAM and buyerTeamId of a SUSPENDED team
    When a visitor calls startBuyerCheckout with that plan id and an email
    Then the call fails with a clear error
    And no PendingPurchase row is created
```

#### AC-014 — NEW_TEAM claim, slug already taken

**Covers**: FR-006

```gherkin
@FR-006 @AC-014
Feature: NEW_TEAM claim validates the chosen slug

  Scenario: claimPurchase rejects a slug already used by another team
    Given a confirmed PendingPurchase for a NEW_TEAM plan
    And a team already exists with slug "acme"
    When "buyer@example.com" calls claimPurchase with team name "Acme" and slug "acme"
    Then the call fails with a CONFLICT error
    And no team is created
    And the PendingPurchase status remains PENDING
```

#### AC-015 — NEW_TEAM claim, invalid team name

**Covers**: FR-006

```gherkin
@FR-006 @AC-015
Feature: NEW_TEAM claim validates the team name

  Scenario: claimPurchase rejects a team name shorter than 2 characters
    Given a confirmed PendingPurchase for a NEW_TEAM plan
    When "buyer@example.com" calls claimPurchase with team name "A" and slug "a"
    Then the call fails with a validation error
    And no team is created
```

#### AC-016 — EXISTING_TEAM claim replaces a prior plan

**Covers**: FR-007

```gherkin
@FR-007 @AC-016
Feature: Claiming into a team updates whatever plan it already had

  Scenario: claimPurchase overwrites the destination team's existing Free plan
    Given a confirmed PendingPurchase for Plan "Support Seat" (EXISTING_TEAM, team "Client Co")
    And "Client Co" currently has Team.planId "Free"
    When "buyer@example.com" calls claimPurchase
    Then Team.planId of "Client Co" is "Support Seat"
```

#### AC-017 — Claim refused, EXISTING_TEAM destination deleted before claim

**Covers**: US-002, FR-008, NFR-003

```gherkin
@US-002 @FR-008 @NFR-003 @AC-017
Feature: Claim refused when the destination team no longer exists

  Scenario: claimPurchase refuses a buyerTeamId that became null after the team was deleted
    Given a confirmed PendingPurchase for Plan "Support Seat" (EXISTING_TEAM)
    And the destination team was deleted after the purchase, so Plan.buyerTeamId is now null
    When "buyer@example.com" calls claimPurchase
    Then the call fails with a clear error
    And the PendingPurchase status becomes REJECTED with a recorded reason
```

#### AC-018 — Claim refused, EXISTING_TEAM destination suspended between valid checkout start and claim

**Covers**: FR-008, NFR-003

```gherkin
@FR-008 @NFR-003 @AC-018
Feature: The destination is re-checked at claim time, not only at checkout start

  Scenario: A destination valid at checkout start is re-validated and found suspended at claim
    Given startBuyerCheckout succeeded while "Client Co" was ACTIVE
    And "Client Co" was suspended before the buyer claimed
    When "buyer@example.com" calls claimPurchase
    Then the call fails with a clear error
    And "buyer@example.com" is not added to "Client Co"
```

#### AC-019 — Subscription upsert reuses the existing write path

**Covers**: FR-009, FR-012

```gherkin
@FR-009 @FR-012 @AC-019
Feature: Claim writes the subscription through the existing single write path

  Scenario: A renewal webhook after claim updates the same Subscription row
    Given a claimed PendingPurchase whose Subscription row has providerSubscriptionId "sub_123"
    When the provider later delivers a renewal event for "sub_123"
    Then the existing Subscription row for "sub_123" is updated
    And no second Subscription row is created
```

#### AC-020 — Claim rejected, expired

**Covers**: FR-010, FR-011

```gherkin
@FR-010 @FR-011 @AC-020
Feature: An expired pending purchase cannot be claimed

  Scenario: claimPurchase distinguishes "expired" from "already claimed" or "wrong email"
    Given a PendingPurchase past its 30-day expiry with status PENDING
    When "buyer@example.com" calls claimPurchase for it
    Then the call fails with a clear "expired" error, distinct from FORBIDDEN or "already claimed"
```

#### AC-021 — Expired claim link does not leak data

**Covers**: FR-011, NFR-001

```gherkin
@FR-011 @NFR-001 @AC-021
Feature: An expired or foreign claim link shows no other buyer's data

  Scenario: getPendingPurchase on an expired purchase reveals nothing to a non-matching session
    Given a PendingPurchase past its 30-day expiry, e-mail "buyer@example.com"
    When a user authenticated as "someoneelse@example.com" calls getPendingPurchase for it
    Then the call fails with a NOT_FOUND or FORBIDDEN error
    And no plan, team, or e-mail details are returned
```

#### AC-022 — Concurrent claim attempts

**Covers**: FR-012, NFR-002

```gherkin
@FR-012 @NFR-002 @AC-022
Feature: Concurrent claims resolve to exactly one outcome

  Scenario: Two simultaneous claimPurchase calls for the same purchase produce one team
    Given a confirmed PendingPurchase with status PENDING
    When "buyer@example.com" calls claimPurchase twice at the same time
    Then exactly one of the calls succeeds
    And the other fails with a clear "already claimed" error
    And exactly one team (or membership) was created
```

#### AC-023 — Admin filters pending purchases by status

**Covers**: US-003

```gherkin
@US-003 @AC-023
Feature: Admin pending-purchases list is filterable

  Scenario: The admin filters the list to only REJECTED entries
    Given pending purchases exist with status PENDING, CLAIMED, EXPIRED, and REJECTED
    When the platform admin filters the list by status REJECTED
    Then only the REJECTED entries are shown
```

#### AC-024 — Admin sees the rejection reason

**Covers**: US-003, NFR-003

```gherkin
@US-003 @NFR-003 @AC-024
Feature: A rejected pending purchase shows why

  Scenario: The admin reads the recorded failure reason
    Given a PendingPurchase with status REJECTED and failureReason "Destination team no longer exists"
    When the platform admin opens that row in /admin
    Then "Destination team no longer exists" is shown
```

### 7. Requirements

#### Functional

- **FR-001**: The system shall let an unauthenticated caller start a checkout session (Stripe or Paddle) for a given, non-archived `Plan` by supplying only an e-mail address, without an existing session or team.
- **FR-002**: The system shall refuse to start a checkout when the plan is archived, or when `buyerTeamMode` is `EXISTING_TEAM` and `buyerTeamId` does not resolve to a team with `status = ACTIVE` at that moment.
- **FR-003**: The system shall create one `PendingPurchase` row, linked to the checkout's provider identifiers, before redirecting the buyer to the provider's hosted checkout page.
- **FR-004**: The system shall send the buyer a claim e-mail exactly once per `PendingPurchase`, only after the provider confirms the underlying subscription is active (not merely that a checkout session completed).
- **FR-005**: The system shall let an authenticated user claim a `PendingPurchase` only when the session's e-mail equals the `PendingPurchase`'s e-mail.
- **FR-006**: When claiming a `PendingPurchase` whose plan has `buyerTeamMode = NEW_TEAM`, the system shall create a new team with the claiming user as Owner, using a name and slug supplied at claim time and validated the same way as `teams.create` (name 2–50 chars, slug 2–50 chars, unique).
- **FR-007**: When claiming a `PendingPurchase` whose plan has `buyerTeamMode = EXISTING_TEAM`, the system shall add the claiming user as Member of `buyerTeamId` (without duplicating an existing membership) and set that team's `planId` to the purchased plan.
- **FR-008**: When claiming a `PendingPurchase` whose plan has `buyerTeamMode = EXISTING_TEAM` and the destination team no longer exists or is not `ACTIVE` at claim time, the system shall reject the claim, create no team or membership, and set the `PendingPurchase` status to `REJECTED` with a recorded reason.
- **FR-009**: Upon a successful claim, the system shall write the `Subscription` row for the resolved team using the existing `upsertSubscription` write path, keyed by `providerSubscriptionId`.
- **FR-010**: The system shall reject a claim attempt on a `PendingPurchase` whose status is not `PENDING` (already `CLAIMED`, `EXPIRED`, or `REJECTED`), with an error that distinguishes which of those it is.
- **FR-011**: The system shall treat a `PendingPurchase` as expired 30 days after its creation if still `PENDING`, and shall list every `PendingPurchase` (all statuses) for the platform admin, including the recorded reason for `REJECTED` or the fact of expiry for `EXPIRED`.
- **FR-012**: The system shall not create more than one `Subscription` row or send more than one claim e-mail for the same provider subscription, regardless of how many times the provider redelivers the related webhook event.

#### Non-Functional

- **NFR-001**: Security — a claim succeeds only when the authenticated session's e-mail matches the `PendingPurchase`'s e-mail; a Paddle pending-purchase id carried in browser-supplied `customData` is HMAC-signed at checkout start and verified at webhook time, the same mechanism already used for `team_id`. **Verification**: unit tests (`AC-005`, `AC-011`, `AC-021`) plus code review against `paddle-team-signature.ts`'s existing pattern.
- **NFR-002**: Idempotency — redelivered webhook events and repeated or concurrent claim calls produce exactly one provisioning outcome. **Verification**: unit tests simulating redelivery and concurrent calls (`AC-006`, `AC-007`, `AC-019`, `AC-022`).
- **NFR-003**: Observability — every `REJECTED` or `EXPIRED` `PendingPurchase` is visible to the platform admin with its reason, with no separate batch job required to surface it. **Verification**: `AC-004`, `AC-009`, `AC-017`, `AC-018`, `AC-024`.

#### Errors and Edge Cases

- Checkout requested for an unknown `planId` → `NOT_FOUND`, no `PendingPurchase` created.
- Checkout requested with an invalid e-mail → validation error (`zod`), no provider call made.
- Provider checkout session creation fails (network/provider error) → no `PendingPurchase` row left behind (create the row only after the provider confirms the session, or delete it on failure — see DEC-003).
- `claimPurchase` called for a `PendingPurchase` whose subscription was never confirmed (buyer opens a stale/guessed link before the webhook ran) → treated the same as "not found" from the caller's perspective; no claim e-mail was sent for it yet, so this is not a normal path.
- `claimPurchase` called with `teamName`/`teamSlug` for an `EXISTING_TEAM` purchase → those fields are ignored (not an error): only `NEW_TEAM` needs them.

## Act II — Design and Prove

### 8. Technical Plan

#### Existing Context

- Nuxt 4 layers (`layers/billing`, `layers/teams`), tRPC via `~~/server/trpc/trpc` (`publicProcedure`, `protectedProcedure`), Drizzle + Postgres, Cloudflare Workers/SST. Stack details: `.fireskills/STACK.md`; billing-specific conventions: `fireskills/specialists/fireskill-specialist-billing/references/nuxfire-billing.md`.
- Existing pieces this spec extends rather than replaces: `layers/billing/server/trpc/stripe.ts` (team-upgrade checkout, unchanged), `layers/billing/server/api/webhooks/{stripe,paddle}.post.ts`, `layers/billing/server/utils/stripe/subscription-sync.ts`, `layers/billing/server/utils/billing/{event-ledger,subscription-repository,paddle-team-signature}.ts`, `layers/teams/server/trpc/teams.ts` (`create` mutation, reused for the NEW_TEAM shape), `layers/teams/server/utils/roles.ts` (`ensureSystemRoles`).

#### Architecture and Modules

- **`layers/billing/server/utils/billing/pending-purchase-repository.ts`** (new): the single read/write surface for `PendingPurchase` rows — `createPendingPurchase`, `findPendingPurchaseById`, `findPendingPurchaseByProviderCheckoutId`, `recordConfirmedSubscription` (sets `providerSubscriptionId`/`providerCustomerId`, returns whether this is the first confirmation so the caller sends the claim e-mail exactly once), `claimPendingPurchase` (single `UPDATE ... WHERE id = ? AND status = 'PENDING' AND expiresAt > now() RETURNING *` — the atomic PENDING→CLAIMED transition that makes AC-006/AC-020/AC-022 hold without a transaction or lock), `rejectPendingPurchase`, `expirePendingPurchaseIfDue`.
- **`layers/billing/server/utils/billing/buyer-provisioning.ts`** (new): `provisionBuyerTeam({ pendingPurchase, plan, user, teamName?, teamSlug? })` — the orchestration behind FR-006/FR-007/FR-008: looks up the "Owner"/"Member" system role (same lookup as `teams.create`), branches on `plan.buyerTeamMode`, creates the team or the membership, updates `Team.planId`, and returns the resolved `teamId` or a typed rejection reason. Pure orchestration over `useDB()`, unit-tested directly (mirrors how `plan-buyer-team.ts` already isolates the admin-side rule from its router).
- **`layers/billing/server/utils/stripe/subscription-sync.ts`** (edit): extract the existing body of `syncStripeSubscription` into `syncStripeSubscriptionForTeam(stripe, subscriptionId, teamId)`; `syncStripeSubscription` becomes a thin wrapper that resolves `teamId` from `customer.metadata.team_id` and delegates. `claimPurchase` calls `syncStripeSubscriptionForTeam` directly once a team is resolved, re-fetching live data from Stripe rather than trusting a stored snapshot (same freshness guarantee the existing sync already relies on).
- **Paddle equivalent** (edit `paddle.post.ts`): extract the existing `SubscriptionCreated`/`Updated`/`Canceled` case body (price/plan lookup, `SubscriptionUpsertInput` construction) into an exported `resolvePaddleSubscriptionInput(paddle, subscriptionEvent)` returning everything except `teamId`; the existing case adds `teamId` from `customData.team_id` as before, and `claimPurchase` calls the same function with the team resolved at claim time.
- **`layers/billing/server/utils/billing/paddle-team-signature.ts`** (edit): add `signPaddlePendingPurchase(secret, pendingPurchaseId)` / `verifyPaddlePendingPurchase(...)`, same HMAC-SHA256 helper, a distinct domain-separation string (`nuxfire:paddle-checkout-pending-purchase:${id}`) so a pending-purchase signature can never be replayed as a team signature or vice-versa.
- **`layers/billing/server/trpc/checkout.ts`** (new router, mounted in `layers/billing/server/trpc/router.ts`):
  - `startBuyerCheckout` (`publicProcedure`): input `{ planId, email, provider: "STRIPE" | "PADDLE", redirectUrl }`. Loads the plan, applies FR-002, creates the provider customer/checkout (Stripe: `stripe.customers.create({ email, metadata: { pending_purchase_id } })` then `stripe.checkout.sessions.create(...)`, mirroring `stripe.ts`'s existing session shape but without a `teamId`; Paddle: browser-driven Paddle.js checkout, `customData: { pending_purchase_id, purchase_sig }` in place of `team_id`/`team_sig`), inserts the `PendingPurchase` first so its id exists to embed, rate-limited via the existing `assertNotRateLimited` (payment-endpoint abuse deserves the same guard as the webhooks, even though the older `addToWaitlist` precedent has none — DEC-003).
  - `getPendingPurchase` (`protectedProcedure`): returns the plan name, destination description, and status for a `PendingPurchase`, only when `ctx.user.email === pendingPurchase.email`; otherwise `FORBIDDEN`/`NOT_FOUND` indistinguishably (NFR-001, AC-021). Powers the claim page.
  - `claimPurchase` (`protectedProcedure`): input `{ pendingPurchaseId, teamName?, teamSlug? }`. Implements FR-005 through FR-010 by composing `pending-purchase-repository.ts` and `buyer-provisioning.ts`.
- **Webhook handlers** (`stripe.post.ts`, `paddle.post.ts`, edit): in the existing `dispatch()`, when the resolved customer/custom-data carries `pending_purchase_id` instead of `team_id`, call `recordConfirmedSubscription` instead of `syncStripeSubscription`/`upsertSubscription`, and send the claim e-mail (`packages/emails/templates/PurchaseClaim.tsx`, new) exactly when `recordConfirmedSubscription` reports first confirmation.
- **`layers/admin`**: a read-only `listPendingPurchases` (`platformAdminProcedure`) in a new or existing admin billing router, filterable by status, surfaced as a table under `/admin` (section 10).

#### Migrations

- One versioned `drizzle-kit` migration (`bun run generate-migrations` in `apps/functions`, per DEC-004) adding the `PendingPurchase` table and the `PendingPurchaseStatus` value set. Rollback: drop the table; nothing else references it yet, so this is safe to revert on its own.

#### Models

- `PendingPurchase` (`layers/billing/server/database/schema.ts`, new table `pendingPurchases`) — see section 9 for full column list.
- `PendingPurchaseStatus` enum (`layers/billing/shared/types/enums.ts`, new) — `PENDING | CLAIMED | EXPIRED | REJECTED`, same `$Enums` namespace shape as `SubscriptionStatus`.

#### Procedures and Handlers

- `checkout.startBuyerCheckout` — public, rate-limited, input validated with `zod` (`planId: string`, `email: z.string().email()`, `provider: z.enum(["STRIPE","PADDLE"])`, `redirectUrl: string`). Output: `{ url: string, pendingPurchaseId: string }`.
- `checkout.getPendingPurchase` — protected, input `{ pendingPurchaseId: string }`. Output: plan name, destination summary (team name for `EXISTING_TEAM`, or "a new team" for `NEW_TEAM`), status.
- `checkout.claimPurchase` — protected, input `{ pendingPurchaseId: string, teamName?: string, teamSlug?: string }`. Output: `{ teamSlug: string }` for client-side redirect.
- `admin.listPendingPurchases` — `platformAdminProcedure`, input `{ status?: PendingPurchaseStatus }`, output a page of rows for the `UTable` in section 10.

#### Views and UI Experience

See section 10 (full nine-area breakdown, `Human Interface: Yes`).

#### Queries and Repositories

- `pending-purchase-repository.ts` functions listed above are the only writers of `PendingPurchase`. Indexes: unique index on `providerCheckoutId` (prevents two rows for one checkout attempt if `startBuyerCheckout` is retried after a network error client-side — the retry finds and reuses the existing row instead of creating a second); index on `email` (claim/admin lookups); index on `status` (admin filter, expiry sweep).
- Expiry (FR-011) is computed lazily: `expirePendingPurchaseIfDue` is called wherever a `PendingPurchase` is read (claim, admin list) and flips `PENDING` rows past `expiresAt` to `EXPIRED` before returning them — no separate cron job, consistent with this feature's low volume and DEC-003's preference for the simplest mechanism that satisfies FR-011.

#### Jobs and Async Processing

- Not applicable. No queue/cron involved; expiry is read-time as above, matching PR-002's spirit of not introducing new async machinery for a rare, low-volume path.

#### File Structure

```text
specs/defined/0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode/
  spec.md
layers/billing/
  server/database/schema.ts                        (edit: pendingPurchases table)
  shared/types/enums.ts                             (edit: PendingPurchaseStatus)
  server/utils/billing/pending-purchase-repository.ts   (new)
  server/utils/billing/buyer-provisioning.ts            (new)
  server/utils/billing/paddle-team-signature.ts     (edit: pending-purchase sign/verify)
  server/utils/stripe/subscription-sync.ts          (edit: extract syncStripeSubscriptionForTeam)
  server/api/webhooks/stripe.post.ts                (edit: pending-purchase branch)
  server/api/webhooks/paddle.post.ts                (edit: pending-purchase branch, extract resolvePaddleSubscriptionInput)
  server/trpc/checkout.ts                           (new router)
  server/trpc/router.ts                             (edit: mount checkout router)
  i18n/locales/{en,pt-BR,es}.json                   (edit: buy/claim page text)
layers/admin/
  server/trpc/admin-billing.ts or admin-plans.ts    (edit: listPendingPurchases)
  app/pages/admin/pending-purchases/index.vue       (new)
apps/app/app/pages/
  buy/[planId].vue                                  (new, public)
  claim/[id].vue                                    (new, protected)
packages/emails/templates/
  PurchaseClaim.tsx                                 (new)
apps/functions/src/database/migrations/
  0001_<generated-name>.sql                         (new, via drizzle-kit generate)
```

### 9. Data Model

#### Entities

| Entity | Identity | Attributes and Validation | Relationships |
| --- | --- | --- | --- |
| `PendingPurchase` | `id` (cuid, PK) | `email` (text, not null, valid e-mail enforced at input); `planId` (text, not null, FK → `Plan.id`); `provider` (text, `PaymentProvider`: `STRIPE`\|`PADDLE`); `providerCheckoutId` (text, not null, unique — Stripe Checkout Session id or Paddle transaction id); `providerCustomerId` (text, nullable); `providerSubscriptionId` (text, nullable until confirmed); `status` (text, `PendingPurchaseStatus`, default `PENDING`); `failureReason` (text, nullable, set only when `REJECTED`); `claimEmailSentAt` (timestamp, nullable — guards FR-004/FR-012); `claimedAt` (timestamp, nullable); `claimedByUserId` (text, nullable, FK → `User.id`); `resultTeamId` (text, nullable, FK → `Team.id`, `onDelete: set null` like `Plan.buyerTeamId`); `expiresAt` (timestamp, not null, `createdAt + 30 days`); `createdAt`/`updatedAt` (timestamp, as every other table in this schema). | Many `PendingPurchase` → one `Plan` (`planId`); many `PendingPurchase` → one `User` (`claimedByUserId`, nullable); many `PendingPurchase` → one `Team` (`resultTeamId`, nullable). |

No changes to `Plan`, `Team`, `TeamMembership`, or `Subscription` shapes — this spec only adds rows to existing tables through their existing write paths (`teams`, `teamMemberships`, `subscriptions`) plus the one new table above.

#### States and Transitions

| Entity | Current State | Event | Next State | Invariants |
| --- | --- | --- | --- | --- |
| `PendingPurchase` | (none) | `startBuyerCheckout` succeeds | `PENDING` | `providerSubscriptionId` null; `expiresAt = createdAt + 30d` |
| `PendingPurchase` | `PENDING` (no subscription yet) | webhook confirms active subscription | `PENDING` (subscription confirmed) | `providerSubscriptionId` set exactly once; claim e-mail sent exactly once (FR-004, FR-012) |
| `PendingPurchase` | `PENDING` (subscription confirmed) | `claimPurchase` succeeds | `CLAIMED` | `claimedAt`, `claimedByUserId`, `resultTeamId` all set together; transition is atomic (PR-001) |
| `PendingPurchase` | `PENDING` (subscription confirmed) | `claimPurchase` fails destination validation (FR-008) | `REJECTED` | `failureReason` set; no team/membership created |
| `PendingPurchase` | `PENDING` | `now() > expiresAt` (checked on read) | `EXPIRED` | No further claim possible (FR-010) |
| `PendingPurchase` | `CLAIMED` / `EXPIRED` / `REJECTED` | any further `claimPurchase` call | unchanged | Rejected with a status-specific error (FR-010, AC-006/AC-020) |

#### Migration and Retention

- New table only; no backfill needed (no purchases could exist before this spec). Retention: rows are kept indefinitely for audit (mirrors `TeamInvite`, which is never purged); a future spec may add cleanup if volume warrants it — out of scope here.

### 10. Interfaces and Contracts

#### Human Interface

- **Human interface present**: Yes — a public checkout-start page, a protected claim page, and a read-only admin listing.

#### Interface Stack and Conventions

- Nuxt 4 + `@nuxt/ui` (per `.fireskills/STACK.md`/`INTERFACE.md`), Vue SFCs with `<script setup lang="ts">`, `useTrpcClient()` for tRPC calls, i18n via `layers/billing/i18n/locales/{en,pt-BR,es}.json` (already declared in `layers/billing/nuxt.config.ts` since the buyer-team-mode admin work). Pages live in `apps/app/app/pages/` (Nuxt file-based routing), same app as `/invite/[[id]]` and the global `0.auth.global.ts` middleware this spec relies on.

#### Screens and Responsibilities

- **Buy** (`apps/app/app/pages/buy/[planId].vue`, public, `auth: false`): actor Buyer; goal: start a checkout with only an e-mail; input: e-mail, provider choice (only shown if the plan supports both); output: redirect to the provider's hosted checkout.
- **Claim** (`apps/app/app/pages/claim/[id].vue`, protected): actor Buyer (now authenticated); goal: finish provisioning; input: team name/slug (only when destination is `NEW_TEAM`); output: redirect into the provisioned team, or a clear error state (expired/rejected/wrong e-mail).
- **Pending purchases** (`layers/admin/app/pages/admin/pending-purchases/index.vue`, `platformAdminProcedure`): actor Platform admin; goal: see what did not finish; input: status filter; output: read-only list.

#### Information Flow and Navigation

- **Buy**: reached by a direct link (`/buy/{planId}`, e.g. shared by the admin) — Home (public) > Buy. Not linked from any menu; there is no plan-browsing UI in scope.
- **Claim**: reached only via the e-mailed claim link (`/claim/{id}`) — no breadcrumb trail from within the app, since it is an out-of-band entry point, exactly like `/invite/[[id]]` today. A logged-out visitor is bounced through OpenAuth by the existing global middleware and lands back on `/claim/{id}` authenticated.
- **Pending purchases**: Admin > Billing > Pending purchases, alongside the existing `/admin/plans` (same `layers/admin`/`layers/billing` admin surface, `platformAdminProcedure`-gated).

#### Menus and Primary Navigation

- **Buy** and **Claim** are not in any menu (deep-link only, matching `/invite/[[id]]`'s existing pattern of "not a navigable destination").
- **Pending purchases** gets one menu item in the existing `/admin` sidebar, next to "Plans", routing to the new screen; visible only to platform admins (same visibility rule already applied to every other `/admin` destination).

#### Forms and Actions

- **Buy** page: a single-field form (e-mail; provider choice only when a plan has both `providerPriceId` values configured), primary action "Continue to payment" (`UButton`), inline validation message for an invalid e-mail (`UForm` + `zod` schema shared with the procedure's input schema).
- **Claim** page: for `NEW_TEAM`, a two-field `UForm` (team name, slug — slug auto-suggested from name, editable, same validation messages as `teams.create`'s existing form) with primary action "Create my team"; for `EXISTING_TEAM`, no form, a single primary action "Join {team name}" (mirrors `/invite/[[id]]`'s "Accept" button). Both show the plan name and price context above the action.
- **Pending purchases** page: a status filter (`USelect`), no create/edit/delete actions — read-only per CRUD Contract's "independent edit/delete actions" note not applying here (there is nothing to edit).

#### Composition and Layout

- **Buy**/**Claim**: centered single-column card (`UCard`), matching `/invite/[[id]]`'s `UModal`+`UCard` composition rather than a full dashboard shell, since neither page is part of the authenticated app shell's normal navigation.
- **Pending purchases**: standard `/admin` shell (`PageHeader` + full-width table), same density as `/admin/plans`.

#### Selected Vue and @nuxt/ui Components

| Screen | Vue Component | Responsibility | Target File | Component Composition | Origin | Reuse or Extend |
| --- | --- | --- | --- | --- | --- | --- |
| Buy | `BuyPlanForm` | E-mail + provider input, submit to `startBuyerCheckout` | `apps/app/app/pages/buy/[planId].vue` | `UCard`, `UForm`, `UFormField`, `UInput`, `USelect`, `UButton` | `@nuxt/ui` | New page, existing primitives |
| Claim | `ClaimPurchaseCard` | Show plan/destination, collect team name for `NEW_TEAM`, submit `claimPurchase` | `apps/app/app/pages/claim/[id].vue` | `UCard`, `UForm`, `UFormField`, `UInput`, `UButton`, `UAlert` (error/expired states) | `@nuxt/ui` | New page, same shell shape as `layers/teams/app/pages/invite/[[id]].vue` |
| Pending purchases | `PendingPurchasesTable` | List + filter | `layers/admin/app/pages/admin/pending-purchases/index.vue` | `PageHeader`, `UTable` (`enterpriseTableUi`), `USelect`, `UBadge` (status) | `@nuxt/ui` + existing `PageHeader` | New page, reuses `/admin/plans`' listing shell |

- Registered in `.fireskills/INTERFACE.md` alongside the existing `/admin/plans` entry when this spec implements.

#### States and Accessibility

- **Buy**: loading (button spinner while creating the checkout session), error (provider/plan validation failure shown via `UAlert`, e.g. "This plan is no longer available"), success (browser navigates away to the provider's hosted page, so no in-app success state).
- **Claim**: loading (fetching `getPendingPurchase`), not-found/forbidden (wrong e-mail or foreign link — shown as one generic "Link not found or expired" `UAlert`, deliberately not distinguishing wrong-e-mail from not-found, per NFR-001/AC-021), expired (`UAlert`, distinct copy, no destination details), rejected (`UAlert` explaining the destination is no longer available, directs to support contact — no retry action in scope), success (redirect into the team).
- **Pending purchases**: loading (table skeleton, existing `/admin` convention), empty ("No pending purchases"), populated. All interactive elements keyboard-reachable and focus-ringed, consistent with existing `/admin/plans` and `/invite/[[id]]` screens (no new pattern introduced).

#### CRUD Contract

- Buy/Claim are not CRUD screens (single-purpose action flows), so the CRUD Contract's `PageHeader`/list/detail/create/edit conventions do not apply to them.
- Pending purchases uses the same reusable `PageHeader` component as every other `/admin` list, above a list-only (no detail/create) full-width `UTable` (`enterpriseTableUi`) with the `ID` column visible; rows are not interactive links and carry no edit or delete action, because there is nothing on this read-only screen for the admin to edit or delete.

#### Visual Review During Development

- Perform visual review on Buy, Claim (both destination variants: `NEW_TEAM` form and `EXISTING_TEAM` one-click), and Pending purchases at desktop and mobile viewports: borders, spacing, margins, padding, typography, and the four Claim states (loading, expired, rejected, success-redirect). Recorded under each implementation task's `VISUAL` checklist item.

#### Exposed APIs

| Procedure | Auth | Input | Output | Errors |
| --- | --- | --- | --- | --- |
| `checkout.startBuyerCheckout` | public | `{ planId, email, provider, redirectUrl }` | `{ url, pendingPurchaseId }` | `NOT_FOUND` (plan), `BAD_REQUEST` (archived plan or invalid destination), validation error (email) |
| `checkout.getPendingPurchase` | protected | `{ pendingPurchaseId }` | `{ planName, destinationSummary, status }` | `FORBIDDEN`/`NOT_FOUND` (e-mail mismatch, indistinguishable) |
| `checkout.claimPurchase` | protected | `{ pendingPurchaseId, teamName?, teamSlug? }` | `{ teamSlug }` | `FORBIDDEN` (e-mail mismatch), `CONFLICT` (already claimed, slug taken), `BAD_REQUEST` (expired, rejected, destination invalid), validation error (team name/slug) |
| `admin.listPendingPurchases` | `platformAdminProcedure` | `{ status? }` | page of `PendingPurchase` summaries | none beyond standard auth |

#### External APIs

- Stripe (`stripe ^17.5.0`, pinned API version, existing `createStripeClient`): `customers.create`, `checkout.sessions.create` (mode `subscription`, no team-scoped customer reuse since none exists yet). No new package.
- Paddle (`@paddle/paddle-node-sdk`, `@paddle/paddle-js`, existing `usePayments` composable): browser checkout with `customData` carrying `pending_purchase_id`/`purchase_sig` instead of `team_id`/`team_sig`. No new package.
- Both already configured (`config.ts`, `infra/secret.ts`); no new credentials.
- Failure mode: neither call gets custom timeout/retry wrapping, matching the existing `createStripeCheckoutSession` precedent (`layers/billing/server/trpc/stripe.ts`), which relies on the SDK's own defaults and lets a failure surface as a plain error. A failed `startBuyerCheckout` call returns `INTERNAL_SERVER_ERROR` and creates no `PendingPurchase` row (see Errors and Edge Cases); the buyer's only recovery path is retrying the Buy page, same as the existing upgrade checkout offers today.

### 11. TDD Strategy

- **Unit**: `pending-purchase-repository.test.ts` (state machine transitions, atomic claim, expiry-on-read), `buyer-provisioning.test.ts` (NEW_TEAM/EXISTING_TEAM branches, role lookup, rejection reasons), `paddle-team-signature.test.ts` (extended: pending-purchase sign/verify, domain separation from team signing), `subscription-sync.test.ts` (extended: `syncStripeSubscriptionForTeam` extraction keeps existing behavior).
- **Integration/Contract**: `checkout.test.ts` (new) exercising `startBuyerCheckout`/`getPendingPurchase`/`claimPurchase` against a test database, covering AC-001 through AC-022 at the procedure boundary (mocking only the Stripe/Paddle SDK calls, not the database).
- **BDD/Acceptance**: the 24 Gherkin scenarios in section 6 guide the test cases above; no separate `.feature` files (per framework rule), each scenario maps to one or more `it(...)` blocks carrying a `SPECSFY:` marker referencing its `AC-NNN`.
- **Test Runner**: Vitest via `bun run test`.
- **E2E**: Not applicable — the Buy→pay→claim journey crosses a real external payment provider, which is not exercised in this project's automated suite (no existing precedent for it either, e.g. the existing Stripe checkout procedure has no E2E test); covered instead by the visual review in section 10 plus manual verification with Stripe/Paddle test-mode credentials before considering the feature done, same bar `AGENTS.md` already sets ("deployment is the actual verification gate" for anything Workers/SST cannot be proven by `vitest` alone).

#### RED-GREEN-REFACTOR Evidence

| IDs | Reference BDD | TDD Test Case | Observed RED | Observed GREEN | Refactor/Regression |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-001, FR-002, FR-003, AC-001 | AC-001 (section 6) | `checkout.test.ts` — NEW_TEAM happy path | Pending | Pending | Pending |
| US-001, FR-001, FR-007, AC-002 | AC-002 | `checkout.test.ts` — EXISTING_TEAM happy path | Pending | Pending | Pending |
| FR-002, AC-003, AC-012, AC-013 | AC-003/AC-012/AC-013 | `checkout.test.ts` — startBuyerCheckout refusals | Pending | Pending | Pending |
| FR-008, NFR-003, AC-004, AC-017, AC-018 | AC-004/AC-017/AC-018 | `buyer-provisioning.test.ts` — destination re-validation | Pending | Pending | Pending |
| FR-005, FR-010, NFR-001, AC-005, AC-006, AC-020, AC-021 | AC-005/AC-006/AC-020/AC-021 | `pending-purchase-repository.test.ts` — claim guards | Pending | Pending | Pending |
| FR-004, FR-012, NFR-002, AC-007, AC-008 | AC-007/AC-008 | webhook dispatch tests — confirmation and dedupe | Pending | Pending | Pending |
| FR-006, AC-014, AC-015 | AC-014/AC-015 | `buyer-provisioning.test.ts` — NEW_TEAM validation | Pending | Pending | Pending |
| FR-007, AC-010, AC-016 | AC-010/AC-016 | `buyer-provisioning.test.ts` — EXISTING_TEAM idempotent membership | Pending | Pending | Pending |
| FR-009, FR-012, AC-019, AC-022 | AC-019/AC-022 | `subscription-sync.test.ts` + `checkout.test.ts` — write-path reuse and concurrency | Pending | Pending | Pending |
| NFR-001, AC-011 | AC-011 | `paddle-team-signature.test.ts` — pending-purchase signature | Pending | Pending | Pending |
| US-003, FR-011, NFR-003, AC-009, AC-023, AC-024 | AC-009/AC-023/AC-024 | `admin-billing.test.ts` (or extended `admin-plans.test.ts`) — pending-purchases listing | Pending | Pending | Pending |

### 12. Testing and Traceability Plan

| Requirement | BDD Scenario | Level | Test File/Command | Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | AC-001, AC-002, AC-011, AC-012 | Integration | `layers/billing/server/trpc/checkout.test.ts` | Pending |
| FR-002 | AC-003, AC-012, AC-013 | Integration | `layers/billing/server/trpc/checkout.test.ts` | Pending |
| FR-003 | AC-001, AC-002, AC-011 | Integration | `layers/billing/server/trpc/checkout.test.ts` | Pending |
| FR-004 | AC-001, AC-002, AC-007, AC-008 | Unit + Integration | `layers/billing/server/utils/billing/pending-purchase-repository.test.ts` | Pending |
| FR-005 | AC-001, AC-002, AC-005 | Integration | `layers/billing/server/trpc/checkout.test.ts` | Pending |
| FR-006 | AC-001, AC-014, AC-015 | Unit | `layers/billing/server/utils/billing/buyer-provisioning.test.ts` | Pending |
| FR-007 | AC-002, AC-010, AC-016 | Unit | `layers/billing/server/utils/billing/buyer-provisioning.test.ts` | Pending |
| FR-008 | AC-004, AC-017, AC-018 | Unit | `layers/billing/server/utils/billing/buyer-provisioning.test.ts` | Pending |
| FR-009 | AC-001, AC-002, AC-019 | Unit | `layers/billing/server/utils/stripe/subscription-sync.test.ts` | Pending |
| FR-010 | AC-005, AC-006, AC-020 | Unit | `layers/billing/server/utils/billing/pending-purchase-repository.test.ts` | Pending |
| FR-011 | AC-009, AC-020, AC-021 | Unit + Integration | `layers/billing/server/utils/billing/pending-purchase-repository.test.ts`, `layers/admin/server/trpc/admin-billing.test.ts` | Pending |
| FR-012 | AC-007, AC-019, AC-022 | Integration | `layers/billing/server/trpc/checkout.test.ts` | Pending |
| NFR-001 | AC-001, AC-002, AC-005, AC-011, AC-021 | Unit + Integration | `layers/billing/server/utils/billing/paddle-team-signature.test.ts`, `checkout.test.ts` | Pending |
| NFR-002 | AC-006, AC-007, AC-019, AC-022 | Integration | `layers/billing/server/trpc/checkout.test.ts` | Pending |
| NFR-003 | AC-004, AC-009, AC-017, AC-018, AC-024 | Integration | `layers/admin/server/trpc/admin-billing.test.ts` | Pending |

### 13. Validations

#### Act I Gate — Definition

- **Result**: READY (structural: `VALID DRAFT`; research: `PASSED`; semantic review below has no `P1 Open` finding).
- **Command**: `node fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs specs/defined/0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode/spec.md` (2026-09-26: `RESULT: VALID DRAFT`); `node fireskills/skills/fireskill-03-specify/scripts/load_research.mjs specs/defined/0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode/spec.md` (2026-09-26: `Research: PASSED`).
- **Findings** (review lenses — `references/review-lenses.md`):

- **FIND-SEC-001** [P1] [Resolved] Could a claimant defeat the e-mail-match check by registering with someone else's unverified e-mail — Refs: FR-005 — Evidence: apps/functions/src/auth.ts — Effect: would let an attacker claim a stranger's purchase by typing their e-mail — Suggestion: none required, already mitigated: every OpenAuth provider verifies e-mail ownership before issuing a session (password signup sends and verifies a code, code login is itself the verification, GitHub/Google emails are provider-verified), so FR-005 matches against a proven mailbox, not a claimed string.
- **FIND-SEC-002** [P3] [Resolved] Could a logged-out visitor see purchase/destination details by opening a claim link, the way invite links show details before login — Refs: FR-005 — Evidence: apps/app/app/middleware/0.auth.global.ts — Effect: would leak plan/team information pre-authentication — Suggestion: none required, already mitigated: DEC-002 makes the claim page a normal protected page with no auth bypass, so the existing global middleware redirects before any data loads.
- **FIND-ARCH-001** [P2] [Resolved] Extracting a team-scoped sync function out of the existing Stripe sync must not change behavior on the existing team-upgrade webhook path — Refs: FR-009 — Evidence: layers/billing/server/utils/stripe/subscription-sync.ts — Effect: a careless refactor could regress the already-working upgrade flow — Suggestion: add characterization tests for the current behavior before refactoring, already reflected in the task ordering (schema, then repository, then provisioning, then sync extraction, ahead of new behavior).
- **FIND-SEC-003** [P2] [Accepted] A confirmed EXISTING_TEAM purchase whose destination becomes invalid before claim has already taken the buyer's money with no automatic refund — Refs: FR-008 — Evidence: specs/backlog/0007-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode.md — Effect: buyer paid, got no access, needs manual follow-up via the admin listing — Suggestion: a future spec could add refund or cancellation triggered by rejection; out of scope here by the user's own recorded decision (that same backlog file, "Recompra/upgrade... fora de escopo", "sem reembolso automático").

No `P1 Open` finding. Gate is `READY`.

#### Act II Gate — Plan

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs specs/defined/0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode/spec.md`
- **Findings**: Pending.

#### Act III Gate — Delivery

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs specs/defined/0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode/spec.md .`
- **Findings**: Pending.

### 14. Tasks

Format:
`- [ ] TNNN [P?] [TYPE] [US-NNN?] Action with file path — Refs: IDs — Depends: IDs|none`

Mandatory checklist per task in exact order: `PREP`, `EXECUTE`, `VERIFY`, `VISUAL`, `EVIDENCE`, `IMPROVE`.

#### Phase 1 — RED TDD Informed by BDD

- [ ] T001 [TEST] [TDD] [US-001] Derive from AC-001 a failing Vitest case (NEW_TEAM happy path) in layers/billing/server/trpc/checkout.test.ts — Refs: US-001, US-002, FR-001, FR-003, FR-004, FR-005, FR-006, FR-009, NFR-001, AC-001 — Depends: none
  - [ ] **PREP**: Read AC-001's Gherkin; confirm the plan/team/subscription fixtures the test database needs.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker; no `.feature` file.
  - [ ] **VERIFY**: Observe RED — `bunx vitest run layers/billing/server/trpc/checkout.test.ts`.
  - [ ] **VISUAL**: Not applicable — test-only task, no UI rendered.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Note any fixture reused from `layers/teams`' existing team-creation tests.

- [ ] T002 [TEST] [TDD] [US-001] Derive from AC-002 a failing Vitest case (EXISTING_TEAM happy path) in layers/billing/server/trpc/checkout.test.ts — Refs: US-001, US-002, FR-001, FR-003, FR-004, FR-005, FR-007, FR-009, NFR-001, AC-002 — Depends: none
  - [ ] **PREP**: Read AC-002's Gherkin; seed an ACTIVE destination team.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Note any shared setup extracted with T001.

- [ ] T003 [TEST] [TDD] [US-001] Derive from AC-003 a failing Vitest case (checkout refused, EXISTING_TEAM removed) in layers/billing/server/trpc/checkout.test.ts — Refs: US-001, FR-001, FR-002, AC-003 — Depends: none
  - [ ] **PREP**: Read AC-003's Gherkin; seed a plan with `buyerTeamId` null.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm no `PendingPurchase` row leaks from a failed attempt.

- [ ] T004 [TEST] [TDD] [US-002] Derive from AC-004 a failing Vitest case (claim refused, destination suspended before claim) in layers/billing/server/utils/billing/buyer-provisioning.test.ts — Refs: US-002, FR-008, NFR-003, AC-004 — Depends: none
  - [ ] **PREP**: Read AC-004's Gherkin; seed a confirmed pending purchase and a team suspended after checkout.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the rejection reason text is asserted, not just the error code.

- [ ] T005 [TEST] [TDD] [US-002] Derive from AC-005 a failing Vitest case (claim rejected, wrong e-mail) in layers/billing/server/utils/billing/pending-purchase-repository.test.ts — Refs: US-002, FR-005, FR-010, NFR-001, AC-005 — Depends: none
  - [ ] **PREP**: Read AC-005's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the FORBIDDEN outcome is indistinguishable from NOT_FOUND (NFR-001).

- [ ] T006 [TEST] [TDD] [US-002] Derive from AC-006 a failing Vitest case (claim rejected, already CLAIMED) in layers/billing/server/utils/billing/pending-purchase-repository.test.ts — Refs: US-002, FR-010, NFR-002, AC-006 — Depends: none
  - [ ] **PREP**: Read AC-006's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Note the atomic-transition shape this drives (see T026).

- [ ] T007 [TEST] [TDD] Derive from AC-007 a failing Vitest case (webhook redelivery does not duplicate) in layers/billing/server/utils/billing/stripe-webhook-dispatch.test.ts — Refs: FR-004, FR-012, NFR-002, AC-007 — Depends: none
  - [ ] **PREP**: Read AC-007's Gherkin; confirm the ledger fixture from `event-ledger.test.ts` is reusable.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the test asserts exactly one claim e-mail send, not merely one DB row.

- [ ] T008 [TEST] [TDD] Derive from AC-008 a failing Vitest case (delayed payment method does not claim early) in layers/billing/server/utils/billing/stripe-webhook-dispatch.test.ts — Refs: FR-004, AC-008 — Depends: none
  - [ ] **PREP**: Read AC-008's Gherkin (both scenarios: `unpaid` then `async_payment_succeeded`).
  - [ ] **EXECUTE**: Author both cases with unique `SPECSFY:` markers.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Reuse the existing `checkout.session.completed`/`async_payment_succeeded` fixtures from `stripe.post.ts`'s own doc comments.

- [ ] T009 [TEST] [TDD] [US-003] Derive from AC-009 a failing Vitest case (unclaimed purchase expires, visible to admin) in layers/admin/server/trpc/admin-billing.test.ts — Refs: US-003, FR-011, NFR-003, AC-009 — Depends: none
  - [ ] **PREP**: Read AC-009's Gherkin; seed a `PendingPurchase` created 31 days ago.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm a later claim attempt on the same row fails with the "expired" reason, not silently succeeds.

- [ ] T010 [TEST] [TDD] [US-002] Derive from AC-010 a failing Vitest case (claim when buyer already a member) in layers/billing/server/utils/billing/buyer-provisioning.test.ts — Refs: US-002, FR-007, AC-010 — Depends: none
  - [ ] **PREP**: Read AC-010's Gherkin; seed an existing membership.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the test asserts a single `TeamMembership` row (unique constraint respected).

- [ ] T011 [TEST] [TDD] Derive from AC-011 a failing Vitest case (tampered Paddle pending-purchase signature rejected) in layers/billing/server/utils/billing/paddle-team-signature.test.ts — Refs: FR-001, FR-003, NFR-001, AC-011 — Depends: none
  - [ ] **PREP**: Read AC-011's Gherkin; read the existing `verifyPaddleTeam` tests for the fixture shape.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the domain-separation string prevents cross-use with `signPaddleTeam`.

- [ ] T012 [TEST] [TDD] Derive from AC-012 a failing Vitest case (checkout refused, plan archived) in layers/billing/server/trpc/checkout.test.ts — Refs: FR-001, FR-002, AC-012 — Depends: none
  - [ ] **PREP**: Read AC-012's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm no provider API call is attempted before the plan check.

- [ ] T013 [TEST] [TDD] Derive from AC-013 a failing Vitest case (checkout refused, EXISTING_TEAM suspended at start) in layers/billing/server/trpc/checkout.test.ts — Refs: FR-002, AC-013 — Depends: none
  - [ ] **PREP**: Read AC-013's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Share the fixture builder with T003.

- [ ] T014 [TEST] [TDD] Derive from AC-014 a failing Vitest case (NEW_TEAM claim, slug already taken) in layers/billing/server/utils/billing/buyer-provisioning.test.ts — Refs: FR-006, AC-014 — Depends: none
  - [ ] **PREP**: Read AC-014's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Reuse `teams.create`'s existing slug-conflict fixture.

- [ ] T015 [TEST] [TDD] Derive from AC-015 a failing Vitest case (NEW_TEAM claim, invalid team name) in layers/billing/server/utils/billing/buyer-provisioning.test.ts — Refs: FR-006, AC-015 — Depends: none
  - [ ] **PREP**: Read AC-015's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Reuse `teams.create`'s existing name-length validation message.

- [ ] T016 [TEST] [TDD] Derive from AC-016 a failing Vitest case (EXISTING_TEAM claim replaces a prior Free plan) in layers/billing/server/utils/billing/buyer-provisioning.test.ts — Refs: FR-007, AC-016 — Depends: none
  - [ ] **PREP**: Read AC-016's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm seat-limit interactions are out of scope and left untouched.

- [ ] T017 [TEST] [TDD] [US-002] Derive from AC-017 a failing Vitest case (claim refused, EXISTING_TEAM destination deleted) in layers/billing/server/utils/billing/buyer-provisioning.test.ts — Refs: US-002, FR-008, NFR-003, AC-017 — Depends: none
  - [ ] **PREP**: Read AC-017's Gherkin; seed `Plan.buyerTeamId` null via the `set null` FK behavior.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Distinguish this rejection reason from T004's in the assertion text.

- [ ] T018 [TEST] [TDD] Derive from AC-018 a failing Vitest case (destination re-validated at claim, not only at checkout start) in layers/billing/server/utils/billing/buyer-provisioning.test.ts — Refs: FR-008, NFR-003, AC-018 — Depends: none
  - [ ] **PREP**: Read AC-018's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the checkout-start validation (T013) and the claim-time validation call the same underlying check.

- [ ] T019 [TEST] [TDD] Derive from AC-019 a failing Vitest case (claim reuses the existing Subscription write path) in layers/billing/server/utils/stripe/subscription-sync.test.ts — Refs: FR-009, FR-012, AC-019 — Depends: none
  - [ ] **PREP**: Read AC-019's Gherkin; read the current `syncStripeSubscription` behavior to characterize before refactoring (FIND-ARCH-001).
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Add a characterization test for the existing `syncStripeSubscription` wrapper alongside this one.

- [ ] T020 [TEST] [TDD] Derive from AC-020 a failing Vitest case (claim rejected, expired) in layers/billing/server/utils/billing/pending-purchase-repository.test.ts — Refs: FR-010, FR-011, AC-020 — Depends: none
  - [ ] **PREP**: Read AC-020's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the error message distinguishes "expired" from T005/T006's outcomes.

- [ ] T021 [TEST] [TDD] Derive from AC-021 a failing Vitest case (expired/foreign claim link leaks no data) in layers/billing/server/trpc/checkout.test.ts — Refs: FR-011, NFR-001, AC-021 — Depends: none
  - [ ] **PREP**: Read AC-021's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Assert the response shape carries no plan/team/e-mail fields.

- [ ] T022 [TEST] [TDD] Derive from AC-022 a failing Vitest case (concurrent claim attempts resolve to one outcome) in layers/billing/server/trpc/checkout.test.ts — Refs: FR-012, NFR-002, AC-022 — Depends: none
  - [ ] **PREP**: Read AC-022's Gherkin; confirm the test can issue two overlapping calls against the same test-database connection pool.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm the assertion counts teams/memberships, not just HTTP outcomes.

- [ ] T023 [TEST] [TDD] [US-003] Derive from AC-023 a failing Vitest case (admin filters pending purchases by status) in layers/admin/server/trpc/admin-billing.test.ts — Refs: US-003, AC-023 — Depends: none
  - [ ] **PREP**: Read AC-023's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Reuse `admin-plans.test.ts`'s `platformAdminProcedure` fixture.

- [ ] T024 [TEST] [TDD] [US-003] Derive from AC-024 a failing Vitest case (admin sees the rejection reason) in layers/admin/server/trpc/admin-billing.test.ts — Refs: US-003, NFR-003, AC-024 — Depends: none
  - [ ] **PREP**: Read AC-024's Gherkin.
  - [ ] **EXECUTE**: Author the case with a unique `SPECSFY:` marker.
  - [ ] **VERIFY**: Observe RED.
  - [ ] **VISUAL**: Not applicable — test-only task.
  - [ ] **EVIDENCE**: Record the RED failure trace.
  - [ ] **IMPROVE**: Confirm `failureReason` text matches what T004/T017 recorded.

#### Phase 2 — US-001 and US-002: checkout, provisioning, and webhooks

**Goal**: a buyer with no team pays and, after claiming, has a working team and plan.
**Independent Test**: `bunx vitest run layers/billing/server/trpc/checkout.test.ts` — AC-001/AC-002 pass.

- [ ] T025 [CODE] [MIGRATION] [US-001] Add the PendingPurchase table via layers/billing/server/database/schema.ts, layers/billing/shared/types/enums.ts (PendingPurchaseStatus), and a generated apps/functions/src/`database/migrations/0001_pending_purchase.sql` — Refs: FR-003, FR-011, AC-001, AC-011 — Depends: T001, T002, T011
  - [ ] **PREP**: Confirm RED T001/T002/T011; run `check_database_safety.mjs` before touching the test database.
  - [ ] **EXECUTE**: Declare `pendingPurchases` (columns per spec section 9) and `PendingPurchaseStatus`; generate the migration with `bunx drizzle-kit generate` inside `apps/functions`.
  - [ ] **VERIFY**: `bunx drizzle-kit generate` produces only the planned table; apply it to the test database and query `information_schema.tables` to confirm `PendingPurchase` exists.
  - [ ] **VISUAL**: Not applicable — persistent schema only.
  - [ ] **EVIDENCE**: Record the generated SQL file path and the two verification commands' output.
  - [ ] **IMPROVE**: Confirm the unique index on `providerCheckoutId` and the `set null` FK on `resultTeamId` match `Plan.buyerTeamId`'s existing pattern.

- [ ] T026 [CODE] [US-002] Implement pending-purchase-repository.ts (create, find, atomic claim transition, reject, expire-on-read) in layers/billing/server/utils/billing/pending-purchase-repository.ts — Refs: FR-003, FR-010, FR-011, NFR-002, AC-005, AC-006, AC-020 — Depends: T005, T006, T020, T025
  - [ ] **PREP**: Confirm RED T005/T006/T020 and completed T025.
  - [ ] **EXECUTE**: Implement the single atomic `UPDATE ... WHERE status = 'PENDING' AND expiresAt > now() RETURNING *` claim transition and the other repository functions.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/utils/billing/pending-purchase-repository.test.ts` — GREEN.
  - [ ] **VISUAL**: Not applicable — server utility only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm no `SELECT ... FOR UPDATE` was needed given the single-statement atomic update.
  <!-- specsfy:evidence {"task":"T026","refs":["FR-003","FR-010","FR-011","NFR-002","AC-005","AC-006","AC-020"],"files":["layers/billing/server/utils/billing/pending-purchase-repository.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/utils/billing/pending-purchase-repository.test.ts","exit":0}]} -->

- [ ] T027 [CODE] [US-002] Implement buyer-provisioning.ts (NEW_TEAM/EXISTING_TEAM branches, Owner/Member lookup, destination re-validation) in layers/billing/server/utils/billing/buyer-provisioning.ts — Refs: FR-006, FR-007, FR-008, AC-004, AC-010, AC-014, AC-015, AC-016, AC-017, AC-018 — Depends: T004, T010, T014, T015, T016, T017, T018, T025
  - [ ] **PREP**: Confirm RED T004/T010/T014/T015/T016/T017/T018 and completed T025; read `teams.create`'s Owner-lookup and slug-validation code to reuse the same shape.
  - [ ] **EXECUTE**: Implement `provisionBuyerTeam({ pendingPurchase, plan, user, teamName?, teamSlug? })`.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/utils/billing/buyer-provisioning.test.ts` — GREEN.
  - [ ] **VISUAL**: Not applicable — server utility only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm PR-001 (no partial provisioning) holds by inspecting the function's control flow for early returns after a partial write.
  <!-- specsfy:evidence {"task":"T027","refs":["FR-006","FR-007","FR-008","AC-004","AC-010","AC-014","AC-015","AC-016","AC-017","AC-018"],"files":["layers/billing/server/utils/billing/buyer-provisioning.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/utils/billing/buyer-provisioning.test.ts","exit":0}]} -->

- [ ] T028 [CODE] [US-002] Extract syncStripeSubscriptionForTeam from syncStripeSubscription in layers/billing/server/utils/stripe/subscription-sync.ts — Refs: FR-009, FR-012, AC-001, AC-002, AC-019 — Depends: T001, T002, T019
  - [ ] **PREP**: Confirm RED T019 and the characterization test for existing behavior (T019's IMPROVE item).
  - [ ] **EXECUTE**: Extract the body into `syncStripeSubscriptionForTeam(stripe, subscriptionId, teamId)`; `syncStripeSubscription` becomes a thin wrapper resolving `teamId` from `customer.metadata.team_id`.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/utils/stripe/subscription-sync.test.ts` — GREEN, including the pre-existing behavior characterization.
  - [ ] **VISUAL**: Not applicable — server utility only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm the existing team-upgrade webhook path has no behavior change (FIND-ARCH-001 resolved).
  <!-- specsfy:evidence {"task":"T028","refs":["FR-009","FR-012","AC-001","AC-002","AC-019"],"files":["layers/billing/server/utils/stripe/subscription-sync.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/utils/stripe/subscription-sync.test.ts","exit":0}]} -->

- [ ] T029 [CODE] [US-001] Extract resolvePaddleSubscriptionInput and add the pending-purchase branch in layers/billing/server/api/webhooks/paddle.post.ts — Refs: FR-001, FR-003, FR-004, FR-012, NFR-001, AC-002, AC-007, AC-011 — Depends: T002, T007, T011
  - [ ] **PREP**: Confirm RED T007/T011.
  - [ ] **EXECUTE**: Extract `resolvePaddleSubscriptionInput`; branch on `customData.pending_purchase_id` (verified via `verifyPaddlePendingPurchase`) versus `customData.team_id`.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/api/webhooks/paddle.test.ts` — GREEN.
  - [ ] **VISUAL**: Not applicable — webhook handler only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm the existing `team_id` branch's behavior is unchanged (diff review).
  <!-- specsfy:evidence {"task":"T029","refs":["FR-001","FR-003","FR-004","FR-012","NFR-001","AC-002","AC-007","AC-011"],"files":["layers/billing/server/api/webhooks/paddle.post.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/api/webhooks/paddle.test.ts","exit":0}]} -->

- [ ] T030 [CODE] [US-001] Add the pending-purchase branch and claim-e-mail trigger in layers/billing/server/utils/billing/stripe-webhook-dispatch.ts (extracted from stripe.post.ts, which stays a thin defineEventHandler wrapper) — Refs: FR-004, FR-012, AC-001, AC-007, AC-008 — Depends: T001, T007, T008
  - [ ] **PREP**: Confirm RED T007/T008.
  - [ ] **EXECUTE**: In `dispatch()`, branch on `customer.metadata.pending_purchase_id` to call `recordConfirmedSubscription` instead of `syncStripeSubscription`, sending the claim e-mail only on first confirmation.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/utils/billing/stripe-webhook-dispatch.test.ts` — GREEN.
  - [ ] **VISUAL**: Not applicable — webhook handler only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm the existing `customer.subscription.*`/`checkout.session.*` branches for a team-upgrade checkout are unchanged.
  <!-- specsfy:evidence {"task":"T030","refs":["FR-004","FR-012","AC-001","AC-007","AC-008"],"files":["layers/billing/server/api/webhooks/stripe.post.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/utils/billing/stripe-webhook-dispatch.test.ts","exit":0}]} -->

- [ ] T031 [CODE] [US-001] Add signPaddlePendingPurchase/verifyPaddlePendingPurchase in layers/billing/server/utils/billing/paddle-team-signature.ts — Refs: FR-001, FR-003, NFR-001, AC-011 — Depends: T011, T001, T002
  - [ ] **PREP**: Confirm RED T011.
  - [ ] **EXECUTE**: Add the sign/verify pair reusing the file's existing HMAC helper, with the distinct domain-separation string.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/utils/billing/paddle-team-signature.test.ts` — GREEN.
  - [ ] **VISUAL**: Not applicable — server utility only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm a team signature cannot verify as a pending-purchase signature and vice versa.
  <!-- specsfy:evidence {"task":"T031","refs":["FR-001","FR-003","NFR-001","AC-011"],"files":["layers/billing/server/utils/billing/paddle-team-signature.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/utils/billing/paddle-team-signature.test.ts","exit":0}]} -->

- [ ] T032 [CODE] [US-001] Implement checkout.startBuyerCheckout (rate-limited, public) in layers/billing/server/trpc/checkout.ts, mounted in layers/billing/server/trpc/router.ts — Refs: FR-001, FR-002, FR-003, AC-001, AC-002, AC-003, AC-012, AC-013 — Depends: T001, T002, T003, T012, T013, T025, T031
  - [ ] **PREP**: Confirm RED T003/T012/T013 and completed T025/T031.
  - [ ] **EXECUTE**: Implement `startBuyerCheckout` (plan/destination validation via T027's re-check helper, `assertNotRateLimited`, provider customer/session creation, `PendingPurchase` insert); mount the new router.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/trpc/checkout.test.ts` — AC-001/AC-002/AC-003/AC-012/AC-013 GREEN.
  - [ ] **VISUAL**: Not applicable — server procedure only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm the rate limit matches the webhook's existing 60/min shape or states why it differs.
  <!-- specsfy:evidence {"task":"T032","refs":["FR-001","FR-002","FR-003","AC-001","AC-002","AC-003","AC-012","AC-013"],"files":["layers/billing/server/trpc/checkout.ts","layers/billing/server/trpc/router.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/trpc/checkout.test.ts","exit":0}]} -->

- [ ] T033 [CODE] [US-002] Implement checkout.getPendingPurchase (protected) in layers/billing/server/trpc/checkout.ts — Refs: FR-005, NFR-001, AC-005, AC-021 — Depends: T005, T021, T001
  - [ ] **PREP**: Confirm RED T005/T021.
  - [ ] **EXECUTE**: Implement the e-mail-match check returning an indistinguishable FORBIDDEN/NOT_FOUND.
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/trpc/checkout.test.ts` — AC-005/AC-021 GREEN.
  - [ ] **VISUAL**: Not applicable — server procedure only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm no plan/team fields leak in the error path.
  <!-- specsfy:evidence {"task":"T033","refs":["FR-005","NFR-001","AC-005","AC-021"],"files":["layers/billing/server/trpc/checkout.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/trpc/checkout.test.ts","exit":0}]} -->

- [ ] T034 [CODE] [US-002] Implement checkout.claimPurchase (protected, orchestrates T026/T027/T028) in layers/billing/server/trpc/checkout.ts — Refs: FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-012, AC-001, AC-002, AC-004, AC-006, AC-010, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019, AC-020, AC-022 — Depends: T001, T002, T004, T006, T010, T014, T015, T016, T017, T018, T019, T020, T022, T026, T027, T028
  - [ ] **PREP**: Confirm RED T004/T006/T010/T014/T015/T016/T017/T018/T019/T020/T022 and completed T026/T027/T028.
  - [ ] **EXECUTE**: Implement `claimPurchase`: atomic claim (T026), destination provisioning (T027), subscription upsert via `syncStripeSubscriptionForTeam`/Paddle equivalent (T028/T029).
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/trpc/checkout.test.ts` — full suite GREEN.
  - [ ] **VISUAL**: Not applicable — server procedure only.
  - [ ] **EVIDENCE**: Record the passing test command output.
  - [ ] **IMPROVE**: Confirm AC-022's concurrency case passes under the atomic claim transition without an added lock.
  <!-- specsfy:evidence {"task":"T034","refs":["FR-005","FR-006","FR-007","FR-008","FR-009","FR-010","FR-012","AC-001","AC-002","AC-004","AC-006","AC-010","AC-014","AC-015","AC-016","AC-017","AC-018","AC-019","AC-020","AC-022"],"files":["layers/billing/server/trpc/checkout.ts"],"commands":[{"run":"bunx vitest run layers/billing/server/trpc/checkout.test.ts","exit":0}]} -->

- [ ] T035 [CODE] [US-001] Implement the PurchaseClaim e-mail template in packages/emails/templates/PurchaseClaim.tsx — Refs: FR-004, AC-001, AC-007, AC-008 — Depends: T001, T007, T008
  - [ ] **PREP**: Confirm RED T007/T008; read `Invitation.tsx` for the existing React Email conventions.
  - [ ] **EXECUTE**: Implement the template (plan name, destination summary, claim link).
  - [ ] **VERIFY**: `bunx vitest run layers/billing/server/utils/billing/stripe-webhook-dispatch.test.ts` — the claim-e-mail assertions in T007/T008 GREEN.
  - [ ] **VISUAL**: Borders, spacing, margins, padding, and typography reviewed in the e-mail client preview during T030's verification (transactional e-mail markup, not a `.vue` screen).
  - [ ] **EVIDENCE**: Record the file created and its use from T030.
  - [ ] **IMPROVE**: Confirm the template's copy passes through `fireskill-specialist-copywriting` per `AGENTS.md`'s text rule.
  <!-- specsfy:evidence {"task":"T035","refs":["FR-004","AC-001","AC-007","AC-008"],"files":["packages/emails/templates/PurchaseClaim.tsx"],"commands":[{"run":"bunx vitest run layers/billing/server/utils/billing/stripe-webhook-dispatch.test.ts","exit":0}]} -->

#### Interface Phase

- [ ] T036 [CODE] [US-001] Implement the Buy page in apps/app/app/pages/buy/[planId].vue — Refs: FR-001, FR-002, AC-001, AC-002, AC-003, AC-012, AC-013 — Depends: T032
  - [ ] **PREP**: Load `$fireskill-specialist-nuxt-ui` before editing this `.vue` file; confirm completed T032.
  - [ ] **EXECUTE**: Build the `UCard`/`UForm` e-mail+provider form calling `checkout.startBuyerCheckout` (section 10 Screens/Forms).
  - [ ] **VERIFY**: Manual run against Stripe/Paddle test-mode credentials (section 16 Risks); component-level assertions in a Vitest/Vue Test Utils spec if the project's existing `.vue` test conventions apply (none currently exist for `/invite`, so this may be manual-only, recorded as such).
  - [ ] **VISUAL**: Inspect borders, spacing, margins, padding, and typography at desktop and mobile viewports, matching `/invite/[[id]]`'s `UModal`+`UCard` composition (section 10).
  - [ ] **EVIDENCE**: Record the manual verification screenshots/notes and any automated assertions.
  - [ ] **IMPROVE**: Register the component in `.fireskills/INTERFACE.md` (see T039).

- [ ] T037 [CODE] [US-002] Implement the Claim page in apps/app/app/pages/claim/[id].vue — Refs: FR-005, FR-006, FR-007, FR-008, FR-010, AC-004, AC-005, AC-006, AC-010, AC-014, AC-015, AC-016, AC-017, AC-018, AC-020 — Depends: T033, T034
  - [ ] **PREP**: Load `$fireskill-specialist-nuxt-ui`; confirm completed T033/T034; note DEC-002 (protected page, no `auth: false`).
  - [ ] **EXECUTE**: Build the `UCard` with the conditional `NEW_TEAM` name/slug `UForm` or the `EXISTING_TEAM` one-click accept, plus the loading/expired/rejected/success states.
  - [ ] **VERIFY**: Manual verification of all four states against a seeded `PendingPurchase` in each status.
  - [ ] **VISUAL**: Inspect borders, spacing, margins, padding, and typography for both destination variants and all four states, at desktop and mobile viewports (section 10).
  - [ ] **EVIDENCE**: Record the manual verification notes for each state.
  - [ ] **IMPROVE**: Register the component in `.fireskills/INTERFACE.md` (see T039).

- [ ] T038 [CODE] [US-003] Implement the pending-purchases admin listing in layers/admin/app/pages/admin/pending-purchases/index.vue and its listPendingPurchases procedure in layers/admin/server/trpc/admin-billing.ts — Refs: US-003, FR-011, AC-009, AC-023, AC-024 — Depends: T009, T023, T024
  - [ ] **PREP**: Load `$fireskill-specialist-nuxt-ui`; confirm RED T009/T023/T024.
  - [ ] **EXECUTE**: Implement `listPendingPurchases` (`platformAdminProcedure`) and the `PageHeader` + `UTable` (`enterpriseTableUi`) + `USelect` status filter screen; add its sidebar entry next to "Plans".
  - [ ] **VERIFY**: `bunx vitest run layers/admin/server/trpc/admin-billing.test.ts` — AC-009/AC-023/AC-024 GREEN; manual check of the sidebar entry and empty state.
  - [ ] **VISUAL**: Inspect borders, spacing, margins, padding, and typography, matching `/admin/plans`' existing table density (section 10).
  - [ ] **EVIDENCE**: Record the passing test command output and the manual sidebar/empty-state check.
  - [ ] **IMPROVE**: Register the component in `.fireskills/INTERFACE.md` (see T039).
  <!-- specsfy:evidence {"task":"T038","refs":["US-003","FR-011","AC-009","AC-023","AC-024"],"files":["layers/admin/app/pages/admin/pending-purchases/index.vue","layers/admin/server/trpc/admin-billing.ts"],"commands":[{"run":"bunx vitest run layers/admin/server/trpc/admin-billing.test.ts","exit":0}]} -->

- [ ] T039 [DOC] [US-001] Update .fireskills/INTERFACE.md with the Buy, Claim, and Pending-purchases screens — Refs: US-001, US-002, US-003 — Depends: T036, T037, T038
  - [ ] **PREP**: Confirm T036/T037/T038 completed.
  - [ ] **EXECUTE**: Add each screen's purpose, file path, API, states, and reuse rules per the skill's documentation contract.
  - [ ] **VERIFY**: Re-read `.fireskills/INTERFACE.md` to confirm no existing entry (e.g. `/admin/plans`) was overwritten.
  - [ ] **VISUAL**: Not applicable — documentation update, no rendered UI change.
  - [ ] **EVIDENCE**: Record the diff of `.fireskills/INTERFACE.md`.
  - [ ] **IMPROVE**: None needed — mechanical documentation update.

#### Final Quality Phase

- [ ] T040 [DOC] [US-001] Update .fireskills/DATABASE.md with the PendingPurchase table — Refs: FR-003, FR-011, AC-001 — Depends: T025
  - [ ] **PREP**: Confirm T025 completed and migration applied to the test database.
  - [ ] **EXECUTE**: Document the table, its states/transitions (spec section 9), and the 30-day expiry rule via `$fireskill-aux-database` or manually.
  - [ ] **VERIFY**: Cross-check the documented columns against `layers/billing/server/database/schema.ts`.
  - [ ] **VISUAL**: Not applicable — documentation update.
  - [ ] **EVIDENCE**: Record the diff of `.fireskills/DATABASE.md`.
  - [ ] **IMPROVE**: None needed — mechanical documentation update.

- [ ] T041 [DOC] [US-002] Update .fireskills/PROJECT.md "Boundaries and Non-Goals" to reflect that a purchase now provisions a team — Refs: FR-006, FR-007 — Depends: T027, T034
  - [ ] **PREP**: Confirm T027/T034 completed.
  - [ ] **EXECUTE**: Revise the line "Anything that consumes `Plan.buyerTeamMode`: no code creates a team or membership..." to describe the new, now-true behavior and its remaining boundary (re-purchase of an already-paid team stays out of scope).
  - [ ] **VERIFY**: Re-read the updated paragraph against the actual shipped scope (no overclaiming beyond this spec).
  - [ ] **VISUAL**: Not applicable — documentation update.
  - [ ] **EVIDENCE**: Record the diff of `.fireskills/PROJECT.md`.
  - [ ] **IMPROVE**: Run `$fireskill-documentator` for the full `docs/` rebuild this same slice (per `AGENTS.md`).

- [ ] T042 [TEST] Execute full regression and traceability across layers/billing, layers/admin, and layers/teams — Refs: US-001, US-002, US-003, FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, NFR-001, NFR-002, NFR-003 — Depends: T032, T033, T034, T035, T036, T037, T038, T040, T041
  - [ ] **PREP**: Confirm every predecessor task completed.
  - [ ] **EXECUTE**: Run `bun run test`, `bun run typecheck` (`apps/app`), `bunx vue-tsc --noEmit -p server/tsconfig.json`, `bun run check:i18n`, `bun run check:copy`.
  - [ ] **VERIFY**: Zero test failures; zero typecheck errors; i18n/copy gates pass for the new Buy/Claim/admin text (`layers/billing/i18n/locales/{en,pt-BR,es}.json`).
  - [ ] **VISUAL**: Final pass across Buy, Claim (all states), and Pending-purchases at desktop and mobile viewports — borders, spacing, margins, padding, typography.
  - [ ] **EVIDENCE**: Record every command's exit code and the final test/typecheck counts in section 12.
  - [ ] **IMPROVE**: Record any lesson learned via `$fireskill-lessons` (e.g., the migration-tooling decision in DEC-004).

### 15. Execution Order

- Critical Path: T025 (schema/migration) → T026 (repository) → T027 (provisioning) → T028/T029 (sync extraction, Stripe/Paddle) → T031 (Paddle signature) → T032/T033/T034 (checkout router) → T030 (Stripe webhook branch) → T036/T037 (Buy/Claim pages) → T042 (final regression).
- Parallel Tasks: `[P]` — T035 (email template) and T038 (admin listing) can proceed in parallel with T036/T037 once T032–T034's contracts exist, since none of the three share files; T039/T040/T041 (documentation) are parallel with each other once their respective code tasks land.
- MVP Strategy: T001, T002 (partial — NEW_TEAM only), T003, T012, T013, T025, T026, T027 (NEW_TEAM branch), T028, T032, T034 (NEW_TEAM path), T036, T037 (NEW_TEAM variant) is the smallest slice proving the end-to-end journey; the `EXISTING_TEAM` branch and US-003 (admin visibility) follow using the same repository/provisioning modules without re-architecting them.

## Act III — Deliver and Validate

### 16. Dependencies, Risks, and Assumptions

#### Dependencies

- `Plan.buyerTeamMode`/`buyerTeamId` (delivered, `b48e2ba`).
- Existing `layers/billing` checkout/webhook/idempotency infrastructure (delivered).
- OpenAuth (existing) for account creation/login at claim time.
- `layers/teams`' system roles (`ensureSystemRoles`) and `teams.create` validation shape (existing, reused).

#### Risks

- A buyer pays with an e-mail they later can't access (typo, shared inbox) → they cannot claim; mitigated by keeping the purchase visible to the admin after 30 days (FR-011), not by this spec inventing a self-service e-mail-change flow (explicitly out of scope).
- Stripe/Paddle test-mode credentials may not be available in this environment to exercise the real provider calls end-to-end → mitigated by unit/integration tests that mock only the SDK boundary (section 11), with real-provider verification called out as a manual step before Delivery Gate, consistent with `AGENTS.md`'s existing rule that `vitest`/`nuxt build` do not prove a Workers/SST-dependent path.
- Extracting `syncStripeSubscriptionForTeam` touches code with no existing test coverage gap tolerance (`subscription-sync.ts` has none today per the repository scan) → mitigated by adding characterization tests for the existing `syncStripeSubscription` wrapper before refactoring (task order in section 14 puts this ahead of new behavior).

#### Assumptions

- An already-authenticated user with no team who starts a checkout still goes through the same emailed claim link as an anonymous buyer, rather than a shortcut that skips the e-mail round-trip — one consistent code path, consciously simpler than a second branch for an edge case (see DEC-001 rationale extension: consistency chosen over the marginal convenience).
- A plan can be purchased at most through one active `PendingPurchase` per e-mail at a time is **not** enforced — two separate purchases by the same e-mail for two different plans are both allowed to exist as independent `PendingPurchase` rows; nothing in the backlog or discovery asked for a one-active-purchase-per-e-mail limit.
- "30 days" for expiry is a reasonable reversible default matching `TeamInvite`'s existing expiry, not a business requirement stated by the user; easy to change later without a data migration (just the constant used to compute `expiresAt`).

### 17. Decisions

- **DEC-001**: Pay-before-account, always via an emailed claim link — chosen over an account-first flow. Rationale: this is the only shape that works for a truly anonymous first-time buyer (the primary case `Plan.buyerTeamMode = NEW_TEAM` exists for); an account-first flow would still need this exact mechanism for that primary case, so building both would be two paths for one outcome. Trade-off accepted: an already-logged-in, team-less user pays the same e-mail round-trip cost (see Assumptions).
- **DEC-002**: The claim page is a normal protected Nuxt page (no `auth: false`), relying on the existing global `0.auth.global.ts` redirect-through-OpenAuth-and-back behavior — chosen over copying `/invite/[[id]]`'s public-page-plus-protected-mutation shape. Rationale: R-003 found that existing shape silently fails today for a logged-out visitor (empty `catch` around `acceptInvite`); reusing the global middleware's already-working redirect avoids reproducing that gap in a payment-adjacent flow.
- **DEC-003**: No new async/queue machinery for expiry or checkout-creation retries — expiry is computed on read (`expirePendingPurchaseIfDue`), and a `startBuyerCheckout` retry after a network error relies on the unique `providerCheckoutId` index rather than a dedicated idempotency-key parameter. Rationale: the existing webhook ledger already solves the higher-stakes idempotency problem (payment confirmation); this is a much lower-volume, lower-stakes path where a cron job or a second idempotency mechanism would be complexity without a corresponding requirement. Rate limiting (`assertNotRateLimited`) is added to `startBuyerCheckout` specifically because it creates real, costly provider API calls — a materially different risk than `addToWaitlist`'s plain insert.
- **DEC-004**: Schema change ships as a versioned `drizzle-kit` migration, not a hand-edit of `0000_init.sql` — chosen over following the immediately-preceding commit's precedent (which amended `0000_init.sql` directly for `Plan.buyerTeamMode`/`buyerTeamId` and noted "a deployed database would need to be recreated"). Rationale: `AGENTS.md` states the project rule explicitly ("Tasks that alter persistent database schemas must include [MIGRATION]: versioned migrations (drizzle-kit), applied during deployment, never on the development database"); the prior commit's shortcut was already flagged in that session's own summary as a deviation from process, not a precedent to repeat. Trade-off: the previous commit's `0000_init.sql` edit is left as-is (out of scope to fix retroactively); this spec only ensures its own new column does not repeat that pattern.

### 18. Definition of Done

- [ ] `Definition Gate` is `Passed`.
- [ ] `Plan Gate` is `Passed`.
- [ ] `Delivery Gate` is `Passed`.
- [ ] All applicable `AC` acceptance scenarios pass.
- [ ] All requirements have verified test evidence.
- [ ] All tasks in section 14 are completed.
- [ ] All static checks and automated test suites pass (`bun run test`, `apps/app` typecheck, `bunx vue-tsc --noEmit -p server/tsconfig.json`, `bun run check:i18n`, `bun run check:copy`).
- [ ] `.fireskills/DATABASE.md` updated with the new `PendingPurchase` table (this spec changes persistence, per `fireskill-04-validate`'s point 9).
- [ ] `.fireskills/INTERFACE.md` updated with the Buy, Claim, and Pending-purchases screens (new human interface, section 10).
- [ ] `.fireskills/PROJECT.md` "Boundaries and Non-Goals" line "Anything that consumes `Plan.buyerTeamMode`..." (currently in `fireskills/specialists/fireskill-specialist-billing/references/nuxfire-billing.md:39` and `PROJECT.md`) revised to reflect that a purchase now provisions a team, via `$fireskill-documentator`.

# Integrated Specification: Landing refactor: one offer, proven claims, light page

| Field | Value |
| --- | --- |
| Format | Specsfy/2.0 |
| ID | SPEC-0003 |
| Slug | 0003-landing-refactor-one-offer |
| Status | Draft |
| Effort | 1 |
| Effort updated at | 2026-09-25 |
| Effort rationale | Initial estimate; review during discovery. |
| ClickUp Task | |
| Milestones | |
| Definition Gate | Pending |
| Plan Gate | Pending |
| Delivery Gate | Pending |
| Evidence Contract | 1 |
| Human Interface | To be defined |
| Updated at | 2026-09-25 |

## Act I — Define

### 1. Problem and Desired Outcome

#### Problem

The Nuxfire home page does not sell. It has ten sections after the hero and about 47 bordered boxes; 64 % of its text is technical argument (comparison table, database architecture, the six Fireskills steps); its main button goes to a WhatsApp group, not to a purchase; the price is stated four ways (`$49` hard-coded, "$79 regular price afterwards", "one-time payment", "annual or lifetime") and none of them is the owner's price (regular R$ 497,00, launch R$ 97,00, confirmed 2026-09-25); 152 claims have no proof and eight testimonials cannot be verified; the title is the placeholder "Demo SaaS"; the hero has no image of the product; the page ships 280 KB of JavaScript and 3.4 MB of avatar photos and paints its main text in 4.2 to 4.6 s in the lab profile (Astro reference page: 2.1 to 2.4 s). See `research/landing-audit.md`.

In addition, the license page did not name the real seller and licensor; the third-party name it carried was removed on 2026-09-25 and the correct seller must be written before any sale (Q-01).

#### Desired Outcome

A page with one goal: a qualified visitor buys the one offer. The offer button leads to a Stripe checkout (wired by a later spec; until then it points to one configurable address). The technical depth lives in posts and docs and is linked as proof. Every claim on the page has a ledger record, the layout is clean with few boxes and loose, spaced content, and the page passes the three gates (`check:seo`, `check:perf`, `check:copy`) with no allowance owned by `BACKLOG-landing-refactor`.

#### Success Metrics

- Allowances and baselines owned by `BACKLOG-landing-refactor` (152 unproven claims, 19 testimonial entries, 1 urgency phrase, 3 placeholder titles, image and byte baselines of the three home routes): from those entries to **0**.
- Landing text in `en.json`: from 35,990 to at most **8,000 characters** (project decision, to confirm), with the removed depth published as posts and docs.
- Sections on the home: from 10 to at most **7**; bordered boxes: from about 47 to at most **10**.
- Lab LCP (Lighthouse mobile, applied throttling, 3 runs) at or below **2.5 s** on all three home routes; no image above 200,000 bytes; home JavaScript below the SPEC-0002 baseline of 280,097 bytes by a target set in the plan gate.
- Field: LCP, INP, CLS at the 75th percentile in Search Console after launch (no baseline exists today; recorded when data exists).
- Conversion: **no baseline exists** (no analytics on the site). The spec defines the measurement (Q-06) before any conversion number is promised.

### 2. Research and Clarifications

#### Executed Research

- **R-001** [critical] The owner's belief that Nuxfire is "the first structure 100 % built on the Cloudflare ecosystem" — Verdict: unsupported — Confidence: medium — Evidence: `research/market-positioning.md` (several Nuxt kits already run on Cloudflare; search summaries and one page read RAW) — Budget: 4/8. Impact: the claim cannot be written; the positioning uses checkable facts.
- **R-002** [critical] Ownership of the code sold — Verdict: verified by owner statement (2026-09-25: "the code is mine") — Confidence: medium (the analyst did not verify it) — Evidence: `research/market-positioning.md` section 2 — Budget: 1/8. Impact: no gate on ownership; every third-party name is removed from the license, code comments and copy, and the real seller is written on the license page (Q-01).
- **R-003** Systematic audit of the home (structure, copy claims, SEO, performance, layout) → 10 sections with a keep, cut, move or rewrite verdict each; 14 copy findings (P0 to P2) → `research/landing-audit.md`.
- **R-004** Competitor prices (SuperSaas $149; premium kits $200 to $600 per a search summary) and the owner's price (regular R$ 497,00, launch R$ 97,00) → the price is the owner's decision (Q-02); a cross-currency comparison is a claim and is not written until sourced.

#### Consulted Sources and Context

- Repository: `apps/web/app/pages/index.vue`, `components/landing/*`, `apps/web/i18n/locales/{en,pt-BR,es}.json`, `apps/web/content/license.md`, `perf-budgets.json`, `scripts/copy-baseline.json`, `scripts/seo-config.json`, `git log`.
- SPEC-0002 research (`baseline-measurements.md`, `lab-measurements.md`, `zero-js-spike.md`) and the specialists `fireskill-specialist-copywriting`, `-seo`, `-web-performance`.
- Owner brief of 2026-09-25 (in chat): single objective, Stripe checkout later, technical content as proof, audience hypothesis (developers and beginners in vibe coding), Cloudflare positioning, community, layers and design blocks, clean layout.

#### Consulted Documentation

- https://supersaas.dev/ (read 2026-09-25); web search results of 2026-09-25 (titles and summaries only, mode SUM).

#### Stored Research Artifacts

- `specs/draft/0003-landing-refactor-one-offer/research/landing-audit.md`: the audit, written by the analyst from repository files and measurements.
- `specs/draft/0003-landing-refactor-one-offer/research/market-positioning.md`: competitor facts with URLs and dates and the ownership statement. Paraphrases only; no page is copied.

#### Resolved Questions

- **Q**: What is the single goal? → **A** (owner, 2026-09-25): sell the offer; the button leads to a Stripe checkout implemented later.
- **Q**: Where does technical content go? → **A**: posts and docs, as proof, not as the sales argument.
- **Q**: Layout direction? → **A**: clean, fewer cards, more loose and spaced content.
- **Q**: Who owns the code? → **A** (owner, 2026-09-25): the code is the owner's; the branding was changed to nuxfire. Every third-party name is removed.
- **Q**: What is the price? → **A** (owner, 2026-09-25): regular R$ 497,00, launch R$ 97,00, in reais; the launch price is for the first 100 buyers and R$ 497,00 will be the price afterwards.
- **Q**: One-time or annual? → **A**: one price, paid once; one year of updates is included.
- **Q**: License terms and refund? → **A**: only what the law requires (Brazil). The analyst read the text of the Brazilian consumer code, art. 49: the consumer may withdraw within 7 days of signing or receiving the product or service when the contract is made outside the commercial establishment; amounts paid are returned at once, monetarily updated (https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm, read 2026-09-25). Whether it applies to a digital code download is a legal interpretation for the owner's lawyer; the "14-Day Money-Back Guarantee" of the current page is therefore removed unless the owner decides to offer it.
- **Q**: Payment from outside Brazil? → **A**: Stripe accepts (owner statement, not verified by the analyst).
- **Q**: Are the testimonials and the number of testers real? → **A** (owner): yes, more than 10 developers (not 40); keep the testimonials as they are, no further proof. Recorded as owner statements in the ledger (verifier `owner-statement`, with name and date); the conditions in Q-03 apply.
- **Q**: The WhatsApp community group? → **A**: eliminated from the page and from the benefits.
- **Q**: Is there a public demo? → **A**: no; a visitor talks to the owner through a scheduled call or by WhatsApp support (+55 11 94020-4449). The FAQ about a live demo and every "demo" line are rewritten.
- **Q**: Analytics? → **A**: yes, privacy-friendly analytics may measure clicks on the offer button; the tool is chosen in the plan after a sourced comparison (Q-05).
- **Q**: Audience? → **A**: use what the site already says (developers and beginners building with AI tools such as Cursor, Claude Code and v0). It is the owner's existing positioning, not interview data; the copy brief marks it so (PR-005).
- **Q**: Language order? → **A**: pt-br first, then en and es.
- **Q**: Payment methods? → **A** (owner): card through Stripe; Pix through WhatsApp support.

#### Open Questions

- **Q-01** (blocks the license page, Stripe and invoices): the legal seller. "Nuxfire Starter Kit SaaS" is the product name; the license, Stripe and the fiscal document need the name of the person or company that sells, with its tax number (CPF or CNPJ). The address `hi@nuxfire.com` is already in the license text: confirm it as the contact.
- **Q-02** (blocks the offer text): what R$ 497,00 and R$ 97,00 include beyond one year of updates. The pricing card lists 12 items (monorepo source, multi-tenancy, auth, realtime, queues, billing, email, admin, database, storage, kanban, updates); confirm which stay and remove those that are not delivered.
- **Q-03** (blocks proof): the testimonials stay as the owner said, with two conditions the analyst cannot waive: (a) two photos are used for two different names each (`xZ4wg2Xj.jpeg` for Alex Rivera and Sarah Johnson, `FJkauyEa.jpeg` for Marcus Vance and Michael Chen), and two different people cannot share one photo, so each person gets their own photo or no photo; (b) the person who gave each quote consented to its publication (owner confirms, one sentence). Quotes with figures ("2 months", "48 hours", "cut bills to zero") stay only if the owner confirms each figure came from that person.
- **Q-04**: how a visitor books the call: a scheduling link (which tool) or by WhatsApp message; and the support hours to state.
- **Q-05**: the analytics tool. To be decided in the plan from a dated comparison; the owner chooses.
- **Q-06**: the fiscal document. The Stripe help page read (2026-09-25) says Stripe stopped issuing the electronic service invoice for **its own fees** to merchants in São Paulo; it does not say that Stripe issues the merchant's fiscal document to the buyer. Who issues the nota fiscal to the buyer (the owner's accountant)? The page must not promise one until this is answered.
- **Q-07**: Pix. Stripe documents Pix in Checkout (BRL, Brazil) at https://docs.stripe.com/payments/pix (read 2026-09-25). Enable Pix in Stripe, which would make it automatic, or keep Pix by WhatsApp (manual)?
- **Q-08**: the launch limit "first 100 buyers": how sales are counted and where the price switches to R$ 497,00 (this belongs to the checkout spec), and what the page shows when the 100 are sold.
- **Q-09**: visitors in English and Spanish: keep the price in reais (a foreign card pays in BRL) or add another currency?

### 3. Scope and Actors

#### In Scope

- Audit-driven refactor of the home page (`en`, `pt-br`, `es`): structure, copy, layout, SEO metadata and structured data, images, hydration and weight.
- The single offer block with its call to action pointing to one configurable address (a Stripe checkout URL is filled in by the later spec).
- Moving the removed technical depth into blog posts and docs (with `fireskill-specialist-content-seo`), linked from the page as proof.
- The claim ledger records, the testimonial records (only real ones), and the removal of the allowances owned by `BACKLOG-landing-refactor`.
- Correction of the license page text and of every statement of the seller, after Q-01; removal of the WhatsApp community group and of every demo promise; the support contact by scheduled call and WhatsApp.

#### Out of Scope

- The Stripe checkout, webhooks, license delivery and the thank-you page (a later spec).
- New product features: layers for agenda, chat, agent, and the reusable design blocks (backlog items `0004` and `0005`); the landing states only what exists today.
- Paid acquisition, email marketing and community management.
- Redesign of the docs and blog layouts.
- Any deploy or IndexNow submission without the owner's authorization.

#### Actors

- **Visitor (developer or beginner building with AI tools)**: decides whether the kit is worth the price.
- **Owner**: decides the offer, the truth of claims and testimonials, and authorizes publication.
- **Search engines and social networks**: read the title, description, structured data and preview image.
- **Copy, SEO and performance gates**: refuse a page that claims without proof, weighs too much or misleads a crawler.

### 4. Principles and Constraints

- **PR-001**: The page has one goal and one primary action; everything on it either helps that decision or is removed.
- **PR-002**: Technical depth is proof, linked, not argument; the page never asks the visitor to understand the architecture to buy.
- **PR-003**: No claim without a ledger record; no testimonial without a person who exists, used the product and consented; no deadline without a real dated limit.
- **PR-004**: Nothing is asserted about competitors or the market without a dated source; "the first" and similar superlatives are not used.
- **PR-005**: The audience is a hypothesis until interviews exist; the copy brief says so.
- **PR-006**: No deploy, no IndexNow submission and no checkout wiring without the owner's explicit authorization, and nothing is sold before the license page names the real seller (Q-01).
- **PR-009**: The page states the refund only as the law requires; it does not offer a guarantee the owner did not decide to give.
- **PR-008**: A price shown as "from X to Y" or a "launch" label exists only with a real reference price and a real, dated or counted limit (EU Directive 2005/29/EC Annex I(7); Brazilian CDC arts. 36 to 38: not legal advice); the copy reads them from the offer configuration.
- **PR-007**: The words go through `fireskill-specialist-copywriting` in the persuade register; the page is judged by the three gates and a separate review pass.

### 5. User Stories

#### US-001 — A visitor understands the offer and buys (P1)

As a developer or a beginner building with AI tools, I want to see what I get, for whom it is, what it costs and why I can trust it, so that I can decide to buy in one visit.

**Why P1**: it is the only purpose of the page.
**Independent Test**: on the built home, one primary button exists in the hero and one in the offer, both to the configured address; the price shown equals the configured offer; a reader can find price, license, refund and what is included without leaving the page.
**Requirements**: FR-001, FR-002, FR-003, FR-004

#### US-002 — The owner can prove every claim (P1)

As the owner, I want each claim on the page to have evidence a machine can check, so that I can answer any question about it.

**Why P1**: the page is a legal and commercial promise.
**Independent Test**: `bun run check:copy` exits 0 with no allowance for `landing.*`.
**Requirements**: FR-005, FR-006

#### US-003 — Search engines and social networks show an accurate page (P2)

As the owner, I want a specific title, a written description, correct structured data and a preview image per language, so that the page is found and shown as it is.

**Why P2**: discovery depends on it, and the placeholder title is public today.
**Independent Test**: `bun run check:seo` exits 0 and the allowances of `title-not-placeholder` for `/`, `/pt-br` and `/es` are removed.
**Requirements**: FR-007, FR-008

#### US-004 — The page loads fast (P2)

As a visitor on a phone, I want the main text to appear quickly, so that I do not leave.

**Why P2**: speed affects the visit and Google recommends good Core Web Vitals.
**Independent Test**: `bun run check:perf` exits 0 and the lab protocol gives LCP at or below 2.5 s on the three routes.
**Requirements**: FR-009, NFR-001, NFR-002

#### US-005 — The technical depth convinces without crowding the page (P2)

As a developer who wants proof, I want the step by step of Fireskills, the data model and the feature inventory in posts and docs, so that I can verify what the page says.

**Why P2**: proof builds trust, and it must exist before it is removed from the home.
**Independent Test**: each block moved from the home has a published page in three languages and a link from the home.
**Requirements**: FR-010

#### US-006 — The page reads naturally in three languages (P2)

As a Portuguese or Spanish speaker, I want the page written for me, not translated word by word, so that it persuades in my language.

**Why P2**: the site follows the visitor's language.
**Independent Test**: `bun run check:i18n` exits 0 and a native review of each language is recorded.
**Requirements**: FR-011

### 6. BDD Acceptance Scenarios

#### AC-001 — One goal, one price, one action

**Covers**: US-001, FR-001, FR-002, FR-003, FR-004

```gherkin
@US-001 @FR-001 @FR-002 @FR-003 @FR-004 @AC-001
Feature: The home sells one offer

  Scenario: The visitor finds price, action and terms
    Given the built home in any of the three languages
    When the visitor reads it from the top
    Then there is one offer with one price read from a single configuration
    And the primary button in the hero and the one in the offer lead to the configured address
    And the license terms, the refund terms and what is included are on the page
```

#### AC-002 — A claim without proof does not ship

**Covers**: US-002, FR-005, FR-006

```gherkin
@US-002 @FR-005 @FR-006 @AC-002
Feature: Claims are proven

  Scenario: A number without a ledger record
    Given a number, comparison, guarantee or deadline in a landing text
    When `bun run check:copy` runs
    Then it fails with the rule and the key unless a ledger record proves it
    And no allowance owned by the landing refactor remains
```

#### AC-003 — Metadata and structured data are honest and specific

**Covers**: US-003, FR-007, FR-008

```gherkin
@US-003 @FR-007 @FR-008 @AC-003
Feature: The head describes the page

  Scenario: Title, description and markup
    Given the built home in each language
    When `bun run check:seo` runs
    Then the title is unique and not a placeholder and the description is written for the page
    And the JSON-LD has no rating, review or FAQ markup and its price equals the visible price
```

#### AC-004 — The page stays inside its weight budget

**Covers**: US-004, FR-009, NFR-001, NFR-002

```gherkin
@US-004 @FR-009 @NFR-001 @NFR-002 @AC-004
Feature: A light page

  Scenario: Budgets
    Given the built site
    When `bun run check:perf` runs and the lab protocol is applied
    Then no image exceeds 200,000 bytes and every image has dimensions
    And the lab LCP is at most 2.5 s on the three routes
```

#### AC-005 — The removed depth exists as proof

**Covers**: US-005, FR-010

```gherkin
@US-005 @FR-010 @AC-005
Feature: Proof pages

  Scenario: A section leaves the home
    Given a technical block removed from the home
    When the site is built
    Then a post or doc page in each language holds it and the home links to it
    And `bun run check:seo` passes for the new pages
```

#### AC-006 — Nothing is sold before the seller is named

**Covers**: US-001, FR-012

```gherkin
@US-001 @FR-012 @AC-006
Feature: Seller gate

  Scenario: Publishing the refactored page
    Given the license page does not name the real seller (Q-01)
    When the page is prepared for publication
    Then the page is not published and the offer button does not point to a checkout
```

### 7. Requirements

#### Functional

- **FR-001**: The home shall present one offer with one primary action, repeated at most twice (hero and offer), pointing to one configurable address.
- **FR-002**: The price, currency (reais: regular R$ 497,00, launch R$ 97,00 until the limit of Q-02) and plan model shall be read from one configuration source used by the visible text, the structured data and (later) the checkout.
- **FR-003**: The page shall state the license terms, the refund terms and what is included, using only the terms the owner confirmed (Q-02).
- **FR-004**: The page shall show what the product is with a real visual of it (screenshots or a recording), with dimensions and a modern format.
- **FR-005**: Every number, comparison, guarantee, deadline, named source and testimonial in the landing text shall have a ledger record with a verifier, or be removed.
- **FR-006**: Testimonials shall appear only with a record of a person who exists, used the product, consented and has their own photo; otherwise the block is absent.
- **FR-007**: Each language shall have a unique, specific `<title>`, a description written for the page and a preview image.
- **FR-008**: The structured data shall follow `references/structured-data.md` of the SEO specialist: no rating, review or FAQ markup unless real and eligible.
- **FR-009**: The home shall meet the budgets of `perf-budgets.json` with the baseline lowered to the new measured values and no landing allowance left.
- **FR-010**: The technical blocks removed from the home shall be published as posts or docs in `en`, `pt-br` and `es` and linked from the home.
- **FR-011**: The copy shall be written by transcreation for each language and reviewed by a separate pass.
- **FR-013**: The page shall not mention the WhatsApp community group or any demo; the secondary action is "talk to us" through a scheduled call or the support WhatsApp number, read from one configuration.
- **FR-014**: The page shall say "one year of updates" and shall not say lifetime, annual plan or continuous updates.
- **FR-015**: The refund text shall state only what the law requires (Brazilian consumer code, art. 49) in the words the owner and a lawyer approve, and shall not carry the "14-Day Money-Back Guarantee".
- **FR-016**: The launch price R$ 97,00 shall be shown only while the counted limit of the first 100 buyers is enforced by the checkout (Q-08); until it is, the page shows the price that is real.
- **FR-012**: The refactored page shall not be published, and no checkout shall be linked, until the license page names the real seller and licensor (Q-01).

#### Non-Functional

- **NFR-001**: Lab LCP at most 2.5 s (Lighthouse, mobile, applied throttling, median of 3 runs) on `/`, `/pt-br`, `/es`. **Verification**: the lab protocol of SPEC-0002 recorded in `research/`.
- **NFR-002**: No image above 200,000 bytes; every `<img>` has `width` and `height`; the hero product image has `fetchpriority="high"`. **Verification**: `bun run check:perf`.
- **NFR-003**: The layout has at most 10 bordered boxes and at most 7 sections, with spacing that follows the design system. **Verification**: a component inventory in the review and a visual check on three viewports.
- **NFR-004**: The page is operable with the keyboard, with sufficient contrast and named controls (the conformance level is fixed by the accessibility specialist in the plan). **Verification**: `$fireskill-specialist-web-accessibility` review and an automated check chosen in the plan.
- **NFR-005**: All gates (`bun run test`, typechecks, `check:seo`, `check:perf`, `check:copy`, `check:i18n`) pass on a fresh build with the real `SITE_URL`. **Verification**: the commands.

#### Errors and Edge Cases

- The support contact (WhatsApp number or booking link) is missing in the configuration → the build fails.
- The configured offer address is empty → the offer button is disabled with a visible "not available yet" text; the build fails in production mode instead of shipping a dead link.
- A price or currency is missing in the configuration → the build fails.
- A locale lacks a landing key → `check:i18n` fails.
- An image is added above the byte limit or without dimensions → `check:perf` fails.
- A claim text changes while its ledger record does not → `claim-text-mismatch` fails.

## Act II — Design and Prove

### 8. Technical Plan

This section is the plan the owner asked for. Its phases are ordered; nothing after Phase 0 starts before Q-01 and Q-02 are answered.

#### Existing Context

- `apps/web`: Nuxt 4.5, `@nuxt/ui`, `@nuxt/content`, `@nuxt/image` (unused for landing images), i18n in three languages, gates from SPEC-0002 with baselines owned by `BACKLOG-landing-refactor`. Sections in `components/landing/*`, page in `pages/index.vue`.
- Known defects and their evidence: `research/landing-audit.md`; market and provenance: `research/market-positioning.md`.

#### Architecture and Modules

- **Phase 0 — Gate (owner decisions)**: Q-01 (the legal seller), Q-02 (the rest of the offer), Q-03 (real proof), then write the seller on `license.md`. Output: decisions recorded in section 17 and the license text approved by the owner and, at the owner's choice, a lawyer.
- **Phase 1 — Research and brief**: audience interviews or community reading (Q-07), search-intent data (Search Console once verified, or a documented tool), sourced competitor comparison, the value proposition sentence (CXL template), messaging hierarchy. Output: a copy brief per language in `research/`.
- **Phase 2 — Structure and copy**: one outline (proposed, to be confirmed after Phase 1): hero with the product visual; the problem in the visitor's words; what you get in six outcomes; how it works in three steps with links to proof; who it is for and not for; proof (real testimonials or none; facts through the ledger); the offer; the buyer's real questions; final call to action. Copy in three languages by transcreation; ledger records; a separate review pass.
- **Phase 3 — Proof content**: publish the Fireskills walkthrough, the data model, the feature inventory and the folder structure as posts and docs in three languages (content-seo specialist), before removing them from the home.
- **Phase 4 — Build**: new small sections with one idea each and open spacing; one `landing.offer` configuration (price, currency, plan, terms, checkout address); product images through `NuxtImg` with dimensions, sizes and avif or webp; remove the client-only comparison search, the testimonial marquee and the animated pricing card; lazy hydration for anything interactive below the fold; keep the shared header working (SPEC-0002 spike: no `noScripts` on the home).
- **Phase 5 — SEO**: specific title and description per language, `SoftwareApplication` with `offers` (no rating or review), `Organization` only with the owner's confirmed facts, a preview image per language, canonical and hreflang as today; IndexNow after an authorized deploy.
- **Phase 6 — Verify**: full regression, the three gates with the baselines lowered and no landing allowance, the lab protocol on three routes, keyboard and contrast review, a visual review on three viewports, a separate copy review per language; then request authorization to deploy.
- **Phase 7 — Later spec**: Stripe checkout, webhooks, license delivery and thank-you page, reading the same `landing.offer` configuration.

#### Views and UI Experience

- Loose, single-column content with generous spacing and a clear order, cards only for the offer; the design system tokens of `.fireskills/DESIGNSYSTEM.MD`; dark mode remains mandatory (project rule).

#### File Structure

```text
specs/draft/0003-landing-refactor-one-offer/
  spec.md
  research/
    landing-audit.md
    market-positioning.md
apps/web/
  app/pages/index.vue
  app/components/landing/
  i18n/locales/
  content/
```

#### Migrations, Models, Procedures, Queries, Jobs

- Not applicable: no persistence, procedure or job changes in this spec (the checkout spec adds them).

### 9. Data Model

Not applicable: the offer configuration is a typed constant or runtime config, not a table. To be confirmed in the plan.

### 10. Interfaces and Contracts

#### Human Interface

- **Human interface present**: Yes, the public home page in three languages.

#### Screens and Responsibilities

- Home (`/`, `/pt-br`, `/es`): visitor; goal: decide to buy; outputs: a click on the offer button.

#### States and Accessibility

- Loading is not applicable (prerendered); the offer button has a disabled state when no address is configured; every control has an accessible name; the shared header controls must be operable (the spike found five unnamed buttons).

#### Exposed and External APIs

- None in this spec. The checkout address is a plain link until the checkout spec.

### 11. TDD Strategy

- **Unit**: the offer configuration validator (price, currency, address), pure text builders if any.
- **Integration/Contract**: `check:copy`, `check:seo`, `check:perf` and `check:i18n` on a fresh build; a test that the visible price equals the configured price and the JSON-LD price.
- **BDD/Acceptance**: AC-001 to AC-006 in section 6.
- **Test Runner**: Vitest via `bun run test`.
- **E2E**: a build with `SITE_URL` and the lab protocol.

#### RED-GREEN-REFACTOR Evidence

| IDs | Reference BDD | TDD Test Case | Observed RED | Observed GREEN | Refactor/Regression |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-002, AC-001 | AC-001 | Pending: written after the definition gate | Pending | Pending | Pending |
| US-002, FR-005, FR-006, AC-002 | AC-002 | Pending | Pending | Pending | Pending |
| US-003, FR-007, FR-008, AC-003 | AC-003 | Pending | Pending | Pending | Pending |

### 12. Test Plan and Traceability

| Requirement | BDD Scenario | Level | Test File/Command | Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | AC-001 | Integration | to be named in the tasks | Pending |
| FR-005 | AC-002 | Integration | `bun run check:copy` | Pending |
| FR-007 | AC-003 | Integration | `bun run check:seo` | Pending |
| FR-009 | AC-004 | Integration | `bun run check:perf` | Pending |
| NFR-001 | AC-004 | Lab | lab protocol | Pending |
| FR-012 | AC-006 | Manual gate | recorded decision | Pending |

### 13. Validations

#### Act I Gate — Definition

- **Result**: Pending
- **Command**: `bun run fireskill validate 0003 --strict`
- **Findings**: Pending. Q-01 to Q-09 are open (see section 2); Q-01 blocks the seller's name on the license page and Stripe, Q-02 the final list of what the price includes and Q-03 the consent of the testimonials.

#### Act II Gate — Plan

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs specs/draft/0003-landing-refactor-one-offer/spec.md --allow-draft`
- **Findings**: Tasks T001 to T013 written on 2026-09-25 (9 executed, 4 open). The validator reports the two errors that a Draft spec must have (Definition Gate not Passed) and four about traceable TDD predecessors (T005, T007, T008, T012: it wants three RED cases per CODE task, and the slice was covered by three test files, 29 cases); the Plan Gate stays Pending until the open tasks are re-planned.

#### Act III Gate — Delivery

- **Result**: Pending (T010 to T013 are open)
- **Command**: `node fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs specs/draft/0003-landing-refactor-one-offer/spec.md .`
- **Findings**: Slice executed on 2026-09-25 with `SITE_URL=https://nuxfire.com`: `bun run test` 570 passed, 1 skipped; `apps/web` typecheck 0 errors; `check:seo`, `check:perf`, `check:copy` and `check:i18n` exit 0. Home HTML 23,429 to 11,246 bytes (brotli), images 3,447,493 to 27,162 bytes, requests 64 to 56, total transfer of `/pt-br` 5.1 MB to 0.44 MB. Lighthouse 13.5.0 mobile, applied throttling, `/pt-br` three runs: LCP 3,535, 2,859 and 3,454 ms (before 4.2 to 4.6 s; **the 2.5 s target of NFR-001 is not met**), TBT 1.5 to 2.0 s, accessibility 1.00, SEO 1.00 (before 0.95 and 0.92). Sections 7, bordered boxes 5, English landing text 4,527 characters (from 35,990). Not met or open: LCP target and JavaScript reduction (T012); the English home `/` still downloads the Content database (1.1 MB, task spawned); the seller's name (Q-01, T011); deploy (T010).

### 14. Tasks

Format:
`- [ ] TNNN [P?] [TYPE] [US-NNN?] Action with file path — Refs: IDs — Depends: IDs|none`

Every task maintains the six-item checklist (PREP, EXECUTE, VERIFY, VISUAL, EVIDENCE, IMPROVE).

Tasks T001 to T009 were executed on 2026-09-25 after the owner asked to advance without waiting for the open questions (Q-01 to Q-09 stay open where noted). Tasks T010 to T013 remain open.

#### Phase 1 — RED TDD Informed by BDD

- [x] T001 [TEST] [TDD] [US-001] Derive from AC-001 failing Vitest cases for the offer configuration, price formatting, support link and structured data in `apps/web/app/utils/offer.test.ts` — Refs: US-001, US-003, FR-002, FR-008, FR-013, AC-001, AC-003 — Depends: none
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.

- [x] T002 [TEST] [TDD] [US-002] Derive from AC-002 a failing Vitest case that a testimonial shown without a photo is valid and not a shared image in `scripts/copy-rules.test.ts` — Refs: US-002, FR-006, AC-002 — Depends: none
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.

- [x] T003 [TEST] [TDD] [US-001] Derive from AC-001, AC-002, AC-003 and AC-005 failing Vitest cases for the landing contract (same keys in three languages, numbers from the offer, ruled-out words absent, at most seven sections, technical blocks removed, docs links exist, specific title and description) in `apps/web/app/utils/landing-contract.test.ts` — Refs: US-001, US-002, US-003, US-005, US-006, FR-001, FR-005, FR-007, FR-010, FR-011, FR-013, FR-014, FR-015, NFR-003, AC-001, AC-002, AC-003, AC-005 — Depends: none
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.


#### Phase 2 — Implementation

- [x] T004 [CODE] [US-001] Implement the offer module and its composable, and the `checkoutUrl` runtime configuration, in `apps/web/app/utils/offer.ts`, `apps/web/app/composables/use-offer.ts` and `apps/web/nuxt.config.ts` — Refs: US-001, US-003, FR-001, FR-002, FR-008, FR-013, AC-001, AC-003 — Depends: T001
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.
  <!-- specsfy:evidence {"task": "T004", "refs": ["US-001", "US-003", "FR-001", "FR-002", "FR-008", "FR-013", "AC-001", "AC-003"], "files": ["apps/web/app/utils/offer.ts", "apps/web/app/composables/use-offer.ts", "apps/web/nuxt.config.ts"], "commands": [{"run": "bunx vitest run apps/web/app/utils/offer.test.ts", "exit": 0}]} -->

- [x] T005 [CODE] [US-002] Allow a testimonial without a photo in the claim ledger rules in `scripts/copy-rules.ts` — Refs: US-002, FR-006, AC-002 — Depends: T002
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.
  <!-- specsfy:evidence {"task": "T005", "refs": ["US-002", "FR-006", "AC-002"], "files": ["scripts/copy-rules.ts"], "commands": [{"run": "bunx vitest run scripts/copy-rules.test.ts", "exit": 0}]} -->

- [x] T006 [DOC] [US-006] Write the landing copy in pt-br, en and es by transcreation, with the numbers as placeholders, in `apps/web/i18n/locales/pt-BR.json`, `en.json` and `es.json` — Refs: US-001, US-006, FR-001, FR-002, FR-011, FR-013, FR-014, FR-015, AC-001 — Depends: T003
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.

- [x] T007 [CODE] [US-001] Build the seven landing sections and the page with the head and structured data, remove the old sections, the marquee, the pricing card and the avatar photos in `apps/web/app/components/landing/`, `apps/web/app/pages/index.vue` and `apps/web/public/static/` — Refs: US-001, US-003, US-004, US-005, FR-001, FR-003, FR-004, FR-007, FR-008, FR-009, FR-010, NFR-002, NFR-003, AC-001, AC-003, AC-004, AC-005 — Depends: T004, T006
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Reviewed on desktop and phone (see section 13).
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.
  <!-- specsfy:evidence {"task": "T007", "refs": ["US-001", "US-003", "US-004", "US-005", "FR-001", "FR-003", "FR-004", "FR-007", "FR-008", "FR-009", "FR-010", "NFR-002", "NFR-003", "AC-001", "AC-003", "AC-004", "AC-005"], "files": ["apps/web/app/pages/index.vue", "apps/web/app/components/landing/LandingHero.vue", "apps/web/app/components/landing/LandingOffer.vue", "apps/web/app/components/landing/LandingOutcomes.vue", "apps/web/app/components/landing/LandingMethod.vue", "apps/web/app/components/landing/LandingProof.vue", "apps/web/app/components/landing/LandingAudience.vue", "apps/web/app/components/landing/LandingProblem.vue"], "commands": [{"run": "bunx vitest run apps/web/app/utils/landing-contract.test.ts", "exit": 0}, {"run": "cd apps/web && bun run typecheck", "exit": 0}]} -->

- [x] T008 [CODE] [US-002] Record the claims in the ledger and reduce the baselines and allowances to what remains in `.fireskills/CLAIMS.yml`, `scripts/copy-baseline.json`, `perf-budgets.json` and `scripts/seo-config.json` — Refs: US-002, US-003, US-004, FR-005, FR-007, FR-009, AC-002, AC-003, AC-004 — Depends: T007
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.
  <!-- specsfy:evidence {"task": "T008", "refs": ["US-002", "US-003", "US-004", "FR-005", "FR-007", "FR-009", "AC-002", "AC-003", "AC-004"], "files": [".fireskills/CLAIMS.yml", "scripts/copy-baseline.json", "perf-budgets.json", "scripts/seo-config.json"], "commands": [{"run": "bun run check:copy", "exit": 0}, {"run": "bun run check:perf", "exit": 0}, {"run": "bun run check:seo", "exit": 0}]} -->

- [x] T009 [TEST] [US-004] Run the full regression, a fresh build with `SITE_URL`, the four gates and the visual review on desktop and phone, and record the results in section 13 — Refs: US-001, US-004, NFR-001, NFR-002, NFR-003, NFR-005, AC-004 — Depends: T007, T008
  - [x] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [x] **EXECUTE**: Produce the deliverable at the declared path.
  - [x] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [x] **VISUAL**: Not applicable: no visual output.
  - [x] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Record the lesson or justify its absence.

#### Phase 3 — Open work

- [ ] T010 [OPS] [US-001] After the owner's authorization, deploy the page, run `check:seo --live` and submit the changed URLs with IndexNow, recording the results in `specs/draft/0003-landing-refactor-one-offer/research/` — Refs: US-001, US-003, FR-012, AC-006 — Depends: T009
  - [ ] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [ ] **EXECUTE**: Produce the deliverable at the declared path.
  - [ ] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [ ] **VISUAL**: Not applicable: no visual output.
  - [ ] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [ ] **IMPROVE**: Record the lesson or justify its absence.

- [ ] T011 [DOC] [US-001] Write the seller's name and tax number on the license page and check the license and refund text with a lawyer in `apps/web/content/license.md` (Q-01) — Refs: US-001, FR-012, FR-015, AC-006 — Depends: none
  - [ ] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [ ] **EXECUTE**: Produce the deliverable at the declared path.
  - [ ] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [ ] **VISUAL**: Not applicable: no visual output.
  - [ ] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [ ] **IMPROVE**: Record the lesson or justify its absence.

- [ ] T012 [CODE] [US-004] Reduce the home JavaScript with lazy hydration of what is below the first screen and record the lab LCP of the three routes in `apps/web/app/pages/index.vue` — Refs: US-004, FR-009, NFR-001, AC-004 — Depends: T009
  - [ ] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [ ] **EXECUTE**: Produce the deliverable at the declared path.
  - [ ] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [ ] **VISUAL**: Not applicable: no visual output.
  - [ ] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [ ] **IMPROVE**: Record the lesson or justify its absence.

- [ ] T013 [DOC] [US-005] Publish the verified feature inventory and data model in the docs in three languages from backlog item 0006 in `apps/web/content/docs/` — Refs: US-005, FR-010, AC-005 — Depends: none
  - [ ] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [ ] **EXECUTE**: Produce the deliverable at the declared path.
  - [ ] **VERIFY**: Run the targeted check and the full `bun run test`.
  - [ ] **VISUAL**: Not applicable: no visual output.
  - [ ] **EVIDENCE**: Record the commands and the files in the evidence comment and in sections 11-13.
  - [ ] **IMPROVE**: Record the lesson or justify its absence.

### 15. Execution Order

- Critical Path: Phase 0 (decisions) → Phase 1 (research and brief) → Phase 2 (structure and copy) → Phase 3 (proof content) → Phase 4 (build) → Phase 5 (SEO) → Phase 6 (verify) → authorization to deploy.
- Parallel Tasks: Phase 3 (proof posts) can run beside Phase 2 once the outline is agreed; the icon prerender fix (spawned separately) is independent.
- MVP Strategy: the smallest end-to-end slice is the English home with the offer, real visual, proven claims and the three gates green; the other two languages follow with the same structure.

## Act III — Deliver and Validate

### 16. Dependencies, Risks, and Assumptions

#### Dependencies

- SPEC-0002 (specialists and gates) is implemented and pushed.
- Owner answers Q-01 to Q-09; Q-01, Q-02 and Q-03 gate the license page, the offer and the proof block.
- The icon prerender task (nondeterministic HTML size) before final byte baselines.
- The later checkout spec for the purchase itself.

#### Risks

- A license page or invoice that names the wrong seller → Q-01 in Phase 0; nothing is published or wired before it is written; a lawyer confirms the license text.
- A "launch" price with no real end, or a reference price that was never charged → Q-02 and PR-008; the copy reads the limit from the offer configuration.
- Positioning on a false "first" → the market research; only checkable facts are written.
- Claims without proof survive a rewrite → the gate has no inline ignore; the baseline for the landing must reach zero.
- The audience hypothesis is wrong → interviews (Q-07) before the copy; the brief marks the hypothesis; the copy is tested after launch.
- Removing content lowers search visibility for technical terms → the content moves to posts and docs first (Phase 3), with redirects and sitemap consistency.
- No conversion baseline → measurement decided in Q-06 before launch.
- A very clean page with a weak offer → price, license, refund and product visual are decided in Phase 0 and 1, not left to design.

#### Assumptions

- The page keeps three languages and the current site structure and header.
- The purchase is one payment: R$ 97,00 for the first 100 buyers, then R$ 497,00, with one year of updates included (owner, 2026-09-25).
- The budgets of section 1 are project decisions to be confirmed at the plan gate.

### 17. Decisions

- **DEC-001**: The landing refactor is planned in phases with a decision gate first, because the seller identity and the rest of the offer (Q-01, Q-02) are not defined.
- **DEC-002**: Technical depth moves to posts and docs before it leaves the home, so that proof exists when the argument disappears.
- **DEC-003**: The offer (price, currency, plan, terms, checkout address) has a single source of truth that the visible text, the structured data and the later checkout read.
- **DEC-004**: The audience is written as a hypothesis in the copy brief until interviews or data exist (PR-005).
- **DEC-006**: Support and pre-sale contact are a scheduled call and a WhatsApp support number (owner, 2026-09-25); there is no public demo and no community group. The visual of the product is screenshots and a short recording made from the real application.
- **DEC-007**: The offer is one price paid once with one year of updates; launch R$ 97,00 for the first 100 buyers, then R$ 497,00 (owner, 2026-09-25).
- **DEC-008**: Testimonials stay on the owner's statement, as owner-statement ledger records, on the two conditions of Q-03 (own photo per person; consent to publish); "40+" becomes "more than 10" (owner statement).
- **DEC-009**: The language order is pt-br, then en and es; the copy brief and the review start with pt-br.
- **DEC-010**: The product visual is the real project structure and the deploy command as text (no bytes, no invented screenshot); real screenshots replace it when the owner supplies them.
- **DEC-011**: When no checkout address is set the offer button is replaced by a visible "purchase available soon" text and the build does not fail (a failing build would block every staging build); publishing is blocked by FR-012 and the owner's authorization, not by the build.
- **DEC-012**: Three testimonials are shown as loose quotes without photos (the two shared photos are gone from the repository); the three remain allowances of `testimonial-unverified` owned by SPEC-0003 until the owner confirms consent (Q-03); the two figures are owner-statement claims.
- **DEC-013**: Docs deep pages have one URL for every language (the content follows the active locale), so the landing links `/docs/...` without a locale prefix; `localePath` returns an empty string for docs slugs and for the English-only legal pages, which had left anchors without an href in the footer (fixed).
- **DEC-005**: The layers for agenda, chat, agent and the design blocks are product work, captured as backlog items `0004` and `0005`; the landing states only what exists.

### 18. Definition of Done

- [ ] `Definition Gate` is `Passed`.
- [ ] `Plan Gate` is `Passed`.
- [ ] `Delivery Gate` is `Passed`.
- [ ] All applicable `AC` acceptance scenarios pass.
- [ ] All requirements have verified test evidence.
- [ ] All tasks in section 14 are completed.
- [ ] All static checks and automated test suites pass.

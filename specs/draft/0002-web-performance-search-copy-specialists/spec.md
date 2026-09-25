# Integrated Specification: Web performance, search and copy specialists with enforcement gates

| Field | Value |
| --- | --- |
| Format | Specsfy/2.0 |
| ID | SPEC-0002 |
| Slug | 0002-web-performance-search-copy-specialists |
| Status | Draft |
| Effort | 10 |
| Effort updated at | 2026-09-25 |
| Effort rationale | Three new specialists, three build-time gates (one of them with a live HTTP mode), a machine-checkable claim ledger, a baseline/ratchet mechanism, an owner-material distillation, routing and docs in three languages. Every source must be re-read before it becomes a rule, and two items need measurements or an authorized deploy that this session could not perform. |
| ClickUp Task | |
| Milestones | |
| Definition Gate | Pending |
| Plan Gate | Pending |
| Delivery Gate | Pending |
| Evidence Contract | 1 |
| Human Interface | No |
| Updated at | 2026-09-25 |

## Act I — Define

### 1. Problem and Desired Outcome

#### Problem

The owner wants the pages of Nuxfire to be "as optimized as Astro", optimised for Google and Bing,
and written so that the main landing page sells one idea instead of explaining the architecture.
They also require that **every text a human reads inside the apps passes through a copy
specialist**. Today none of that has an owner in the framework, and the measurements taken for
this specification show why it matters (all values are in `research/baseline-measurements.md`
unless stated):

- **D1 — Search identity of the home page.** Its `<title>` is `Demo SaaS | Nuxfire` and its
  description is the generic site default (M4). The `check:seo` gate does not flag it because a
  placeholder is not a fallback and the home is exempt from the description rule.
- **D2 — Weight.** The production home loads 56 JS/CSS files, 336,279 bytes brotli (M2), against
  about 52 KB brotli for the scripts and styles of Astro's own documentation page (A2, an order of
  magnitude reference, not an equivalence). The home ships 956 KB of decoded JavaScript (M2b).
- **D3 — Images.** Six avatar photos of 447-621 KB each (3.4 MB) are shown at 28-32 px (M3).
- **D4 — HTTP layer.** In production the canonical URLs answer **307 Temporary Redirect** to a
  trailing-slash URL whose canonical points back to the first one (M10), and the legacy redirects
  are a 307 followed by a `meta refresh` page (M11). Bing's guidelines ask for 301 for permanent
  moves and 302 only for changes under two days (B6).
- **D5 — Freshness signals.** The sitemap carries date-only `lastmod` values (M12) although Bing asks
  for date and time (Bing sitemap post); there is no IndexNow (M9).
- **D6 — Claims and proof.** The landing states numbers and superlatives without evidence in the
  repository, and shows testimonials whose photos are reused for different names (M13). The
  primary texts read (16 CFR 465.2, Directive 2005/29/EC Annex I(7), CDC arts. 36-38) make the
  advertiser responsible for proof and forbid invented testimonials and invented urgency.
- **D7 — Text outside any governed path.** About 315 literal strings sit in `.vue` templates of the
  apps and layers, whose locale files hold 0 or 1 keys (M15-M18); the dashboard is written in one
  language without a copy owner.
- **D8 — Structure of the landing.** Twelve sections, of which the three most technical hold 64 %
  of the text, and the primary call to action leads to a WhatsApp group (M6).

There is no specialist for browser delivery, none for search-engine requirements beyond the blog
pipeline (`fireskill-specialist-content-seo`, SPEC-0001), and none for copy.

#### Desired Outcome

Three specialists an agent must load, and gates that make the rules mechanical, so that:

1. a page cannot gain weight, scripts, unsized images or third-party requests without failing a
   budget, and a page that needs no interactivity can be declared and verified as shipping no
   JavaScript (the transferable core of Astro's model, A1);
2. the HTTP and sitemap behaviour that search engines read is audited on the built output and on a
   live origin, and IndexNow can notify Bing when content changes;
3. no fact, number, testimonial or deadline reaches a human without a record that proves it, and
   no new literal text is added outside a governed path;
4. the owner's copy material is turned into original, classified patterns, without redistributing
   it and without emitting patterns that are deceptive or unprovable;
5. the refactor of the landing (SPEC-0003) starts from measured budgets, verified rules and an
   evidence-checked copy process.

#### Success Metrics

- 3 specialists registered; the catalog, the routing table, the README, `AGENTS.md`, the docs in
  three languages and the tests all say 38 (today 35).
- `bun run check:perf` reproduces the M1-M3 payload figures within 1 % on the same build and
  fails a fixture that adds 1 byte over a budget; baseline entries can only shrink.
- `bun run check:seo -- --live <origin>` reproduces D4 against production (307 on canonical URLs)
  before any fix, and reports 0 redirected sitemap URLs after the fix.
- `bun run check:copy` inventories 100 % of the `.vue` template literals of `apps/*` and
  `layers/*` with a per-file baseline, and fails when one is added.
- 100 % of the numeric or superlative claims of the marketing namespaces are ledger entries with a
  passing verifier, or are listed in the baseline with the spec that removes them.
- No run of 8 or more identical words between the published pattern library and the raw material
  in `docs/copywiter/`.
- Every fact in the three specialists' references has a source, an access date and a reading mode
  of RAW, CMD or CODE (no SUM).

### 2. Research and Clarifications

#### Executed Research

- **R-001** [critical] Astro's documented performance model is zero JavaScript by default, opt-in hydration per component, server-first rendering, images that carry dimensions — Verdict: verified — Confidence: medium (mode SUM) — Evidence: `research/astro-reference.md`. Impact: "as Astro" is defined by four transferable behaviours and a measured reference, not by adopting Astro (DEC-004).
- **R-002** [critical] Astro's documentation page loads 4 JS files of 32,967 bytes brotli and 4 CSS files of 18,851 bytes, plus a 28,208-byte document — Verdict: verified — Confidence: high (mode CMD) — Evidence: `research/astro-reference.md`. Impact: order-of-magnitude reference for budgets; not a like-for-like target.
- **R-003** [critical] The installed Nuxt 4.5.2 supports `routeRules[route].noScripts`, lazy hydration strategies and component islands — Verdict: verified — Confidence: high (mode CODE) — Evidence: `research/nuxt-cloudflare-capabilities.md`. Impact: a zero-JavaScript page is technically available; what it breaks in this app is unknown until T045.
- **R-004** [critical] The core web vitals "good" thresholds are LCP 2.5 s, INP 200 ms, CLS 0.1 at the 75th percentile, and lab data does not replace field data — Verdict: verified — Confidence: high (two sources agree) — Evidence: `research/web-dev.md`, `research/google-search.md`. Impact: the only externally sourced numeric thresholds; the gate measures bytes, timings are measured by protocol (DEC-009).
- **R-005** [critical] Bing asks for 301 for permanent redirects and 302 only under two days, for canonical URLs only in sitemaps, for IndexNow on changes, and for accurate `lastmod` — Verdict: verified — Confidence: high (mode RAW) — Evidence: `research/bing-webmaster.md`. Impact: D4, D5.
- **R-006** [critical] Bing recommends `lastmod` in ISO 8601 with date and time — Verdict: verified — Confidence: medium (mode SUM of a Bing blog post) — Evidence: `research/bing-webmaster.md`. Impact: supersedes the date-only acceptance of SPEC-0001 DEC-013 (DEC-011).
- **R-007** [critical] Google discontinued FAQ rich results from 2026-05-07 and requires a rating or review for the SoftwareApplication rich result — Verdict: verified — Confidence: medium (mode SUM) — Evidence: `research/google-search.md`. Impact: no FAQPage markup for Google; no rating or review markup without real reviews (DEC-012, DEC-013).
- **R-008** [critical] Cloudflare Workers Static Assets default `html_handling` is `auto-trailing-slash`, a `_redirects` file supports 301 and 308, and SST exposes `assets.htmlHandling` — Verdict: verified — Confidence: high (docs and code) — Evidence: `research/nuxt-cloudflare-capabilities.md`. Impact: D4 has a documented cause and two documented levers; the effect on this site is untested (T039).
- **R-009** [critical] Production answers 307 on canonical URLs and serves legacy redirects as a meta refresh — Verdict: verified — Confidence: high (mode CMD, reproducible with `curl -I`) — Evidence: `research/baseline-measurements.md`. Impact: D4 is real today; it may change with the next deploy.
- **R-010** [critical] The primary texts of US, EU and Brazilian consumer law make the advertiser responsible for proving claims and prohibit invented testimonials and invented urgency — Verdict: verified for the passages read — Confidence: high for those passages, low for their applicability to this business (not legal advice) — Evidence: `research/compliance-claims.md`. Impact: the claim ledger and the forbidden-pattern class (DEC-007).
- **R-011** [critical] Conversion copy is grounded in voice-of-customer research first, a messaging hierarchy second and formulas last; the case-study lifts reported by the authors are their own — Verdict: verified — Confidence: medium — Evidence: `research/copy-sources.md`. Impact: the copy workflow order; results are never used as promises.
- **R-012** [critical] The owner's material is a set of fill-in-the-blank templates from mass-market direct response, includes third-party affiliate scripts, and contains patterns that require invented proof — Verdict: verified — Confidence: high (mode RAW) — Evidence: `research/copywiter-material-analysis.md`. Impact: distil structures, classify them, never redistribute (DEC-006).
- **R-013** [material] About 315 literal strings sit outside the locale files in `apps/*` and `layers/*` — Verdict: verified as an order of magnitude — Confidence: medium (heuristic scan) — Evidence: `research/baseline-measurements.md`. Impact: the copy gate needs an exact scanner and a baseline (FR-010).
- **R-014** [material] Testimonial photos are reused for different names and the "40+ devs" statement has no evidence in the repository — Verdict: verified for the code facts; authenticity of the people is unverifiable — Confidence: high — Evidence: `research/baseline-measurements.md`. Impact: testimonials need provenance records (FR-009).
- **R-015** [material] IndexNow requires a key file at the site root, accepts GET for one URL and POST for up to 10,000, and is shared among participating engines; Google is not stated as a participant — Verdict: verified — Confidence: medium (mode SUM) — Evidence: `research/bing-webmaster.md`. Impact: FR-006.
- **R-016** [material] The named copy sites do not cover in-app text; NN/g and WCAG 3.3 cover error messages — Verdict: verified — Confidence: medium — Evidence: `research/copy-sources.md`. Impact: the application-text reference needs further primary sources (T051).

#### Consulted Sources and Context

- Repository: `apps/web/nuxt.config.ts`, `apps/web/app/pages/index.vue`, `apps/web/app/components/landing/*`, `apps/web/i18n/locales/*.json`, `infra/utils/nuxt.ts`, `.sst/platform/src/components/cloudflare/worker.ts`, `scripts/seo-rules.ts`, `scripts/check-seo.ts`, `fireskills/specialists/*`, `fireskills/SKILL.md`, `.fireskills/RULES.md`, `docs/copywiter/*`.
- Measurements against `https://nuxfire.com` (read-only `curl`) and `https://docs.astro.build` (browser).
- SPEC-0001 (`specs/review/0001-content-seo-metadata`), whose gate, builders and lessons this spec extends.

#### Consulted Documentation

- Astro docs (why-astro, islands, images), Google Search Central (helpful content, core web vitals, snippets, structured data policies, FAQ, SoftwareApplication, Organization, JavaScript SEO), web.dev (vitals, LCP, INP, performance budgets, fonts), Bing Webmaster Guidelines (read in full), Bing webmaster blog on sitemaps (2025-07-31), IndexNow, schema.org (SoftwareApplication, Product), Copyhackers, CXL, Copyblogger, Nielsen Norman Group, WCAG 2.2 SC 3.3.3, 16 CFR 465 (eCFR, current 2026-09-23), Directive 2005/29/EC, Lei 8.078/1990, Cloudflare Workers Static Assets docs. Dates, URLs and reading modes are in the research files.

#### Stored Research Artifacts

- `specs/draft/0002-web-performance-search-copy-specialists/research/`: ten files listed in `research/README.md`; paraphrases with URLs and access dates, no reproduced pages.

#### Resolved Questions

- **Q**: Should SEO knowledge be added to `fireskill-specialist-content-seo`? → **A**: No; that specialist stays the authoring pipeline of blog and docs; a new specialist holds the search-engine requirements for every page (DEC-002).
- **Q**: Is a byte budget a sourced threshold? → **A**: No. Only the vitals thresholds are sourced; byte budgets are project decisions with the baseline as evidence (DEC-005).
- **Q**: Can a gate measure LCP, INP and CLS? → **A**: Not deterministically; they need a browser and field data. The gate measures bytes and structure; timings are recorded by a documented protocol (DEC-009).

#### Open Questions

- **Q-01** (blocks T049, T050): may the owner's material be redistributed or adapted, and may the raw files stay out of the delivered repository (ignored by git), with the two committed files removed from the tree? **Answered 2026-09-25**: the material is local only, it does not go into git, and the two committed files are removed (done in commit 6096621); the owner deleted the folder from the machine, and asked not to add it to `.gitignore`.
- **Q-02** (blocks T051): confirm the scope of "text a human reads in the apps" (DEC-014). **Not answered**: DEC-014 was applied as the default and is reported to the owner as an assumption.
- **Q-03** (blocks T051): markets and jurisdictions whose consumer rules apply (this spec read US, EU and Brazil). **Not answered**: the three markets were applied as the default and are reported as an assumption.
- **Q-04** (blocks SPEC-0003, not this spec): are the testimonials and the "40+ devs" statement real, and what is the evidence?
- **Q-05** (blocks T041): explicit authorization to deploy the redirect and trailing-slash fix to production and to run the live audit and, later, IndexNow submissions.
- **Q-06** (blocks SPEC-0003): the single conversion action and the primary audience of the landing.

### 3. Scope and Actors

#### In Scope

- The three specialists (`fireskill-specialist-web-performance`, `fireskill-specialist-seo`, `fireskill-specialist-copywriting`) with references, registration, routing and docs in three languages.
- `check:perf`, the new static rules and the live mode of `check:seo`, `check:copy`, IndexNow, the claim ledger, the baseline mechanism.
- The redirect and trailing-slash fix of D4 and the `lastmod` change of D5 (they are the first customers of the new rules).
- The pattern library distilled from the owner's material.
- A zero-JavaScript spike and a lab-measurement protocol run, to give the specialists measured facts.

#### Out of Scope

- Refactoring the landing, replacing its copy, removing or replacing testimonials, optimising the avatar photos and the title of the home (SPEC-0003; the gates list them in the baseline with that owner).
- Translating the dashboard, the login app and the layers (the gate inventories their text; localising it is a separate spec).
- Adopting Astro as a framework, deploying to production, submitting URLs to IndexNow, or paid analytics.
- Legal review of the compliance rules.

#### Actors

- **Agent (developer)**: implements pages and text; must load the specialists and pass the gates.
- **Owner**: decides scope, provides rights and evidence, authorizes deploys.
- **Reviewer/verifier agent**: re-reads sources, re-runs gates and measurements independently of the author.
- **Search engines (Googlebot, Bingbot)**: read HTTP responses, HTML, sitemaps and structured data.
- **Visitor**: reads text and loads pages on real devices.

### 4. Principles and Constraints

- **PR-001**: Zero assumption. Every rule cites a source read (RAW, CMD or CODE), a measurement, or is labelled a project decision. A summarised source (SUM) is a lead, never a rule.
- **PR-002**: The codebase supersedes documentation; a reference states what exists and what does not, with file evidence.
- **PR-003**: Gates are deterministic and offline. Network access exists only in the explicit `--live` mode and in IndexNow with `--submit`.
- **PR-004**: A baseline is an explicit, dated, shrinking list of known defects, each naming the spec that removes it. It is never a waiver.
- **PR-005**: No deployment, submission to a third party, or destructive action without the owner's explicit authorization in the current context.
- **PR-006**: No new runtime dependency reaches a Worker; tooling dependencies are exact-version `devDependencies`.
- **PR-007**: Text a human reads is not fabricated: no invented number, person, proof, deadline or scarcity.
- **PR-008**: Owner material is used as structural inspiration and is not redistributed (DEC-006).
- **PR-009**: Authoring and review are separate passes; the author does not approve its own work.

### 5. User Stories

#### US-001 — Web performance specialist and byte-budget gate (P1)

As a developer building or changing a public page, I want a web-performance specialist and a
`check:perf` gate that measure the built output against declared budgets and rules, so that a page
cannot regress in weight, scripts, images or third-party requests, and a page that needs no
interactivity can be declared and verified as shipping no JavaScript.

**Why P1**: the home ships 956 KB of decoded JavaScript and 3.4 MB of avatar photos (D2, D3); nothing stops it growing.
**Independent Test**: `bun run check:perf` on the current build passes with the recorded baseline and fails on a fixture that exceeds a budget.
**Requirements**: FR-001, FR-002, NFR-001, NFR-002, NFR-004

#### US-002 — Search-engine specialist, HTTP audit and IndexNow (P1)

As the owner and as a search engine, I want an SEO specialist and audit rules covering Google, Bing
and schema.org requirements, including redirect status, trailing-slash behaviour, sitemap freshness
and IndexNow, so that URLs are consolidated, fresh and eligible.

**Why P1**: canonical URLs answer 307 in production and the sitemap has no times (D4, D5).
**Independent Test**: `bun run check:seo -- --live https://nuxfire.com` reports the 307 responses before the fix and none after it.
**Requirements**: FR-003, FR-004, FR-005, FR-006, FR-007, NFR-003

#### US-003 — Copy specialist for every human-readable text (P1)

As a visitor and as the owner, I want every text a human reads in the products to be produced
through a copy specialist (research, messaging hierarchy, claims, localisation, review), so that the
text is clear, true and consistent.

**Why P1**: the owner requires it, and 315 literal strings currently have no owner (D7).
**Independent Test**: adding a literal string to a `.vue` template makes `bun run check:copy` fail; the agent instructions route the work to the specialist.
**Requirements**: FR-008, FR-010, NFR-001

#### US-004 — Claim ledger and testimonial provenance (P1)

As the owner, I want every factual claim, testimonial and time-limited offer backed by a record a
machine can verify, so that nothing false or unprovable ships and I can produce the proof when
asked.

**Why P1**: the advertiser bears the burden of proof (L3 Art. 38) and fabricated testimonials are prohibited (L1 465.2); today the proof does not exist (D6).
**Independent Test**: a claim in a marketing string without a ledger entry, or with an entry whose verifier does not hold, fails `bun run check:copy`.
**Requirements**: FR-009, FR-010, NFR-001, NFR-002

#### US-005 — Pattern library from the owner's material (P2)

As a copywriter agent, I want the owner's material distilled into original, classified patterns, so
that useful structures are reusable without copying protected text and without emitting deceptive
patterns.

**Why P2**: it improves quality but nothing else depends on it.
**Independent Test**: the library test fails on any run of 8 identical words with the raw files and on any class C pattern used as an example.
**Requirements**: FR-011, NFR-005

#### US-006 — Governance and routing (P2)

As an agent, I want `AGENTS.md`, the Fireskills routing, the rules, the catalog and the docs in
three languages to route page and text work to these specialists, with consistent counts, so that
nobody bypasses them.

**Why P2**: without routing the specialists exist but are not used.
**Independent Test**: the catalog, drift and evidence tests pass with 38 specialists and the routing text present.
**Requirements**: FR-001, FR-003, FR-008, FR-012, NFR-006, NFR-007

#### US-007 — Baseline and ratchet (P2)

As the owner, I want the measured defects recorded as an explicit shrinking baseline tied to the
spec that removes each one, so that the gates run today without hiding debt and without allowing new
debt.

**Why P2**: it lets the gates be enabled immediately.
**Independent Test**: a regression, a stale entry and an entry without an owning spec each fail the gate.
**Requirements**: FR-002, FR-010, NFR-002

### 6. BDD Acceptance Scenarios

#### AC-001 — Budgets on the built output

**Covers**: US-001, FR-002, NFR-001

```gherkin
@US-001 @FR-002 @NFR-001 @AC-001
Feature: Byte budgets of a page

  Scenario: a page within its budget passes and a page over it fails
    Given a built site whose home page references scripts of 90000 brotli bytes
    And a budget of 90000 bytes for the JavaScript of the home page
    When check:perf runs
    Then it exits 0
    When the budget is lowered to 89999 bytes
    Then it exits 1 and prints the rule, the page, the measured value and the limit
```

#### AC-002 — Static delivery rules

**Covers**: US-001, FR-002, NFR-001

```gherkin
@US-001 @FR-002 @NFR-001 @AC-002
Feature: Static delivery rules

  Scenario: images, third-party origins and zero-JavaScript pages
    Given a page with an img that has no width and height
    And a page whose declared LCP image has loading lazy
    And a page that loads a script from another origin
    And a page declared as zero JavaScript that contains a script tag other than JSON-LD
    When check:perf runs
    Then each case is reported with its own rule name and page
    And a page with sized images, an eager LCP image with fetchpriority high, same-origin resources and no script passes
```

#### AC-003 — Baseline ratchet

**Covers**: US-007, FR-002, NFR-002

```gherkin
@US-007 @FR-002 @NFR-002 @AC-003
Feature: Baselines only shrink

  Scenario: regression, stale entry and missing owner
    Given a baseline entry of 336279 bytes owned by SPEC-0003
    When the measured value is 336280 bytes
    Then the gate fails as a regression
    When the measured value is 300000 bytes and the entry still says 336279
    Then the gate fails as stale and asks to lower the entry
    When an entry has no owning spec
    Then the file is rejected
```

#### AC-004 — Search static rules

**Covers**: US-002, FR-004, NFR-001

```gherkin
@US-002 @FR-004 @NFR-001 @AC-004
Feature: Search rules on the built output

  Scenario: freshness, redirects, titles and structured data
    Given a sitemap whose lastmod is 2026-09-25 without a time
    And a page that is a meta refresh stub
    And a home page titled with a configured placeholder
    And a page with JSON-LD of type FAQPage or with aggregateRating and no ledger reviews
    And a robots.txt without a Sitemap line
    When check:seo runs
    Then each is reported with its own rule
    And a lastmod of 2026-09-25T00:00:00Z passes
```

#### AC-005 — Live HTTP audit

**Covers**: US-002, FR-005, FR-007, NFR-003

```gherkin
@US-002 @FR-005 @FR-007 @NFR-003 @AC-005
Feature: Live HTTP audit

  Scenario: redirects, headers and safety
    Given a local server that answers 307 for a sitemap URL and 301 with one hop for a legacy URL
    When check:seo --live is run with that origin
    Then the 307 is reported as a redirected sitemap URL and the legacy URL passes
    And a response without content encoding is reported
    And only GET and HEAD requests were sent, only to the origin given on the command line
    And running without an origin argument fails before any request
```

#### AC-006 — IndexNow

**Covers**: US-002, FR-006, NFR-003

```gherkin
@US-002 @FR-006 @NFR-003 @AC-006
Feature: IndexNow submission

  Scenario: dry run by default
    Given a site with a valid key file
    When the indexnow script runs without --submit
    Then it prints the payload and sends no request
    When the key is 7 characters long or contains a character outside letters, digits and dashes
    Then it fails before building the payload
    When --submit is passed without an explicit origin
    Then it fails
```

#### AC-007 — Claim ledger

**Covers**: US-004, FR-009, FR-010, NFR-001

```gherkin
@US-004 @FR-009 @FR-010 @NFR-001 @AC-007
Feature: Claims are proven

  Scenario: ledger and verifiers
    Given a marketing string that contains "20 audited tables"
    And no ledger entry for its key
    When check:copy runs
    Then it reports the claim as unproven
    When the entry has a count verifier that counts 21 definitions in the given files
    Then it reports the measured value and the claimed value
    When the entry has a url evidence without a retrieved date
    Then the ledger is rejected
```

#### AC-008 — Text outside governed paths

**Covers**: US-003, US-007, FR-010, NFR-002

```gherkin
@US-003 @US-007 @FR-010 @NFR-002 @AC-008
Feature: New literal text is refused

  Scenario: literal in a template
    Given a baseline that lists the literals of each .vue file
    When a literal string is added to a template
    Then check:copy fails naming the file and the string
    When the literal is moved to a locale key
    Then it passes
    When a baselined literal is removed and the baseline is not lowered
    Then check:copy fails as stale
```

#### AC-009 — Forbidden patterns and testimonials

**Covers**: US-003, US-004, FR-009, FR-010

```gherkin
@US-003 @US-004 @FR-009 @FR-010 @AC-009
Feature: No invented urgency or proof

  Scenario: urgency and testimonials
    Given a marketing string with "only today" or a countdown component
    And no dated limit in the billing configuration
    When check:copy runs
    Then it fails
    Given a testimonial key without a verified registry record
    Then it fails
    Given two testimonials that use the same image file
    Then it fails
```

#### AC-010 — Pattern library

**Covers**: US-005, FR-011, NFR-005

```gherkin
@US-005 @FR-011 @NFR-005 @AC-010
Feature: Original, classified patterns

  Scenario: classification and originality
    Given the published pattern library
    Then every pattern has a class A, B or C, a structure, a reason and examples in en, pt-br and es
    And no class C pattern appears as an example
    And when docs/copywiter exists, no run of 8 identical words is shared with any file in it
    And when it does not exist the overlap test is skipped with an explicit message
```

#### AC-011 — Governance and evidence discipline

**Covers**: US-006, FR-001, FR-003, FR-008, FR-012, NFR-006, NFR-007

```gherkin
@US-006 @FR-001 @FR-003 @FR-008 @FR-012 @NFR-006 @NFR-007 @AC-011
Feature: Specialists are routed and evidenced

  Scenario: registration and evidence
    Given the three new specialists
    Then the catalog, the routing table, the README, AGENTS.md and the docs in three languages list them with count 38
    And AGENTS.md and RULES.md route any page or human-readable text work to them
    And every fact table in their references has Source, Read and Mode columns
    And no row has mode SUM
```

### 7. Requirements

#### Functional

- **FR-001**: `fireskill-specialist-web-performance` shall exist with `SKILL.md`, `agents/openai.yaml` and references for the delivery baseline, the Astro reference, budgets and measurement, and the zero-JavaScript recipe, each fact carrying source, date and mode, and a "What does NOT exist" section.
- **FR-002**: `bun run check:perf` shall read `apps/web/.output/public` and `perf-budgets.json`, compute per page the brotli bytes of HTML, referenced JavaScript, referenced CSS and referenced images plus the request count, evaluate budgets per route, apply the rules `img-dimensions`, `img-lcp-lazy`, `img-max-bytes`, `third-party-origin` and `js-none`, print `[rule] page` with the measured and allowed values, and exit 0 when clean and 1 otherwise.
- **FR-003**: `fireskill-specialist-seo` shall exist with `SKILL.md`, `agents/openai.yaml` and references for the search-engine requirements matrix (Google, Bing, schema.org, each row with source, date, mode), structured-data selection, indexing and HTTP behaviour, and verification tools, with the boundary against `fireskill-specialist-content-seo` stated.
- **FR-004**: `check:seo` shall gain the rules `sitemap-lastmod-datetime`, `no-meta-refresh`, `title-not-placeholder`, `jsonld-no-faq`, `jsonld-no-unproven-rating`, `robots-sitemap` and a `site-sitemap-canonical` rule that no sitemap URL is a redirect stub, with the placeholder list and the allowlists in a versioned file.
- **FR-005**: `check:seo` shall accept `--live <origin>` and audit the HTTP layer of that origin: every sitemap URL answers 200 with no redirect, declared legacy URLs answer a single 301 or 308, `robots.txt` lists the sitemap, HTML is compressed, immutable assets carry a long-lived cache header, and pages marked noindex are not in the sitemap; it shall send only GET and HEAD requests, only to the given origin, and fail without one.
- **FR-006**: `bun run indexnow` shall build the IndexNow payload from the sitemap, validate the key format and the key file, print the payload by default, and send it only with `--submit` and an explicit `--origin`.
- **FR-007**: The site shall serve every sitemap URL with 200 without a redirect and every legacy URL with a single 301 or 308, by the mechanism chosen in the spike (T039) among `assets.htmlHandling` and a `_redirects` file, verified locally and, after the owner's authorization, live.
- **FR-008**: `fireskill-specialist-copywriting` shall exist with `SKILL.md`, `agents/openai.yaml` and references for the workflow (brief, voice-of-customer research, messaging hierarchy, draft, claims, localisation, review), messaging and value proposition, headlines and buttons, application text, claims and compliance, and localisation; and `AGENTS.md`, `fireskills/SKILL.md` and `.fireskills/RULES.md` shall require it for any text a human reads in `apps/*`, `layers/*`, `packages/emails`, and the blog, docs prose, legal and landing content.
- **FR-009**: `.fireskills/CLAIMS.yml` shall record each factual claim with id, locale keys, statement, evidence (`repo-count`, `repo-file`, `url` with retrieved date, or `owner-statement` with date and name), verified date and owner, and each testimonial with existence, consent and provenance; `scripts/copy-rules.ts` shall execute the verifiers.
- **FR-010**: `bun run check:copy` shall detect literal text in `.vue` templates against a per-file baseline, numeric or superlative claims in the marketing namespaces against the ledger, forbidden urgency and scarcity patterns, testimonials without registry records, and images shared by different testimonials, and exit 1 on any violation.
- **FR-011**: `fireskills/specialists/fireskill-specialist-copywriting/references/pattern-library.md` shall list original patterns with class A, B or C, structure, awareness stage, reason and examples in en, pt-br and es, and be checked for originality against the raw material when it is present.
- **FR-012**: The three specialists shall be registered in `catalog.json`, `fireskills/SKILL.md`, `fireskills/README.md`, `AGENTS.md`, `.fireskills/RULES.md`, the docs pages in en, pt-br and es, with the count 38 everywhere, and the scripts `check:perf` and `check:copy` in `package.json`.

#### Non-Functional

- **NFR-001**: The gates shall be deterministic and offline: the same tree and build give the same output, and no gate other than `--live` and `indexnow --submit` performs network access. **Verification**: tests run the gates with the network unavailable and compare two runs.
- **NFR-002**: Every baseline entry shall carry the id of the spec that removes it; the gates shall fail on regression, on a stale entry and on an entry without an owner. **Verification**: `scripts/perf-rules.test.ts`, `scripts/copy-rules.test.ts`.
- **NFR-003**: The live audit shall be read-only and IndexNow shall default to a dry run; neither deploys anything. **Verification**: tests assert methods, hosts and the absence of requests without `--submit`.
- **NFR-004**: No gate or specialist adds a runtime dependency to a Worker; tooling packages are exact-version `devDependencies`, and no file under `apps/` imports from `scripts/`. **Verification**: import and `package.json` guard tests.
- **NFR-005**: No published pattern shall share a run of 8 or more identical words with the raw material, and the raw material shall not be tracked by git. **Verification**: overlap test and a `git ls-files` guard.
- **NFR-006**: Every fact table in a specialist reference shall have Source, Read (date) and Mode columns, and a finished reference shall contain no row with mode SUM. **Verification**: `scripts/specialist-evidence.test.ts`.
- **NFR-007**: The three specialists shall appear with identical counts and names in the catalog, the README, `AGENTS.md`, the routing table and the docs of the three languages. **Verification**: catalog and drift tests, `bun run check:i18n`.

#### Errors and Edge Cases

- Raw material folder absent (CI, a buyer's clone) → the overlap test is skipped with an explicit message, never silently passed.
- `.output/public` absent → `check:perf` and `check:seo` run their source checks only and say so.
- A page listed in the budget file that does not exist in the build → a rule violation naming the route.
- The live origin is unreachable or returns 5xx for a sitemap URL → a violation, not a skip.
- A claim whose verifier needs a file that moved → a violation naming the claim and the missing file.
- Marketing string with a number that is not a claim (a version, a year) → allowed only through an explicit `not-a-claim` entry in the ledger with a reason.

## Act II — Design and Prove

### 8. Technical Plan

#### Existing Context

- Nuxt 4.5.2, Nitro `cloudflare-module`, SST 4.14, prerendered site served as Workers Static Assets (M7, F1-F4), `@nuxt/image`, `@nuxt/scripts`, `@nuxt/fonts`, `@nuxtjs/seo` 5.3.14 installed; the SEO builders, the `check:seo` gate and the specialist `content-seo` from SPEC-0001.
- Vitest projects `apps/web` and `scripts`; the repository convention for guard tests is a `scripts/*.test.ts` that reads the source tree (for example `scripts/notification-rules.test.ts`).

#### Architecture and Modules

- Specialists under `fireskills/specialists/fireskill-specialist-{web-performance,seo,copywriting}/` with the same structure as `content-seo` (SKILL.md, `agents/openai.yaml`, `references/`).
- Pure rules and thin CLIs, like SPEC-0001: `scripts/perf-rules.ts` + `scripts/check-perf.ts`; `scripts/seo-rules.ts` (extended) + `scripts/seo-live.ts` + `scripts/check-seo.ts`; `scripts/indexnow.ts`; `scripts/copy-rules.ts` + `scripts/check-copy.ts`.
- Data files: `perf-budgets.json` (root), `.fireskills/CLAIMS.yml`, `scripts/copy-baseline.json`, `scripts/seo-config.json` (placeholder titles, allowlists).
- Redirects: `apps/web/public/_redirects` and/or `assets.htmlHandling` in `infra/utils/nuxt.ts`, chosen by the spike.
- Zero-JS: `routeRules[route].noScripts` on the routes declared `js: none` in `perf-budgets.json`, only after the spike.

#### Migrations

- Not applicable (no database change).

#### Models

- Budget entry, baseline entry and claim entry are defined in section 9 and validated by the pure rule modules.

#### Procedures and Handlers

- Not applicable (no tRPC procedure).

#### Views and UI Experience

- Not applicable: no screen changes in this spec. The documentation pages that list the specialists follow the existing docs layout.

#### Queries and Repositories

- Not applicable.

#### Jobs and Async Processing

- Not applicable. IndexNow is a manual command, never a scheduled job (DEC-010).

#### File Structure

```text
specs/draft/0002-web-performance-search-copy-specialists/
  spec.md
  research/
fireskills/specialists/
  fireskill-specialist-web-performance/
  fireskill-specialist-seo/
  fireskill-specialist-copywriting/
scripts/
  perf-rules.ts  check-perf.ts  seo-live.ts  indexnow.ts  copy-rules.ts  check-copy.ts
  seo-config.json  copy-baseline.json
perf-budgets.json
.fireskills/CLAIMS.yml
apps/web/public/_redirects
```

### 9. Data Model

#### Entities

| Entity | Identity | Attributes and Validation | Relationships |
| --- | --- | --- | --- |
| Budget entry | `route` glob + `metric` | `limit` (bytes or count), `kind` (`budget` or `baseline`), `source` (a research id or `decision:DEC-nnn`), `removedBy` (required when `kind` is `baseline`), `since` (date) | Many per route |
| Page declaration | `route` | `js` (`none` or `allowed`), `lcp` (`text` or `image` with selector), `thirdParty` allowlist | One per route |
| Claim | `id` | `keys[]` (locale keys), `statement`, `evidence.kind` (`repo-count`, `repo-file`, `url`, `owner-statement`), evidence data (`files`, `pattern`, `equals` / `path` / `url` + `retrieved` / `by` + `on`), `verifiedAt`, `owner` | Referenced by locale keys |
| Testimonial | `id` | `key`, `personExists`, `usedProduct`, `consent`, `image`, `provenance`, `disclosure` | Referenced by testimonial keys |
| Literal baseline entry | `file` + `text` | `removedBy` (spec id) | One per grandfathered literal |
| Pattern | `id` | `class` (A, B, C), `trigger`, `structure`, `stage`, `reason`, `examples{en,pt-br,es}` | Belongs to the pattern library |

#### States and Transitions

| Entity | Current State | Event | Next State | Invariants |
| --- | --- | --- | --- | --- |
| Baseline entry | open | measured value drops | stale (gate fails) | must be lowered or deleted in the same change |
| Baseline entry | open | measured value rises | regression (gate fails) | never raised |
| Claim | unverified | verifier passes | verified | `verifiedAt` is the run date |
| Claim | verified | evidence changes | unverified | the gate re-runs the verifier every time |
| Pattern | drafted | classified | published | class C never has examples |

#### Migration and Retention

- Not applicable.

### 10. Interfaces and Contracts

#### Human Interface

- **Human interface present**: No. The deliverables are command-line gates, data files, specialist documents and text of docs pages that already have a layout.

#### Interface Stack and Conventions

- Bun scripts run with `bun scripts/<name>.ts`, Vitest for tests, `Bun.YAML` for the ledger (as `check:seo` does for frontmatter), output format `[rule] where` plus an indented message and a final count, exit 0 or 1, as `check:seo`.

#### Screens and Responsibilities

- Not applicable.

#### Navigation and Information Flow

- Docs: the specialists appear in the docs section "Fireskills > Specialists" in en, pt-br and es.

#### Menus and Primary Navigation

- Not applicable (no new menu entries).

#### Forms and Actions

- Not applicable.

#### Layout Composition and Density

- Not applicable.

#### Vue and @nuxt/ui Component Selection

| Screen | Vue Component | Responsibility | Target File | Component Composition | Origin | Reuse or Extend |
| --- | --- | --- | --- | --- | --- | --- |
| Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable |

- No component is created or changed; `.fireskills/INTERFACE.md` is unaffected.

#### States and Accessibility

- Not applicable to a command-line tool; the copy specialist encodes WCAG 3.3.1 and 3.3.3 for application text (N2).

#### CRUD Contract

- Not applicable.

#### Visual Review During Development

- Not applicable: no visual change. The VISUAL item of each task states this.

#### Exposed APIs

- Rule identifiers are the public contract of the gates:
  - `check:perf`: `budget-html`, `budget-js`, `budget-css`, `budget-images`, `budget-requests`, `img-dimensions`, `img-lcp-lazy`, `img-max-bytes`, `third-party-origin`, `js-none`, `baseline-regression`, `baseline-stale`, `baseline-owner`, `route-missing`.
  - `check:seo` (new): `sitemap-lastmod-datetime`, `no-meta-refresh`, `title-not-placeholder`, `jsonld-no-faq`, `jsonld-no-unproven-rating`, `robots-sitemap`, `sitemap-canonical`, and for `--live`: `live-status`, `live-redirect-chain`, `live-legacy-redirect`, `live-robots`, `live-compression`, `live-immutable-cache`, `live-noindex-listed`.
  - `check:copy`: `literal-text`, `literal-stale`, `claim-unproven`, `claim-verifier`, `claim-evidence`, `urgency-unproven`, `testimonial-unverified`, `testimonial-shared-image`, `ledger-invalid`.

#### External APIs

- IndexNow: `https://api.indexnow.org/indexnow` or an engine endpoint `https://<engine>/indexnow`, key file at the origin root, POST JSON up to 10,000 URLs, no credentials; used only with `--submit` (R-015). Live audit: HTTP GET/HEAD to the origin given.

### 11. TDD Strategy

- **Unit**: pure rule modules (`perf-rules`, the new rules in `seo-rules`, `copy-rules`), the IndexNow payload builder, the redirect-file parser.
- **Integration/Contract**: each CLI against temporary fixture trees; the live audit against a local `Bun.serve` fixture server; catalog, routing, docs and evidence tests against the real repository files.
- **BDD/Acceptance**: AC-001 to AC-011 in section 6.
- **Test Runner**: Vitest via `bun run test` (project `scripts`).
- **E2E**: A full `nuxt build` with `SITE_URL`, then `check:perf`, `check:seo`, `check:copy`; a local `wrangler dev` run of the spike for D4; a lab measurement run (T044).

#### RED-GREEN-REFACTOR Evidence

| IDs | Reference BDD | TDD Test Case | Observed RED | Observed GREEN | Refactor/Regression |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-002, NFR-001, AC-001, AC-002, AC-003 | AC-001, AC-002, AC-003 | `scripts/perf-rules.test.ts` | Pending | Pending | Pending |
| US-002, FR-004, FR-007, NFR-001, AC-004 | AC-004 | `scripts/seo-rules.test.ts` (new cases) | Pending | Pending | Pending |
| US-002, FR-005, FR-006, NFR-003, AC-005, AC-006 | AC-005, AC-006 | `scripts/seo-live.test.ts`, `scripts/indexnow.test.ts` | Pending | Pending | Pending |
| US-003, US-004, FR-009, FR-010, AC-007, AC-008, AC-009 | AC-007, AC-008, AC-009 | `scripts/copy-rules.test.ts` | Pending | Pending | Pending |
| US-005, FR-011, NFR-005, AC-010 | AC-010 | `scripts/copy-patterns.test.ts` | Pending | Pending | Pending |
| US-006, FR-001, FR-003, FR-008, FR-012, NFR-006, NFR-007, AC-011 | AC-011 | `scripts/specialists-catalog.test.ts`, `scripts/specialist-evidence.test.ts`, `scripts/content-docs-drift.test.ts` | Pending | Pending | Pending |

### 12. Test Plan and Traceability

| Requirement | BDD Scenario | Level | Test File/Command | Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | AC-011 | Integration | scripts/specialists-catalog.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-002 | AC-001, AC-002, AC-003 | Unit | scripts/perf-rules.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-003 | AC-011 | Integration | scripts/specialists-catalog.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-004 | AC-004 | Unit | scripts/seo-rules.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-005 | AC-005 | Integration | scripts/seo-live.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-006 | AC-006 | Unit | scripts/indexnow.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-007 | AC-004, AC-005 | Integration | scripts/redirects.test.ts, scripts/seo-live.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-008 | AC-011 | Integration | scripts/content-docs-drift.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-009 | AC-007, AC-009 | Unit | scripts/copy-rules.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-010 | AC-007, AC-008, AC-009 | Unit | scripts/copy-rules.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-011 | AC-010 | Unit | scripts/copy-patterns.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| FR-012 | AC-011 | Integration | scripts/content-docs-drift.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| NFR-001 | AC-001, AC-004, AC-007 | Unit | bun run test | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| NFR-002 | AC-003, AC-008 | Unit | scripts/perf-rules.test.ts, scripts/copy-rules.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| NFR-003 | AC-005, AC-006 | Integration | scripts/seo-live.test.ts, scripts/indexnow.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| NFR-004 | AC-011 | Integration | scripts/gates-dependencies.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| NFR-005 | AC-010 | Unit | scripts/copy-patterns.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| NFR-006 | AC-011 | Integration | scripts/specialist-evidence.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |
| NFR-007 | AC-011 | Integration | scripts/content-docs-drift.test.ts | GREEN 2026-09-25 (`bun run test`, 553 passed) |

### 13. Validations

#### Act I Gate — Definition

- **Result**: Pending
- **Command**: `bun run fireskill validate 0002 --strict`
- **Findings**: The linter passes (`Status: VALID`, 0 errors, 0 warnings, 2026-09-25). The gate stays Pending on purpose: Q-01 to Q-03 are open and the Fireskills rules keep a spec in Draft while applicable gaps remain.

#### Act II Gate — Plan

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs specs/draft/0002-web-performance-search-copy-specialists/spec.md --allow-draft`
- **Findings**: In draft mode the validator reports 55 tasks (33 TDD, 10 CODE), 330 checklist items and 37 of 37 specification IDs covered, and only the two errors that a Draft spec must have (Definition Gate not Passed, Status not Defined). The gate cannot pass until the RED tasks T001-T032 are executed and completed, because the validator requires completed TDD predecessors.

#### Act III Gate — Delivery

- **Result**: Pending
- **Command**: `node fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs specs/draft/0002-web-performance-search-copy-specialists/spec.md .`
- **Findings**: Traceability OK, 37 of 37 IDs covered in 32 test files (2026-09-25). Gates on a fresh build with `SITE_URL=https://nuxfire.com`: `check:seo`, `check:perf`, `check:copy` and `check:i18n` exit 0; `check:seo --live` against a local `wrangler dev` with `drop-trailing-slash` audited 97 sitemap URLs and 10 legacy URLs, exit 0; typechecks of `apps/web`, `apps/app` and `apps/app` server exit 0; `bun run test` 553 passed, 1 skipped. The gate stays Pending: T041 (production deploy and live audit, which needs Q-05) is open, and Q-02 and Q-03 were not answered.

### 14. Tasks

Format:
`- [ ] TNNN [P?] [TYPE] [US-NNN?] Action with file path — Refs: IDs — Depends: IDs|none`

Every task maintains this exact checklist during execution:

```markdown
  - [ ] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [ ] **EXECUTE**: Produce implementation at declared file path.
  - [ ] **VERIFY**: Execute targeted test verification.
  - [ ] **VISUAL**: Check borders, margins, padding, spacing, and typography; if non-visual, mark `Not applicable` with rationale.
  - [ ] **EVIDENCE**: Record command output and resolved IDs in sections 11–13.
  - [ ] **IMPROVE**: Record process improvement or justify absence.
```

#### Phase 1 — RED TDD Informed by BDD

- [x] T001 [TEST] [TDD] [US-001] Derive from AC-001 failing Vitest cases for the extraction of brotli bytes and request counts of a page and the evaluation of route budgets in `scripts/perf-rules.test.ts` — Refs: US-001, FR-002, NFR-001, AC-001 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T002 [TEST] [TDD] [US-001] Derive from AC-002 failing Vitest cases for the image rules `img-dimensions`, `img-lcp-lazy` and `img-max-bytes` in `scripts/perf-rules.test.ts` — Refs: US-001, FR-002, NFR-001, AC-002 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T003 [TEST] [TDD] [US-001] Derive from AC-002 failing Vitest cases for `third-party-origin` and `js-none` in `scripts/perf-rules.test.ts` — Refs: US-001, FR-002, NFR-001, AC-002 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T004 [TEST] [TDD] [US-007] Derive from AC-003 failing Vitest cases for the baseline ratchet (`baseline-regression`, `baseline-stale`, `baseline-owner`) of the performance budgets in `scripts/perf-rules.test.ts` — Refs: US-007, FR-002, NFR-002, AC-003 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T005 [TEST] [TDD] Derive from AC-001 and AC-003 failing Vitest cases for the `check:perf` command line (exit codes, output format, missing build output) in `scripts/perf-rules.test.ts` — Refs: US-001, US-007, FR-002, NFR-001, NFR-002, AC-001, AC-003 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T006 [TEST] [TDD] [US-002] Derive from AC-004 failing Vitest cases for `sitemap-lastmod-datetime` and `robots-sitemap` in `scripts/seo-rules.test.ts` — Refs: US-002, FR-004, NFR-001, AC-004 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T007 [TEST] [TDD] [US-002] Derive from AC-004 failing Vitest cases for `no-meta-refresh`, `sitemap-canonical` and `title-not-placeholder` in `scripts/seo-rules.test.ts` — Refs: US-002, FR-004, FR-007, NFR-001, AC-004 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T008 [TEST] [TDD] Derive from AC-004 failing Vitest cases for `jsonld-no-faq` and `jsonld-no-unproven-rating` in `scripts/seo-rules.test.ts` — Refs: US-002, US-004, FR-004, FR-009, NFR-001, AC-004 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T009 [TEST] [TDD] [US-002] Derive from AC-005 failing Vitest cases for `live-status`, `live-redirect-chain` and `live-legacy-redirect` against a local `Bun.serve` fixture in `scripts/seo-live.test.ts` — Refs: US-002, FR-005, FR-007, NFR-003, AC-005 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T010 [TEST] [TDD] [US-002] Derive from AC-005 failing Vitest cases for `live-robots`, `live-compression`, `live-immutable-cache` and `live-noindex-listed` in `scripts/seo-live.test.ts` — Refs: US-002, FR-005, NFR-003, AC-005 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T011 [TEST] [TDD] [US-002] Derive from AC-005 and AC-006 failing Vitest cases for the read-only guarantees (only GET and HEAD, only the given origin, no run without an origin) in `scripts/seo-live.test.ts` — Refs: US-002, FR-005, FR-006, NFR-003, AC-005, AC-006 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T012 [TEST] [TDD] [US-002] Derive from AC-006 failing Vitest cases for the IndexNow key validation and payload building in `scripts/indexnow.test.ts` — Refs: US-002, FR-006, NFR-003, AC-006 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T013 [TEST] [TDD] [US-002] Derive from AC-006 failing Vitest cases for the dry-run default and the refusal to send without `--submit` and `--origin` in `scripts/indexnow.test.ts` — Refs: US-002, FR-006, NFR-003, AC-006 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T014 [TEST] [TDD] [US-004] Derive from AC-007 failing Vitest cases for the validation of the claim ledger schema in `scripts/copy-rules.test.ts` — Refs: US-004, FR-009, NFR-001, NFR-002, AC-007 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T015 [TEST] [TDD] [US-004] Derive from AC-007 failing Vitest cases for the verifiers `repo-count`, `repo-file`, `url` with a retrieved date and `owner-statement` in `scripts/copy-rules.test.ts` — Refs: US-004, FR-009, NFR-001, AC-007 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T016 [TEST] [TDD] Derive from AC-007 failing Vitest cases for the detection of numeric and superlative claims in the marketing namespaces against the ledger in `scripts/copy-rules.test.ts` — Refs: US-003, US-004, FR-009, FR-010, NFR-001, AC-007 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T017 [TEST] [TDD] Derive from AC-008 failing Vitest cases for the literal-text scanner of `.vue` templates and its baseline ratchet in `scripts/copy-rules.test.ts` — Refs: US-003, US-007, FR-010, NFR-002, AC-008 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T018 [TEST] [TDD] Derive from AC-009 failing Vitest cases for `urgency-unproven`, `testimonial-unverified` and `testimonial-shared-image` in `scripts/copy-rules.test.ts` — Refs: US-003, US-004, FR-009, FR-010, AC-009 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T019 [TEST] [TDD] [US-005] Derive from AC-010 failing Vitest cases for the structure and classification of the pattern library in `scripts/copy-patterns.test.ts` — Refs: US-005, FR-011, NFR-005, AC-010 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T020 [TEST] [TDD] [US-005] Derive from AC-010 failing Vitest cases for the 8-word overlap detector against the raw material, with an explicit skip when it is absent, in `scripts/copy-patterns.test.ts` — Refs: US-005, FR-011, NFR-005, AC-010 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T021 [TEST] [TDD] [US-005] Derive from AC-010 failing Vitest cases for the language coverage of the examples and the absence of class C examples in `scripts/copy-patterns.test.ts` — Refs: US-005, FR-011, NFR-005, AC-010 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T022 [TEST] [TDD] [US-006] Derive from AC-011 failing Vitest cases for the registration of the three specialists (catalog, routing table, README, count 38) in `scripts/specialists-catalog.test.ts` — Refs: US-006, FR-001, FR-003, FR-008, FR-012, NFR-007, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T023 [TEST] [TDD] [US-006] Derive from AC-011 failing Vitest cases for the required structure of the three specialists (sections, `agents/openai.yaml`, references, "What does NOT exist") in `scripts/specialist-evidence.test.ts` — Refs: US-006, FR-001, FR-003, FR-008, NFR-006, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T024 [TEST] [TDD] [US-006] Derive from AC-011 failing Vitest cases for the routing text of `AGENTS.md`, `fireskills/SKILL.md` and `.fireskills/RULES.md` and for the package scripts in `scripts/content-docs-drift.test.ts` — Refs: US-006, FR-003, FR-008, FR-012, NFR-007, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T025 [TEST] [TDD] [US-006] Derive from AC-011 failing Vitest cases for the docs mirrors in en, pt-br and es and the count of specialists in the locale files in `scripts/content-docs-drift.test.ts` — Refs: US-006, FR-012, NFR-007, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T026 [TEST] [TDD] [US-001] Derive from AC-011 failing Vitest cases that check every performance fact of the specialist against the installed packages (the `noScripts` route rule and the lazy hydration strategies exist in the installed Nuxt) in `scripts/specialist-evidence.test.ts` — Refs: US-001, FR-001, NFR-006, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T027 [TEST] [TDD] [US-002] Derive from AC-004 and AC-005 failing Vitest cases for the parsing and validation of `apps/web/public/_redirects` (only 301 or 308, no duplicate source, every legacy path of `nuxt.config.ts` present) in `scripts/redirects.test.ts` — Refs: US-002, FR-007, NFR-001, AC-004, AC-005 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T028 [TEST] [TDD] Derive from AC-011 failing Vitest cases that no gate script imports a package other than Node or Bun built-ins and the already declared tooling, and that nothing under `apps/` imports from `scripts/`, in `scripts/gates-dependencies.test.ts` — Refs: US-001, US-002, US-003, NFR-004, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T029 [TEST] [TDD] Derive from AC-011 failing Vitest cases that every tooling package used by the gates is an exact-version root `devDependency` and that the gate scripts are registered in `package.json`, in `scripts/gates-dependencies.test.ts` — Refs: US-001, US-002, US-003, FR-012, NFR-004, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T030 [TEST] [TDD] Derive from AC-011 failing Vitest cases that the built `apps/web/.output` output contains no code of the gates, in `scripts/gates-dependencies.test.ts` — Refs: US-001, US-002, NFR-004, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T031 [TEST] [TDD] [US-006] Derive from AC-011 failing Vitest cases that every fact table of the three specialists has the columns Source, Read and Mode, in `scripts/specialist-evidence.test.ts` — Refs: US-006, FR-001, FR-003, FR-008, FR-012, NFR-006, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

- [x] T032 [TEST] [TDD] [US-006] Derive from AC-011 failing Vitest cases that a finished reference has no row with mode SUM and that every URL in a fact table appears in the research index, in `scripts/specialist-evidence.test.ts` — Refs: US-006, FR-001, FR-003, FR-008, NFR-006, AC-011 — Depends: none
  - [x] **PREP**: Read the Gherkin of the referenced AC and confirm the rule, the IDs and the test level; load `$fireskill-specialist-typescript` and `$fireskill-specialist-content-seo`.
  - [x] **EXECUTE**: Author the cases with a unique `SPECSFY:` comment marker each, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure caused by the missing behaviour, not by a syntax error.
  - [x] **VISUAL**: Not applicable: test implementation with no visual output.
  - [x] **EVIDENCE**: Record the test command and the failure trace in section 11.
  - [x] **IMPROVE**: Review coverage and record the lesson learned.

#### Phase 2 — Performance track (US-001, US-007)

**Goal**: budgets and rules on the built output, measured facts for the specialist.
**Independent Test**: `bun run check:perf` on the current build.

- [x] T033 [CODE] Implement the pure performance rules (metrics extraction, budgets, image and origin rules, `js-none`, baseline ratchet) in `scripts/perf-rules.ts` — Refs: US-001, US-007, FR-002, NFR-001, NFR-002, AC-001, AC-002, AC-003 — Depends: T001, T002, T003, T004, T005
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T033", "refs": ["US-001", "US-007", "FR-002", "NFR-001", "NFR-002", "AC-001", "AC-002", "AC-003"], "files": ["scripts/perf-rules.ts"], "commands": [{"run": "bunx vitest run scripts/perf-rules.test.ts", "exit": 0}, {"run": "bun run test", "exit": 0}]} -->

- [x] T034 [CODE] Implement the `check:perf` command, register it in `package.json` and generate the first baseline (M1-M3 values, each with `removedBy`) in `scripts/check-perf.ts` and `perf-budgets.json` — Refs: US-001, US-007, FR-002, FR-012, NFR-001, NFR-002, AC-001, AC-003 — Depends: T033, T001, T002, T003, T004, T005
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T034", "refs": ["US-001", "US-007", "FR-002", "FR-012", "NFR-001", "NFR-002", "AC-001", "AC-003"], "files": ["scripts/check-perf.ts", "perf-budgets.json", "package.json"], "commands": [{"run": "bunx vitest run scripts/perf-rules.test.ts", "exit": 0}, {"run": "bun run check:perf", "exit": 0}]} -->

#### Phase 3 — Search track (US-002)

**Goal**: search rules on the output and on a live origin, IndexNow, and the fix of D4 and D5.
**Independent Test**: `bun run check:seo -- --live <origin>`.

- [x] T035 [CODE] Implement the new static search rules (`sitemap-lastmod-datetime`, `no-meta-refresh`, `sitemap-canonical`, `title-not-placeholder`, `jsonld-no-faq`, `jsonld-no-unproven-rating`, `robots-sitemap`) in `scripts/seo-rules.ts` and `scripts/seo-config.json` — Refs: US-002, US-004, FR-004, FR-007, NFR-001, AC-004 — Depends: T006, T007, T008
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T035", "refs": ["US-002", "US-004", "FR-004", "FR-007", "NFR-001", "AC-004"], "files": ["scripts/seo-rules.ts", "scripts/seo-config.json"], "commands": [{"run": "bunx vitest run scripts/seo-rules.test.ts", "exit": 0}, {"run": "bun run check:seo", "exit": 0}]} -->

- [x] T036 [CODE] [US-002] Make the sitemap `lastmod` of posts carry date and time in `apps/web/server/plugins/sitemap-blog.ts` and `apps/web/app/utils/seo/content-seo.ts` — Refs: US-002, FR-004, NFR-001, AC-004 — Depends: T006, T007, T008, T035
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T036", "refs": ["US-002", "FR-004", "NFR-001", "AC-004"], "files": ["apps/web/server/plugins/sitemap-blog.ts", "apps/web/app/utils/seo/content-seo.ts"], "commands": [{"run": "bunx vitest run apps/web/app/utils/seo/content-seo.test.ts", "exit": 0}, {"run": "bun run check:seo", "exit": 0}]} -->

- [x] T037 [CODE] [US-002] Implement the live HTTP audit and the `--live` option of `check:seo` in `scripts/seo-live.ts` and `scripts/check-seo.ts` — Refs: US-002, FR-005, FR-007, NFR-003, AC-005, AC-006 — Depends: T009, T010, T011
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T037", "refs": ["US-002", "FR-005", "FR-007", "NFR-003", "AC-005", "AC-006"], "files": ["scripts/seo-live.ts", "scripts/check-seo.ts"], "commands": [{"run": "bunx vitest run scripts/seo-live.test.ts", "exit": 0}, {"run": "bun run check:seo -- --live http://127.0.0.1:8787 --sitemap-origin https://nuxfire.com", "exit": 0}]} -->

- [x] T038 [CODE] [US-002] Implement the IndexNow script with dry run by default and register `indexnow` in `package.json` in `scripts/indexnow.ts` — Refs: US-002, FR-006, NFR-003, AC-006 — Depends: T011, T012, T013
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T038", "refs": ["US-002", "FR-006", "NFR-003", "AC-006"], "files": ["scripts/indexnow.ts", "package.json"], "commands": [{"run": "bunx vitest run scripts/indexnow.test.ts", "exit": 0}]} -->

- [x] T039 [OPS] Run the redirect and trailing-slash spike locally with `wrangler dev` for `auto-trailing-slash` and `drop-trailing-slash`, with and without a `_redirects` file, audited by `check:seo --live`, and record the result in `specs/draft/0002-web-performance-search-copy-specialists/research/redirect-spike.md` — Refs: US-002, FR-005, FR-007, AC-005 — Depends: T037
  - [x] **PREP**: Confirm the prerequisites, the authorization when the step is outward-facing, and that the environment is the intended one.
  - [x] **EXECUTE**: Run the procedure exactly as written and keep the raw output.
  - [x] **VERIFY**: Compare the result with the expected outcome and record any difference.
  - [x] **VISUAL**: Not applicable: operational step with no visual output.
  - [x] **EVIDENCE**: Record the commands, outputs, dates and the files produced.
  - [x] **IMPROVE**: Record what the step taught and whether a rule or a test must change.

- [x] T040 [CODE] [US-002] Apply the mechanism chosen by the spike: `apps/web/public/_redirects` and, if chosen, `assets.htmlHandling` in `infra/utils/nuxt.ts`, and remove the meta-refresh stubs of `apps/web/nuxt.config.ts` route rules — Refs: US-002, FR-004, FR-007, AC-004, AC-005 — Depends: T007, T009, T027, T039
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T040", "refs": ["US-002", "FR-004", "FR-007", "AC-004", "AC-005"], "files": ["apps/web/public/_redirects", "infra/utils/nuxt.ts", "infra/web.ts", "apps/web/nuxt.config.ts"], "commands": [{"run": "bunx vitest run scripts/redirects.test.ts", "exit": 0}, {"run": "bun run check:seo -- --live http://127.0.0.1:8787 --sitemap-origin https://nuxfire.com", "exit": 0}]} -->

- [ ] T041 [OPS] After the owner's authorization (Q-05), deploy the change and run `check:seo --live https://nuxfire.com`, recording the before and after in `specs/draft/0002-web-performance-search-copy-specialists/research/live-audit.md` — Refs: US-002, FR-005, FR-007, AC-005 — Depends: T040
  - [ ] **PREP**: Confirm the prerequisites, the authorization when the step is outward-facing, and that the environment is the intended one.
  - [ ] **EXECUTE**: Run the procedure exactly as written and keep the raw output.
  - [ ] **VERIFY**: Compare the result with the expected outcome and record any difference.
  - [ ] **VISUAL**: Not applicable: operational step with no visual output.
  - [ ] **EVIDENCE**: Record the commands, outputs, dates and the files produced.
  - [ ] **IMPROVE**: Record what the step taught and whether a rule or a test must change.

#### Phase 4 — Copy track (US-003, US-004, US-005)

**Goal**: claims proven, no new ungoverned text, original patterns.
**Independent Test**: `bun run check:copy`.

- [x] T042 [CODE] Implement the pure copy rules (ledger schema and verifiers, claim detection, literal scanner and ratchet, urgency and testimonial rules) in `scripts/copy-rules.ts` — Refs: US-003, US-004, US-007, FR-009, FR-010, NFR-001, NFR-002, AC-007, AC-008, AC-009 — Depends: T014, T015, T016, T017, T018
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T042", "refs": ["US-003", "US-004", "US-007", "FR-009", "FR-010", "NFR-001", "NFR-002", "AC-007", "AC-008", "AC-009"], "files": ["scripts/copy-rules.ts"], "commands": [{"run": "bunx vitest run scripts/copy-rules.test.ts scripts/copy-patterns.test.ts", "exit": 0}, {"run": "bun run test", "exit": 0}]} -->

- [x] T043 [CODE] Implement the `check:copy` command, register it in `package.json`, create the initial ledger and generate the literal baseline (each entry `removedBy`) in `scripts/check-copy.ts`, `.fireskills/CLAIMS.yml` and `scripts/copy-baseline.json` — Refs: US-003, US-004, US-007, FR-009, FR-010, FR-012, NFR-001, NFR-002, AC-007, AC-008, AC-009 — Depends: T042, T014, T015, T016, T017, T018
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T043", "refs": ["US-003", "US-004", "US-007", "FR-009", "FR-010", "FR-012", "NFR-001", "NFR-002", "AC-007", "AC-008", "AC-009"], "files": ["scripts/check-copy.ts", ".fireskills/CLAIMS.yml", "scripts/copy-baseline.json"], "commands": [{"run": "bunx vitest run scripts/copy-rules.test.ts", "exit": 0}, {"run": "bun run check:copy", "exit": 0}]} -->

- [x] T044 [OPS] Run the lab measurement protocol (Lighthouse or a Chromium with paint timing) on the home built locally and on production, and record LCP, CLS and an INP proxy with the method and its limits in `specs/draft/0002-web-performance-search-copy-specialists/research/lab-measurements.md` — Refs: US-001, FR-001, NFR-006 — Depends: T034
  - [x] **PREP**: Confirm the prerequisites, the authorization when the step is outward-facing, and that the environment is the intended one.
  - [x] **EXECUTE**: Run the procedure exactly as written and keep the raw output.
  - [x] **VERIFY**: Compare the result with the expected outcome and record any difference.
  - [x] **VISUAL**: Not applicable: operational step with no visual output.
  - [x] **EVIDENCE**: Record the commands, outputs, dates and the files produced.
  - [x] **IMPROVE**: Record what the step taught and whether a rule or a test must change.

- [x] T045 [OPS] Run the zero-JavaScript spike: `routeRules` `noScripts` on a scratch route, measure bytes before and after, list what stops working (color mode, locale switcher, header menu, search) and record it in `specs/draft/0002-web-performance-search-copy-specialists/research/zero-js-spike.md` — Refs: US-001, FR-001, FR-002 — Depends: T034
  - [x] **PREP**: Confirm the prerequisites, the authorization when the step is outward-facing, and that the environment is the intended one.
  - [x] **EXECUTE**: Run the procedure exactly as written and keep the raw output.
  - [x] **VERIFY**: Compare the result with the expected outcome and record any difference.
  - [x] **VISUAL**: Not applicable: operational step with no visual output.
  - [x] **EVIDENCE**: Record the commands, outputs, dates and the files produced.
  - [x] **IMPROVE**: Record what the step taught and whether a rule or a test must change.

- [x] T046 [DOC] Author `fireskill-specialist-web-performance` (`SKILL.md`, `agents/openai.yaml`, references) after re-reading the web.dev and Astro sources RAW, in `fireskills/specialists/fireskill-specialist-web-performance/SKILL.md` — Refs: US-001, US-006, FR-001, NFR-006 — Depends: T034, T044, T045
  - [x] **PREP**: Read the research files and, for every source to be encoded as a rule, re-read the page RAW and record the reading mode.
  - [x] **EXECUTE**: Write the document at the declared path from verified facts only; label decisions as decisions.
  - [x] **VERIFY**: Run the specialist and drift tests and `bun run check:i18n` where a mirror exists.
  - [x] **VISUAL**: Not applicable: documentation with no visual output.
  - [x] **EVIDENCE**: Record the sources read, the commands and the modified files.
  - [x] **IMPROVE**: Record what a reviewer agent found in a separate pass.

- [x] T047 [DOC] Re-read RAW the Google, Bing and schema.org sources listed as not yet read (redirects, canonicalization, sitemaps, robots, Product, Organization, WebSite, BreadcrumbList) and update `specs/draft/0002-web-performance-search-copy-specialists/research/google-search.md` and `research/schema-org.md` — Refs: FR-003, NFR-006 — Depends: none
  - [x] **PREP**: Read the research files and, for every source to be encoded as a rule, re-read the page RAW and record the reading mode.
  - [x] **EXECUTE**: Write the document at the declared path from verified facts only; label decisions as decisions.
  - [x] **VERIFY**: Run the specialist and drift tests and `bun run check:i18n` where a mirror exists.
  - [x] **VISUAL**: Not applicable: documentation with no visual output.
  - [x] **EVIDENCE**: Record the sources read, the commands and the modified files.
  - [x] **IMPROVE**: Record what a reviewer agent found in a separate pass.

- [x] T048 [DOC] Author `fireskill-specialist-seo` (`SKILL.md`, `agents/openai.yaml`, references) in `fireskills/specialists/fireskill-specialist-seo/SKILL.md` — Refs: US-002, US-006, FR-003, NFR-006 — Depends: T035, T037, T038, T040, T047
  - [x] **PREP**: Read the research files and, for every source to be encoded as a rule, re-read the page RAW and record the reading mode.
  - [x] **EXECUTE**: Write the document at the declared path from verified facts only; label decisions as decisions.
  - [x] **VERIFY**: Run the specialist and drift tests and `bun run check:i18n` where a mirror exists.
  - [x] **VISUAL**: Not applicable: documentation with no visual output.
  - [x] **EVIDENCE**: Record the sources read, the commands and the modified files.
  - [x] **IMPROVE**: Record what a reviewer agent found in a separate pass.

- [x] T049 [OPS] Record the owner's answers to Q-01, Q-02 and Q-03 as decisions and, once Q-01 is confirmed, ignore `docs/copywiter/` in git and remove the two committed files from the tree in `specs/draft/0002-web-performance-search-copy-specialists/spec.md` — Refs: FR-008, FR-011, NFR-005 — Depends: none
  - [x] **PREP**: Confirm the prerequisites, the authorization when the step is outward-facing, and that the environment is the intended one.
  - [x] **EXECUTE**: Run the procedure exactly as written and keep the raw output.
  - [x] **VERIFY**: Compare the result with the expected outcome and record any difference.
  - [x] **VISUAL**: Not applicable: operational step with no visual output.
  - [x] **EVIDENCE**: Record the commands, outputs, dates and the files produced.
  - [x] **IMPROVE**: Record what the step taught and whether a rule or a test must change.

- [x] T050 [DOC] Distil the pattern library (classes A, B, C; original structures; examples in en, pt-br and es) from the raw material in `fireskills/specialists/fireskill-specialist-copywriting/references/pattern-library.md` — Refs: US-005, FR-011, NFR-005 — Depends: T049, T019, T020, T021
  - [x] **PREP**: Read the research files and, for every source to be encoded as a rule, re-read the page RAW and record the reading mode.
  - [x] **EXECUTE**: Write the document at the declared path from verified facts only; label decisions as decisions.
  - [x] **VERIFY**: Run the specialist and drift tests and `bun run check:i18n` where a mirror exists.
  - [x] **VISUAL**: Not applicable: documentation with no visual output.
  - [x] **EVIDENCE**: Record the sources read, the commands and the modified files.
  - [x] **IMPROVE**: Record what a reviewer agent found in a separate pass.

- [x] T051 [DOC] Author `fireskill-specialist-copywriting` (`SKILL.md`, `agents/openai.yaml`, workflow, messaging, headlines, application text, claims and compliance, localisation references) after re-reading RAW the copy, compliance and application-text sources in `fireskills/specialists/fireskill-specialist-copywriting/SKILL.md` — Refs: US-003, US-004, US-006, FR-008, NFR-006 — Depends: T043, T049
  - [x] **PREP**: Read the research files and, for every source to be encoded as a rule, re-read the page RAW and record the reading mode.
  - [x] **EXECUTE**: Write the document at the declared path from verified facts only; label decisions as decisions.
  - [x] **VERIFY**: Run the specialist and drift tests and `bun run check:i18n` where a mirror exists.
  - [x] **VISUAL**: Not applicable: documentation with no visual output.
  - [x] **EVIDENCE**: Record the sources read, the commands and the modified files.
  - [x] **IMPROVE**: Record what a reviewer agent found in a separate pass.

#### Phase 5 — Governance (US-006)

**Goal**: routing, registration, docs and counts.
**Independent Test**: catalog and drift tests, `bun run check:i18n`.

- [x] T052 [CODE] [US-006] Register the three specialists and the routing rules in `fireskills/specialists/catalog.json`, `fireskills/SKILL.md`, `fireskills/README.md`, `AGENTS.md` and `.fireskills/RULES.md` — Refs: US-006, FR-001, FR-003, FR-008, FR-012, NFR-006, NFR-007, AC-011 — Depends: T022, T023, T024, T031, T032
  - [x] **PREP**: Confirm the RED tests fail for the declared reason and the dependencies are complete; read `.fireskills/RULES.md` and load `$fireskill-specialist-typescript`.
  - [x] **EXECUTE**: Implement the minimal passing code at the declared path, pure functions first and a thin command line.
  - [x] **VERIFY**: Run the targeted suite and the full `bun run test` for regressions.
  - [x] **VISUAL**: Not applicable: non-visual code with no user interface.
  - [x] **EVIDENCE**: Record the GREEN output and the modified files in the evidence comment and in sections 11-13.
  - [x] **IMPROVE**: Document refactoring or justify its absence.
  <!-- specsfy:evidence {"task": "T052", "refs": ["US-006", "FR-001", "FR-003", "FR-008", "FR-012", "NFR-006", "NFR-007", "AC-011"], "files": ["fireskills/specialists/catalog.json", "fireskills/SKILL.md", "fireskills/README.md", "AGENTS.md", ".fireskills/RULES.md"], "commands": [{"run": "bunx vitest run scripts/specialists-catalog.test.ts scripts/content-docs-drift.test.ts", "exit": 0}]} -->

- [x] T053 [DOC] Document the three specialists in the docs in three languages and update the specialist counts in `apps/web/content/docs/2.fireskills/4.specialists/0.overview.md` and its pt-br and es mirrors and locale files — Refs: US-006, FR-012, NFR-007 — Depends: T052, T025
  - [x] **PREP**: Read the research files and, for every source to be encoded as a rule, re-read the page RAW and record the reading mode.
  - [x] **EXECUTE**: Write the document at the declared path from verified facts only; label decisions as decisions.
  - [x] **VERIFY**: Run the specialist and drift tests and `bun run check:i18n` where a mirror exists.
  - [x] **VISUAL**: Not applicable: documentation with no visual output.
  - [x] **EVIDENCE**: Record the sources read, the commands and the modified files.
  - [x] **IMPROVE**: Record what a reviewer agent found in a separate pass.

- [x] T054 [OPS] Run the Fireskills documentator, the context monitor and `bun run check:i18n`, resolving every pending flag, in `docs/README.md` and `.fireskills/PACKAGES.md` — Refs: US-006, FR-012, NFR-007 — Depends: T053
  - [x] **PREP**: Confirm the prerequisites, the authorization when the step is outward-facing, and that the environment is the intended one.
  - [x] **EXECUTE**: Run the procedure exactly as written and keep the raw output.
  - [x] **VERIFY**: Compare the result with the expected outcome and record any difference.
  - [x] **VISUAL**: Not applicable: operational step with no visual output.
  - [x] **EVIDENCE**: Record the commands, outputs, dates and the files produced.
  - [x] **IMPROVE**: Record what the step taught and whether a rule or a test must change.

#### Final Quality Phase

- [x] T055 [TEST] Execute the full regression, a fresh build with `SITE_URL`, `check:perf`, `check:seo`, `check:copy`, the typecheck and the traceability, confirming with `--json` that each ID is covered by the test files declared in section 12 and not by another spec, in `scripts/specialists-catalog.test.ts` — Refs: US-001, US-002, US-003, US-004, US-005, US-006, US-007, FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, NFR-001, NFR-002, NFR-003, NFR-004, NFR-005, NFR-006, NFR-007, AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011 — Depends: T034, T036, T040, T043, T046, T048, T050, T051, T054
  - [x] **PREP**: Identify the suites, builds and gates to run.
  - [x] **EXECUTE**: Run the complete regression and every gate on a fresh build.
  - [x] **VERIFY**: Confirm zero failures and a clean output from every gate.
  - [x] **VISUAL**: Not applicable: verification with no visual output.
  - [x] **EVIDENCE**: Record final counts and commands.
  - [x] **IMPROVE**: Document retrospective notes.


### 15. Execution Order

- Critical Path: T001-T032 (RED) → T033 → T034 → T035 → T037 → T039 → T040 → T042 → T043 → T052 → T053 → T054 → T056.
- Parallel Tasks: the three tracks are independent until registration: performance (T033, T034, T044, T045, T046), search (T035-T041, T047, T048), copy (T042, T043, T049-T051). T044 and T045 need only a build.
- MVP Strategy: T033-T034 and T042-T043 deliver the gates with baselines; the specialists (T046, T048, T051) then encode what the gates and measurements proved.

## Act III — Deliver and Validate

### 16. Dependencies, Risks, and Assumptions

#### Dependencies

- SPEC-0001 (its gate, builders and specialist), `sharp` and Bun as already declared, the installed Nuxt 4.5.2 and SST 4.14.
- Owner answers to Q-01 to Q-03 before T049-T051; Q-05 before T041.
- A Chromium or Lighthouse able to produce timings for T044 (the pane used in this session cannot).

#### Risks

- A source summarised by a tool is wrong or stale → no SUM row survives into a specialist (NFR-006); T046, T047 and T051 re-read RAW.
- `noScripts` breaks the color mode, locale switcher, header menu or search → the spike (T045) records what breaks before any route is declared `js: none`; the decision to keep, replace with HTML/CSS, or hydrate lazily is made per component with evidence.
- `htmlHandling` or `_redirects` behaves differently from the documentation on this Worker → the spike runs `wrangler dev` locally with both variants and the live audit before any deploy.
- The claim detector flags numbers that are not claims (versions, years) or misses a claim → explicit `not-a-claim` entries with a reason, a fixture suite of real strings from `en.json`, and the ledger reviewed by a second agent.
- Baselines become a permanent excuse → `removedBy` is mandatory and stale entries fail (NFR-002).
- Distilled patterns still resemble the raw text → the 8-word overlap test, and a manual read by a reviewer agent.
- The rules of a jurisdiction not read are missed → Q-03 and the "not legal advice" limit stated in the specialist.
- Two agents work on the same branch (a concurrent session was seen earlier) → verify the git state before each commit.
- The traceability script matches `SPECSFY:` markers across the whole repository and IDs repeat between specs (SPEC-0001 also defines US-001 and FR-001), so it can report coverage that belongs to another spec (confirmed by reading `fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs`; it already reports 26 of 37 IDs covered before any test of this spec exists) → T055 checks the per-ID locations of `--json` output against the test files declared in section 12 only, and the limitation is reported to the owner.

#### Assumptions

- The owner's decisions on Q-01 to Q-03 will confirm DEC-006 and DEC-014; if they do not, the affected tasks are re-planned, not improvised.
- Production headers and behaviour (M7, M10, M11) are as measured on 2026-09-25 until the next deploy; T041 re-measures.
- Bun's `zlib` supports brotli compression for the byte counts (to be confirmed by T001; Node's `zlib.brotliCompressSync` is the fallback).

### 17. Decisions

- **DEC-001**: Three new specialists (performance, SEO, copy) instead of one combined "landing" specialist or additions to existing ones — the three change for different reasons (per build, per site, per text) and are routed by different triggers; considered a single specialist (large, mixes cadences) and extending `content-seo` (would turn a pipeline document into a general reference).
- **DEC-002**: `fireskill-specialist-seo` holds what search engines require for any page; `fireskill-specialist-content-seo` keeps how Nuxfire's blog and docs are authored and gated; each names the other.
- **DEC-003**: `fireskill-specialist-web-performance` covers browser delivery (bytes, scripts, images, fonts, hydration, vitals); `fireskill-specialist-performance-engineering` keeps the general method and back-end capacity; each names the other.
- **DEC-004**: "As Astro" means four transferable behaviours (no JavaScript where there is no interactivity, hydrate only what needs it and when, images with dimensions and modern formats, defaults enforced by tooling) plus a measured reference; adopting Astro as a second framework is deferred — it would duplicate the Vue design system and the i18n stack; revisit only if the spike shows that Nuxt with `noScripts` and lazy hydration cannot meet the budgets set from the Astro reference for a marketing page.
- **DEC-005**: Byte budgets are project decisions recorded with the measured baseline as their evidence; the only sourced numbers are the vitals thresholds (R-004).
- **DEC-006**: The raw copy material stays out of the delivered repository (ignored by git) and the specialist stores original structures in the project's words; the two committed files are removed from the tree once the owner confirms (Q-01). Rationale: the material includes third-party affiliate scripts and its redistribution rights are unknown (R-012).
- **DEC-007**: Claims are proven by a ledger whose verifiers a machine can run (`repo-count`, `repo-file`, `url` with a retrieved date, `owner-statement` with name and date); a claim without proof does not ship.
- **DEC-008**: Baselines are explicit, dated and owned, and only shrink; a gate that starts red and is waived is not accepted (PR-004).
- **DEC-009**: `check:perf` measures bytes and structure, which are deterministic; LCP, INP and CLS are measured by a documented protocol and recorded as evidence, because a lab run cannot replace field data (R-004).
- **DEC-010**: The live audit is read-only and IndexNow defaults to a dry run; nothing in this spec deploys or submits without the owner's authorization (PR-005).
- **DEC-011**: The sitemap `lastmod` carries date and time from now on (Bing, R-006); this supersedes the date-only acceptance of SPEC-0001 DEC-013 for the sitemap only, and `article:published_time` keeps its own rule.
- **DEC-012**: No `FAQPage` markup is added for Google's sake (R-007); whether Bing uses it is recorded as unverified.
- **DEC-013**: No `aggregateRating` or `review` is emitted without real, attributable reviews (R-007, R-010).
- **DEC-014**: "Text a human reads" means interface strings, marketing pages, blog posts, legal text, transactional emails, notifications and error messages shown to users; documentation prose is covered for voice and clarity only, not for conversion; code comments, logs and developer-only console messages are excluded — to be confirmed by the owner (Q-02).
- **DEC-015**: Marketing copy is localised by transcreation (the message is rebuilt for the market), interface text by faithful translation.
- **DEC-016**: The copy gate has no inline ignore comment; the only exception mechanism is the dated, owned baseline.
- **DEC-017**: The raw copy material no longer exists on the machine (the owner deleted it), so the pattern library was written from the trigger and component names recorded in `research/copywiter-material-analysis.md`, the primary sources of `research/raw-reads.md` and the compliance rules, not distilled from the files; it has 24 patterns (12 class A, 7 class B, 5 class C) and says so in its own text; the originality test is skipped when the folder is absent. Supersedes the extraction method of T050.
- **DEC-018**: Owners of baselines and allowances are `BACKLOG-landing-refactor`, `BACKLOG-app-ui-copy` and `BACKLOG-web-image-dimensions` (files `specs/backlog/000n-*.md`), because the follow-up specs do not exist yet; `ownerExists` checks that the file is there. Added rule ids: `testimonial-unregistered-image`, `claim-text-mismatch`. The sitemap `lastmod` time is written by the `sitemap:output` hook.
- **DEC-019**: Two builds of the same source are not byte-identical (hashes, and the icons that Nuxt Icon could not fetch from Iconify within 1,500 ms at prerender time: up to 6 % of the home HTML), so a baseline may be exceeded by `regressionTolerancePct` (0.1) before it is a regression; this refines DEC-009 (bytes are deterministic only up to build noise) and DEC-008. The icon nondeterminism itself is a finding, handed to a follow-up task, not fixed here.
- **DEC-020**: `noScripts` on a route removes the whole shell's JavaScript (language switch, color mode, menus) and leaves two inline scripts, so no page is declared `js: none` yet; DEC-004 stands with the condition recorded in `research/zero-js-spike.md`.
- **DEC-021**: The landing text that states "38 specialists" is not covered by a ledger record: the same locale keys also carry other unproven claims (for example "zero hallucinations"), and a ledger record covers a whole key, so covering them would hide those. They stay baselined until the landing is rewritten (`BACKLOG-landing-refactor`).

### 18. Definition of Done

- [ ] `Definition Gate` is `Passed`.
- [ ] `Plan Gate` is `Passed`.
- [ ] `Delivery Gate` is `Passed`.
- [ ] All applicable `AC` acceptance scenarios pass.
- [ ] All requirements have verified test evidence.
- [ ] All tasks in section 14 are completed.
- [ ] All static checks and automated test suites pass.

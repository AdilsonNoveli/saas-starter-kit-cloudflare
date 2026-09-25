# Landing audit (SPEC-0003), 2026-09-25

Method: every row cites the file, the built HTML or a measurement. Reading modes as in
`specs/draft/0002-web-performance-search-copy-specialists/research/README.md` (RAW, CMD, CODE).
Nothing here is an opinion about taste: a verdict is a decision from the specialists
(`fireskill-specialist-copywriting`, `-seo`, `-web-performance`), and says which rule it applies.

The job the owner gave the page (2026-09-25, in chat): **sell one thing**. The call to action of the
offer goes to a Stripe checkout (to be built later). Technical depth (the step by step of Fireskills,
how to create anything) belongs in blog posts and docs and serves as **proof**, not as the sales
argument. Layout: clean, fewer cards, loose content with more air.

## 1. What the page is today

| Id | Fact | Source | Mode |
| --- | --- | --- | --- |
| A1 | The home composes ten sections after the hero: use cases (the six Fireskills steps), architecture diagram, comparison table, folder structure, feature badges, database architecture, FAQs, testimonials, pricing. | apps/web/app/pages/index.vue | CODE |
| A2 | Text per landing block in `en.json` (characters): comparison 9,217; database architecture 9,145; use cases 5,626; FAQs 3,908; pricing 3,677; testimonials 2,181; showcase 1,086; hero 738; badges 705; architecture 633. Three technical blocks (comparison, database, use cases) hold 64 % of the landing text. | apps/web/i18n/locales/en.json | CMD |
| A3 | Cards and bordered boxes per component (count of `UCard`, rounded or bordered containers): comparison 12, database architecture 11, use cases 11, pricing 7, folder structure 2, architecture 2, hero 1. About 47 boxes on one page. | apps/web/app/components/landing/*.vue | CMD |
| A4 | The hero has a badge, a headline, one paragraph with a bold tail, a primary button that scrolls to `#pricing` and a secondary button to the docs. It has **no image of the product** (no screenshot, no video, no demo link). | apps/web/app/components/landing/LandingHero.vue | CODE |
| A5 | The pricing block hard-codes `$49` in the template, says in a note "$79 regular price afterwards" (the owner's price is R$ 497,00 regular and R$ 97,00 at launch, so none of these is right), says "One-Time Payment" and "Never pay monthly for code", while the FAQ and a feature line speak of "annual or lifetime" plans. Its button is "JOIN THE GROUP" and goes to a WhatsApp group link. | LandingPricing.vue (line 97), en.json `landing.pricing`, `landing.faqs.items.item7` | CODE |
| A6 | `<title>` is `Demo SaaS | Nuxfire`; description is `Production-ready enterprise-grade Nuxt starter kit for Cloudflare.`; JSON-LD is `WebSite` and `WebPage` only; the OG image is the site default. | apps/web/.output/public/index.html | CMD |
| A7 | Weight and speed: home JS 280,097 bytes, six avatar JPEGs of 447 to 621 KB shown at 28 to 32 px, LCP 4.2 to 4.6 s in the lab profile against 2.1 to 2.4 s for the Astro reference page. | perf-budgets.json, SPEC-0002 `research/lab-measurements.md` | CMD |
| A8 | The FAQ asks "Can I test the live demo before purchasing?": no demo link is on the hero. Testimonials come after the technical blocks, and pricing is last. | en.json, index.vue | CODE |

## 2. Section by section: what sells, what does not, and where it goes

Rule used: a section stays on the landing only if it helps a visitor decide to buy the one offer.
Depth that convinces goes to a post or a doc page, linked from the landing as proof.

| Section | Job it does today | Verdict | Why | Destination |
| --- | --- | --- | --- | --- |
| Hero | States the problem ("stop spending months...") and a vague CTA | **Rewrite** | No named audience, no visual of the product, "GET STARTED NOW" goes to a scroll; the claim "battle-tested" is unproven | Landing, stays first |
| Use cases (six Fireskills steps, prompts, "step guarantee") | Explains the workflow | **Cut to a short proof block**, move the full walk-through | It is a technical argument, 5.6 KB, with claims such as "guarantees the AI will never hallucinate" that no one can prove | Blog post and docs page "how Fireskills works"; landing keeps three lines and a link |
| Architecture diagram | Shows the Cloudflare architecture | **Keep as one image, cut text** | It is the visual that says "Cloudflare-native" at a glance; the surrounding text ("Complicated? Perhaps.") admits the product is hard to follow, which weakens the sale | Landing (small), full explanation in docs |
| Comparison table (52 features) | Lists 52 features against "SaaS from scratch" | **Move** | A 9 KB table is an argument by inventory, not by outcome; it also holds unproven claims ("Hardware MFA", "GDPR / LGPD compliant") | Docs "what is included" page; landing keeps six outcomes |
| Folder structure | Shows the monorepo | **Move** | Proof for developers who already believe | Docs |
| Feature badges | 21 labels | **Cut** | Labels without meaning ("Modern Stack", "Cloud Ready") | Delete |
| Database architecture (20 tables) | Metrics and an admin console pitch | **Move and correct** | 9 KB of technical argument; "20 tables" vs 21 in code; "<10ms" and "Hardware MFA" are unproven or wrong | Docs and a blog post about the data model |
| FAQs | Answers doubts | **Keep, rewrite** | Objection handling is sales copy; questions must be the buyer's own (price, license, refund, updates, support) | Landing, near the offer |
| Testimonials | Social proof | **Hold until real** | 8 unverified testimonials, photos reused across names, "40+ devs" without evidence (Q-04) | Landing only with ledger records |
| Pricing | The offer | **Rewrite as the goal of the page** | Inconsistent price and plan; CTA goes to WhatsApp; price hard-coded | Landing, one offer, one CTA (Stripe checkout later) |

## 3. Copy audit: claims and risks

Class P0 = false or legally risky as written, P1 = unproven, P2 = weak wording. All P0 and P1 need a
ledger record (`.fireskills/CLAIMS.yml`) or removal (`check:copy` counts 152 unproven claims).

| Id | Text (en) | Class | Finding |
| --- | --- | --- | --- |
| C1 | "Hardware MFA & Elevated Sessions" (admin console) | P0 | The description says TOTP, which is software MFA; "hardware" is wrong |
| C2 | "GDPR / LGPD compliant cascading deletion" | P0 | A compliance claim; the code deletes across KV and Postgres, but "compliant" is a legal conclusion the owner cannot state without advice |
| C3 | "Guarantees the AI will never hallucinate", "zero hallucinations", "Zero code enters the repository without an automated test" | P0 | Absolute claims about an AI system and about all code |
| C4 | 8 testimonials with names, roles, photos; "Real feedback from developers" | P1 | The owner states they are real and to keep them; two photos are shared by two names each, which cannot be true of two people, and figures such as "cut bills to zero" need the person's confirmation |
| C5 | "Early access with 40+ devs testing on Discord & GitHub" | P0 | The owner says the number is more than 10, not 40 (owner statement); the text must change and name no community the owner eliminated |
| C6 | "Limited group spots", "Launch pricing for early adopters ($79 regular price afterwards)" | P1 | Urgency without a dated, enforced limit (EU Directive Annex I(7)) |
| C7 | "14-Day Money-Back Guarantee" | P0 | The owner's policy is only what the law requires (Brazilian consumer code, art. 49: 7 days); the 14-day guarantee is not offered, so the claim is false as written |
| C8 | "52 / 52 production-ready features", "36 features typically missing from early-stage builds", "3+ Months saved" | P1 | Counts are internal; "typically missing" is a claim about other people's products |
| C9 | "20 Audited PostgreSQL Tables" | P1 | 21 `pgTable(` calls in the code |
| C10 | "<10ms Hyperdrive", "zero cold-starts", "300+ data centers" | P1 | Third-party performance facts without a dated source |
| C11 | "Build million-dollar applications alone in days, not months" | P0 | A promise of outcome (income) that the seller does not control |
| C12 | Price `$49` / `$79` / "annual or lifetime" / "One-Time Payment" | P0 | Four statements about one price, in dollars, while the owner's price is R$ 497,00 regular and R$ 97,00 at launch; the checkout must read one source. A "launch" label and a "from R$ 497" reference need a real limit and a real reference price |
| C13 | Headline "Stop spending months building what your SaaS should have on day one." | P2 | Says nothing about who it is for or why this one; no number the reader can check |
| C14 | "Complicated? Perhaps. We've already handled the hard parts so you can focus..." | P2 | Opens by conceding that the product is complicated; the hero and the offer state the benefit instead |

## 4. SEO audit

| Id | Finding | Rule | Action |
| --- | --- | --- | --- |
| S1 | Title is the placeholder "Demo SaaS" | `title-not-placeholder` (allowed today until SPEC-0003) | A title that says what the product is and for whom |
| S2 | Description is the site default, not written for the page | `description-not-fallback` | Write it for the offer; Google may still choose another snippet |
| S3 | Only `WebSite` and `WebPage` markup | structured-data selection | `SoftwareApplication` with `offers` (price, currency) and **no** rating or review; `Organization` only when the owner confirms the legal facts |
| S4 | The home is one page in three languages | hreflang gate passes | Keep; each language written by transcreation, not translation |
| S5 | No keyword or search-intent data exists in the repository | zero assumption | Task: collect real queries (Search Console once the site is verified, or a documented tool) before choosing the H1 words; until then, no keyword is claimed |
| S6 | The single conversion needs an indexable, fast page | Core Web Vitals (Google, web.dev) | Performance budget below |

## 5. Performance audit and budget proposal

Values from SPEC-0002 are a baseline, not a target. Proposed (project decisions, to be confirmed in the spec):

- No image over 200,000 bytes; every `<img>` with width and height; hero product image `fetchpriority="high"`, everything else lazy.
- Home JavaScript: reduce from 280,097 bytes by removing the client-only comparison search, the marquee of testimonials and the animated pricing card; lazy hydration (`defineLazyHydrationComponent`) for anything interactive below the fold.
- Target LCP at or below 2.5 s in the lab protocol and the same page below 2.5 s at the 75th percentile in the field after launch (Search Console/CrUX).
- Fix the icon prerender nondeterminism (task already spawned) so the HTML does not change with the network.

## 6. Layout: fewer cards, more air

Findings: about 47 bordered boxes, most content sits in grids of equal cards, the eye has no order, and
each section uses a different shape (badge + headline + subtitle + cards). Direction: one column of loose
content with generous spacing, a limited number of sections, each with one idea; cards only where they mean
something (the offer). Typography and spacing come from `.fireskills/DESIGNSYSTEM.MD` (to be read by the designer role before the mockups).

## 7. The owner's vision, sorted

| Statement (2026-09-25) | Where it goes |
| --- | --- |
| One objective: sell; the offer button goes to Stripe checkout | The page's single goal; the checkout is a later spec |
| Technical content as proof (blog, docs, the Fireskills step by step) | Posts and docs linked from the page |
| Audience: developers and beginners in vibe coding (not confirmed at 100 %) | Working hypothesis, marked as such in the copy brief until data exists |
| Position in the Cloudflare universe | Only with checkable statements; "the first" is not supported (see `market-positioning.md`) |
| Community around the product | The owner eliminated the WhatsApp group from the page and the benefits; support is a scheduled call and a WhatsApp support number |
| Layers for agenda, kanban, agent, chat, switched on or off by config; design blocks like shadcn/ui | Product roadmap. The landing may state only what exists today: `layers/` has `admin`, `billing`, `kanban`, `notifications`, `teams` |

## 8. Owner answers of 2026-09-25 and what each changes on the page

| Answer | Effect on the page |
| --- | --- |
| Price R$ 497,00, launch R$ 97,00 for the first 100 buyers, R$ 497,00 afterwards; one payment; one year of updates | Replace `$49`, `$79`, "lifetime", "annual", "continuous updates"; the launch label needs an enforced count |
| Refund only as the law requires | Remove the 14-day guarantee; state the legal right in approved words |
| More than 10 testers, testimonials real and kept | "40+" becomes "more than 10"; testimonials via owner-statement records; fix the shared photos |
| WhatsApp group eliminated; no demo; call or WhatsApp support | Remove the group, "VIP", "Club Nuxfire", "live demos", "direct networking" and the demo FAQ; the secondary action becomes "talk to us" |
| Card by Stripe, Pix by WhatsApp | The offer text says card at checkout; Pix on request until Q-07 |
| pt-br first | Copy brief, review and mockups start in pt-br |

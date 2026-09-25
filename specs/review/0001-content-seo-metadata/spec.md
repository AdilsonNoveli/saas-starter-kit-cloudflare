# Integrated Specification: SEO metadata for content pages and a post-authoring specialist

| Field | Value |
| --- | --- |
| Format | Specsfy/2.0 |
| ID | SPEC-0001 |
| Slug | 0001-content-seo-metadata |
| Status | Reviewing |
| Effort | 8 |
| Effort updated at | 2026-09-25 |
| Effort rationale | Cross-cutting change: shared page layout, content schema, sitemap hook, two build-time scripts, a new gate, a new specialist and 3-language docs. Verified only by a full build, so iteration is slow. |
| ClickUp Task | |
| Milestones | |
| Definition Gate | Passed |
| Plan Gate | Passed |
| Delivery Gate | Passed |
| Evidence Contract | 1 |
| Human Interface | Yes |
| Updated at | 2026-09-25 |

## Act I — Define

### 1. Problem and Desired Outcome

#### Problem

The prerendered HTML of `apps/web` was audited on 2026-09-25 (build with `SITE_URL=https://nuxfire.com`, output `apps/web/.output/public`). Findings, each reproducible with the audit script recorded in section 2:

- **D1** Every blog post and legal page emits `<title>Nuxfire Docs | Nuxfire | Nuxfire</title>`, the site-default description and `og:title` equal to that title. Root cause: `apps/web/app/components/layout/LayoutContentPage.vue` never calls `useSeoMeta`/`useHead`, and `nuxt.config.ts` sets `app.head.title: "Nuxfire Docs | Nuxfire"` as a global fallback.
- **D2** Blog and legal pages have **no `<h1>`**: the title is rendered in a `<span>` (`LayoutContentPage.vue`).
- **D3** `og:type` is `website` on every page; there are no `article:*` tags; the JSON-LD `WebPage.name` is derived from the URL slug ("Git Branching Stage Production First Release") and there is no `BlogPosting`, author, date or image.
- **D4** No page emits `og:image`, yet `twitter:card=summary_large_image` is set everywhere. Post covers are SVG, and Facebook's Sharing docs list only `image/jpeg`, `image/gif` and `image/png`.
- **D5** All posts are declared `en-US` (`<html lang>`, `og:locale`, sitemap `hreflang`) although 7 of the 10 posts are Portuguese and one is Spanish. `og:locale:alternate` advertises `pt_BR`/`es_ES` for posts that have no such translation. No sitemap URL carries `lastmod` (0 of 86).
- **D6** A missing blog/legal document renders an empty page with status 200 (no error is thrown) — a soft 404.

#### Desired Outcome

Every content page (blog post, blog index, legal page, docs page) declares accurate, unique and complete metadata that search engines and social crawlers can act on, and a regression gate makes it impossible to reintroduce D1–D6 silently. Fireskills teaches agents and humans to author posts that satisfy the same rules.

#### Success Metrics

- 0 content pages with a title equal to the site fallback; 0 duplicate titles across the built site.
- 100% of blog posts with exactly one `<h1>`, a raster `og:image` (with `og:image:width`/`height`), a valid `BlogPosting` JSON-LD and correct `lang`.
- 100% of translation clusters reciprocal in both `<head>` and sitemap.
- `bun run check:seo` exits 0 on the built output and non-zero on each of the regressions in AC-005.

### 2. Research and Clarifications

#### Executed Research

- **R-001** [critical] `<title>` missing or generic makes Google fall back to `<h1>` and other headings — Verdict: verified — Confidence: high — Evidence: research/google-title-links.md — Budget: 1/1. Impact: the missing `<h1>` (D2) compounds the missing title (D1).
- **R-002** [critical] Facebook `og:image` supports `image/jpeg`, `image/gif` and `image/png`; SVG is not listed — Verdict: verified — Confidence: medium — Evidence: research/facebook-og-image.md — Budget: 1/1. The X (Twitter) documentation could not be fetched (HTTP 402), so no claim is made about X. Impact: social images are raster.
- **R-003** [critical] Google Search supports BMP, GIF, JPEG, PNG, WebP, SVG and AVIF for `<img>` — Verdict: verified — Confidence: high — Evidence: research/google-images.md — Budget: 1/1. Impact: raster PNG satisfies both Google and Facebook.
- **R-004** [critical] Google hreflang: each version must list itself and all others (reciprocal), URLs fully-qualified, ISO 639-1 with optional ISO 3166-1 region, `x-default` optional, HTML head and sitemap are equivalent methods — Verdict: verified — Confidence: high — Evidence: research/google-hreflang.md — Budget: 1/1. Impact: head and sitemap must never disagree.
- **R-005** [critical] Google Article structured data: no required property; recommended `author`, `author.name`, `datePublished`, `dateModified`, `headline`, `image`; dates in ISO 8601 with timezone; images in multiple ratios 16x9, 4x3, 1x1 recommended — Verdict: verified — Confidence: high — Evidence: research/google-article.md — Budget: 1/1. Impact: only 16:9 is produced (DEC-006).
- **R-006** [critical] Open Graph protocol: `og:title`, `og:type`, `og:image`, `og:url` required; article object has `published_time`, `modified_time`, `author`, `section`, `tag` — Verdict: verified — Confidence: high — Evidence: research/ogp.md — Budget: 1/1.
- **R-007** [critical] Nuxt SEO + Nuxt Content: collection schemas provide `title`/`description`, but the page must call `useSeoMeta`, `useSchemaOrg`, etc. itself; `asSeoCollection()` is deprecated in favour of `defineSitemapSchema()` and siblings; `@nuxtjs/seo` must precede `@nuxt/content` — Verdict: verified — Confidence: high — Evidence: research/nuxt-seo-content.md — Budget: 1/1. Impact: confirms the root cause of D1.
- **R-008** [critical] `@nuxtjs/sitemap` 8.5.0 URL entries accept `lastmod`, `alternatives: [{ hreflang, href }]`, `_i18nTransform` and `_sitemap`; `defineSitemapSchema({ name, onUrl })` mutates the URL per content entry — Verdict: verified — Confidence: high — Evidence: `node_modules/@nuxtjs/sitemap/dist/runtime/types.d.ts` lines 418-461. Impact: D5 is fixable per entry.
- **R-009** Bun 1.4.0 provides `Bun.YAML.parse` — Verdict: verified — Confidence: high — Evidence: executed 2026-09-25. Impact: the gate script needs no YAML dependency.

#### Consulted Sources and Context

- `apps/web/app/components/layout/LayoutContentPage.vue`, `apps/web/app/pages/docs/[...slug].vue`, `apps/web/app/pages/blog/*.vue`, `apps/web/app/app.vue`, `apps/web/nuxt.config.ts`, `apps/web/content.config.ts`, `apps/web/content/blog/*.md`.
- Built output `apps/web/.output/public/**` and `__sitemap__/*.xml` (audit).
- `.fireskills/RULES.md`, `fireskills/SKILL.md`, `fireskills/specialists/catalog.json`.

#### Consulted Documentation

- Google Search Central: title links, Article structured data, localized versions, image best practices (fetched 2026-09-25).
- Facebook Sharing for webmasters; Open Graph protocol (ogp.me) (fetched 2026-09-25).
- Nuxt SEO: Nuxt Content guide, Nuxt Sitemap content and i18n guides (fetched 2026-09-25).

#### Stored Research Artifacts

- `specs/draft/0001-content-seo-metadata/research/*.md`: one provenance note per consulted documentation page (URL, retrieval date 2026-09-25, paraphrased statements relied on, limits of the note). Public documentation; no page text is copied. Files: `google-title-links.md`, `facebook-og-image.md`, `google-images.md`, `google-hreflang.md`, `google-article.md`, `ogp.md`, `nuxt-seo-content.md`.
- Not stored: the X (Twitter) card documentation (HTTP 402 — never read), and the installed-type evidence of R-008, which is a repository file.

#### Resolved Questions

- **Q**: Should the blog index be filtered by active locale? → **A**: No. It would leave English and Spanish visitors with one post each. Each card shows a language label instead (DEC-004).
- **Q**: Should `lang` have a silent default? → **A**: No. It is required, so a post can never be published with an assumed language (DEC-002).

#### Open Questions

- None.

### 3. Scope and Actors

#### In Scope

- Page metadata (title, description, h1, canonical, Open Graph, Twitter, article tags), structured data (JSON-LD), language and hreflang, sitemap `lastmod`/alternatives, for blog posts, blog index, legal pages and docs pages.
- Blog content schema (`lang`, `translations`, `updated`, `ogImage`, `authorType`) and frontmatter of the 10 existing posts.
- Raster social images (default and per post) and the script that produces them.
- `bun run check:seo` (source lint + build audit) and its unit tests.
- HTTP 404 for missing content.
- A Fireskills specialist for content and SEO authoring; catalog, routing, counts, docs in three languages; project rules.

#### Out of Scope

- Runtime-generated OG images (`nuxt-og-image` stays disabled).
- Filtering the blog index by locale or a blog language switcher.
- RSS/Atom feeds, per-locale blog URLs, `lastmod` for docs pages (they have no dates).
- Multiple image aspect ratios (1:1, 4:3) for structured data (DEC-006).
- The stale headings of `fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs` (reported, not changed).

#### Actors

- **Search crawler**: reads title, headings, description, canonical, hreflang, JSON-LD, sitemap.
- **Social crawler / sharer**: reads Open Graph and Twitter tags and the image.
- **Reader**: sees the page title as a heading and a language label on blog cards.
- **Maintainer / CI**: runs `check:seo` and the test suites.
- **Author (human or AI agent)**: writes posts following the specialist.

### 4. Principles and Constraints

- **PR-001**: Code supersedes documentation; every claim about a page is verified against built HTML (`.fireskills/RULES.md`).
- **PR-002**: No `any`; strict typing (`scripts/no-explicit-any.test.ts` scans every tracked `.ts`/`.vue`).
- **PR-003**: No silent defaults for facts that cannot be inferred (language, translation links, image format); the schema fails the build instead.
- **PR-004**: One source of truth per fact: locales in one module, imported by `nuxt.config.ts`, `content.config.ts` and the SEO utility.
- **PR-005**: Head and sitemap must express the same hreflang cluster (R-004).
- **PR-006**: Build-time only tooling (`sharp`) is a root `devDependency`, never imported by application code or the Worker bundle.
- **PR-007**: UI uses semantic tokens and `@nuxt/ui`; dark mode preserved (`.fireskills/DESIGNSYSTEM.MD`).
- **PR-008**: Docs are English-first with mirrored `pt-br` and `es` files; `bun run check:i18n` must pass.

### 5. User Stories

#### US-001 — Accurate title, description and heading on every content page (P1)

As a search crawler or reader, I want each content page to have a unique title, a specific description, one `<h1>` and correct canonical URLs, so that search results and browser tabs describe the page.

**Why P1**: the pages are effectively anonymous today (D1, D2, D6).
**Independent Test**: `bun run test` (unit) and `bun run check:seo` on a fresh build.
**Requirements**: FR-001, FR-006, FR-007

#### US-002 — Valid social previews and article metadata (P1)

As a person sharing a post, I want a raster preview image and article metadata, so that the link renders correctly on social networks.

**Why P1**: no page has `og:image` (D4) and posts are typed `website` (D3).
**Independent Test**: unit tests on the builder plus `check:seo` asserting a raster `og:image` that exists in the build output.
**Requirements**: FR-002, FR-009

#### US-003 — Correct structured data, language, hreflang and sitemap (P1)

As a search engine, I want `BlogPosting` and breadcrumb structured data, the real language of each post, reciprocal translation links and `lastmod`, so that posts are indexed with the right language and freshness.

**Why P1**: D3 and D5.
**Independent Test**: unit tests plus `check:seo` reciprocity and sitemap checks on a fresh build.
**Requirements**: FR-003, FR-004, FR-005

#### US-004 — Regressions are caught automatically (P1)

As a maintainer, I want one command that lints post frontmatter and audits the built HTML, so that D1–D6 cannot return unnoticed.

**Why P1**: the defects went unnoticed until manually audited.
**Independent Test**: `bun run check:seo` exits non-zero on each fixture violation and zero on the clean build.
**Requirements**: FR-006, FR-008

#### US-005 — Fireskills teaches how to write posts (P2)

As an author (human or AI agent), I want a specialist describing the frontmatter schema, translation rules, covers, SEO rules and checks, so that new posts satisfy the gate on the first attempt.

**Why P2**: value depends on the P1 rules existing first.
**Independent Test**: `bun run test` (catalog consistency) and `bun run check:i18n`.
**Requirements**: FR-010, FR-011

### 6. BDD Acceptance Scenarios

#### AC-001 — A post page exposes its own title, description, heading and canonical

**Covers**: US-001, FR-001, FR-006, NFR-001

```gherkin
@US-001 @FR-001 @FR-006 @NFR-001 @AC-001
Feature: Page metadata of a content page

  Scenario: A blog post declares its own metadata
    Given a post with title "Git for Your First Release", a description and lang "en"
    When the page SEO is built for site "https://nuxfire.com"
    Then the title is the post title without a second brand suffix
    And the description is the post description
    And the canonical and og:url are absolute URLs of the post
    And a title equal to the site fallback is rejected
```

#### AC-002 — Social tags: article metadata and a raster image

**Covers**: US-002, FR-002, FR-009, NFR-001

```gherkin
@US-002 @FR-002 @FR-009 @NFR-001 @AC-002
Feature: Open Graph and Twitter metadata

  Scenario: A post with a raster cover
    Given a post published on "2026-09-25" and updated on "2026-09-27" with a PNG ogImage
    When the page SEO is built
    Then og:type is "article" with published and modified times in ISO 8601 with timezone
    And og:image is an absolute URL with width, height, type and alt
    And twitter:card is "summary_large_image" with the same image

  Scenario: A post without ogImage falls back to the site image
    Given a post without ogImage
    When the page SEO is built
    Then the default site image is used

  Scenario: An SVG ogImage is rejected
    Given a post whose ogImage ends in ".svg"
    When the page SEO is built
    Then an error names the offending path
```

#### AC-003 — Structured data and language

**Covers**: US-003, FR-003, FR-004, FR-006, NFR-001

```gherkin
@US-003 @FR-003 @FR-004 @FR-006 @NFR-001 @AC-003
Feature: Structured data and language

  Scenario: A Portuguese post
    Given a post with lang "pt-br" and author type "Organization"
    When the page SEO is built
    Then the html lang is "pt-BR" and og:locale is "pt_BR"
    And the JSON-LD BlogPosting has inLanguage "pt-BR", headline, datePublished, dateModified, image, author and keywords
    And the breadcrumb is Home, Blog, post
    And og:locale:alternate lists only real translations
```

#### AC-004 — Reciprocal hreflang in head and sitemap

**Covers**: US-003, FR-004, FR-005, FR-006, NFR-001

```gherkin
@US-003 @FR-004 @FR-005 @FR-006 @NFR-001 @AC-004
Feature: Translation clusters

  Scenario: A post with two translations
    Given posts in "en", "pt-br" and "es" that reference each other in translations
    When the head links and the sitemap URL are built for the "pt-br" post
    Then the head lists itself, both siblings and x-default pointing to the English post
    And the sitemap alternatives are identical to the head links
    And lastmod is the updated date, or the date when not updated

  Scenario: A post without translations
    Given a post with lang "pt-br" and no translations
    When the head links and the sitemap URL are built
    Then it declares only itself as "pt-BR" and no x-default
```

#### AC-005 — The gate detects regressions

**Covers**: US-001, US-002, US-003, US-004, FR-001, FR-002, FR-004, FR-006, FR-008, NFR-002

```gherkin
@US-004 @FR-008 @AC-005
Feature: check:seo

  Scenario: A clean site passes
    Given post frontmatter and built HTML that satisfy every rule
    When check:seo runs
    Then it exits 0

  Scenario Outline: Each violation fails with a named rule
    Given <violation>
    When check:seo runs
    Then it exits non-zero naming the page or file and the rule

    Examples:
      | violation |
      | a post without lang |
      | a translation that does not reference back |
      | an SVG ogImage |
      | two pages with the same title |
      | a content page without h1 or with two |
      | a relative canonical |
      | an og:image that does not exist in the output |
      | hreflang in head different from the sitemap |
      | a BlogPosting JSON-LD missing a required field |
      | an og:image that is not 1200 by 675 pixels |
```

#### AC-006 — Missing content returns 404

**Covers**: US-001, FR-001, FR-007, NFR-001

```gherkin
@US-001 @FR-007 @AC-006
Feature: Missing content

  Scenario: Unknown slug
    Given no blog document exists for the requested path
    When the page is rendered
    Then the response is a 404 error instead of an empty 200 page
```

#### AC-007 — Social images are generated reproducibly

**Covers**: US-002, FR-002, FR-009, NFR-002

```gherkin
@US-002 @FR-009 @NFR-002 @AC-007
Feature: OG image generation

  Scenario: SVG sources become 1200x675 PNGs
    Given SVG covers and the default image in public/images
    When generate:og runs twice
    Then every source has a PNG of exactly 1200 by 675 pixels
    And the second run changes no bytes
```

#### AC-008 — The specialist is registered consistently

**Covers**: US-005, FR-010, FR-011

```gherkin
@US-005 @FR-010 @FR-011 @AC-008
Feature: Specialist registration

  Scenario: Catalog, directory and counts agree
    Given the specialists directory, catalog.json, README, AGENTS.md and the docs in three languages
    When the consistency test runs
    Then the number of specialists is the same everywhere
    And every catalog entry has a directory with SKILL.md and agents/openai.yaml
    And the blog documentation lists every blog schema field
```

### 7. Requirements

#### Functional

- **FR-001**: Every blog post, legal page and docs page shall set a unique `<title>` equal to the page title plus the brand once, the page description, an absolute canonical equal to `og:url`, and exactly one `<h1>` with the page title; the global fallback title shall no longer be docs-flavored.
- **FR-002**: Content pages shall emit `og:type` (`article` for posts, `website` otherwise), `article:published_time`, `article:modified_time`, `article:section` and `article:tag` plus `<meta name="author">` for posts, and a raster `og:image` with `og:image:width`, `og:image:height`, `og:image:type` and `og:image:alt`; `twitter:card=summary_large_image` shall be emitted only together with `twitter:image`.
- **FR-003**: Posts shall emit `BlogPosting` JSON-LD (`headline`, `description`, `image`, `datePublished`, `dateModified`, `author`, `inLanguage`, `keywords`, `articleSection`) and a `BreadcrumbList`; the blog index shall emit `CollectionPage` JSON-LD with a specific description.
- **FR-004**: `<html lang>`, `og:locale` and `inLanguage` shall equal the post language; `og:locale:alternate` and `hreflang` links shall list only real translations, reciprocally, with absolute URLs and `x-default` pointing to the English version when it exists.
- **FR-005**: The sitemap entry of each post shall carry `lastmod` (`updated`, else `date`, as a W3C Datetime: a date or an ISO 8601 datetime with a timezone) and the same alternatives as the head, declared with the post's own language.
- **FR-006**: The blog schema shall require `lang` (`en`, `pt-br`, `es`), validate `date`/`updated` as ISO 8601 with `updated` not before `date`, accept `translations`, `ogImage` (raster path), `authorType`, and reject invalid combinations at build time.
- **FR-007**: A missing blog, legal or docs document shall produce an HTTP 404 error instead of an empty successful page.
- **FR-008**: `bun run check:seo` shall lint post frontmatter and audit the built HTML, exit non-zero on any violation with the page or file and the rule name, and exit 0 on a clean site.
- **FR-009**: `bun run generate:og` shall produce a 1200x675 PNG for every SVG cover and for the default site image, idempotently.
- **FR-010**: A specialist `fireskill-specialist-content-seo` shall exist, registered in `catalog.json`, routed from `fireskills/SKILL.md`, listed in the README and the three-language docs, with counts updated everywhere.
- **FR-011**: The blog feature docs (three languages), `.fireskills/RULES.md` and the Fireskills docs shall describe the schema, the SEO rules and the workflow.

#### Non-Functional

- **NFR-001**: The SEO builders shall be pure functions (no I/O, no Nuxt auto-imports) with unit tests for every branch. **Verification**: `bun run test` (project `apps/web`).
- **NFR-002**: No new runtime dependency shall reach the Worker bundle; `sharp` shall be an exact-version root `devDependency` used only by scripts. **Verification**: `git diff package.json` plus a test that no file under `apps/web` imports `sharp`.

#### Errors and Edge Cases

- Post without `lang` → build fails with the file name (schema) and `check:seo` fails (lint).
- `translations` referencing a missing post, a post of another language, or without reciprocity → `check:seo` fails naming both files.
- `ogImage` pointing to a missing or non-raster file → `check:seo` fails.
- Date-only `date` (`2026-09-25`) → normalized to `2026-09-25T00:00:00Z` for machine-readable output (DEC-005).
- Post without `ogImage` → the default site image is used.
- No build output present → `check:seo` runs only the source lint and says so.

## Act II — Design and Prove

### 8. Technical Plan

#### Existing Context

- Nuxt 4 + `@nuxtjs/seo` 5.3.14 (`nuxt-seo-utils` 8.5.0, `nuxt-schema-org` 6.3.1, `@nuxtjs/sitemap` 8.5.0, `@nuxtjs/robots` 6.2.0, `nuxt-site-config` 4.2.3), `@nuxtjs/i18n` 10.6.0, `@nuxt/content` 3.16.0, `sharp` 0.35.4 present transitively.
- `useLocaleHead({ seo: true })` in `app.vue` emits canonical, `og:locale` and alternates for every route.
- Blog and docs slug pages are `i18n: false`; the prerender list comes from `blogRoutes()` and `docsRoutes()` in `nuxt.config.ts`.
- Vitest aggregator `vitest.config.mts` lists projects; `apps/web` has none.

#### Architecture and Modules

- `apps/web/i18n/supported-locales.ts`: the single list of locales (`code`, `language`, `name`, `file`), imported by `nuxt.config.ts`, `content.config.ts` and the SEO utility.
- `apps/web/app/utils/seo/content-seo.ts`: pure builders `buildArticleSeo`, `buildPageSeo`, `hreflangLinks`, `sitemapAlternatives`, `toIsoDateTime`, `assertRasterImage`, `contentNotFound`.
- `apps/web/app/composables/use-content-seo.ts`: adapter applying builder output through `useSeoMeta`, `useHead`, `useSchemaOrg`, `useBreadcrumbItems`.
- `LayoutContentPage.vue`, `pages/blog/index.vue`, `pages/docs/[...slug].vue`: call the adapter; heading `<h1>`; 404 handling.
- `content.config.ts`: blog schema. `apps/web/server/plugins/sitemap-blog.ts`: Nitro plugin on the `sitemap:resolved` hook that applies the pure builder `sitemapEntryFor` to every post (DEC-012).
- `apps/web/app/utils/breadcrumb.ts`: pure breadcrumb builder that links only pages that exist (DEC-015).
- `scripts/seo-rules.ts` (pure rules) and `scripts/check-seo.ts` (CLI): source lint + build audit.
- `scripts/generate-og-images.ts` (+ `scripts/og-images.ts` pure helpers): SVG to PNG with `sharp`.
- `fireskills/specialists/fireskill-specialist-content-seo/`: SKILL.md, agents/openai.yaml, references.

#### Migrations

- Not applicable (no database change).

#### Models

- Blog frontmatter model (Nuxt Content collection `blog`): source `apps/web/content.config.ts`.

#### Procedures and Handlers

- Not applicable (no tRPC procedure).

#### Views and UI Experience

- Article page: visible `<h1>` replaces the `<span>` (same typography classes), byline unchanged.
- Blog card: a small language label next to the category badge (`UBadge`, `neutral`, `subtle`), text from the post `lang`; states unchanged.
- Docs page: unchanged visually; adds social image and 404 status.

#### Queries and Repositories

- `queryCollection("blog").path(route.path).first()` unchanged; the sitemap plugin reads the same collection with `queryCollection(event, "blog")`.

#### Jobs and Async Processing

- Not applicable.

#### File Structure

```text
specs/draft/0001-content-seo-metadata/
  spec.md
apps/web/
  i18n/locales.ts
  app/utils/seo/content-seo.ts
  app/utils/seo/content-seo.test.ts
  app/composables/use-content-seo.ts
  app/components/layout/LayoutContentPage.vue
  app/pages/blog/index.vue
  app/pages/docs/[...slug].vue
  content.config.ts
  content/blog/*.md
  public/images/og/default.svg
  public/images/og/default.png
  public/images/blog/*.png
scripts/
  seo-rules.ts
  seo-rules.test.ts
  check-seo.ts
  og-images.ts
  og-images.test.ts
  generate-og-images.ts
  specialists-catalog.test.ts
  content-docs-drift.test.ts
fireskills/specialists/fireskill-specialist-content-seo/
```

### 9. Data Model

#### Entities

| Entity | Identity | Attributes and Validation | Relationships |
| --- | --- | --- | --- |
| Blog post (content) | `path` (`/blog/<slug>`) | `title`, `description`, `date` (ISO), `updated?` (ISO, not before `date`), `author`, `authorType` (Person or Organization, default Organization), `lang` (en, pt-br, es; required), `category?`, `readTime?`, `tags?`, `image?`, `ogImage?` (raster path under public), `translations?` (lang to slug, includes itself) | Zero or one post per language in a `translations` cluster; clusters are symmetric |

#### States and Transitions

| Entity | Current State | Event | Next State | Invariants |
| --- | --- | --- | --- | --- |
| Blog post | Authored | Build | Published page + sitemap entry | Schema valid, cluster reciprocal, ogImage raster |
| Blog post | Published | Content edit with `updated` | Republished | `updated` not before `date` |

#### Migration and Retention

- Not applicable.

### 10. Interfaces and Contracts

#### Human Interface

- **Human interface present**: Yes. The article heading and the language label on blog cards change visible output.

#### Interface Stack and Conventions

- Nuxt 4, `@nuxt/ui` v4 (`UBadge`), Tailwind semantic tokens, `useI18n` for labels.

#### Screens and Responsibilities

- **Article page** (reader): reads a post; heading, byline, cover, body.
- **Blog index** (reader): browses posts; card shows category, language, read time.

#### Navigation and Information Flow

- Home > Blog > Post (exposed as the `BreadcrumbList`; no visual breadcrumb is added).

#### Menus and Primary Navigation

- Unchanged.

#### Forms and Actions

- Not applicable.

#### Layout Composition and Density

- Unchanged; the language label reuses the badge row of the card.

#### Vue and @nuxt/ui Component Selection

| Screen | Vue Component | Responsibility | Target File | Component Composition | Origin | Reuse or Extend |
| --- | --- | --- | --- | --- | --- | --- |
| Blog index | Language label | Shows the post language | apps/web/app/pages/blog/index.vue | UBadge | @nuxt/ui | Reuse existing UBadge in the card row |
| Article page | Heading | Page title as h1 | apps/web/app/components/layout/LayoutContentPage.vue | h1 element | custom | Extend existing layout, same classes |

- Keep inventory aligned with `.fireskills/INTERFACE.md`.

#### States and Accessibility

- Exactly one `<h1>` per page; heading order unchanged below it; the language label has visible text; contrast comes from `UBadge` tokens in light and dark mode.

#### CRUD Contract

- Not applicable.

#### Visual Review During Development

- Verify the card row and the article heading in the running dev server at mobile and desktop widths in light and dark mode; record the result under the `VISUAL` item of T008.

#### Exposed APIs

- None. New public files: `/images/og/default.png` and `/images/blog/*.png`.

#### External APIs

- None.

### 11. TDD Strategy

- **Unit**: pure builders in `content-seo.ts`, rules in `seo-rules.ts`, helpers in `og-images.ts`.
- **Integration/Contract**: `check-seo` CLI against temporary fixture directories; catalog consistency against the real repository files; docs drift against the real schema.
- **BDD/Acceptance**: AC-001 to AC-008 in section 6.
- **Test Runner**: Vitest via `bun run test` (new project `apps/web`, existing project `scripts`).
- **E2E**: Not applicable; end-to-end evidence is a full `nuxt build`, `check:seo` on its output and the dev server SSR HTML.

#### RED-GREEN-REFACTOR Evidence

| IDs | Reference BDD | TDD Test Case | Observed RED | Observed GREEN | Refactor/Regression |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-001, FR-006, FR-007, NFR-001, AC-001, AC-006 | AC-001, AC-006 | `apps/web/app/utils/seo/content-seo.test.ts` (metadata, dates, missing blog, legal and docs documents) | 2026-09-25 `bunx vitest run apps/web`: `Cannot find module './content-seo'`, no test runs | `bunx vitest run apps/web`: content-seo.test.ts 43 passed, breadcrumb.test.ts 3 passed, date.test.ts 2 passed | Full `bun run test`: 22 files, 373 tests passed, three runs in a row. One earlier run failed once under load (not captured); the process-spawning suites now declare explicit timeouts |
| US-002, FR-002, FR-009, NFR-001, AC-002 | AC-002 | same file (article and social tags, raster image rules) | same failure | same file: 43 passed | same |
| US-003, FR-003, FR-004, FR-006, NFR-001, AC-003 | AC-003 | same file (BlogPosting, language, breadcrumb) | same failure | same file: 43 passed | same |
| US-003, FR-004, FR-005, NFR-001, AC-004 | AC-004 | same file (hreflang cluster, sitemap entry) | same failure | same file: 43 passed | same |
| US-001..US-004, FR-001..FR-004, FR-006, FR-008, FR-009, NFR-002, AC-005 | AC-005 | `scripts/seo-rules.test.ts` (source lint, head parsing, page audit, site audit, CLI, dependency guards) | 2026-09-25 `bunx vitest run scripts/seo-rules.test.ts`: `Cannot find module './og-images'`, no test runs | `bunx vitest run scripts/seo-rules.test.ts`: 60 passed (includes the CLI against fixture trees and the false-positive fixes of DEC-013 and DEC-014) | same |
| US-002, FR-002, FR-009, NFR-002, AC-007 | AC-007 | `scripts/og-images.test.ts` (planning, generation, idempotence, committed PNGs, dependency guards) | 2026-09-25 `bunx vitest run scripts/og-images.test.ts`: `Cannot find module './og-images'`, no test runs | `bunx vitest run scripts/og-images.test.ts`: 13 passed | same |
| US-005, FR-010, FR-011, AC-008 | AC-008 | `scripts/specialists-catalog.test.ts` | 2026-09-25 `bunx vitest run scripts/specialists-catalog.test.ts`: 5 failed, 32 passed. The 5 failures are all about the new specialist (catalog entry, routing, README placement, reference files); the 32 passing cases are consistency guards over the existing 34 specialists | `bunx vitest run scripts/specialists-catalog.test.ts`: 37 passed (35 specialists) | same |
| US-005, FR-010, FR-011, AC-008 | AC-008 | `scripts/content-docs-drift.test.ts` | 2026-09-25 `bunx vitest run scripts/content-docs-drift.test.ts`: 11 failed, 3 passed (schema fields, docs, scripts, rules not written yet) | `bunx vitest run scripts/content-docs-drift.test.ts`: 14 passed | same |

### 12. Test Plan and Traceability

| Requirement | BDD Scenario | Level | Test File/Command | Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | AC-001 | Unit | apps/web/app/utils/seo/content-seo.test.ts | 43 passed; `check:seo` on the real build passed |
| FR-002 | AC-002 | Unit | apps/web/app/utils/seo/content-seo.test.ts | 43 passed; `check:seo` on the real build passed |
| FR-003 | AC-003 | Unit | apps/web/app/utils/seo/content-seo.test.ts | 43 passed; `check:seo` on the real build passed |
| FR-004 | AC-003, AC-004 | Unit | apps/web/app/utils/seo/content-seo.test.ts | 43 passed; `check:seo` on the real build passed |
| FR-005 | AC-004 | Unit | apps/web/app/utils/seo/content-seo.test.ts | 43 passed; `check:seo` on the real build passed |
| FR-006 | AC-001, AC-003, AC-005 | Unit | scripts/seo-rules.test.ts | 60 passed |
| FR-007 | AC-006 | Unit | apps/web/app/utils/seo/content-seo.test.ts | 43 passed; `check:seo` on the real build passed |
| FR-008 | AC-005 | Integration | scripts/seo-rules.test.ts | 60 passed; CLI `check:seo` exit 0 on `SITE_URL=https://nuxfire.com` build: 10 posts linted, 95 pages and 83 sitemap URLs audited |
| FR-009 | AC-002, AC-007 | Unit | scripts/og-images.test.ts | 13 passed |
| FR-010 | AC-008 | Integration | scripts/specialists-catalog.test.ts | 37 passed |
| FR-011 | AC-008 | Integration | scripts/content-docs-drift.test.ts | 14 passed |
| NFR-001 | AC-001, AC-002, AC-003, AC-004 | Unit | apps/web/app/utils/seo/content-seo.test.ts | 43 passed; `check:seo` on the real build passed |
| NFR-002 | AC-005, AC-007 | Integration | scripts/og-images.test.ts | 13 passed; PNGs opened and inspected |

### 13. Validations

#### Act I Gate — Definition

- **Result**: Passed
- **Command**: `bun run fireskill validate 0001 --strict`
- **Findings**: Errors 0, warnings 0 (2026-09-25). Note: the standalone script fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs rejects even the official template because its mandatory heading aliases are stale; it is reported, not used (DEC-010).

#### Act II Gate — Plan

- **Result**: Passed
- **Command**: `node fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs specs/in-progress/0001-content-seo-metadata/spec.md`
- **Findings**: Every US, FR and NFR has at least 3 TDD tasks, every AC has one, and all 13 RED test tasks are completed with observed failures (section 11).

#### Act III Gate — Delivery

- **Result**: Passed
- **Command**: `node fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs specs/review/0001-content-seo-metadata/spec.md .`
- **Findings**: `Traceability: 26/26 IDs covered in 23 test files. RESULT: OK` (2026-09-25).

#### Delivery evidence (2026-09-25)

| Check | Command | Result |
| --- | --- | --- |
| Unit and integration suites | `bun run test` | 22 files, 373 tests passed (three consecutive runs) |
| Translations and locale files | `bun run check:i18n` | OK: 8 locale directories, 71 docs files mirrored |
| `apps/web` typecheck | `bun run typecheck` in `apps/web` | exit 0 (it found 8 type errors in the first draft of the builders and adapter: SocialImage MIME type, `noUncheckedIndexedAccess` on the date parts, the `CONTENT_LANGS` tuple cast, and schema.org `keywords`/`articleSection` that are arrays; all fixed) |
| Server typecheck | `bunx vue-tsc --noEmit -p server/tsconfig.json` in `apps/app` | exit 0 |
| Production build | `SITE_URL=https://nuxfire.com bun run build` in `apps/web` | exit 0 (the first two builds failed and exposed defects, see DEC-015 and the gate false positives DEC-013, DEC-014) |
| Gate on the real build | `SITE_URL=https://nuxfire.com bun run check:seo` | `10 post(s) linted, 95 page(s) and 83 sitemap URL(s) audited, check:seo passed` (the first audit reported 80 violations of 10 rules) |
| Dev server | article page in the Browser pane | one `<h1>`, `<html lang="pt-BR">`, `og:type=article`, `og:title` set, byline `September 25th, 2026`; blog index shows the PT/EN/ES language badge on the cards |

Not verified: search engine indexing and social network previews of the deployed site (nothing was deployed).

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

- [x] T001 [TEST] [TDD] [US-001] Derive from AC-001 and AC-006 failing Vitest cases (metadata and missing document) in apps/web/app/utils/seo/content-seo.test.ts — Refs: US-001, FR-001, FR-006, FR-007, NFR-001, AC-001, AC-006 — Depends: none
  - [x] **PREP**: Read AC-001 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case, without `.feature` files.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T002 [TEST] [TDD] [US-002] Derive from AC-002 failing Vitest cases in apps/web/app/utils/seo/content-seo.test.ts — Refs: US-002, FR-002, FR-009, NFR-001, AC-002 — Depends: none
  - [x] **PREP**: Read AC-002 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T003 [TEST] [TDD] [US-003] Derive from AC-003 failing Vitest cases in apps/web/app/utils/seo/content-seo.test.ts — Refs: US-003, FR-003, FR-004, FR-006, NFR-001, AC-003 — Depends: none
  - [x] **PREP**: Read AC-003 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T004 [TEST] [TDD] [US-003] Derive from AC-004 failing Vitest cases in apps/web/app/utils/seo/content-seo.test.ts — Refs: US-003, FR-004, FR-005, NFR-001, AC-004 — Depends: none
  - [x] **PREP**: Read AC-004 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T005 [TEST] [TDD] [US-004] Derive from AC-005 failing source-lint cases in scripts/seo-rules.test.ts — Refs: US-001, US-002, US-003, US-004, FR-001, FR-002, FR-004, FR-006, FR-008, NFR-002, AC-005 — Depends: none
  - [x] **PREP**: Read AC-005 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author frontmatter lint cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T006 [TEST] [TDD] [US-004] Derive from AC-005 failing build-audit cases in scripts/seo-rules.test.ts — Refs: US-001, US-002, US-003, US-004, FR-001, FR-002, FR-003, FR-004, FR-005, FR-008, FR-009, NFR-002, AC-005 — Depends: none
  - [x] **PREP**: Read AC-005 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author HTML-fixture audit cases (title, h1, canonical, og:image file and size, JSON-LD, hreflang) with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T007 [TEST] [TDD] [US-004] Derive from AC-005 failing CLI cases in scripts/seo-rules.test.ts — Refs: US-001, US-002, US-003, US-004, FR-003, FR-006, FR-008, FR-009, NFR-002, AC-005 — Depends: none
  - [x] **PREP**: Read AC-005 and confirm the CLI exit-code contract.
  - [x] **EXECUTE**: Author cases that run the CLI against temporary directories, with `SPECSFY:` markers.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T008 [TEST] [TDD] [US-002] Derive from AC-007 failing Vitest cases in scripts/og-images.test.ts — Refs: US-002, FR-002, FR-009, NFR-002, AC-007 — Depends: none
  - [x] **PREP**: Read AC-007 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T009 [TEST] [TDD] [US-005] Derive from AC-008 failing Vitest cases in scripts/specialists-catalog.test.ts — Refs: US-005, FR-010, FR-011, AC-008 — Depends: none
  - [x] **PREP**: Read AC-008 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T010 [TEST] [TDD] [US-005] Derive from AC-008 failing docs drift cases in scripts/content-docs-drift.test.ts — Refs: US-005, FR-010, FR-011, AC-008 — Depends: none
  - [x] **PREP**: Read AC-008 and confirm rule, IDs and test level.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T011 [TEST] [TDD] [US-005] Derive from AC-008 failing specialist structure cases in scripts/specialists-catalog.test.ts — Refs: US-005, FR-010, FR-011, AC-008 — Depends: none
  - [x] **PREP**: Read AC-008 and confirm the specialist structure contract.
  - [x] **EXECUTE**: Author cases for SKILL.md frontmatter and openai.yaml, with `SPECSFY:` markers.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T022 [TEST] [TDD] [US-001] Derive from AC-006 failing Vitest cases for blog and legal pages in apps/web/app/utils/seo/content-seo.test.ts — Refs: US-001, FR-001, FR-007, NFR-001, AC-006 — Depends: none
  - [x] **PREP**: Read AC-006 and confirm the 404 contract for `blog` and `legal` documents.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

- [x] T023 [TEST] [TDD] [US-001] Derive from AC-006 failing Vitest cases for docs pages in apps/web/app/utils/seo/content-seo.test.ts — Refs: US-001, FR-001, FR-007, NFR-001, AC-006 — Depends: none
  - [x] **PREP**: Read AC-006 and confirm that a docs page without a body is also a 404.
  - [x] **EXECUTE**: Author cases with a unique `SPECSFY:` marker per case.
  - [x] **VERIFY**: Observe a valid RED failure.
  - [x] **VISUAL**: Not applicable: test implementation.
  - [x] **EVIDENCE**: Record the command and the failure trace.
  - [x] **IMPROVE**: Review coverage and record the lesson.

#### Phase 2 — Implementation

**Goal**: pages expose correct metadata; the gate and the specialist exist.
**Independent Test**: `bun run test`, then `nuxt build` and `bun run check:seo`.

- [x] T012 [CODE] [US-001] Introduce apps/web/i18n/locales.ts and update apps/web/nuxt.config.ts and apps/web/content.config.ts to import it and to declare the new blog frontmatter contract — Refs: US-001, US-002, US-003, FR-001, FR-004, FR-006, NFR-001, AC-001, AC-003 — Depends: T001, T002, T003
  - [x] **PREP**: Confirm the RED tests, read `.fireskills/RULES.md` and load `$fireskill-specialist-nuxt` before editing Nuxt configuration.
  - [x] **EXECUTE**: Extract the locales, declare the new frontmatter fields with refinements, fix the fallback title.
  - [x] **VERIFY**: Run the targeted tests and `nuxt prepare`.
  - [x] **VISUAL**: Not applicable: configuration and schema.
  - [x] **EVIDENCE**: Record commands and modified files.
  - [x] **IMPROVE**: Record refactoring or justify absence.
  <!-- specsfy:evidence {"task": "T012", "refs": ["US-001", "US-002", "US-003", "FR-001", "FR-004", "FR-006", "NFR-001", "AC-001", "AC-003"], "files": ["apps/web/i18n/supported-locales.ts", "apps/web/nuxt.config.ts", "apps/web/content.config.ts"], "commands": [{"run": "cd apps/web && bun run typecheck", "exit": 0}, {"run": "bun run test", "exit": 0}]} -->

- [x] T013 [CODE] [US-001] Implement pure builders in apps/web/app/utils/seo/content-seo.ts — Refs: US-001, US-002, US-003, FR-001, FR-002, FR-003, FR-004, FR-005, FR-007, NFR-001, AC-001, AC-002, AC-003, AC-004, AC-006 — Depends: T001, T002, T003, T004, T022, T023
  - [x] **PREP**: Confirm the failing RED tests and dependencies.
  - [x] **EXECUTE**: Implement the minimal passing builders with strict types.
  - [x] **VERIFY**: Run `bun run test` for the `apps/web` project and regressions.
  - [x] **VISUAL**: Not applicable: pure functions.
  - [x] **EVIDENCE**: Record the GREEN output and modified files.
  - [x] **IMPROVE**: Document refactoring or justify absence.
  <!-- specsfy:evidence {"task": "T013", "refs": ["US-001", "US-002", "US-003", "FR-001", "FR-002", "FR-003", "FR-004", "FR-005", "FR-007", "NFR-001", "AC-001", "AC-002", "AC-003", "AC-004", "AC-006"], "files": ["apps/web/app/utils/seo/content-seo.ts", "apps/web/app/utils/seo/content-seo.test.ts"], "commands": [{"run": "bunx vitest run apps/web", "exit": 0}, {"run": "cd apps/web && bun run typecheck", "exit": 0}]} -->

- [x] T014 [CODE] [US-001] Implement the adapter apps/web/app/composables/use-content-seo.ts and update apps/web/app/components/layout/LayoutContentPage.vue, apps/web/app/pages/blog/index.vue and apps/web/app/pages/docs/[...slug].vue — Refs: US-001, US-002, US-003, FR-001, FR-002, FR-003, FR-004, FR-007, AC-001, AC-002, AC-003, AC-006 — Depends: T013, T022, T023
  - [x] **PREP**: Confirm stack conventions and states from section 10; load `$fireskill-specialist-nuxt-ui` and `$fireskill-specialist-nuxt` before editing `.vue` files.
  - [x] **EXECUTE**: Apply builder output through Nuxt composables; `<h1>`; 404 handling; language label.
  - [x] **VERIFY**: Fetch the dev server SSR HTML for a post, the blog index, a legal page and a docs page; check a missing slug returns 404.
  - [x] **VISUAL**: Inspect the article heading and the card language label at mobile and desktop widths in light and dark mode: borders, margins, padding, spacing and typography.
  - [x] **EVIDENCE**: Record curl output, status codes and modified files.
  - [x] **IMPROVE**: Apply UI improvements or justify absence.
  <!-- specsfy:evidence {"task": "T014", "refs": ["US-001", "US-002", "US-003", "FR-001", "FR-002", "FR-003", "FR-004", "FR-007", "AC-001", "AC-002", "AC-003", "AC-006"], "files": ["apps/web/app/composables/use-content-seo.ts", "apps/web/app/components/layout/LayoutContentPage.vue", "apps/web/app/pages/blog/index.vue", "apps/web/app/pages/docs/[...slug].vue", "apps/web/app/utils/breadcrumb.ts", "apps/web/app/composables/use-breadcrumb.ts", "apps/web/app/utils/date.ts"], "commands": [{"run": "cd apps/web && bun run typecheck", "exit": 0}, {"run": "cd apps/web && SITE_URL=https://nuxfire.com bun run build", "exit": 0}]} -->

- [x] T015 [CODE] [US-003] Add the sitemap hook in apps/web/server/plugins/sitemap-blog.ts using the pure builder and verify the built sitemap — Refs: US-003, FR-004, FR-005, NFR-001, AC-004 — Depends: T012, T013
  - [x] **PREP**: Confirm the RED tests and how the sitemap module runs its hooks.
  - [x] **EXECUTE**: Register a Nitro plugin on the `sitemap:resolved` hook (DEC-012).
  - [x] **VERIFY**: Build and read `__sitemap__/*.xml` for lastmod and alternatives.
  - [x] **VISUAL**: Not applicable: XML output.
  - [x] **EVIDENCE**: Record the sitemap excerpt.
  - [x] **IMPROVE**: Record refactoring or justify absence.
  <!-- specsfy:evidence {"task": "T015", "refs": ["US-003", "FR-004", "FR-005", "NFR-001", "AC-004"], "files": ["apps/web/server/plugins/sitemap-blog.ts"], "commands": [{"run": "SITE_URL=https://nuxfire.com bun run check:seo", "exit": 0}]} -->

- [x] T016 [CODE] [US-004] Implement scripts/seo-rules.ts and scripts/check-seo.ts and register `check:seo` in package.json — Refs: US-001, US-002, US-003, US-004, FR-001, FR-002, FR-004, FR-005, FR-006, FR-008, NFR-002, AC-005 — Depends: T005, T006, T007
  - [x] **PREP**: Confirm the failing RED tests.
  - [x] **EXECUTE**: Implement pure rules and the CLI using `Bun.YAML.parse`.
  - [x] **VERIFY**: Run the targeted tests, then `bun run check:seo` on the build.
  - [x] **VISUAL**: Not applicable: CLI.
  - [x] **EVIDENCE**: Record outputs and modified files.
  - [x] **IMPROVE**: Document refactoring or justify absence.
  <!-- specsfy:evidence {"task": "T016", "refs": ["US-001", "US-002", "US-003", "US-004", "FR-001", "FR-002", "FR-004", "FR-005", "FR-006", "FR-008", "NFR-002", "AC-005"], "files": ["scripts/seo-rules.ts", "scripts/check-seo.ts", "package.json"], "commands": [{"run": "bunx vitest run scripts/seo-rules.test.ts", "exit": 0}, {"run": "SITE_URL=https://nuxfire.com bun run check:seo", "exit": 0}]} -->

- [x] T017 [CODE] [US-002] Implement scripts/og-images.ts and scripts/generate-og-images.ts, add sharp to package.json, register `generate:og`, register the apps/web Vitest project in vitest.config.mts and generate the PNG assets under apps/web/public/images — Refs: US-002, FR-002, FR-009, NFR-002, AC-002, AC-007 — Depends: T002, T006, T008
  - [x] **PREP**: Confirm the failing RED tests and the installed sharp version.
  - [x] **EXECUTE**: Implement helpers and the generator; create the default image source; run it.
  - [x] **VERIFY**: Run the targeted tests and the generator twice comparing hashes.
  - [x] **VISUAL**: Open the generated PNGs and check borders, spacing, padding, margins and typography (text legibility) against the SVG sources.
  - [x] **EVIDENCE**: Record hashes, dimensions and modified files.
  - [x] **IMPROVE**: Record refactoring or justify absence.
  <!-- specsfy:evidence {"task": "T017", "refs": ["US-002", "FR-002", "FR-009", "NFR-002", "AC-002", "AC-007"], "files": ["scripts/og-images.ts", "scripts/generate-og-images.ts", "package.json", "vitest.config.mts", "apps/web/public/images/og/default.png"], "commands": [{"run": "bunx vitest run scripts/og-images.test.ts", "exit": 0}]} -->

- [x] T018 [CODE] [US-001] Update the frontmatter of the 10 posts in apps/web/content/blog/ — Refs: US-001, US-002, US-003, FR-004, FR-006, AC-001, AC-003, AC-004 — Depends: T012, T017
  - [x] **PREP**: Read each post language and translation set.
  - [x] **EXECUTE**: Add lang, ogImage, authorType where needed and the translations of the three Git posts.
  - [x] **VERIFY**: `bun run check:seo` source lint passes.
  - [x] **VISUAL**: Not applicable: frontmatter.
  - [x] **EVIDENCE**: Record the lint output.
  - [x] **IMPROVE**: Record improvement or justify absence.
  <!-- specsfy:evidence {"task": "T018", "refs": ["US-001", "US-002", "US-003", "FR-004", "FR-006", "AC-001", "AC-003", "AC-004"], "files": ["apps/web/content/blog/arquitetura-modular-nuxt-layers-b2b.md", "apps/web/content/blog/como-construir-saas-escalavel-nuxt-4-cloudflare.md", "apps/web/content/blog/filas-assincronas-jobs-segundo-plano-serverless.md", "apps/web/content/blog/getting-started-with-typescript.md", "apps/web/content/blog/git-branches-stage-production-primeiro-lancamento.md", "apps/web/content/blog/git-branching-stage-production-first-release.md", "apps/web/content/blog/git-ramas-stage-production-primer-lanzamiento.md", "apps/web/content/blog/multi-tenancy-rbac-seguranca-saas.md", "apps/web/content/blog/vibe-coding-ia-cursor-claude-code-saas.md", "apps/web/content/blog/websockets-durable-objects-tempo-real.md"], "commands": [{"run": "SITE_URL=https://nuxfire.com bun run check:seo", "exit": 0}]} -->

- [x] T019 [CODE] [US-005] Create fireskills/specialists/fireskill-specialist-content-seo/SKILL.md and register it in fireskills/specialists/catalog.json, fireskills/SKILL.md, fireskills/README.md and AGENTS.md — Refs: US-005, FR-010, FR-011, AC-008 — Depends: T009, T010, T011
  - [x] **PREP**: Confirm the failing RED tests and read an existing specialist as the structural model.
  - [x] **EXECUTE**: Write the specialist and its references from verified evidence; update counts.
  - [x] **VERIFY**: Run the catalog consistency tests.
  - [x] **VISUAL**: Not applicable: documentation.
  - [x] **EVIDENCE**: Record outputs and modified files.
  - [x] **IMPROVE**: Document refactoring or justify absence.
  <!-- specsfy:evidence {"task": "T019", "refs": ["US-005", "FR-010", "FR-011", "AC-008"], "files": ["fireskills/specialists/fireskill-specialist-content-seo/SKILL.md", "fireskills/specialists/catalog.json", "fireskills/SKILL.md", "fireskills/README.md", "AGENTS.md"], "commands": [{"run": "bunx vitest run scripts/specialists-catalog.test.ts", "exit": 0}]} -->

- [x] T020 [CODE] [US-005] Update the blog docs, RULES and the Fireskills docs in three languages under apps/web/content and .fireskills/RULES.md — Refs: US-005, FR-010, FR-011, AC-008 — Depends: T010, T019
  - [x] **PREP**: Confirm the drift test is failing.
  - [x] **EXECUTE**: Document schema, rules, commands; mirror en, pt-br and es; update counts and lists.
  - [x] **VERIFY**: Run `bun run check:i18n` and the drift test.
  - [x] **VISUAL**: Not applicable: documentation.
  - [x] **EVIDENCE**: Record outputs and modified files.
  - [x] **IMPROVE**: Document improvement or justify absence.
  <!-- specsfy:evidence {"task": "T020", "refs": ["US-005", "FR-010", "FR-011", "AC-008"], "files": ["apps/web/content/docs/1.saas-starter-kit/2.features/14.blog.md", "apps/web/content/pt-br/docs/1.saas-starter-kit/2.features/14.blog.md", "apps/web/content/es/docs/1.saas-starter-kit/2.features/14.blog.md", ".fireskills/RULES.md"], "commands": [{"run": "bun run check:i18n", "exit": 0}, {"run": "bunx vitest run scripts/content-docs-drift.test.ts", "exit": 0}]} -->

#### Final Quality Phase

- [x] T021 [TEST] Execute full regression, build, `check:seo` and the dev server verification in scripts/seo-rules.test.ts — Refs: US-001, US-002, US-003, US-004, US-005, FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, NFR-001, NFR-002, AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008 — Depends: T014, T015, T016, T017, T018, T020
  - [x] **PREP**: Identify the suites and gates.
  - [x] **EXECUTE**: Run `bun run test`, `bun run check:i18n`, the `apps/web` typecheck, `nuxt build` with `SITE_URL`, `bun run check:seo`.
  - [x] **VERIFY**: Confirm zero failures and a clean gate.
  - [x] **VISUAL**: Review the final article page and blog index in the dev server: borders, spacing, margins, padding and typography.
  - [x] **EVIDENCE**: Record final counts and commands.
  - [x] **IMPROVE**: Document workflow retrospective notes.

### 15. Execution Order

- Critical Path: T001–T011, T022, T023 (RED) → T012 → T013 → T014 → T015 → T018 → T021.
- Parallel Tasks: T016 and T017 (independent scripts), T019 and T020 (documentation track) can run in parallel with T014.
- MVP Strategy: T012–T014 alone already fix D1, D2, D3 and D6 for posts; the rest completes D4, D5 and the guardrails.

## Act III — Deliver and Validate

### 16. Dependencies, Risks, and Assumptions

#### Dependencies

- `@nuxtjs/seo` 5.3.14 modules (`nuxt-seo-utils`, `nuxt-schema-org`, `@nuxtjs/sitemap`), `@nuxt/content` 3.16.0, `sharp` 0.35.4, Bun 1.4.0 (`Bun.YAML`).

#### Risks

- The sitemap hook may not reach URLs that come from prerendered routes → verified in the built `__sitemap__/*.xml` (`sitemap-hreflang-match`, `sitemap-lastmod` rules); the first design (`onUrl`) was replaced, see DEC-012.
- `og:locale` and hreflang tags come from `useLocaleHead` with element ids; a page-level override may not replace them → match the same ids and verify in the SSR HTML.
- `sharp` output can differ between platforms → generated PNGs are committed, and the gate checks dimensions and existence, not bytes.
- `throw createError` on missing content could break the prerender crawl for links to non-existent posts → intended: the build should fail on broken internal links.
- Changing the global fallback title affects the error page → verify `error.vue` output.
- Real 404 statuses expose links that only worked as a soft 404 (folder breadcrumbs) and fail the prerender → happened, fixed by DEC-015.

#### Assumptions

- The built site is served with `SITE_URL` set to the production origin at deploy time (verified in `infra/web.ts`).
- Existing Portuguese posts keep their slugs (URLs are stable).

### 17. Decisions

- **DEC-001**: Fix the shared layout with one composable and a pure builder rather than patching each page — one code path covers blog, legal and docs; considered per-page `useSeoMeta` (drift-prone) and content-frontmatter-only `seo` (does not cover JSON-LD or hreflang).
- **DEC-002**: `lang` is required with no default — a wrong language is an SEO defect that cannot be inferred from the file; considered defaulting to Portuguese (silent, wrong for new English posts).
- **DEC-003**: Translations are declared explicitly in `translations` on every member of the cluster, not discovered by a shared key — the head and the sitemap hook can then be built from a single entry without a query, and reciprocity is machine-checked; considered `translationKey` (needs a collection query in `onUrl`, which receives one entry only).
- **DEC-004**: The blog index is not filtered by locale; each card shows the post language — filtering would leave English and Spanish readers with one post each.
- **DEC-005**: Date-only values are normalized to `T00:00:00Z` for machine-readable output because Google requires a timezone and the source has no time; authors may supply a full ISO datetime to be exact.
- **DEC-006**: Structured-data images are 16:9 only — the covers are composed at 16:9 and cropping to 1:1 or 4:3 would cut their text; Google marks multiple ratios as recommended, not required (R-005).
- **DEC-007**: Social images are PNG 1200x675 derived from the SVG sources with `sharp` and committed; runtime OG generation stays disabled (needs a native renderer on Workers) — build-time output is deterministic on one platform and adds no runtime cost.
- **DEC-008**: `sharp` is declared as an exact root `devDependency` (rule: never rely on transitive dependencies) and used only by scripts (PR-006).
- **DEC-009**: The gate reads frontmatter with `Bun.YAML.parse` — no new dependency; pure rule functions receive parsed objects so Vitest (Node) can test them.
- **DEC-011**: `article:author` is not emitted — the Open Graph protocol defines it as a reference to a writer profile and posts carry only an author name; the name goes to `<meta name="author">` and to the JSON-LD `author` (R-005, R-006).
- **DEC-012**: The sitemap entries of posts are completed by a Nitro plugin on the `sitemap:resolved` hook, not by `defineSitemapSchema({ onUrl })` — the module serializes `onUrl` with `fn.toString()` into a virtual module, so it cannot import the pure builder (verified in `node_modules/@nuxtjs/sitemap/dist/module.mjs`, `addContentCallbackVirtuals`; the first attempt failed with a RollupError).
- **DEC-013**: The sitemap `lastmod` rule accepts a W3C Datetime (date-only or with a timezone), not only a datetime with a timezone — the sitemap protocol states that the time can be omitted ("use YYYY-MM-DD", sitemaps.org/protocol.html) and the module writes the date-only form; the timezone requirement stays for `article:published_time` and the JSON-LD dates (Google).
- **DEC-014**: The gate treats a `<meta http-equiv="refresh">` stub (the redirect pages of the route rules) as exempt from page rules, lets hreflang siblings share a title (the same page in another language), and parses quoted attribute values that contain `>` — all three were false positives found by the first audit of the real build, not relaxations of a real defect.
- **DEC-015**: The docs breadcrumb links a segment only when the content navigation has a page at that path (`page !== false`) — folder sections such as `/docs/saas-starter-kit/features` have no page; they used to return a soft 200 "not found" page, and became 404 links that failed the prerender once FR-007/AC-006 made missing content a real 404.
- **DEC-016**: The blog byline date is parsed with `parseISO` — `new Date("2026-09-25")` is midnight UTC and rendered as the 24th west of Greenwich (and differently on server and client), contradicting the front matter and `datePublished`.
- **DEC-010**: The CLI validator (`bun run fireskill validate`) is the authoritative spec linter; the standalone `validate_spec.mjs` has headings that no longer match the template and is reported, not modified.

### 18. Definition of Done

- [x] `Definition Gate` is `Passed`.
- [x] `Plan Gate` is `Passed`.
- [x] `Delivery Gate` is `Passed`.
- [x] All applicable `AC` acceptance scenarios pass.
- [x] All requirements have verified test evidence.
- [x] All tasks in section 14 are completed.
- [x] All static checks and automated test suites pass.

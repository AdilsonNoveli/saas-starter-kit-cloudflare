# Structured Data: which markup, for which page

schema.org defines what a type **means**. Whether a search engine shows anything for it is decided
by that engine's own documentation. So a markup decision has two questions: is the type the right
description of the page (schema.org), and is it eligible and honest for Google and Bing.

## 1. Sourced facts

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| J1 | Google's general rules: JSON-LD recommended; only content visible to readers; no irrelevant or misleading content such as fake reviews; no impersonation or misstated purpose; all required properties present; most specific schema.org type; markup on the page it describes; related items linked with `@id`. A violation can be a manual action that removes rich-result eligibility (not ordinary ranking). Valid markup is not a guarantee of a rich result. | https://developers.google.com/search/docs/appearance/structured-data/sd-policies | 2026-09-25 | RAW |
| J2 | Google `SoftwareApplication` rich result requires `name`, `offers.price` (0 if free, plus `priceCurrency` above 0) and **either `aggregateRating` or `review`**; recommends `applicationCategory` (from a fixed list, including `BusinessApplication` and `DeveloperApplication`) and `operatingSystem`; also supports `MobileApplication` and `WebApplication`. Updated 2026-09-08. | https://developers.google.com/search/docs/appearance/structured-data/software-app | 2026-09-25 | RAW |
| J3 | Google `Organization`: no required properties, add the recommended ones that apply, on the home page. | https://developers.google.com/search/docs/appearance/structured-data/organization | 2026-09-25 | RAW |
| J4 | The Google FAQ rich result stopped appearing on 2026-05-07 and its documentation was removed. | https://developers.google.com/search/updates | 2026-09-25 | RAW |
| J5 | Bing: structured data must reflect visible content and does not guarantee visibility; misleading structured data is listed among abuse that can reduce ranking or remove a site. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| J6 | schema.org `SoftwareApplication` (Thing > CreativeWork > SoftwareApplication) has, among others, `applicationCategory`, `operatingSystem`, `softwareVersion`, `downloadUrl`, `featureList`, `license`, `screenshot`, `releaseNotes`, `softwareRequirements` and `offers`. | https://schema.org/SoftwareApplication | 2026-09-25 | RAW |
| J7 | schema.org `Offer` has `price` (with `priceCurrency` in ISO 4217), `priceValidUntil` (the date after which the price is no longer available), `availability`, `availabilityStarts`, `availabilityEnds`, `validFrom` and `url`. | https://schema.org/Offer | 2026-09-25 | RAW |
| J8 | schema.org `BreadcrumbList` is an `ItemList` of linked pages, each with a `position` that starts at 1 for the top of the trail and usually ends with the current page. | https://schema.org/BreadcrumbList | 2026-09-25 | RAW |

## 2. Selection rule (derived from J1 to J8)

1. The markup describes something the page visibly shows. Each property needs a visible source on
   the page or be a plain fact of the entity (a `softwareVersion` only if the page states the version).
2. Choose the most specific type that is true (J1). Prefer one main type per page plus the
   supporting ones the page visibly has (breadcrumbs, the publisher).
3. `SoftwareApplication` on Google needs a rating or a review (J2). Nuxfire has no verified
   reviews, so **no `aggregateRating` and no `review` may be emitted** (spec DEC-013); the type may
   still be emitted without them for schema.org's sake, and the page then is not eligible for
   Google's rich result. That is an accepted, documented limit, not something to work around.
4. **No `FAQPage`** for Google (J4); the rule `jsonld-no-faq` fails it. Whether Bing uses it is not
   established: record "unverified", do not add it on that basis.
5. A price or a validity date in an `Offer` must match the visible price and a limit that really
   exists (the same rule as urgency in `$fireskill-specialist-copywriting`); no `priceValidUntil` for a
   permanent price.
6. Never put hidden text, instructions for an AI assistant or content that only a crawler sees in
   the markup or the page (J5, spec Bing abuse list).

## 3. Type by page (Nuxfire)

| Page | Use | Do not use | Basis |
| --- | --- | --- | --- |
| Home | `WebSite`, `WebPage` (already emitted); `Organization` with `name`, `url`, `logo` and `sameAs` **only** when the owner confirms the legal name and the profiles; `SoftwareApplication` without rating or review only when the page names the application category and the offer | `aggregateRating`, `review`, `FAQPage` | J2, J3, rule 3 and 4 |
| Blog post | `Article` and `BlogPosting` with `headline`, `datePublished`, `dateModified` (from `updated`), `author`, `image`; `BreadcrumbList`; `Organization` as publisher (already emitted) | `FAQPage`, a rating | J1, J8 |
| Blog index | `CollectionPage` (already emitted) | | J1 |
| Docs page | `WebPage` (already emitted); `BreadcrumbList` when the page shows breadcrumbs | `Article` for reference pages that are not articles | J1, J8 |
| Pricing (when it becomes a page) | `Offer` inside the `SoftwareApplication`, price and currency equal to the visible ones | a fake discount window | J7, rule 5 |
| Legal pages | `WebPage` | | J1 |

## 4. What exists in the repository

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| K1 | The built home page carries JSON-LD `WebSite` and `WebPage`; a blog post carries `Article`, `BlogPosting`, `BreadcrumbList` and `Organization`; the blog index `CollectionPage`; docs and legal pages `WebSite` and `WebPage`. | apps/web/.output/public (built HTML) | 2026-09-25 | CMD |
| K2 | The markup is produced by `useSchemaOrg` in `apps/web/app/composables/use-content-seo.ts` and `apps/web/app/pages/blog/index.vue`. | those files | 2026-09-25 | CODE |
| K3 | The rules `jsonld-no-faq` and `jsonld-no-unproven-rating` in `scripts/seo-rules.ts` fail `FAQPage` and an `aggregateRating` or `review` on any built page. | scripts/seo-rules.ts | 2026-09-25 | CODE |

## 5. What this reference does NOT establish

- Whether Bing shows anything for `SoftwareApplication`, `Organization` or `Offer`: no Bing page
  for those types was read.
- Product, Review, VideoObject, LocalBusiness, `WebSite` sitelinks search box and image licensing
  markup: not read here; do not add them from memory. Read the Google page first and add a row.
- That any markup produces a rich result: nobody can promise it (J1).

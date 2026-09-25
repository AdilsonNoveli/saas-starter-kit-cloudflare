# schema.org (mode SUM; property definitions are the site's own wording, paraphrased)

| Id | Type | Facts | URL |
| --- | --- | --- | --- |
| S1 | `SoftwareApplication` | Thing > CreativeWork > SoftwareApplication. Properties relevant to a downloadable developer product: `applicationCategory`, `operatingSystem`, `offers`, `softwareVersion`, `downloadUrl`, `screenshot`, `featureList`, `license`. | https://schema.org/SoftwareApplication |
| S2 | `Product` | `name`, `description`, `image`, `brand`, `offers`, `sku`, `aggregateRating`, `review`. | https://schema.org/Product |
| S3 | `Organization`, `WebSite`, `WebPage`, `BlogPosting`, `Article`, `BreadcrumbList`, `Offer`, `FAQPage` | Not read in this session (BlogPosting, Article and BreadcrumbList are in use since SPEC-0001). To be read RAW in T047 before the structured-data reference is written. | https://schema.org |

## Selection rule that the specialist must encode (derived, not assumed)

1. schema.org defines what a type **means**; it does not say which search engine shows a feature.
   Eligibility comes from the engine: Google (G5-G8) and Bing (B13, B16).
2. Markup must describe what the visitor can see (Google G5, Bing B13/B16). So every property
   needs a visible source on the page or a value that is a fact of the entity (for example
   `softwareVersion` only if the page states the version).
3. Google's `SoftwareApplication` rich result needs a rating or a review (G7). Nuxfire has no
   verified reviews (see compliance-claims.md and baseline M13), so **no `aggregateRating` and no
   `review` may be emitted** until real, attributable reviews exist. Emitting the type without
   the rating is allowed by schema.org but is not eligible for Google's rich result; that is an
   accepted, documented limitation, not something to work around.
4. `FAQPage` is not to be added for Google (G6, discontinued 2026-05-07). Whether Bing uses it was
   not established; the specialist records "unverified" and forbids adding it on that basis.

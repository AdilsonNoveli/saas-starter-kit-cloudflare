# Research note: Google localized versions (hreflang)

- **Source**: https://developers.google.com/search/docs/specialty/international/localized-versions
- **Retrieved**: 2026-09-25 (fetched through the documentation tool of this session; the page text was summarized by the tool, not copied)
- **License / use**: public documentation; this note paraphrases and quotes only short statements as provenance.

## Statements relied on

- Each language version must list itself and all other versions; missing return links may cause the annotations to be ignored.
- Alternate URLs must be fully qualified, including the protocol.
- Language codes follow ISO 639-1 with an optional ISO 3166-1 Alpha 2 region; case is flexible, the region conventionally uppercase.
- `x-default` is the fallback for users whose language matches no version.
- HTML head, HTTP headers and sitemap are equivalent methods; there is no benefit in combining them (they must at least agree, PR-005).
- Translated pages are duplicates only when the main content stays untranslated.

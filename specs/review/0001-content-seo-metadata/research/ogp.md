# Research note: Open Graph protocol

- **Source**: https://ogp.me/
- **Retrieved**: 2026-09-25 (fetched through the documentation tool of this session; the page text was summarized by the tool, not copied)
- **License / use**: public documentation; this note paraphrases and quotes only short statements as provenance.

## Statements relied on

- Required properties: `og:title`, `og:type`, `og:image`, `og:url`.
- Optional: `og:description`, `og:locale` (language_TERRITORY), `og:locale:alternate`, `og:site_name`, `og:image:alt`, `og:image:width`, `og:image:height`, `og:image:type`.
- Object type `article`: `article:published_time`, `article:modified_time`, `article:expiration_time`, `article:author`, `article:section`, `article:tag`; times are ISO 8601.
- `article:author` is described as writer profile information (a reference to a profile), not a free-text name. **Impact**: not emitted for posts that only have an author name (DEC-011).

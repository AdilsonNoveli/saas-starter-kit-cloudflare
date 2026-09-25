# Research note: Google Article structured data

- **Source**: https://developers.google.com/search/docs/appearance/structured-data/article
- **Retrieved**: 2026-09-25 (fetched through the documentation tool of this session; the page text was summarized by the tool, not copied)
- **License / use**: public documentation; this note paraphrases and quotes only short statements as provenance.

## Statements relied on

- There are no required properties; recommended ones are `author` (Person or Organization) with `name` and `url`, `datePublished`, `dateModified`, `headline` and `image`.
- Dates should be ISO 8601 with a timezone; without one Google assumes the timezone of Googlebot.
- Images should be crawlable, represent the content and be at least 50K pixels; multiple ratios (16x9, 4x3, 1x1) are recommended.
- List each author in a separate `author` entry.
- Concise headlines are recommended because long ones may be truncated.

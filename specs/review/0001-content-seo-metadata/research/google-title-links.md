# Research note: Google Title Links guidance

- **Source**: https://developers.google.com/search/docs/appearance/title-link
- **Retrieved**: 2026-09-25 (fetched through the documentation tool of this session; the page text was summarized by the tool, not copied)
- **License / use**: public documentation; this note paraphrases and quotes only short statements as provenance.

## Statements relied on

- Every page should have a `<title>` element; titles should be descriptive and distinct per page, avoiding boilerplate repeated across the site.
- Include the site name at the beginning or end, separated by a delimiter.
- When the title element is missing or generic, Google builds the title link from headings such as `<h1>`, prominent text and anchor text; putting the title in the first visible `<h1>` helps.
- **Impact**: defects D1 and D2 compound each other (FR-001).

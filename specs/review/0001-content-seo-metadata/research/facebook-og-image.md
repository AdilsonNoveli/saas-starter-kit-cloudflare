# Research note: Facebook sharing: og:image formats

- **Source**: https://developers.facebook.com/docs/sharing/webmasters
- **Retrieved**: 2026-09-25 (fetched through the documentation tool of this session; the page text was summarized by the tool, not copied)
- **License / use**: public documentation; this note paraphrases and quotes only short statements as provenance.

## Statements relied on

- The image formats listed for `og:image` are `image/jpeg`, `image/gif` and `image/png`; SVG is not listed.
- The essential tags are `og:url`, `og:type`, `og:title`, `og:description` and `og:image`.
- Images are cached by URL and are not refreshed unless the URL changes (a changed cover needs a new file name).
- Width and height should be provided so the image loads on the first share.
- **Limits of this note**: the X (Twitter) documentation returned HTTP 402 and was not read; no claim about X is made anywhere in the spec. Recommended pixel dimensions were not stated in the fetched excerpt; 1200x675 is a design decision (DEC-007), not a cited requirement.

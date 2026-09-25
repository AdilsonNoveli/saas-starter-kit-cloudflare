# Astro as the performance reference

Goal stated by the user: pages "as optimized as Astro is". This note fixes what that means with
evidence, so the target is a measurable set of behaviours and numbers instead of a slogan.

## A1. Astro's documented performance model (mode SUM)

| Id | Statement (paraphrased) | Source |
| --- | --- | --- |
| A1.1 | Astro is built for content-driven sites and favours server rendering over client-side rendering to reduce the work left to the visitor's device. | https://docs.astro.build/en/concepts/why-astro/ (heading: content-driven, server-first) |
| A1.2 | "Fast by default" is a stated design goal: it should be hard to build a slow site with the defaults. | same page |
| A1.3 | Zero JavaScript by default: UI components render to HTML and CSS and the client-side JavaScript is stripped unless the author asks for it. | https://docs.astro.build/en/concepts/islands/ and the page above |
| A1.4 | Interactivity is opt-in per component through client directives (`client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`); only the components that need JavaScript are hydrated. | islands page (the behaviour of `client:media` and `client:only` was not detailed by the fetch; re-read RAW) |
| A1.5 | The `<Image />` component sets `alt`, `loading` and `decoding`, infers width and height to avoid Cumulative Layout Shift, and `<Picture />` produces `avif`/`webp` with a fallback; lazy loading is the default. | https://docs.astro.build/en/guides/images/ |

Verdict on "as Astro": the transferable ideas are (1) no JavaScript on a page that has no
interactivity, (2) hydrate only what needs it and only when needed, (3) images always carry their
dimensions and a modern format, (4) these are defaults enforced by tooling, not reminders.

## A2. Astro's own documentation page, measured (mode CMD, in a browser)

Page: `https://docs.astro.build/en/getting-started/`, first load, Chromium in the Claude desktop
browser pane, 2026-09-25. Sizes come from the Resource Timing API of that page load
(`encodedBodySize` is the wire size, `decodedBodySize` is after decompression).

| Resource class | Files | Wire bytes | Decoded bytes |
| --- | --- | --- | --- |
| Document (HTML) | 1 | 28,208 | 152,498 |
| JavaScript | 4 | 32,967 | 128,828 |
| CSS | 4 | 18,851 | 92,109 |
| Images (webp) | 37 | 29,092 | 29,092 |

Limits: it is a documentation page, not a marketing landing page, so it is a reference for the
order of magnitude, not an equivalence. Timing metrics (paint, LCP) were **not** obtained: the
browser pane was hidden and emits no paint entries. A `<script>` count of 15 in the DOM includes
inline scripts and tiny ones.

Re-run: open the URL, run in the console
`performance.getEntriesByType('resource')` grouped by `initiatorType` and file extension.

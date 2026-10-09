# Images and Third-Party Code

Images are the largest payload of the Nuxfire home page and the easiest to fix; third-party code is
the payload that is easiest to add without noticing. This file states what the sources require and
what the repository does today.

## 1. Sourced requirements

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| I1 | Astro's `<Image />` writes the real `width` and `height` of the optimised file, `loading="lazy"` and `decoding="async"` on the `<img>`, requires `alt`, and does it so the image does not cause layout shift. `<Picture />` writes `avif` and `webp` sources with a fallback image. This is the behaviour the phrase "as optimised as Astro" points to for images. | https://docs.astro.build/en/guides/images/ | 2026-09-25 | RAW |
| I2 | For an LCP image: keep it discoverable in the initial HTML, give it `fetchpriority="high"`, never `loading="lazy"`, use a modern format, and serve it from the same origin as the page. | https://web.dev/articles/optimize-lcp | 2026-09-25 | RAW |
| I3 | Bing asks that images and video reinforce the text and are not the only source of information, with descriptive file names, alt text, captions or transcripts. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |

## 2. What the repository does

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| P1 | `@nuxt/image`, `@nuxt/scripts` and `@nuxt/fonts` are installed in `apps/web`; `nuxt.config.ts` has no `image:` block. The blog uses `NuxtImg` in `ProseImg.vue`; the landing avatars use `UAvatar` with a plain file path. | apps/web/nuxt.config.ts, apps/web/package.json, apps/web/app/components/content/ProseImg.vue, apps/web/app/components/landing/LandingAvatars.vue | 2026-09-25 | CODE |
| P2 | Six JPEG files in `apps/web/public/static/` weigh 446,942 to 620,635 bytes (3,413,465 in total) and are shown as small avatars: the HTML gives them a 28 to 32 px box. On the home page they are 3,447,493 bytes of the gate's `images` metric. | `ls -la apps/web/public/static`; perf-budgets.json baseline for `/` | 2026-09-25 | CMD |
| P3 | Lighthouse (mobile, applied throttling) lists these files among the heaviest requests of the home page and reports 5,004 KiB total for it; `sqlite3.wasm` (864,916 bytes) and two `sql_dump.txt` files of Nuxt Content (139,103 and 132,573 bytes) are also fetched by the home page. | specs/draft/0002-web-performance-search-copy-specialists/research/lab-measurements.md | 2026-09-25 | CMD |
| P4 | No page of the built site loads a script from a host other than its own origin: the gate reports zero `third-party-origin` violations, and a search of the built home for gtag, googletagmanager, posthog, umami, plausible and clarity found none. | `bun run check:perf`; specs/draft/0002-web-performance-search-copy-specialists/research/baseline-measurements.md (M5) | 2026-09-25 | CMD |

## 3. What to do (derived from the rows above, not from memory)

- Below-the-fold and small images: `NuxtImg` or `NuxtPicture` with explicit `width` and `height`,
  a modern `format`, and the size the design shows (multiplied by 2 for high-density screens).
  A 32 px avatar needs a file of a few kilobytes, not 600 KB.
- The LCP element of the marketing home page is text (declared in `perf-budgets.json`). If a hero
  image is ever added, declare `lcp: { kind: "image", src }`: the gate then requires it to be eager
  and `fetchpriority="high"` (I2), and it must not be lazy.
- A photograph of a person is content, not decoration: it needs a provenance record in
  `.fireskills/CLAIMS.yml` (see `$fireskill-specialist-copywriting`); performance work never
  replaces or fabricates one.
- A new third-party script is an exception to declare, not a default: add the host to the page's
  `thirdParty` list, explain the reason in the spec, and measure before and after (bytes with
  `check:perf`, timing with the protocol of `references/web-vitals-and-budgets.md`).

## 4. What this reference does NOT establish

- Which `@nuxt/image` provider or format setting Cloudflare should use is not established here: no
  provider was tested in this repository. Test one on a copy of the page and measure before adopting.
- The size a photo "must" have is not a requirement of any source; 200,000 bytes is a project
  decision (see `web-vitals-and-budgets.md`, S2).
- Whether the avatars and testimonial photos are of real people is unknown and is not a
  performance question.

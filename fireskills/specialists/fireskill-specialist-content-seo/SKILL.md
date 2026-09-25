---
name: fireskill-specialist-content-seo
description: Write, translate and review Nuxfire blog posts, docs pages and their SEO — the frontmatter contract in `apps/web/content.config.ts` (`lang`, `translations`, `updated`, `ogImage`, `authorType`), the pure metadata builders in `apps/web/app/utils/seo/content-seo.ts`, raster social covers (`bun run generate:og`), hreflang and sitemap consistency, and the `bun run check:seo` gate. Use when touching `apps/web/content/**`, `apps/web/public/images/**`, `LayoutContentPage.vue`, or any page title, description, Open Graph, JSON-LD, hreflang or sitemap.
---

# Content and SEO in Nuxfire (blog, docs, translations)

## When to Use

- Trigger when creating, translating or editing a blog post (`apps/web/content/blog/*.md`),
  a docs page (`apps/web/content/docs`, `pt-br/docs`, `es/docs`) or a legal page.
- Trigger when changing what a page tells search engines and social networks: title,
  description, `<h1>`, canonical, Open Graph, Twitter, JSON-LD, `<html lang>`, hreflang, sitemap.
- Trigger when adding or renaming a locale (`apps/web/i18n/supported-locales.ts`).
- Do not trigger for visual work on the layout (`$fireskill-specialist-nuxt-ui`), for the
  landing copy stored in `apps/web/i18n/locales/*.json` beyond the keys of `blog.*`, or for
  the infrastructure of the `Web` Worker (`$fireskill-specialist-sst`).
- Combine with `$fireskill-specialist-nuxt` (pages, composables, Nitro plugins),
  `$fireskill-specialist-technical-research` (every claim about GitHub, Stripe, Cloudflare or
  any third party must come from a primary source), `$fireskill-specialist-web-accessibility`
  (one `<h1>`, heading order) and `$fireskill-specialist-typescript`.

## Workflow

1. Read [references/nuxfire-content.md](references/nuxfire-content.md); for a new post also
   [references/new-post-recipe.md](references/new-post-recipe.md).
2. Decide the language and the translation set **before writing**. The blog has no locale
   mechanism: every language is its own post, linked through `translations`.
3. Write the English source first (docs: English is the source of truth), then translate.
   Keep code blocks, commands and AI-agent prompts identical in every language.
4. Verify every technical claim. Run each command in a scratch directory; fetch the vendor
   documentation; write anything you could not verify with hedged wording ("usually",
   "documented for plan X") or leave it out. No claim from memory.
5. Give the post a cover: a 16:9 SVG in `apps/web/public/images/blog/`, then
   `bun run generate:og` to produce the 1200x675 PNG that social networks read.
6. Validate (below) before saying the work is done.

## Core Rules

- **Blog frontmatter** (`apps/web/content.config.ts`, `blog` collection): required `title`,
  `description` (non-empty, specific to the post), `date`, `author`, `lang`; optional
  `updated`, `authorType`, `translations`, `category`, `readTime`, `tags`, `image`, `ogImage`.
- `lang` is one of `en`, `pt-br`, `es`. It has **no default**: a wrong language is an SEO
  defect that cannot be inferred from the file.
- `date` and `updated` are `YYYY-MM-DD` or a full ISO 8601 datetime **with a timezone**. A
  date-only value means midnight UTC. `updated` is never before `date`.
- `translations` maps language to slug, **includes the post itself** and is written
  identically in every member of the set. The target of each key must be written in that
  language. The gate checks all of it; a one-sided set is a violation.
- `ogImage` is a root-relative **png or jpeg** that exists under `apps/web/public`, generated
  at 1200x675. `image` (the cover on the page) may be an SVG. Never point `ogImage` at an SVG:
  Facebook's sharing documentation lists JPEG, GIF and PNG.
- `title` never carries the brand: the SEO template appends ` | Nuxfire` once. Docs pages
  keep their existing `<title> - Nuxfire Docs` form.
- A content page has exactly **one `<h1>`**, generated from `title`. Body headings start at `##`.
- Do not emit `article:author` for a plain author name: the Open Graph protocol defines it as
  a reference to a profile. The name goes to `author` and to the JSON-LD.
- Docs exist in three mirrors (`docs`, `pt-br/docs`, `es/docs`). Headings and code blocks are
  identical to English; only prose is translated. `bun run check:i18n` enforces it.
- Tone measured in the docs: Portuguese uses "você"; Spanish docs use "usted".
- Legal pages are English-only and use `i18n: false`; do not create translated URLs for them.
- The head and the sitemap must say the same thing about a post (Google treats them as
  equivalent methods and ignores annotations that contradict each other). Both come from
  `hreflangLinks`/`sitemapEntryFor`; never hand-write hreflang.
- A helper that must import code cannot be the `onUrl` of `defineSitemapSchema()`: the
  sitemap module serializes it to text. Use a Nitro plugin (`server/plugins/sitemap-blog.ts`).

## Antipatterns

- Publishing a post without running its commands, or with a claim you did not verify.
- Setting `lang` to silence a lint error, or copying the first paragraph into `description`.
- An SVG or relative `ogImage`; a cover that is not 16:9 (the generator refuses it).
- `translations` declared on one file only, or listing a slug that does not exist.
- Adding a locale to `nuxt.config.ts` without `i18n/supported-locales.ts` (they must not drift).
- Translating docs headings or code blocks; changing an English page without its two mirrors.
- Editing `apps/web/.output` or `dist`; committing a PNG cover you did not look at.
- Putting a `<h1>` (`# Title`) in the markdown body of a post.
- Relying on the visitor locale to decide a post's language.

## Validation

- `bun run test` — Vitest projects `apps/web` (builders) and `scripts` (gate, images, docs drift, catalog).
- `bun run check:i18n` — locale files and docs mirrors.
- `bun run generate:og` twice: the second run must print "up to date".
- `SITE_URL=https://<your-domain> bun run --cwd apps/web build`, then `bun run check:seo`.
  Without a build only the frontmatter lint runs, and it says so.
- `bun run --cwd apps/web dev` and `curl` the page: title, description, canonical, `og:*`,
  `<html lang>`, JSON-LD and exactly one `<h1>` in the server-rendered HTML.
- Look at each PNG cover: the fonts of the machine that generated it end up in the image.

## Related Skills

- `$fireskill-specialist-nuxt` — pages, composables, Nitro plugins.
- `$fireskill-specialist-nuxt-ui` — blog card and article layout components.
- `$fireskill-specialist-technical-research` — sourcing claims.
- `$fireskill-specialist-web-accessibility` — headings and landmarks.
- `$fireskill-specialist-delivery-engineering` — deploying the `Web` Worker after content changes.

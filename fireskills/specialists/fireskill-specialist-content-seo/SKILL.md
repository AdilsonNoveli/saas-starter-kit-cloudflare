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
- Search-engine mechanics that are not about authoring (redirects, `_redirects`, `assets.htmlHandling`,
  sitemap and `lastmod` rules, IndexNow, structured-data selection) live in `$fireskill-specialist-seo`.
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
2. **Every post exists in every configured language** (`en`, `pt-br`, `es`), each as its own
   file, all linked through `translations`. There is no single-language post: the site follows
   the language the visitor chose (the blog index shows one card per post in the active locale,
   the docs are served per locale), so a post that lacks a language leaves those readers in a
   language they did not choose. Plan the three slugs and the three covers before writing. The
   same applies when you touch an existing post or add a locale: every post gets every language.
3. Write the English source first (docs: English is the source of truth), then translate.
   Commands, identifiers and AI-agent prompts stay identical in every language; translate the
   prose, the comments inside code blocks and the sample user-facing strings in the examples.
4. Verify every technical claim. Run each command in a scratch directory; fetch the vendor
   documentation; write anything you could not verify with hedged wording ("usually",
   "documented for plan X") or leave it out. No claim from memory.
5. Give each language its cover: a 16:9 SVG in `apps/web/public/images/blog/` (`<name>.svg`,
   `<name>-en.svg`, `<name>-es.svg` when the image contains words; a cover with no words may be
   shared), then `bun run generate:og` to produce the 1200x675 PNG that social networks read.
   Look at each PNG: a longer translation can overflow the badge or the line.
6. Validate (below) before saying the work is done.

## Core Rules

- **Blog frontmatter** (`apps/web/content.config.ts`, `blog` collection): required `title`,
  `description` (non-empty, specific to the post), `date`, `author`, `lang`; optional
  `updated`, `authorType`, `translations`, `category`, `readTime`, `tags`, `image`, `ogImage`.
- `lang` is one of `en`, `pt-br`, `es`. It has **no default**: a wrong language is an SEO
  defect that cannot be inferred from the file.
- `date` and `updated` are `YYYY-MM-DD` or a full ISO 8601 datetime **with a timezone**. A
  date-only value means midnight UTC. `updated` is never before `date`.
- `translations` maps language to slug, **lists every configured language**, **includes the
  post itself** and is written identically in every member of the set. The target of each key
  must be written in that language. The gate checks all of it (`post-translations-complete`,
  `-self`, `-target-exists`, `-lang-match`, `-reciprocal`); a one-sided or partial set is a
  violation, and so is a post with no `translations` at all.
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
- A published slug never changes (it is a URL, and it is indexed). A translation gets its own
  slug in its language; check that it does not collide with another file. The slug of an older
  post may not match its language (`getting-started-with-typescript` is Portuguese): keep it.
- Links from a post to the home use the locale prefix of the post: `/#pricing` (en),
  `/pt-br#pricing`, `/es#pricing`.
- The head and the sitemap must say the same thing about a post (Google treats them as
  equivalent methods and ignores annotations that contradict each other). Both come from
  `hreflangLinks`/`sitemapEntryFor`; never hand-write hreflang.
- A helper that must import code cannot be the `onUrl` of `defineSitemapSchema()`: the
  sitemap module serializes it to text. Use a Nitro plugin (`server/plugins/sitemap-blog.ts`).

## Antipatterns

- Publishing a post without running its commands, or with a claim you did not verify.
- Setting `lang` to silence a lint error, or copying the first paragraph into `description`.
- An SVG or relative `ogImage`; a cover that is not 16:9 (the generator refuses it).
- `translations` declared on one file only, listing a slug that does not exist, or omitted
  because "this post is only in Portuguese".
- Adding or editing a post in one language and leaving the others for later; a translated
  post that reuses a cover whose image text is in another language.
- Adding a locale to `nuxt.config.ts` without `i18n/supported-locales.ts` (they must not drift).
- Translating docs headings or code blocks; changing an English page without its two mirrors.
- Editing `apps/web/.output` or `dist`; committing a PNG cover you did not look at.
- Putting a `<h1>` (`# Title`) in the markdown body of a post.
- Relying on the visitor locale to decide a post's language.
- Deciding how the site behaves per locale without checking how the rest of the site does it
  (the docs already follow the locale): change a listing or a content rule, then switch the
  locale of the running site and look at each one.

## Validation

- `bun run test` — Vitest projects `apps/web` (builders) and `scripts` (gate, images, docs drift, catalog).
- `bun run check:i18n` — locale files and docs mirrors.
- `bun run generate:og` twice: the second run must print "up to date".
- `SITE_URL=https://<your-domain> bun run --cwd apps/web build`, then `bun run check:seo`.
  Without a build only the frontmatter lint runs, and it says so.
- With the dev server running, `curl` `/blog`, `/pt-br/blog` and `/es/blog`: the same number of
  cards in each, one per post, each in that locale's language.
- `bun run --cwd apps/web dev` and `curl` the page: title, description, canonical, `og:*`,
  `<html lang>`, JSON-LD and exactly one `<h1>` in the server-rendered HTML.
- Look at each PNG cover: the fonts of the machine that generated it end up in the image.

## Related Skills

- `$fireskill-specialist-nuxt` — pages, composables, Nitro plugins.
- `$fireskill-specialist-nuxt-ui` — blog card and article layout components.
- `$fireskill-specialist-seo` — what Google and Bing require of any page (status codes, redirects,
  canonical, sitemap, structured data, IndexNow); this specialist keeps how posts and docs are authored.
- `$fireskill-specialist-copywriting` — the words of titles, descriptions and post copy.
- `$fireskill-specialist-technical-research` — sourcing claims.
- `$fireskill-specialist-web-accessibility` — headings and landmarks.
- `$fireskill-specialist-delivery-engineering` — deploying the `Web` Worker after content changes.

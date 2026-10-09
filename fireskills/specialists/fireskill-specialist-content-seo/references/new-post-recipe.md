# Recipe: Adding a Blog Post (and its translations)

Based on the three Git posts under `apps/web/content/blog/` and the contract in
`apps/web/content.config.ts`. Confirm each path against actual code before copying: the codebase
supersedes this document.

## Steps

1. **Pick the slugs.** Always three files, one per configured language (`en`, `pt-br`, `es`),
   each named for its language (`git-branching-…`, `git-branches-…`, `git-ramas-…`). A slug is a
   URL: it never changes after publication, and a translation must not reuse another file's slug
   (`vibe-coding-ia-…` in Portuguese and `vibe-coding-con-ia-…` in Spanish).
2. **Write the English source first**, then translate. Verify every command in a scratch
   repository and every vendor claim in the vendor documentation (see `$fireskill-specialist-technical-research`).
3. **Frontmatter** in each file. This is the complete contract; nothing is defaulted:

```yaml
---
title: "Specific title without the brand"
date: "2026-09-25"
description: "One or two sentences that describe this post, not the site."
author: "Nuxfire Team"
category: "DevOps"
readTime: "14 min"
tags: ["Git", "Release"]
image: "/images/blog/my-cover.svg"
lang: en
ogImage: "/images/blog/my-cover.png"
translations:
  en: my-post-english-slug
  pt-br: my-post-portuguese-slug
  es: my-post-spanish-slug
---
```

   - Use `authorType: "Person"` when `author` is a person (default `Organization`).
   - Add `updated: "YYYY-MM-DD"` when you materially change a published post.
   - `translations` is never omitted and never partial: the gate rejects a post that does not
     list all three languages (`post-translations-complete`).
4. **Covers**: copy `apps/web/public/images/blog/git-branching-stage-production.svg` as a starting
   point (800x450, 16:9), change the text, then generate the PNG and open it. When the image has
   words, make one per language (`<name>.svg`, `<name>-en.svg`, `<name>-es.svg`) and point each
   post's `image`/`ogImage` at its own; a cover without words may be shared:

```bash
bun run generate:og
```

5. **Body**: start at `##` (the `<h1>` is the title). Keep code blocks and AI-agent prompts
   identical across languages; translate prose, code comments and sample user-facing strings.
   Links to the home carry the post's locale prefix (`/#pricing`, `/pt-br#pricing`,
   `/es#pricing`). Portuguese uses "você", Spanish docs-style manuals use "usted".
6. **Validate**:

```bash
bun run test
bun run check:i18n
SITE_URL=https://<your-domain> bun run --cwd apps/web build
bun run check:seo
```

7. **Link it** from the docs page that needs it (all three mirrors, each pointing to the post
   of its own language) and run `bun run check:i18n` again.

## Hand-off prompt for an AI agent

```text
Use $fireskill-specialist-content-seo. Write a blog post about <topic> in English, Portuguese
(pt-br) and Spanish. Verify every command in a scratch directory and every third-party claim in
its official documentation; hedge or drop what you cannot verify. Follow the frontmatter contract
in apps/web/content.config.ts (lang, translations on all three files, raster ogImage), create the
16:9 SVG cover and run `bun run generate:og`, then run `bun run test`, `bun run check:i18n` and
`bun run check:seo`. Do not commit or deploy.
```

---
name: fireskill-specialist-copywriting
description: The pass that every text a human reads in a Nuxfire product goes through — landing and marketing pages, pricing, blog voice, interface labels and buttons, empty states, error and permission messages, transactional emails, notifications and legal text. Covers the brief, voice-of-customer research, the messaging hierarchy, headlines and buttons, application text, localisation (en, pt-br, es), the claim ledger `.fireskills/CLAIMS.yml` (numbers, testimonials, urgency) and the `bun run check:copy` gate. Use when writing or changing any string in `apps/*/i18n/locales/**`, any `.vue` template text, `packages/emails/templates/**`, any page copy, or any claim about the product.
---

# Copywriting in Nuxfire (every text a human reads)

Copy is engineering here: it has an audience, a brief, a source for every claim, a review, and a
gate. The rule of the repository (`AGENTS.md`) is that **text written for a human to read in the
apps passes through this specialist**. Scope, confirmed by the owner on 2026-09-25 (SPEC-0002 DEC-014):
everything that reaches the user as text, whether it teaches, notifies or sells: interface strings,
marketing pages, blog posts, docs, legal text, transactional emails, notifications, errors, empty states.
**Outside the pass**: names of menus, tools and features, product and proper names, commands and code
identifiers (they stay short, consistent and conventional; they still live in the locale files), and
code comments, logs and developer-only console output.

Good copy improves communication in all three registers, but the goal differs, and the techniques
must not leak from one to the other:

| Register | Where | Goal | Not allowed |
| --- | --- | --- | --- |
| Persuade | landing, pricing, blog headlines, invitations | move a reader who has not decided, with proof | any claim without a ledger record |
| Teach or guide | docs, onboarding, empty states, errors, tooltips | the reader understands and completes the task | hooks, curiosity gaps, urgency: here clarity is the whole job |
| Notify | emails, toasts, notifications | say who did what, and what to do next | marketing claims, pressure, vague alarms |

## When to Use

- Trigger when writing or changing a headline, a button, a label, a placeholder, a tooltip, an
  empty state, an error, a toast, a permission message, an email or notification, a pricing line,
  a testimonial, or any sentence that states something about the product.
- Trigger when a `.vue` template contains a literal string, or a locale key is added, renamed or
  translated.
- Trigger when a number, a comparison, a guarantee, a deadline or a person is named on a page.
- Do not trigger for the frontmatter or SEO metadata contract of a post
  (`$fireskill-specialist-content-seo`) beyond its words, nor for search-engine mechanics
  (`$fireskill-specialist-seo`).
- Combine with `$fireskill-specialist-nuxt` and `$fireskill-specialist-content-seo` (locale files,
  posts), `$fireskill-specialist-nuxt-ui` and `$fireskill-specialist-web-accessibility` (labels,
  errors), `$fireskill-specialist-nuxfire-layers` (text that lives in a layer),
  `$fireskill-specialist-technical-research` (a claim about a third party needs its source) and
  `$fireskill-specialist-interface-experience` (flows whose text you are writing).

## Workflow

1. **Brief.** Who reads it, at what awareness stage (problem-aware, solution-aware), what should
   they think on arrival, what should they do by the end, and what must change in their mind in
   between. One sentence each, written down before any draft
   ([references/workflow-and-research.md](references/workflow-and-research.md)).
2. **Research the reader's words.** Use real voice-of-customer material (interviews, support
   messages, reviews, community threads). If there is none, say so in the brief and mark the copy a
   hypothesis to test; do not invent a customer.
3. **Order the message.** Write the messaging hierarchy (what you do, why care, do others like me
   care, how, how will my life improve, why is it safe, what now) and let the page length follow it.
4. **Draft** with the structures of [references/pattern-library.md](references/pattern-library.md)
   and [references/headlines-and-buttons.md](references/headlines-and-buttons.md) for marketing, or
   [references/application-text.md](references/application-text.md) for text inside the product.
   Formulas come last, after the research.
5. **Claims.** Every number, superlative, comparison, guarantee, result, deadline, named person or
   source gets a record in `.fireskills/CLAIMS.yml` with a verifier the machine can run, or it is
   rewritten without the claim ([references/claims-and-compliance.md](references/claims-and-compliance.md)).
6. **Localise.** Marketing copy is transcreated for each market; interface text is translated
   faithfully; commands, code and product names stay identical. All three locale files change in
   the same change ([references/nuxfire-copy-delivery.md](references/nuxfire-copy-delivery.md)).
7. **Review in a separate pass** from the drafting (a reviewer or verifier, not the author in the
   same context): clarity, one idea per block, the claim ledger, tone, accessibility of the words.
8. Validate (below) before saying the work is done.

## Core Rules

- **Text lives in the locale files**, not in templates. A literal in a `.vue` template is a violation
  of the gate (`literal-text`). New text: add the key in `en`, `pt-br` and `es` together.
- **No claim without proof.** A number, "zero", "never", "always", "millions", a percentage, a
  price, a count of features or tables, a comparison or a guarantee is a claim (the patterns are in
  `scripts/copy-config.json`). The ledger holds its evidence: `repo-count`, `repo-file`, `url`
  (with the retrieved date) or `owner-statement` (with the name and the date).
- **A testimonial is a person**: they exist, used the product, consented, and the photo is theirs.
  A photo is never reused for another name. Without the record it does not ship.
- **A deadline is a fact**: a countdown, "only today", "last spots" or a launch price exists only
  if a real, dated, enforced limit is in the ledger's `offers`, and the copy reads it from there.
- **No fear, guilt or exaggeration.** No promise of income, growth, ranking or time saved that the
  ledger cannot show. Not legal advice: the owner confirms what applies in each market.
- **Clarity before cleverness.** One idea per block, concrete over vague, the reader's words over
  ours, a headline that delivers what it promises.
- **A button says what happens** and does not promise more; a call to value before the reader
  decided, a call to action after.
- **An error says what happened, why if useful, and what to do**, next to the field, in plain
  language, without blame, without losing what the person typed.
- **Titles and descriptions of pages** are copy and are checked by `check:seo` too: unique, honest,
  matching what the page shows.
- **Facts about a market or a source** (a law, a competitor, a platform) come from a primary page
  with the date read, never from memory.

## Antipatterns

- A headline written first and a page built to justify it.
- Inventing a customer, a count, a rating, a logo or a quote "as a placeholder" and shipping it.
- Copying a formula's wording from a template kit; a pattern is a structure, and the wording is
  written for this product and reader.
- Translating marketing copy word for word; or leaving an interface string in English in the
  Portuguese app because "developers understand it".
- "Oops! Something went wrong." — an error that names nothing and offers nothing.
- A button that says "Submit" when it deletes something.
- A fake countdown; a "limited" offer with no limit; a discount that is the normal price.
- Fixing a gate failure by editing the baseline or the ledger without evidence.

## Validation

- `bun run test` (includes `scripts/copy-rules.test.ts` and `scripts/copy-patterns.test.ts`).
- `bun run check:copy`: exit 0 (claims proven or baselined with an owner, testimonials registered,
  offers dated, no new literal text in templates).
- `bun run check:i18n`: the three locale files have the same keys.
- `SITE_URL=https://<domain> bun run --cwd apps/web build` then `bun run check:seo` when a title or
  description changed.
- Read the final text in each language as its reader would, on the real page.

## Related Skills

- `$fireskill-specialist-content-seo` — blog and docs authoring, translations and their gates.
- `$fireskill-specialist-seo` — what the head and the structured data must match.
- `$fireskill-specialist-nuxt` — locale files, keys and how the text is rendered.
- `$fireskill-specialist-nuxfire-layers` — text that belongs to a layer.
- `$fireskill-specialist-web-accessibility` — labels, errors and reading order.
- `$fireskill-specialist-technical-research` — sourcing claims about third parties.

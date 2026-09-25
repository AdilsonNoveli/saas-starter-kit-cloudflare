# Market and positioning (SPEC-0003), 2026-09-25

Sources read in a browser on 2026-09-25 (mode RAW) unless marked. Statements are paraphrases.

## 1. The owner's belief, checked

The owner believes Nuxfire is "the first structure 100 % built around the Cloudflare ecosystem".

| Id | Fact | Source | Mode |
| --- | --- | --- | --- |
| M1 | **SuperSaas** sells a Nuxt boilerplate "built for AI coding agents" for $149 ("Save $99"), with Better Auth, Drizzle (Turso, NuxtHub, Postgres, SQLite), Stripe, teams and a super admin; it shows "280+ customers". | https://supersaas.dev/ | RAW |
| M2 | A web search on 2026-09-25 lists Saas-Kit (Nuxt, NuxtHub, D1, Stripe, hosted on Cloudflare Workers), SuperSaas (works on Cloudflare Pages and Workers), other Nuxt starter kits for Cloudflare with Durable Objects, D1 and team auth, a free Cloudflare Workers plus Next.js SaaS template on GitHub, and premium kits priced between $200 and $600. | web search results (titles and summaries only) | SUM |
| M3 | Supastarter documents that each of its kits ships an AGENTS.md and Agent Skills for Claude Code and Cursor. | https://supastarter.dev/claude-code-boilerplate (search summary) | SUM |
| M4 | Conclusion: "the first Cloudflare-native kit" is **not supported**: several kits already run on Cloudflare (M2). "Built for AI coding agents" is already claimed by others (M1), and an `AGENTS.md` with skills is becoming table stakes (M3). |  | derived |

What stays as a *possible* differentiator, each to be **verified before it is written** (none is asserted here):

- **Fireskills**: a specification-driven workflow with gates and specialists that agents follow. The search did not find a competitor with specs, gates and TDD; that is not proof that none exists.
- **PostgreSQL through Hyperdrive**, where others in M2 use D1 or SQLite.
- **Layers switched on or off by configuration** (`layers/` with `admin`, `billing`, `kanban`, `notifications`, `teams`).
- **Price**: Nuxfire's launch price is R$ 97 and its regular price R$ 497 (owner, 2026-09-25); the competitors read cost $149 or more, in dollars. A comparison across currencies needs a dated exchange rate and is a claim, so it is not written until sourced.

## 2. Ownership of the code

The owner stated on 2026-09-25: "the code is mine; we changed the branding to nuxfire". This is recorded as an owner statement (decision), not verified by the analyst. Consequences for the plan:

- Any name of a third party in the license text, the code comments or the copy is removed. The license page must name the real seller and licensor, which only the owner can supply (open question Q-01).
- The third-party open source that the code legitimately builds on keeps its own attribution and license (for example the vendored mailer that forks `@adonisjs/mail`, with its `LICENSE.md`); removing an upstream license notice would be a breach, not a clean-up.

## 3. What this means for the plan

- The positioning is written from checkable facts: what exists in `layers/`, the Fireskills workflow that can be shown in a public post, the stack, the price, the license terms as they will be.
- Any competitor is named only with a dated source and never disparaged (comparisons need both sides sourced and the case where the other product is the better choice).

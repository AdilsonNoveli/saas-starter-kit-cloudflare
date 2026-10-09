# Fireskills Specialists

Technical skills catalog of Fireskills for Nuxfire. The `fireskill-specialist-` prefix distinguishes specialized technical context from core methodology skills (`skills/`). Each specialist resides in a folder containing `SKILL.md`, `agents/openai.yaml`, and `references/`.

`catalog.json` serves as the discovery index: name, description, category, tags, and `detect` rules (files and dependencies indicating when the specialist applies).

## Nuxfire Stack Specialists

Each specialist is derived directly from actual repository code. Statements in `references/nuxfire-*.md` link directly to verified source files.

| Specialist | Scope |
|---|---|
| `fireskill-specialist-nuxt` | Nuxt 4: pages, layouts, middleware, plugins, Nitro, `runtimeConfig`, i18n, SSR |
| `fireskill-specialist-nuxt-ui` | `@nuxt/ui` v4: components, theming, `packages/tokens`, forms, tables |
| `fireskill-specialist-trpc` | tRPC v10 (`trpc-nuxt`): procedures, per-layer routers, context, client |
| `fireskill-specialist-drizzle` | Drizzle + Postgres: per-layer schemas, barrel exports, migrations, seeds |
| `fireskill-specialist-cloudflare-workers` | Workers: bindings, `waitUntil`, KV, R2, Queues, Durable Objects, Cron, Hyperdrive |
| `fireskill-specialist-sst` | SST 4: `infra/*.ts`, secrets, stages, flags, deployment |
| `fireskill-specialist-openauth` | OpenAuth.js: issuer, KV sessions, cookies, identity management |
| `fireskill-specialist-nuxfire-layers` | Creating, registering, and composing domain layers (`config.ts`, `compose-layers`) |
| `fireskill-specialist-nuxt-authorization` | Team RBAC: `defineAbility`, `authorize`, `<Can>` component |
| `fireskill-specialist-pinia` | Pinia: stores, SSR state hydration |
| `fireskill-specialist-billing` | Stripe and Paddle: checkout, webhooks, subscriptions, and plans |

## Engineering Specialists (Stack-Agnostic)

`typescript`, `postgres`, `tailwind-css`, `software-architecture`,
`web-api-design`, `application-security`, `debugging`, `code-review`,
`performance-engineering`, `observability`, `data-modeling`,
`domain-modeling`, `prototyping`, `technical-research`, `design-system`,
`ui-design`, `ux-design`, `interface-experience`, `web-accessibility`,
`delivery-engineering`, `versioning`, `gitflow`, and
`merge-conflict-resolution`, all prefixed with `fireskill-specialist-`.

When creating or modifying user interfaces, begin with `fireskill-specialist-interface-experience`: it activates `fireskill-specialist-design-system`, audits existing UI tokens and stack conventions, structures screen questions, and routes to UX, UI, and `fireskill-specialist-nuxt-ui`. Local component and screen registrations reside in `.fireskills/INTERFACE.md`.

## How to Use

Agents load a specialist by name (`$fireskill-specialist-<name>`) whenever a task touches its technical domain; each core skill's discovery table (`skills/*/references/specialists.md`) indicates which to load. A specialist provides technical guidelines and validation criteria; it does not author specifications, advance gates, or replace canonical project files.

## License

See [LICENSE](LICENSE). Fireskills is derived from Specsfy; preserve license notices and attribution upon redistribution.

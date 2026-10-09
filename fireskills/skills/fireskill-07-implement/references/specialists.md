# Specialists for Implementation

Detect manifests and files before proposing:

- `nuxt.config.ts`, `app/pages`, `server/api` → `fireskill-specialist-nuxt`;
- `.vue` with `U*` components or `@nuxt/ui` → `fireskill-specialist-nuxt-ui`
  (mandatory prior to authoring `.vue` files);
- `layers/`, `layer.manifest.ts`, `config.ts` (`layers`) →
  `fireskill-specialist-nuxfire-layers`;
- `server/trpc/`, `trpc-nuxt`, `useTrpcClient()` → `fireskill-specialist-trpc`;
- `defineAbility`, `nuxt-authorization`, `<Can>` →
  `fireskill-specialist-nuxt-authorization`;
- `defineStore`, `@pinia/nuxt` → `fireskill-specialist-pinia`;
- `drizzle.config.ts`, `schema.ts`, `drizzle-orm` →
  `fireskill-specialist-drizzle` (with `fireskill-specialist-postgres` for SQL,
  indexes, and query tuning);
- `sst.config.ts`, `infra/*.ts`, `.env.example` → `fireskill-specialist-sst`;
- `apps/functions`, bindings (`env.AppDB`, KV, R2, Queues, Durable Objects),
  `waitUntil` → `fireskill-specialist-cloudflare-workers`;
- `@openauthjs/openauth`, `server/api/auth` → `fireskill-specialist-openauth`;
- `tailwindcss` outside `U*` components → `fireskill-specialist-tailwind-css`;
- TypeScript → `fireskill-specialist-typescript`;
- Cross-cutting risk → security, accessibility, performance, observability,
  architecture, or API design (`fireskill-specialist-application-security`,
  `-web-accessibility`, `-performance-engineering`, `-observability`,
  `-software-architecture`, `-web-api-design`).

Specialists reside in `specialists/` in this repository. If the required specialist
is not yet available to the agent, state its name, purpose, and dependencies and request
explicit user authorization before installing or copying; never install, add packages,
or execute deployments as side effects.
If the specialist is available, announce automatic transition and load it within the same conversation.

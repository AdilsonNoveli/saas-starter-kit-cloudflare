# Especialistas para implementação

Detecte manifests e arquivos antes de propor:

- `nuxt.config.ts`, `app/pages`, `server/api` → `fireskill-specialist-nuxt`;
- `.vue` com componentes `U*` ou `@nuxt/ui` → `fireskill-specialist-nuxt-ui`
  (obrigatório antes de escrever o `.vue`);
- `layers/`, `layer.manifest.ts`, `config.ts` (`layers`) →
  `fireskill-specialist-nuxfire-layers`;
- `server/trpc/`, `trpc-nuxt`, `useTrpcClient()` → `fireskill-specialist-trpc`;
- `defineAbility`, `nuxt-authorization`, `<Can>` →
  `fireskill-specialist-nuxt-authorization`;
- `defineStore`, `@pinia/nuxt` → `fireskill-specialist-pinia`;
- `drizzle.config.ts`, `schema.ts`, `drizzle-orm` →
  `fireskill-specialist-drizzle` (com `fireskill-specialist-postgres` para SQL,
  índices e tuning);
- `sst.config.ts`, `infra/*.ts`, `.env.example` → `fireskill-specialist-sst`;
- `apps/functions`, bindings (`env.AppDB`, KV, R2, Queues, Durable Objects),
  `waitUntil` → `fireskill-specialist-cloudflare-workers`;
- `@openauthjs/openauth`, `server/api/auth` → `fireskill-specialist-openauth`;
- `tailwindcss` fora de componentes `U*` → `fireskill-specialist-tailwind-css`;
- TypeScript → `fireskill-specialist-typescript`;
- risco transversal → segurança, acessibilidade, performance, observabilidade,
  arquitetura ou API (`fireskill-specialist-application-security`,
  `-web-accessibility`, `-performance-engineering`, `-observability`,
  `-software-architecture`, `-web-api-design`).

Os especialistas ficam em `specialists/` deste repositório. Se o especialista
necessário não estiver disponível para o agente, informe nome, finalidade e
dependências e peça autorização específica antes de instalar ou copiar; não
instale, não adicione pacote e não execute deploy como efeito colateral.
Se o especialista estiver disponível, anuncie a transição automática e
carregue-o na mesma conversa.

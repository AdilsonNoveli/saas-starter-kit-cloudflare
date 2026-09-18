# Fireskills Specialists

Catálogo de skills técnicas do Fireskills para o Nuxfire. O prefixo
`fireskill-specialist-` distingue contexto especializado das skills base que
executam a metodologia (`skills/`). Cada especialista é uma pasta com
`SKILL.md`, `agents/openai.yaml` e `references/`.

`catalog.json` é a fonte de descoberta: nome, descrição, categoria, tags e
`detect` (arquivos e dependências que indicam que o especialista se aplica).

## Especialistas da stack Nuxfire

Cada um foi escrito a partir do código real do repositório; as afirmações em
`references/nuxfire-*.md` citam o arquivo de evidência.

| Especialista | Cobre |
|---|---|
| `fireskill-specialist-nuxt` | Nuxt 4: páginas, layouts, middleware, plugins, Nitro, `runtimeConfig`, i18n, SSR |
| `fireskill-specialist-nuxt-ui` | `@nuxt/ui` v4: componentes, tema, `packages/tokens`, formulários, tabelas |
| `fireskill-specialist-trpc` | tRPC v10 (`trpc-nuxt`): procedures, routers por layer, contexto, cliente |
| `fireskill-specialist-drizzle` | Drizzle + Postgres: schema por layer, barrel, migrações, seed |
| `fireskill-specialist-cloudflare-workers` | Workers: bindings, `waitUntil`, KV, R2, Queues, DO, Cron, Hyperdrive |
| `fireskill-specialist-sst` | SST 4: `infra/*.ts`, secrets, stages, flags, deploy |
| `fireskill-specialist-openauth` | OpenAuth.js: emissor, sessões no KV, cookies, reset de identidade |
| `fireskill-specialist-nuxfire-layers` | Criar, registrar e compor layers (`config.ts`, `compose-layers`) |
| `fireskill-specialist-nuxt-authorization` | RBAC de equipe: `defineAbility`, `authorize`, `<Can>` |
| `fireskill-specialist-pinia` | Pinia: stores, SSR e hidratação |

## Engenharia (agnósticos de stack)

`typescript`, `postgres`, `tailwind-css`, `software-architecture`,
`web-api-design`, `application-security`, `debugging`, `code-review`,
`performance-engineering`, `observability`, `data-modeling`,
`domain-modeling`, `prototyping`, `technical-research`, `design-system`,
`ui-design`, `ux-design`, `interface-experience`, `web-accessibility`,
`delivery-engineering`, `versioning`, `gitflow` e
`merge-conflict-resolution`, todos com o prefixo `fireskill-specialist-`.

Para criar ou alterar uma interface, comece por
`fireskill-specialist-interface-experience`: ela carrega o
`fireskill-specialist-design-system`, examina o sistema e a stack existentes,
conduz as perguntas sobre telas e encaminha UX, UI e
`fireskill-specialist-nuxt-ui`. O registro local de componentes e telas fica em
`INTERFACE.md`.

## Como usar

O agente carrega um especialista pelo nome (`$fireskill-specialist-<nome>`)
quando a tarefa toca a área dele; a tabela de detecção de cada skill base
(`skills/*/references/specialists.md`) indica qual carregar. Um especialista
orienta padrões técnicos e validação; não cria specs, não avança gates e não
substitui a fonte normativa.

## Licença

Ver [LICENSE](LICENSE). O Fireskills é derivado do Specsfy; mantenha o aviso de
licença e a atribuição ao distribuir.

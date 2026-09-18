# PLANO-REFATORACAO — Fireskills → stack Nuxfire

Fonte de verdade: [`parecer-andamento.md`](parecer-andamento.md) (Parecer Geral v2).
Branch: `refactor/fireskills-nuxfire` · Baseline: commit `220d6c7` (ponto de retorno, 1678 arquivos).

## Status dos blocos

| Bloco | Descrição | Status |
|---|---|---|
| 1 | Renomear skills core `specsfy-*` → `fireskill-*` | ✅ já executado (auditado) |
| 2 | Remover especialistas obsoletos | ✅ já executado (auditado) |
| 3 | Renomear especialistas mantidos | ✅ já executado (auditado) |
| 4 | Criar 10 especialistas novos | ✅ 10/10 |
| 5 | Corrigir `Spec.md` e `fireskill-07-implement/SKILL.md` | ✅ |
| 6 | Adaptar os 4 especialistas de interface | ✅ (linhas do `SKILL.md` raiz, não só `references/`; ver achado 2) |
| 7 | Remover pastas obsoletas | ✅ já executado (auditado); sobrou `.agents/` e `.claude/` |
| 8 | Limpeza extra (decidido com o time) | 🔄 parcial — exclusões bloqueadas, ver "Pendências" |

## Log

### 2026-09-18 — Preparação
- `fireskills/` e `_docs/base-skills/` estavam **inteiros untracked** (0 arquivos rastreados). Uma branch sozinha não daria rollback.
- Criada a branch `refactor/fireskills-nuxfire` e commitado o baseline `220d6c7` só com essas duas pastas (nenhum arquivo do restante do repo foi tocado).

### 2026-09-18 — Auditoria dos Blocos 1, 2, 3 e 7 (somente leitura)

**Bloco 1 — 19 skills core presentes** (o parecer diz "18" no texto, mas lista 19 na seção 7; o disco tem 19):
`fireskill-01-inbox`, `-02-backlog`, `-03-specify`, `-04-validate`, `-05-tasks`, `-06-tdd-bdd`, `-07-implement`, `-setup`, `-documentator`, `-update-spec`, `-progress`, `-interviewer`, `-mvp-milestone-interviewer`, `-roadmap-milestone-interviewer`, `-milestone-governor`, `-data-discovery`, `-aux-stack`, `-aux-rules`, `-aux-database`.
Verificado: `name:` do frontmatter == nome da pasta em todos (0 divergências).

**Bloco 2 — 15 removidos** (o parecer lista 15 na seção 4, o pedido dizia 14): `astro`, `nextjs`, `laravel`, `laravel-package-manager`, `react`, `react-ui-components`, `reui`, `shadcn-ui`, `ansible`, `debian-server`, `docker`, `docker-swarm`, `deploy`, `redis`, `supabase`.
Verificado: nenhum existe no disco, nem como `fireskill-specialist-*` nem `specsfy-specialist-*`.

**Bloco 3 — 23 mantidos, todos `fireskill-specialist-*`:** `typescript`, `postgres`, `tailwind-css`, `debugging`, `code-review`, `software-architecture`, `web-api-design`, `application-security`, `performance-engineering`, `data-modeling`, `domain-modeling`, `prototyping`, `technical-research`, `merge-conflict-resolution`, `gitflow`, `design-system`, `ui-design`, `ux-design`, `interface-experience`, `web-accessibility`, `observability`, `versioning`, `delivery-engineering`.
Verificado: contagem 23/23; `catalog.json` sem nenhuma ocorrência de "specsfy".

**Bloco 7:** `cli/ brand/ example/ specsfy/ tests/ scripts/ .github/ .ebook/ .pdf/` — todos ausentes.
Sobras não listadas no parecer: `.agents/skills/specsfy-monorepo-documentator` e `.claude/skills/specsfy-monorepo-documentator` → vão para o Bloco 8.

### Achados da auditoria (divergências com o parecer)

1. **Não existe `fireskills/SKILL.md`** — a seção 7 do parecer o lista ("fireskills overview"). Precisa ser criado ou removido do alvo. *(decisão pendente)*
2. **Bloco 6 contradiz o parecer.** A seção 5 diz que o `SKILL.md` raiz dos 4 especialistas de interface é "agnóstico" e só as `references/` precisam de reescrita. A medição mostra o oposto:
   - `references/` dos 4 especialistas: **0** ocorrências de shadcn/reui/react.
   - `SKILL.md` raiz: **todas** as ocorrências — `design-system` (7 linhas: 13, 102-103, 149, 164, 190, 207), `ui-design` (16-17, 56-57, 120-121, 127, 135, 139), `ux-design` (100), `interface-experience` (53-56, 110-111).
   - Várias são **links quebrados** para especialistas já removidos (`$fireskill-specialist-react-ui-components`, `-reui`, `-shadcn-ui`, `-react`).
   - Seguir a regra "não reescrever o SKILL.md raiz" deixaria o Bloco 6 sem efeito e os links quebrados. *(decisão pendente antes do Bloco 6)*
3. **Contagens:** 15 removidos (não 14) e 19 skills core (não 18). As substituições do `Spec.md` estão na seção **5** do parecer (não na 3).
4. **Stripe:** a seção 6 sugere extrair `stripe-best-practices` como especialista, mas ele não está entre os 10 da seção 4/7, e Stripe + Paddle estão ativos (`config.ts:74,76`). Fora do escopo por ora. *(decisão pendente)*

### 2026-09-18 — Bloco 4.1 `fireskill-specialist-nuxt-ui` ✅ criado

Criado (17 arquivos) em `specialists/fireskill-specialist-nuxt-ui/`:
- `SKILL.md` — **escrito do zero** (frontmatter → quando usar → fluxo → roteamento → regras → antipadrões → validação → relacionadas). Não é cópia do `.agents/skills/nuxt-ui/SKILL.md`: o original cita Laravel/Inertia/AdonisJS/Vite/pnpm, que não existem no Nuxfire.
- `references/` — 15 arquivos copiados de `.agents/skills/nuxt-ui/references/` (components, guidelines ×4, layouts ×5, recipes ×4), só com `pnpm add/i` → `bun add`.
- `references/nuxfire-real.md` — **novo**, cada fato com arquivo de evidência (cadeia de CSS, `packages/tokens`, `enterpriseTableUi`, layout de dashboard, modal+form, `ConfirmDialog`, contagem de `<U*>` em uso, e o que NÃO está em uso).
- `agents/openai.yaml` — formato dos demais especialistas, nome `Fireskill`.

Grep de vazamento (`shadcn|react|laravel|docker|pnpm|inertia|adonis|reui`, palavra inteira): **0**. (Ocorrências de `reactive` são a API do Vue, não React.)

Correções ao parecer encontradas ao verificar o código:
- Parecer §1 diz que `useOverlay()` está "em uso real" no Nuxfire: **falso** — 0 usos em `layers/` e `apps/app/app/`. Só `defineShortcuts` (`use-dashboard.ts`) e `useToast` estão em uso. A confirmação usa um `ConfirmDialog` próprio (`useNotification().confirm`).
- Versão instalada de `@nuxt/ui` é **4.11.0** (o `package.json` pede `^4.8.1`).
- Servidor MCP do Nuxt UI (`ui.nuxt.com/mcp`) não está configurado em nenhum arquivo do repo.
- `layouts/chat.md`, `editor.md` e `docs.md` da skill original dependem de pacotes ausentes do projeto (AI SDK, TipTap, conteúdo Markdown) — mantidos, mas sinalizados no `SKILL.md`.
- **`specialists/catalog.json` já traz as 10 entradas novas** (foram adicionadas antes). Falta apenas conferir que cada uma bate com o que for criado; `specialists/README.md` ainda não lista nenhuma.
- Todos os `agents/openai.yaml` dos especialistas antigos ainda dizem "Specsfy" e `$specsfy-specialist-*` → Bloco 8.

### 2026-09-18 — Bloco 4.2 a 4.10 ✅ criados (execução contínua, autorizada pelo time: "segue com tudo e só comita no final")

Cada especialista tem `SKILL.md` (frontmatter → quando usar → fluxo → regras → antipadrões → validação → relacionadas), `agents/openai.yaml` e `references/` com um `nuxfire-*.md` cujas afirmações citam arquivo de evidência lido no código real.

| # | Especialista | Arquivos | Fonte real usada |
|---|---|---|---|
| 4.2 | `cloudflare-workers` | 52 | `infra/*.ts`, `apps/functions/src/*`, `server/utils/db.ts`, `server/plugins/database-binding.ts` + 49 arquivos reaproveitados de `_docs/base-skills/cloudflare/skills/{workers-best-practices,durable-objects,wrangler}` e 8 produtos de `cloudflare/references` (kv, r2, queues, hyperdrive, cron-triggers, do-storage, observability, bindings) |
| 4.3 | `trpc` | 4 | `apps/app/server/trpc/*`, `layers/*/server/trpc/*`, `use-trpc-client.ts`, `[trpc].ts` |
| 4.4 | `drizzle` | 4 | `apps/functions/src/database/*`, `drizzle.config.ts`, schemas de layers, `MIGRATIONS.md`, seed |
| 4.5 | `sst` | 4 | `sst.config.ts`, `config.ts`, `infra/*.ts`, `bunfig.toml`, `_docs/AGENTS.md` |
| 4.6 | `openauth` | 3 | `apps/functions/src/{auth,subjects,rate-limit}.ts`, `apps/app/server/utils/auth.ts`, `server/api/auth/callback.ts`, `infra/auth.ts` |
| 4.7 | `nuxfire-layers` | 4 | `scripts/compose-layers.ts`, `packages/manifest`, `layers/{kanban,teams}` |
| 4.8 | `nuxt-authorization` | 4 | `layers/*/shared/utils/abilities.ts`, `permissions.ts`, `seed/data.ts`, plugins `authorization-resolver` |
| 4.9 | `pinia` | 3 | as 3 stores reais (`use-teams-store`, `use-invite-store`, `use-notifications-store`) |
| 4.10 | `nuxt` | 4 | `apps/app/nuxt.config.ts`, middleware, plugins, `server/`, `csp.ts`, `clean-nuxt-build-cache.ts` |

Verificação por especialista: `name:` == pasta (10/10); zero referências `$fireskill-*` quebradas; grep `shadcn|react|laravel|docker` (palavra inteira) = **0**; grep por substring "react" (sem `-w`) = 5 hits, **todos** a palavra "reactive" (API do Vue, falso positivo).

Correções ao parecer encontradas ao ler o código (além das do 4.1):
- Parecer §6 diz que `_docs/AGENTS.md` tem "176 linhas": tem 176 linhas, mas **57 KB** (linhas muito longas). É o documento mais denso do repo e alimentou 6 dos 10 especialistas.
- Parecer §4 aponta `apps/functions/src/database/` como base do drizzle: **correto**, mas o schema real está distribuído por layer (`layers/*/server/database/schema.ts`), agregado por um barrel — o especialista documenta isso.
- Parecer §3 diz "Payments: Stripe + Paddle (ambos ativos) `config.ts:74,76`": confirmado (`flags.stripe/paddle: true`).
- **Discrepância no código (não corrigida, fora do escopo):** `apps/app/server/trpc/trpc.ts` afirma em comentário que "observability is enabled on this worker", mas nenhum arquivo de `infra/` configura observabilidade nos Workers. Registrado como aviso no especialista `cloudflare-workers` (§6).
- **Observação no código:** `apps/functions/src/{jobs-consumer,dlq-consumer,cron}.ts` criam um cliente `postgres.js` por invocação e não chamam `.end()`; o app faz isso via `closeDB`. Documentado no especialista (§4.4), sem alterar código.

### 2026-09-18 — Blocos 5, 6 e 8 (execução contínua)

**Decisões tomadas por instrução do time** ("segue com absolutamente tudo e só comita no final"): o Bloco 6 editou só as linhas afetadas do `SKILL.md` raiz (não os reescreveu); `fireskills/SKILL.md` foi criado como overview; Stripe ficou de fora; **um único commit no fim**.

**Bloco 5 — `Spec.md` e `fireskill-07-implement`**
- `skills/Spec.md`: `DataGrid` → `UTable` + `enterpriseTableUi`; "não introduza React/Tailwind/shadcn" → base Vue 3 + `@nuxt/ui`; parágrafo "Em projeto React… shadcn/ui + ReUI… Laravel com React" → Vue SFC + `@nuxt/ui`; orquestração `$…-react` → `$fireskill-specialist-nuxt-ui` (+ `-nuxt`); proteção do banco (Laravel `.env.testing`) → banco de teste separado dos secrets `DATABASE_*`, e a lista de comandos recusados ganhou `drizzle-kit push --force` e `drizzle-kit drop`; regra "PHP usa Pest" → Vitest.
- **Já estava feito antes deste trabalho:** a seção "Contrato de runtime Cloudflare Workers" do `Spec.md` (o parecer §5 dizia "Laravel"). Verificado e mantido.
- `skills/fireskill-07-implement/SKILL.md`: bloco Laravel/Composer (pacotes) → `package.json`/`bun.lock`; proteção do banco (Laravel) → banco de teste; `UTable (ou DataGrid)` → `UTable` com `enterpriseTableUi`; a lista de recusa manteve `prisma migrate reset` e ganhou `drizzle-kit push --force`/`drop`. Já estavam certos: `@nuxt/ui`/Vue SFC e `$fireskill-specialist-nuxt-ui` obrigatório.
- `skills/fireskill-07-implement/references/specialists.md`: tabela de detecção reescrita para a stack real (apontava para 10 especialistas removidos).

**Bloco 6 — os 4 especialistas de interface** (`design-system`, `ui-design`, `ux-design`, `interface-experience`): removidas todas as menções a shadcn/ReUI/React/TSX/`DataGrid`/Laravel e os links para especialistas removidos, apontando para `@nuxt/ui`, `UTable`/`enterpriseTableUi`, `UBreadcrumb` e `fireskill-specialist-nuxt-ui`/`-nuxt`. Grep nos 4 (todos os arquivos, inclusive `references/`): **0** ocorrências.

**Bloco 8 — limpeza**
- 357 tokens `specsfy-<skill|specialist>` → `fireskill-…` em 85 arquivos; 42 `display_name: "Specsfy - …"` → `"Fireskill - …"` nos `agents/openai.yaml`; 14 páginas `docs/user/skills/specsfy-*.md` renomeadas para `fireskill-*.md`.
- Referências a especialistas removidos: 20 bullets de "Skills relacionadas" apagados e ~25 trechos reescritos apontando para os equivalentes do Nuxfire, nos 23 especialistas mantidos e nas skills 02–06 e `fireskill-setup` (tabela de detecção e núcleo do setup: `shadcn-ui` + `reui` → `nuxt-ui`).
- `tailwind-css` (referência ao `theme.css` com `@theme static`), `versioning` (deploy/Docker/Ansible → `sst`/`delivery-engineering`, com nota de que não há imagem OCI), `typescript`, `postgres`, `application-security`, `observability`, `performance-engineering`, `delivery-engineering`, `data-modeling`, `merge-conflict-resolution`: ajustados.
- `specialists/README.md` e `specialists/AGENTS.md`: **reescritos** (eram do catálogo Specsfy: CLI, `./deploy`, Swarm, `tests/`, `templates/`).
- `skills/README.md`: removidos logo e links para `brand/`, `specsfy/`, `cli/` (não existem mais). `skills/fireskill-documentator/*`: Laravel/Composer → Nuxt/Bun.
- `fireskills/README.md`: tabela de skills completada (faltavam 4 das 19) e `.fireskills/` → `.specsfy/` (o que os scripts realmente usam). `fireskills/SKILL.md` **criado**.
- `skills/fireskill-setup/scripts/check_database_safety.mjs`: **bug de segurança corrigido** — rodado contra o Nuxfire, ele classificava `drizzle-kit push --force` como `SAFE`; agora retorna `IGNORED` (uma regex adicionada). Testado: `push --force` → IGNORED; `bun run test` e `drizzle-kit generate` → SAFE.
- Restaurados finais de linha (LF) dos arquivos que o Python reescreveu com CRLF.

## Pendências — precisam de decisão ou ação do time

1. ~~**BLOQUEIO FUNCIONAL: `skills/templates/` não existe.**~~ **RESOLVIDO (3º commit):** os 11 templates e o exemplo vieram de `_docs/base-skills/specsfy/skills/`, foram adaptados à stack (Vue/`@nuxt/ui`/Vitest/Drizzle; os 2 validadores que liam o título "Blocos React…" agora leem "Componentes Vue e @nuxt/ui selecionados") e o `setup` rodou de verdade no repositório. Texto original: Os scripts de `fireskill-01-inbox`, `-02-backlog`, `-03-specify` e `fireskill-setup` leem `templates/{Inbox,Backlog,Spec,Tasks,Project,Stack,Rules,Database,Interface,UserProfile}.md` (e o design-system cita `DESIGNSYSTEM.MD`) e falham com "template não encontrado … execute `specsfy install`". Não há cópia no baseline nem em outro lugar do repo. Não foram recriados: precisam bater com o que os validadores esperam. **Fonte provável:** `skills/templates/` do repositório upstream `promovaweb/specsfy` (baixar exige autorização).
2. ~~**BLOQUEIO FUNCIONAL: a CLI `specsfy` foi removida (Bloco 7), mas o método a chama:**~~ **RESOLVIDO com a opção B (3º commit):** motor do fluxo restaurado em `fireskills/cli/` (comando `fireskill`; ver `cli/README.md`). Texto original: `specsfy transition <id> in-progress|review`, `specsfy skills detect`, `specsfy install`, `npx skills add …` — 85 ocorrências em 32 arquivos (`fireskill-07-implement`, `-setup`, `-05-tasks`, docs). Sem substituto definido, esses passos não executam.
3. ~~Sem `test:tdd`~~ **(corrigido em 2026-09-18, 2º commit):** o Nuxfire já tem testes (Vitest, 7 arquivos, 131 testes passando com `bun run test`). Nenhum script do fireskills exige o nome `test:tdd` (só texto em prosa, herdado da CLI `specsfy test`); as skills 04/05/06 e o `skills/README.md` agora mandam usar `bun run test`. Nada a criar no `package.json`.
4. **Obsoletos — MOVIDOS (2026-09-18, 2º commit) para `fireskills/obsoletos/`**, mantendo os caminhos originais (23 arquivos); nada foi apagado. Para excluir de vez: `rm -r fireskills/obsoletos`. Conteúdo:
   - `docs/user/laravel.md`, `docs/user/astro.md`, `docs/user/nextjs.md`, `docs/user/deploy.md`, `docs/user/deploy-operations.md`, `docs/user/deploy-vault.md`, `docs/user/cli.md`, `docs/user/cli-reference.md`, `docs/user/installation.md`, `docs/user/specialists.md`, `docs/user/reading-order.txt`, `docs/user/assets/cli/` (4 PNGs), `docs/develop/cli.md`, `docs/develop/context/flows/cli-release.md`;
   - `Makefile` (todos os alvos apontam para `brand/`, `.ebook/`, `.pdf/` e `scripts/check_version_alignment.py`, já removidos);
   - `.agents/skills/specsfy-monorepo-documentator/` e `.claude/skills/specsfy-monorepo-documentator/` (documentam o monorepo upstream `promovaweb/specsfy`, "não use em projetos consumidores").
4b. **A CLI tinha dois papéis, e o fireskills perdeu os dois.** (a) *Motor de fluxo*: `specsfy transition`, `migrate`, `milestones sync`, `effort`, `progress`, `test`. (b) *Instalador*: copiava `skills/` para `.agents/skills/` do projeto e os `templates/` para `.specsfy/templates/`, e instalava especialistas (`skills detect/install`). Hoje: só existe `.agents/skills/nuxt-ui` na raiz do Nuxfire (as skills `fireskill-*` estão em `fireskills/skills/`, mas os scripts as chamam por `.agents/skills/fireskill-*/scripts/…`); não há `specs/` nem `.specsfy/`; `AGENTS.md`/`CLAUDE.md` da raiz não mencionam o fireskills. Decisão pendente (ver resposta ao time): restaurar a CLI do upstream, reimplementar só o motor de fluxo, ou ligar as skills por outro caminho.
5. **Renomear o diretório de contexto `.specsfy/` → `.fireskills/`?** Hoje há ~260 referências em 76 arquivos e os scripts usam `.specsfy/`; o parecer §6 também diz `.specsfy/`. Mantido. Idem para os tokens de protocolo `SPECSFY:` (marcador de teste), `Formato: Specsfy/2.0` e `specsfy:evidence`, que os validadores parseiam.
6. **`docs/` (16 páginas restantes) ainda é prosa upstream do Specsfy** (CLI, instalação, Laravel): `docs/user/{README,advanced-usage,getting-started,project-context,system-documentation,method*,…}`, `docs/develop/*`. Só os tokens de nome de skill foram renomeados; o conteúdo precisa de reescrita ou exclusão pelo time (15 links quebrados para `cli/`, `brand/`, `ebook/`…).
7. **Scripts detectores multi-stack** (`inspect_project.mjs`, `inspect_interface.mjs`, `build_documentation.mjs`, `update_stack.mjs`, `validate_*_tasks.mjs`, `semver.mjs`): têm lógica para Laravel/React/Next/Docker (158 ocorrências). Não foram alterados e **não foi verificado** se detectam Nuxt/Bun corretamente (ex.: o documentador inventaria `package-lock.json`; o Nuxfire usa `bun.lock`).
8. **`fireskill-specialist-versioning`** é centrado em `SEMVER` + tags de imagem Docker/OCI; o Nuxfire não publica imagens nem tem arquivo `SEMVER`. O parecer o classificou "Agnóstico". Foi ajustado só o texto; vale decidir entre reescrever ou remover.
9. **`VERSION` (0.23.0)** é a versão do Specsfy; sem uso agora que `.ebook/` e o alinhamento de versão foram removidos.
10. **Stripe** (parecer §6) continua fora dos 10 especialistas; Stripe + Paddle estão ativos.
11. **Discrepâncias de código encontradas (não corrigidas):** comentário "observability is enabled" em `apps/app/server/trpc/trpc.ts` sem configuração correspondente em `infra/`; consumers `jobs-consumer`/`dlq-consumer`/`cron` não fecham o cliente Postgres (ver 4.4); `_docs/template-kanban/app/components/admin/DashboardPainelOperacional.vue` ainda cita `shadcn` (fora de `apps/app`, `layers`, `packages`); `vue` e `vue-router` em `latest` no `apps/app/package.json`.

## Verificação final (parecer §8)

- `grep -i shadcn` em `apps/app`, `layers`, `packages` (sem `node_modules/.nuxt/dist/.output`): **0 resultados**.
- Fora de `fireskills/` e `_docs/base-skills/`, o único hit é `_docs/template-kanban/app/components/admin/DashboardPainelOperacional.vue`.
- 52 `SKILL.md` (19 skills + 33 especialistas): `name` == pasta em todos; `catalog.json` 33/33 == pastas; 0 referências `fireskill-*` quebradas fora dos arquivos de `docs/` listados na pendência 6 (4 nomes, 7 ocorrências).
- Vazamento nos 10 especialistas novos (`shadcn|react|laravel|docker`, palavra inteira): **0**; por substring "react": 5 hits, todos "reactive" (API do Vue).
- Vazamento residual em `fireskills/` (substring, sem `parecer`/`PLANO`): ~285 nos candidatos a exclusão, ~158 em scripts, ~104 na prosa de `docs/`, e o restante em `AGENTS.md`/`README.md` da raiz (as afirmações deliberadas "ZERO X"), `.gitignore`, `versioning` e negações em `Spec.md`.

## Bloco 4 — Plano (10 especialistas novos, um por vez)

Formato alvo (parecer §2): `SKILL.md` (frontmatter `name`/`description` → quando usar → regras/anti-patterns → validação → referências) + `references/`.
Regra: conteúdo só do que o código real confirma; após cada um, `grep -iE "shadcn|react|laravel|docker"` no especialista.

| # | Ação | Origem (evidência) | Destino |
|---|---|---|---|
| 4.1 ✅ | Criar | `.agents/skills/nuxt-ui/` (15 arquivos) — reaproveitar, adaptar nome/frontmatter | `specialists/fireskill-specialist-nuxt-ui/` |
| 4.2 ✅ | Criar | `_docs/base-skills/cloudflare/skills/{cloudflare,workers-best-practices,durable-objects,wrangler}` + `infra/*.ts` | `specialists/fireskill-specialist-cloudflare-workers/` |
| 4.3 ✅ | Criar | `apps/app/server/trpc/{trpc,context}.ts`, `routers/{index,account,public}.ts`, `routers/.composition/layer-routers.ts` | `specialists/fireskill-specialist-trpc/` |
| 4.4 ✅ | Criar | `apps/functions/src/database/{core-schema,schema}.ts`, `migrations/`, `MIGRATIONS.md`, `seed/` | `specialists/fireskill-specialist-drizzle/` |
| 4.5 ✅ | Criar | `infra/*.ts` (app, auth, cron, database, dns, emails, jobs, secret, web, websockets), `sst.config.ts`, `_docs/AGENTS.md` | `specialists/fireskill-specialist-sst/` |
| 4.6 ✅ | Criar | `apps/functions/src/auth.ts`, `infra/auth.ts` | `specialists/fireskill-specialist-openauth/` |
| 4.7 ✅ | Criar | `_docs/AGENTS.md`, `config.ts`, `scripts/compose-layers.ts`, `nuxt.config.ts` de cada layer | `specialists/fireskill-specialist-nuxfire-layers/` |
| 4.8 ✅ | Criar | `layers/{teams,billing,kanban}/shared/utils/abilities.ts` (+ testes) | `specialists/fireskill-specialist-nuxt-authorization/` |
| 4.9 ✅ | Criar | `layers/{teams,notifications}/app/composables/use-*-store.ts` (3 stores reais) | `specialists/fireskill-specialist-pinia/` |
| 4.10 ✅ | Criar | `apps/app/nuxt.config.ts`, `app/`, `layers/*/app/`, `_docs/AGENTS.md` | `specialists/fireskill-specialist-nuxt/` |

Cada criação também deve registrar a entrada em `specialists/catalog.json` e em `specialists/README.md`. *(a confirmar no plano de cada especialista)*

## Bloco 8 — Limpeza extra (aprovado, plano detalhado antes de executar)

Escopo prévio: 180 arquivos ainda citam "specsfy" e 78 têm termos legados. Mais pesados: `docs/user/laravel.md`, `docs/user/deploy*.md`, `docs/user/cli*.md`, `skills/fireskill-setup/SKILL.md` (22 hits), `skills/Spec.md`, `skills/fireskill-05-tasks/SKILL.md`, `.agents/`, `.claude/`, `Makefile`, `specialists/fireskill-specialist-versioning/scripts/semver.mjs`.

---

## Changelog final (arquivo por arquivo, gerado do `git diff` contra o baseline `220d6c7`)

Legenda: criado / editado / renomeado. Nenhum arquivo foi removido nesta refatoração além dos 14 renomeados (a remoção de obsoletos das seções 1–3 e 7 já estava feita antes; o que ficou bloqueado está em Pendências).

- editado: `.agents/skills/specsfy-monorepo-documentator/SKILL.md`
- editado: `README.md`
- criado: `SKILL.md`
- editado: `docs/develop/context/architecture/modules.md`
- editado: `docs/develop/context/data/persistence.md`
- editado: `docs/develop/context/design/README.md`
- editado: `docs/develop/context/engineering/packages.md`
- editado: `docs/develop/context/engineering/testing.md`
- editado: `docs/develop/documentation.md`
- editado: `docs/develop/methodology.md`
- editado: `docs/develop/milestones.md`
- editado: `docs/develop/skills.md`
- editado: `docs/user/README.md`
- editado: `docs/user/advanced-usage.md`
- editado: `docs/user/backlog.md`
- editado: `docs/user/design-system.md`
- editado: `docs/user/getting-started.md`
- editado: `docs/user/inbox.md`
- editado: `docs/user/method.md`
- editado: `docs/user/milestones.md`
- editado: `docs/user/project-context.md`
- editado: `docs/user/skills/README.md`
- renomeado: `docs/user/skills/specsfy-01-inbox.md` → `docs/user/skills/fireskill-01-inbox.md`
- renomeado: `docs/user/skills/specsfy-02-backlog.md` → `docs/user/skills/fireskill-02-backlog.md`
- renomeado: `docs/user/skills/specsfy-03-specify.md` → `docs/user/skills/fireskill-03-specify.md`
- renomeado: `docs/user/skills/specsfy-04-validate.md` → `docs/user/skills/fireskill-04-validate.md`
- renomeado: `docs/user/skills/specsfy-05-tasks.md` → `docs/user/skills/fireskill-05-tasks.md`
- renomeado: `docs/user/skills/specsfy-06-tdd-bdd.md` → `docs/user/skills/fireskill-06-tdd-bdd.md`
- renomeado: `docs/user/skills/specsfy-07-implement.md` → `docs/user/skills/fireskill-07-implement.md`
- renomeado: `docs/user/skills/specsfy-data-discovery.md` → `docs/user/skills/fireskill-data-discovery.md`
- renomeado: `docs/user/skills/specsfy-interviewer.md` → `docs/user/skills/fireskill-interviewer.md`
- renomeado: `docs/user/skills/specsfy-milestone-governor.md` → `docs/user/skills/fireskill-milestone-governor.md`
- renomeado: `docs/user/skills/specsfy-mvp-milestone-interviewer.md` → `docs/user/skills/fireskill-mvp-milestone-interviewer.md`
- renomeado: `docs/user/skills/specsfy-progress.md` → `docs/user/skills/fireskill-progress.md`
- renomeado: `docs/user/skills/specsfy-roadmap-milestone-interviewer.md` → `docs/user/skills/fireskill-roadmap-milestone-interviewer.md`
- renomeado: `docs/user/skills/specsfy-update-spec.md` → `docs/user/skills/fireskill-update-spec.md`
- editado: `docs/user/system-documentation.md`
- editado: `docs/user/update-spec.md`
- editado: `skills/README.md`
- editado: `skills/Spec.md`
- editado: `skills/fireskill-01-inbox/agents/openai.yaml`
- editado: `skills/fireskill-02-backlog/SKILL.md`
- editado: `skills/fireskill-02-backlog/agents/openai.yaml`
- editado: `skills/fireskill-02-backlog/references/specialists.md`
- editado: `skills/fireskill-03-specify/SKILL.md`
- editado: `skills/fireskill-03-specify/agents/openai.yaml`
- editado: `skills/fireskill-03-specify/references/specialists.md`
- editado: `skills/fireskill-04-validate/SKILL.md`
- editado: `skills/fireskill-04-validate/agents/openai.yaml`
- editado: `skills/fireskill-04-validate/references/specialists.md`
- editado: `skills/fireskill-04-validate/scripts/verify_repo.mjs`
- editado: `skills/fireskill-05-tasks/SKILL.md`
- editado: `skills/fireskill-05-tasks/agents/openai.yaml`
- editado: `skills/fireskill-05-tasks/references/specialists.md`
- editado: `skills/fireskill-05-tasks/scripts/validate_tasks.mjs`
- editado: `skills/fireskill-06-tdd-bdd/SKILL.md`
- editado: `skills/fireskill-06-tdd-bdd/agents/openai.yaml`
- editado: `skills/fireskill-06-tdd-bdd/references/specialists.md`
- editado: `skills/fireskill-07-implement/SKILL.md`
- editado: `skills/fireskill-07-implement/agents/openai.yaml`
- editado: `skills/fireskill-07-implement/references/specialists.md`
- editado: `skills/fireskill-aux-database/agents/openai.yaml`
- editado: `skills/fireskill-aux-rules/agents/openai.yaml`
- editado: `skills/fireskill-aux-stack/SKILL.md`
- editado: `skills/fireskill-aux-stack/agents/openai.yaml`
- editado: `skills/fireskill-data-discovery/agents/openai.yaml`
- editado: `skills/fireskill-documentator/SKILL.md`
- editado: `skills/fireskill-documentator/agents/openai.yaml`
- editado: `skills/fireskill-documentator/references/documentation-standard.md`
- editado: `skills/fireskill-interviewer/agents/openai.yaml`
- editado: `skills/fireskill-milestone-governor/agents/openai.yaml`
- editado: `skills/fireskill-mvp-milestone-interviewer/agents/openai.yaml`
- editado: `skills/fireskill-mvp-milestone-interviewer/scripts/importar_mvp.mjs`
- editado: `skills/fireskill-progress/agents/openai.yaml`
- editado: `skills/fireskill-progress/references/specialists.md`
- editado: `skills/fireskill-progress/scripts/progress.mjs`
- editado: `skills/fireskill-roadmap-milestone-interviewer/agents/openai.yaml`
- editado: `skills/fireskill-setup/SKILL.md`
- editado: `skills/fireskill-setup/agents/openai.yaml`
- editado: `skills/fireskill-setup/scripts/check_database_safety.mjs`
- editado: `skills/fireskill-setup/scripts/monitor_context.mjs`
- editado: `skills/fireskill-setup/scripts/setup_context.mjs`
- editado: `skills/fireskill-setup/scripts/sync_speckit_context.mjs`
- editado: `skills/fireskill-update-spec/agents/openai.yaml`
- editado: `specialists/AGENTS.md`
- editado: `specialists/README.md`
- editado: `specialists/fireskill-specialist-application-security/SKILL.md`
- editado: `specialists/fireskill-specialist-application-security/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-cloudflare-workers/SKILL.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/best-practices/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/best-practices/platform-apis.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/best-practices/runtime-patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/durable-objects/index.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/durable-objects/rules.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/durable-objects/testing.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/durable-objects/workers.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/nuxfire-workers.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/bindings/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/bindings/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/bindings/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/bindings/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/bindings/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/cron-triggers/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/cron-triggers/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/cron-triggers/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/cron-triggers/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/cron-triggers/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/do-storage/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/do-storage/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/do-storage/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/do-storage/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/do-storage/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/do-storage/testing.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/hyperdrive/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/hyperdrive/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/hyperdrive/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/hyperdrive/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/hyperdrive/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/kv/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/kv/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/kv/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/kv/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/kv/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/observability/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/observability/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/observability/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/observability/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/observability/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/queues/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/queues/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/queues/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/queues/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/queues/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/r2/README.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/r2/api.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/r2/configuration.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/r2/gotchas.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/products/r2/patterns.md`
- criado: `specialists/fireskill-specialist-cloudflare-workers/references/wrangler.md`
- editado: `specialists/fireskill-specialist-code-review/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-data-modeling/SKILL.md`
- editado: `specialists/fireskill-specialist-data-modeling/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-data-modeling/references/standards.md`
- editado: `specialists/fireskill-specialist-debugging/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-delivery-engineering/SKILL.md`
- editado: `specialists/fireskill-specialist-delivery-engineering/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-design-system/SKILL.md`
- editado: `specialists/fireskill-specialist-design-system/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-design-system/references/standards.md`
- editado: `specialists/fireskill-specialist-domain-modeling/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-drizzle/SKILL.md`
- criado: `specialists/fireskill-specialist-drizzle/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-drizzle/references/new-table-recipe.md`
- criado: `specialists/fireskill-specialist-drizzle/references/nuxfire-drizzle.md`
- editado: `specialists/fireskill-specialist-gitflow/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-interface-experience/SKILL.md`
- editado: `specialists/fireskill-specialist-interface-experience/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-merge-conflict-resolution/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-merge-conflict-resolution/references/standards.md`
- criado: `specialists/fireskill-specialist-nuxfire-layers/SKILL.md`
- criado: `specialists/fireskill-specialist-nuxfire-layers/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-nuxfire-layers/references/new-layer-recipe.md`
- criado: `specialists/fireskill-specialist-nuxfire-layers/references/nuxfire-layers.md`
- criado: `specialists/fireskill-specialist-nuxt-authorization/SKILL.md`
- criado: `specialists/fireskill-specialist-nuxt-authorization/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-nuxt-authorization/references/new-ability-recipe.md`
- criado: `specialists/fireskill-specialist-nuxt-authorization/references/nuxfire-authorization.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/SKILL.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/components.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/guidelines/component-selection.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/guidelines/conventions.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/guidelines/design-system.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/guidelines/forms.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/layouts/chat.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/layouts/dashboard.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/layouts/docs.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/layouts/editor.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/layouts/landing.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/nuxfire-real.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/recipes/auth.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/recipes/data-tables.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/recipes/navigation.md`
- criado: `specialists/fireskill-specialist-nuxt-ui/references/recipes/overlays.md`
- criado: `specialists/fireskill-specialist-nuxt/SKILL.md`
- criado: `specialists/fireskill-specialist-nuxt/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-nuxt/references/nuxfire-nuxt.md`
- criado: `specialists/fireskill-specialist-nuxt/references/recipes.md`
- editado: `specialists/fireskill-specialist-observability/SKILL.md`
- editado: `specialists/fireskill-specialist-observability/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-openauth/SKILL.md`
- criado: `specialists/fireskill-specialist-openauth/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-openauth/references/nuxfire-openauth.md`
- editado: `specialists/fireskill-specialist-performance-engineering/SKILL.md`
- editado: `specialists/fireskill-specialist-performance-engineering/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-performance-engineering/references/standards.md`
- criado: `specialists/fireskill-specialist-pinia/SKILL.md`
- criado: `specialists/fireskill-specialist-pinia/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-pinia/references/nuxfire-pinia.md`
- editado: `specialists/fireskill-specialist-postgres/SKILL.md`
- editado: `specialists/fireskill-specialist-postgres/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-prototyping/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-software-architecture/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-sst/SKILL.md`
- criado: `specialists/fireskill-specialist-sst/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-sst/references/nuxfire-sst.md`
- criado: `specialists/fireskill-specialist-sst/references/recipes.md`
- editado: `specialists/fireskill-specialist-tailwind-css/SKILL.md`
- editado: `specialists/fireskill-specialist-tailwind-css/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-tailwind-css/references/standards.md`
- editado: `specialists/fireskill-specialist-technical-research/SKILL.md`
- editado: `specialists/fireskill-specialist-technical-research/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-trpc/SKILL.md`
- criado: `specialists/fireskill-specialist-trpc/agents/openai.yaml`
- criado: `specialists/fireskill-specialist-trpc/references/new-router-recipe.md`
- criado: `specialists/fireskill-specialist-trpc/references/nuxfire-trpc.md`
- editado: `specialists/fireskill-specialist-typescript/SKILL.md`
- editado: `specialists/fireskill-specialist-typescript/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-ui-design/SKILL.md`
- editado: `specialists/fireskill-specialist-ui-design/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-ui-design/references/standards.md`
- editado: `specialists/fireskill-specialist-ux-design/SKILL.md`
- editado: `specialists/fireskill-specialist-ux-design/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-versioning/SKILL.md`
- editado: `specialists/fireskill-specialist-versioning/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-versioning/references/standards.md`
- editado: `specialists/fireskill-specialist-web-accessibility/SKILL.md`
- editado: `specialists/fireskill-specialist-web-accessibility/agents/openai.yaml`
- editado: `specialists/fireskill-specialist-web-api-design/SKILL.md`
- editado: `specialists/fireskill-specialist-web-api-design/agents/openai.yaml`

## 3º commit — CLI (opção B), templates, migração de `_docs/docs` e AGENTS.md raiz

- **CLI `fireskill`** (`fireskills/cli/`): trouxe `filesystem`, `lifecycle`, `milestones`, `progress`, `backlog`, `config`, `clickupfy` do upstream; `cli.ts` reduzido a `transition`, `migrate`, `effort`, `progress`, `milestones sync`, `test`, `config`; `project-testing.ts` **reescrito** (o original só detectava Laravel + Pest; agora executa `bun run test`). Sem instalador, catálogo, atualizador nem TUI. **Verificado:** `tsc` limpo; 20 testes do upstream passando; smoke em projeto de teste (`progress`, `transition draft→defined` moveu a pasta e atualizou `Status`). Script `fireskill` adicionado ao `package.json` da raiz.
- **Templates e exemplo** em `skills/templates/` e `skills/examples/`, adaptados (0 termos de Laravel/React/shadcn/Pest/DataGrid).
- **Caminhos**: `.agents/skills/…` → `fireskills/skills/…` em 37 pontos de texto e 10 nos scripts; `.specsfy/Spec.md` → `fireskills/skills/Spec.md` em 18 (contrato lido direto, sem cópia); comandos `specsfy transition|milestones sync|…` → `bun run fireskill …` (38 pontos); referências a `specsfy install`/`skills detect`/`doctor`/`npx skills add` reescritas (especialistas já estão no repositório).
- **Bugs de scripts encontrados e corrigidos:** `setup_context.mjs` quebrava no Windows (`new URL(import.meta.url).pathname` → `fileURLToPath`) e não achava os templates; `update_database.mjs`, `inspect_project.mjs`, `build_documentation.mjs` varriam `_docs/` (achou um schema Supabase de um template de terceiros) e `fireskills/`; `monitor_context.mjs` tratava mudanças em `_docs/` e `fireskills/` como mudanças do produto; `check_traceability.mjs` agora ignora `fireskills/` e `_docs/`; o documentador classificava todo `.vue` de `apps/app/app/` como "Página".
- **Detecção de stack para Nuxt**: `setup_context.mjs` e `update_stack.mjs` agora leem as dependências de `apps/*`, `packages/*`, `layers/*` e reconhecem Nuxt, `@nuxt/ui`, tRPC, Drizzle, Pinia, OpenAuth, SST e Bun.
- **Contexto do projeto gerado e preenchido**: `.specsfy/{PROJECT,STACK,RULES,DATABASE,PACKAGES,USER-PROFILE,INTERFACE,DESIGNSYSTEM}` (os três `.md` de contexto foram para `.specsfy/` no 4º commit), `docs/`, `specs/inbox/…`. Migração e veredito por documento: `MIGRACAO-DOCS.md`.
- **`AGENTS.md` e `CLAUDE.md` na raiz do repositório**: instruções de entrada (toda conversa começa por `fireskills/SKILL.md`, contexto e especialista da área) + bloco gerenciado do setup; `CLAUDE.md` importa `@AGENTS.md` e o contrato `@fireskills/skills/Spec.md`.
- Regra do projeto `useNotification` refletida no especialista `nuxt-ui` (`useToast()` direto é legado: 14 arquivos usam `useToast`, 8 usam `useNotification`).

### Pendências novas / que permanecem

1. **TUI** do upstream (`tui.ts`, `neo-blessed`) **não** restaurada; `progress --watch` cobre o acompanhamento.
2. **Tokens de protocolo `specsfy`** (`.specsfy/`, `SPECSFY:`, `Formato: Specsfy/2.0`, `specsfy:evidence`) mantidos, pois os validadores os leem; renomear é decisão do time (pendência 5 acima).
3. **`docs/` gerado** pelo documentador é heurístico: `docs/database.md` não reconhece as tabelas (a fonte confiável é `.specsfy/DATABASE.md`), os diagramas Mermaid são genéricos e `docs/application.md` é um inventário de arquivos. Serve como inventário, não como documentação de arquitetura.
4. `fireskills/cli` declara `commander` mas usa o `node_modules` da raiz (v13.1.0); numa cópia limpa: `bun install --cwd fireskills/cli`.
5. Só o `setup_context.mjs` tinha o bug de caminho no Windows entre os scripts testados; **os demais scripts não foram todos executados** de ponta a ponta (o fluxo inbox foi; backlog/spec/tasks/tdd/implement não).
6. `_docs/REFATORE_ARCHITETURE.md`, `ROADMAP.md` e `MAILER_FORK_PLAN.md` foram removidos de `_docs` (não estão em `_docs/docs`); ver `MIGRACAO-DOCS.md`.
7. As alterações de `_docs/` feitas por você (mover para `_docs/docs`, `RULES.md`, `_docs/base-skills/specsfy/`) **não foram commitadas**: ficam com você.

## 4º commit — raiz enxuta e fluxo testado de ponta a ponta

- **Raiz do repositório só com `AGENTS.md` e `CLAUDE.md`** (mais o `README.md` do produto, que já existia e não foi mexido): `PROJECT.md`, `INTERFACE.md` e `DESIGNSYSTEM.MD` foram para `.specsfy/` (163 referências reescritas em 44 arquivos; `setup_context.mjs` e `monitor_context.mjs` ajustados).
- **`AGENTS.md` curto (43 linhas, ~2 KB)**: só direciona (ler `fireskills/SKILL.md` → `.specsfy/RULES.md` → especialista da área → fluxo). Comandos, fontes de verdade e "manter vivo" passaram para `fireskills/SKILL.md`. O bloco gerenciado do setup foi encurtado de ~40 para 13 linhas (`fireskill-setup/references/framework-instructions.md`); o `CLAUDE.md` é só `@AGENTS.md` (deixou de importar o `Spec.md` inteiro a cada conversa).
- **Fluxo rodado em projeto de teste** (`setup` → inbox → backlog → spec → validações → CLI `transition`/`effort`/`milestones sync` → documentator): todos os scripts executam sem erro de runtime. Falhas restantes são as esperadas de spec com placeholders (gates pendentes, sem teste, sem evidência).
- **Bugs achados nesse teste e corrigidos:** (1) `validate_interface_tasks.mjs` com `SyntaxError` que **eu** introduzi (barra de `@nuxt/ui` dentro de regex literal); (2) `verify_repo.mjs` ainda filtrava diretórios `specsfy-*` e falhava com "catálogo base esperado=14 observado=0" (agora `PASSED` no repositório real); (3) `analyze_change.mjs` dizia "repositório Git indisponível" no Windows (comparava caminho com `\` contra `/`); (4) `inspect_interface.mjs` não detectava nada no Nuxfire (agora: frameworks `nuxt`/`vue`, `@nuxt/ui`, 36 rotas e 103 componentes). Gate novo: `node --check` em todos os 30 `.mjs`.
- **Não coberto pelo teste:** as etapas conversacionais (perguntas numeradas, refinamento, aprovação de gates) são conduzidas pelo agente, não por script; `importar_mvp`, `sync_speckit_context` e `verify_acceptance` com dados reais não foram exercitados.

## 5º commit — documentação pública fiel ao código, validação de ponta a ponta

Fluxo scriptado rodado em projeto descartável (inbox → backlog → spec → effort → validate → transition → progress → lesson); cada exemplo da doc pública foi conferido contra a saída real.

- **Bugs achados e corrigidos:** (1) `fireskill validate` reprovava a spec gerada pelo **template oficial** ("Seção obrigatória ausente: Testes e Evidências"; regex de `validator.ts`), com teste de regressão novo contra `templates/Spec.md`; (2) `validate_spec.mjs` exigia a palavra `DataGrid` no Contrato CRUD, mas o contrato do Nuxfire manda `UTable` (spec seguindo o template reprovava o Definition Gate); (3) `monitor_context.mjs` só olhava o 1º segmento do caminho para "código da aplicação", então mudanças em `apps/*` e `layers/*` nunca acionavam revisão do `PROJECT.md` nem o documentador; (4) `verify_repo.mjs` voltou a `FAILED` porque as 4 skills novas (`lessons`, `the-fool`, `the-jury`, `the-judge`) não tinham `agents/openai.yaml`, criados agora; (5) `Spec.md` citava `.fireskills/…` (6 caminhos) em vez de `.specsfy/`; (6) `skills/README.md` dizia que os templates estavam ausentes, linkava `../docs/` removido e não listava as 4 skills novas.
- **Documentação pública** (`apps/web/content/docs/2.fireskills/`): 14 páginas em `getting-started/` (quick-start orientado a "o que digitar na IDE por objetivo", uma página por etapa, mudanças tardias, outros pontos de entrada); metodologia, skills, especialistas e CLI reescritas ou corrigidas. Erros removidos: `transition`/`effort` com ID curto (`0042`; o ID é `<NNNN>-<slug>`), `transition` "validando gates" (só checa adjacência), `fireskill validate` apresentado como o gate (é um linter leve), flags inexistentes em `lesson add` (`--category`, `--rule-id`), cabeçalho `Field | Value` e `Status | In-Progress` (real: `Campo | Valor`, `Implementing`), marcador `[SPECSFY:AC-01]` no título do teste (real: comentário `// SPECSFY: US-001 FR-001 AC-001`), caminhos inexistentes (`layers/database`, `layers/teams/tests`, `stripe.post.ts`), `bun run typecheck` na raiz (só existe em `apps/app`), `baseProcedure` (real: `publicProcedure`), `@nuxt-hub/core` (real: `@nuxthub/core`), documentador "sincronizando `apps/web/content/docs`" (escreve `docs/` e `PACKAGES.md`), handoff automático do inbox (não existe).
- **Verificado:** `bun run test` 131/131; testes da CLI 28/28 e `tsc`; `node --check` nos 30 `.mjs`; `verify_repo` PASSED; `check:i18n` OK; `build_documentation --check` = 0; as 32 páginas de `/docs/fireskills/*` respondem 200 no `nuxt dev` e a navegação está na ordem certa.

### Pendências novas

1. **`transition` não lê os gates** (só adjacência) e **não sai de `completed`**: a skill `fireskill-update-spec` manda reabrir uma spec `Complete`, e a CLI recusa. Decidir: permitir `completed → review` ou tratar mudança pós-entrega como spec nova.
2. **ID curto**: só `validate` aceita `0001`; `effort` e `transition` exigem `<NNNN>-<slug>`. Vale unificar a resolução (hoje a doc pede o ID completo).
3. **Scripts tratam `--help` como execução**: `setup_context.mjs`, `update_stack.mjs`, `update_database.mjs`, `build_documentation.mjs` e `sync_speckit_context.mjs` gravam arquivos no diretório atual quando recebem `--help` (aconteceu numa varredura; os arquivos criados por engano em `fireskill-setup/scripts/` foram removidos).
4. **`monitor_context.mjs` fica `PENDING` para `docs/`** enquanto houver mudança de app não commitada, mesmo com `build_documentation --check` = 0 (exige diff em `docs/`). Some após o commit.
5. `apps/web/constants/paths.json` é gerado de arquivos rastreados: regenerar depois do commit (ainda lista `fireskills/obsoletos/` e `fireskills/docs/`, já removidos do disco).
6. `nuxt dev` do `apps/web` registrou 2 avisos "Hydration completed but contains mismatches", não atribuídos às páginas novas (não aumentaram ao abrir outra página).
7. Prosa de skills antigas ainda diz "instala" especialista (setup); eles já estão no repositório.

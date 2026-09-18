---
name: fireskill-specialist-sst
description: Definir, alterar e implantar a infraestrutura do Nuxfire com SST 4 em Cloudflare — recursos em `infra/*.ts` (Workers, Hyperdrive, KV, R2, Queues, Cron, Durable Objects, D1), secrets por stage, flags de `config.ts`, domínios, `bun run deploy` e as pegadinhas que já quebraram deploy. Use ao tocar `infra/`, `sst.config.ts`, `config.ts` (flags), `.env.example` ou ao preparar/depurar um deploy; o comportamento do código dentro do Worker é do `$fireskill-specialist-cloudflare-workers`.
---

# SST 4 (infraestrutura como código na Cloudflare)

## Quando usar

- Acionar ao criar/alterar recurso em `infra/*.ts`, adicionar secret, flag,
  domínio, fila, cron, Durable Object ou Worker.
- Acionar ao fazer ou depurar `sst deploy`, `sst secret load`, mudança de stage,
  falha de build do Nitro dentro do deploy, migração/seed que rodam no deploy.
- Não acionar para lógica dentro de handlers (`$fireskill-specialist-cloudflare-workers`),
  schema/migrações em si (`$fireskill-specialist-drizzle`) ou fluxo de
  release/versão (`$fireskill-specialist-delivery-engineering`).
- Combinar com `$fireskill-specialist-nuxfire-layers` (flags vs layers),
  `$fireskill-specialist-openauth` (Worker `Auth`) e
  `$fireskill-specialist-application-security` (tratamento de secrets).

## Fluxo

1. Ler [references/nuxfire-sst.md](references/nuxfire-sst.md); para uma tarefa
   comum, ir direto a [references/recipes.md](references/recipes.md).
2. Achar o arquivo de `infra/` que já cria algo parecido e seguir o padrão.
3. Mudar **infra e código no mesmo passo** quando um depende do outro (binding
   novo → `link` + leitura no código + tratamento de ausência).
4. Conferir nomes obrigatórios (`BLOB`, `KV`, `CACHE`, `DB`) e o que é
   caminho relativo.
5. Validar; para o que toca `apps/functions`/`layers`, o gate é um deploy real.

## Regras principais

- Um recurso = um trecho em `infra/`; `sst.config.ts` importa todo `.ts` e mescla
  `outputs`. Sem stack central, sem `wrangler.toml`.
- Stage é flag de CLI: `bun run deploy -- --stage <nome>` (com o `--`); nunca
  `SST_STAGE=`.
- `production` é `retain` + `protect`; não altere sem decisão explícita.
- `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` são variáveis reais do shell,
  nunca `sst.Secret`.
- Secrets em `SCREAMING_SNAKE_CASE`, idênticos em `.env.example`,
  `infra/secret.ts` e `Resource.<NOME>`; carregados por stage
  (`.env.stage`, `.env.production`); produção **sem** `--fallback`.
- Nunca abrir, colar ou versionar `.env.stage`/`.env.production`.
- Só o que é público leva `NUXT_PUBLIC_`.
- `handler` de Worker é **caminho relativo**; `link` usa o nome do recurso e não
  permite renomear (por isso `BLOB`/`KV`/`CACHE`/`DB` literais).
- Durações são string. `dlq.retryDelay` tem bug no SST 4.14.0: o atraso real vem
  de `transform.consumer` em `infra/jobs.ts`.
- Migração `new_sqlite_classes` de DO só quando a classe ainda não existe no
  stage (`isDurableObjectClassProvisioned`).
- Build de Nuxt é `command.local.Command` (`infra/utils/builder.ts`) + `dependsOn`;
  com `hub:` ligado a saída do Nitro é `dist`, senão `.output`.
- Worker→Worker por `link` (service binding), não por URL pública.
- `flags` (recursos Cloudflare) e `layers` (layers Nuxt) são mecanismos
  separados; um recurso opcional nasce atrás de flag e o código trata a ausência.
- `bunfig.toml` com `linker = "hoisted"`, `unenv` dividido raiz v2 / apps v1 e
  patches por versão exata **não se mexem** sem entender o motivo.
- Não existe CI/CD; automatizar deploy é trabalho novo.

## Antipadrões

- `path.resolve()` em `handler`.
- Passar duração como número; confiar em `dlq.retryDelay` do SST 4.14.0.
- Renomear `BLOB`/`KV`/`CACHE` ou o D1 `DB` do `apps/web`.
- Fixar `true`/`false` na migração de Durable Object em vez de consultar o stage.
- Reenviar `new_sqlite_classes` (erro 10074).
- `SST_STAGE=production bun run deploy`.
- Transformar `CLOUDFLARE_API_TOKEN` em `sst.Secret`.
- Secret em camelCase, ou definido só em um dos três lugares.
- `sst secret load … --fallback` com o `.env.production`.
- `overrides` global de `unenv`; trocar o linker para `isolated`; ignorar
  `patchedDependencies` após regenerar o lockfile.
- Caminho relativo para `layers/` em código que o SST empacota
  (`apps/functions`).
- Declarar recurso e esquecer o `link` (ou o `if (flags.x)` do lado do código).
- Adicionar `wrangler.toml`/deploy por `wrangler` fora do SST.
- Considerar `tsc`/`vitest`/`nuxt build` verdes como prova de que o deploy
  funciona.

## Validação

- `bunx sst diff --stage <stage>` (ou `sst deploy` em stage de teste) antes de
  qualquer stage compartilhado; nunca testar primeiro em `production`.
- Para cada `handler:` novo/alterado:
  `bunx esbuild <handler> --bundle --platform=node` como proxy mínimo.
- Confirmar no fim do deploy: URLs de `outputs`, migração e seed executados sem
  erro, Worker respondendo.
- Conferir que `.env.example` acompanha todo secret novo.
- Depois de mexer em flag: o recurso some/aparece **e** o código não quebra com
  o binding ausente.
- `bun run test` (Vitest) e `bun run check:i18n` seguem verdes.

## Skills relacionadas

- `$fireskill-specialist-cloudflare-workers` — código dentro do Worker.
- `$fireskill-specialist-drizzle` — migrações/seed disparados pelo deploy.
- `$fireskill-specialist-nuxfire-layers` — `layers` vs `flags`.
- `$fireskill-specialist-openauth` — Worker `Auth`, `AuthKV`.
- `$fireskill-specialist-delivery-engineering` — release e rollout.
- `$fireskill-specialist-application-security` — secrets e segredos por stage.
- `$fireskill-specialist-observability` — logs e traces.

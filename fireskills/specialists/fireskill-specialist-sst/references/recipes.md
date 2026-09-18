# Receitas de infra (SST 4 no Nuxfire)

Todas partem de padrões que já existem em `infra/`. Confirme o arquivo de
referência antes de copiar.

## Adicionar um secret

1. Declare em `infra/secret.ts`, dentro do `if (flags.<x>)` correspondente:
   `secretList.MeuSegredo = new sst.Secret("MEU_SEGREDO", "");`
   (nome em `SCREAMING_SNAKE_CASE`; default `""` se o stage puder subir sem ele).
2. Acrescente a chave em branco e comentada em `.env.example`.
3. Entregue ao Worker: em `infra/app.ts` (`vars`, prefixo `NUXT_` no nome que o
   `runtimeConfig` do Nuxt lê) ou em `link: [...]` de um Worker nativo
   (`Resource.MEU_SEGREDO.value`).
4. Se o valor for **público** (vai ao browser), use `NUXT_PUBLIC_…`; se não, jamais.
5. Carregue por stage: `bunx sst secret load .env.<stage> --stage <stage>`.
6. Código que lê o secret trata o caso "vazio" e **falha fechado**.

## Adicionar um Worker nativo

1. Novo arquivo `infra/<nome>.ts` com `new sst.cloudflare.Worker("Nome", {
   handler: "apps/functions/src/<arquivo>.ts", compatibility: COMPATIBILITY,
   link: [...] })`. `handler` **relativo**; `COMPATIBILITY` de
   `infra/utils/constants.ts`.
2. Precisa de banco: `link: [database]` e no handler use
   `env.AppDB.connectionString`.
3. Exporte `outputs` se quiser URL visível; o `sst.config.ts` os mescla.
4. Quem chamar o Worker de outro Worker: `link: [worker]` (service binding),
   nunca `fetch` na URL pública.
5. Comportamento do código: `$fireskill-specialist-cloudflare-workers`.

## Adicionar um recurso atrás de flag

1. Adicione a chave ao tipo e ao valor de `flags` em `config.ts`.
2. No arquivo de `infra/`, crie o recurso como `flags.<x> ? new … : undefined`
   e exporte `outputs` condicional (padrão de `jobs.ts`/`websockets.ts`).
3. Onde ele é linkado (`infra/utils/nuxt.ts`), use `if (flags.<x>) link.push(...)`.
4. No código, trate o binding ausente (`event.context.cloudflare.env.<Nome>`
   pode ser `undefined`).

## Adicionar fila ou cron

- Fila: copie `infra/jobs.ts` (fila + DLQ + `subscribe`). **Mantenha** o
  `transform.consumer` que impõe `retryDelay` em segundos (bug do SST 4.14.0) e
  durações sempre como string.
- Cron: `infra/cron.ts` (`schedules: ["0 * * * *"]`, `job.handler`, `link`).

## Adicionar um Durable Object

1. Worker com `transform.worker` acrescentando o binding
   `durable_object_namespace` (via `$output(args.bindings ?? []).apply(...)`).
2. Migração `newSqliteClasses` **só** se a classe ainda não existe no stage:
   reuse `isDurableObjectClassProvisioned` (`infra/utils/durable-objects.ts`).
3. Nunca reenviar a migração de uma classe provisionada (erro 10074).

## Fazer deploy

1. Exporte `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no shell.
2. Carregue os secrets do stage (`sst secret load`).
3. `bun run deploy -- --stage <stage>`.
4. Migração e seed rodam sozinhos ao fim do `App`.
5. Confirme o resultado real do deploy (não só o typecheck).

## Depuração rápida

| Sintoma | Causa provável |
|---|---|
| `403 … workers.dev subdomain` (10063) | Conta nova sem subdomínio `workers.dev` (abrir Workers & Pages) |
| `duration.split is not a function` | Duração passada como número |
| Erro 10074 no DO | Migração de classe reenviada |
| `Could not resolve …/layers/…/schema` | Caminho relativo no barrel do schema |
| Worker aponta para pasta de build inexistente | Saída do Nitro é `dist` quando há `hub:`; `deployWorker` usa `app: true` |
| Build de Nuxt derruba o CI/CPU | `SST_BUILD_CONCURRENCY_SITE` (padrão 1) |
| Patch do `nodemailer` "sumiu" | Versão resolvida diferente da chave em `patchedDependencies` |
| `Invalid database credentials` (2013) | Host de um modo de conexão com usuário de outro |

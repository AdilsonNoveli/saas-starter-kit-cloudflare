# SST no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento.

## 1. Modelo

- **SST 4.14.0** (`package.json` da raiz), `home: "cloudflare"`, providers
  `cloudflare 6.20.0`, `command 1.0.1`, `random 4.17.0` (`sst.config.ts`).
- `sst.config.ts` importa **todo `.ts` de `infra/`** e mescla o export `outputs`
  de cada um; não existe arquivo central de stack. Um recurso novo = um arquivo
  (ou um trecho) em `infra/`.
- `#nuxfire/config` aponta para o `config.ts` da raiz.
- Não há `wrangler.toml`/`wrangler.jsonc`: tudo é `sst.cloudflare.*`.
- **Não há CI/CD** (`.github/workflows/` não existe). O único caminho é
  `bun run deploy` manual. Adicionar pipeline é trabalho novo, não conserto.
- `.sst/` e `sst-env.d.ts` são gerados; `Resource.<Nome>` só tipa depois de
  `sst dev`/`deploy` gerá-los.

## 2. Arquivos de `infra/`

| Arquivo | Cria |
|---|---|
| `dns.ts` | Domínios por stage e `sst.Linkable` de URL (`AuthUrl`, `WebUrl`, `AppUrl`, `WebsocketsUrl`) |
| `secret.ts` | Todos os `sst.Secret` (por flag) |
| `database.ts` | `sst.cloudflare.Hyperdrive("AppDB")` |
| `auth.ts` | `Kv("AuthKV")`, Worker `Auth`, `adminSecret`, build estático de `apps/login` |
| `emails.ts` | Worker `Emails` |
| `websockets.ts` | Worker `Websockets` + Durable Object (`flags.websockets`) |
| `jobs.ts` | `Queue("JobQueue")` + `Queue("JobDLQ")` e consumers (`flags.jobsQueue`) |
| `cron.ts` | `Cron("Cron")`, `0 * * * *` |
| `app.ts` | `deployWorker("App", …)` (vars, secrets, link) |
| `web.ts` | `D1("DB")` + `deployWorker("Web", …)` |
| `utils/nuxt.ts` | `deployWorker`: build + Worker nativo + migração + seed |
| `utils/builder.ts` | `command.local.Command` que roda `bun run build`, limitado por `SST_BUILD_CONCURRENCY_SITE` (padrão 1) |
| `utils/constants.ts` | `COMPATIBILITY` (`date "2025-09-01"`, `nodejs_compat`) |
| `utils/durable-objects.ts` | Consulta a API da Cloudflare: a classe do DO já existe neste stage? |
| `utils/semaphore.ts` | Semáforo do builder |

## 3. Stages e domínios

- Stage é **flag de CLI**, não variável de ambiente:
  `bun run deploy -- --stage production` (o `--` é obrigatório).
  **Não** `SST_STAGE=production`.
- Stage de dev usa o nome de usuário do sistema por padrão; domínio
  `<stage>.<devDomain>` (`infra/dns.ts`: `production` → `prodDomain`).
  Domínios em `config.ts`: `prodDomain = "nuxfire.com"`,
  `devDomain = "dev.nuxfire.com"`; subdomínios `app.`, `auth.`, `websockets.`.
- `production`: `removal: "retain"` e `protect: true`; os demais: `remove`,
  sem proteção (`sst.config.ts`).
- Conta Cloudflare nova precisa do subdomínio `workers.dev` provisionado uma
  vez (abrir **Workers & Pages** no painel) — senão o deploy falha no meio com
  `403 … workers.dev subdomain` (código 10063). Não é problema de token.

## 4. Secrets e variáveis

- Nome do secret em **`SCREAMING_SNAKE_CASE`**, igual em três lugares:
  `.env.example`, `infra/secret.ts` (`new sst.Secret("DATABASE_HOST", "")`) e
  `Resource.DATABASE_HOST` no código. A chave JS
  (`secretList.DatabaseHost`) é só ergonomia interna; o literal é o que vale.
  Não introduza secret em camelCase.
- `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` são **variáveis de ambiente
  reais do shell**, nunca `sst.Secret`: o SST precisa delas antes de ler o cofre.
  Necessárias em todo comando `sst` (`secret load`, `secret set`, `deploy`,
  `dev`).
- Secrets são carregados **por stage**, de arquivo com o nome do stage:
  `bunx sst secret load .env.stage --fallback` (dev) ou
  `bunx sst secret load .env.production --stage production` (produção, **sem**
  `--fallback`, que faria os valores de produção virarem padrão de todo stage).
  Nunca um `.env` único reaproveitado, nunca `.env.local`.
- `.env.example` é o modelo canônico. **Não abra, cole nem versione**
  `.env.stage`/`.env.production`: contêm valores reais.
- Secrets sensíveis chegam ao Worker por `vars` (`infra/app.ts`); só o que é
  público tem prefixo `NUXT_PUBLIC_`.
- Secrets operados por humano (`PLATFORM_MFA_SESSION_SECRET`,
  `PLATFORM_ADMIN_ENCRYPTION_KEY`, `USER_MFA_*`) têm default `""`: o stage sobe
  e as rotas correspondentes **falham fechadas** até serem carregados. A chave
  de criptografia guarda TOTP já gravado; perdê-la obriga reinscrição.

## 5. Flags (`config.ts`)

`flags` provisiona **recursos Cloudflare** (`infra/*.ts`); `layers` decide quais
**layers Nuxt** entram no app. São mecanismos separados de propósito. Flags de
integração: `stripe`, `paddle`, `githubAuth`, `googleAuth`, `resend`, `smtp`,
`ses`, `sparkPost`, `mailgun`, `websockets`, `cron`, `jobsQueue`. Hoje
`stripe`, `paddle`, `githubAuth`, `googleAuth`, `resend`, `websockets` e
`jobsQueue` estão `true`. `websockets` e `jobsQueue` exigem Workers Paid.
(Observação: `flags.cron` existe só no tipo — não tem valor em `config.ts` nem
é consultada por `infra/cron.ts`; o Cron é sempre criado.)
Um provedor de auth só vale de fato se as credenciais existirem: o Worker
`Auth` e o build do `apps/login` avaliam a mesma verdade (`!!id && !!secret`).

## 6. Pegadinhas de infra que já quebraram deploy (não reabrir)

1. **`handler` de Worker é caminho relativo, nunca `path.resolve()`** —
   absoluto quebra o staging de artefatos no Windows. (`assets.directory`
   absoluto é aceito.)
2. **`link` usa o nome próprio do recurso**: não dá para linkar `AppDB` e
   chamá-lo `DB`. O NuxtHub exige `BLOB`/`KV`/`CACHE` literais — por isso esses
   recursos são criados com esses nomes em `infra/utils/nuxt.ts`. O D1 do
   `apps/web` também deve se chamar `DB`.
3. **Durações são string** (`"120 seconds"`), nunca número (erro
   `duration.split is not a function`).
4. **Bug do SST 4.14.0**: `dlq.retryDelay` é convertido em ms em vez de s;
   acima de ~86 s a Cloudflare rejeita. Contorno em `infra/jobs.ts`:
   sobrescrever `args.settings.retryDelay` (número de segundos) em
   `transform.consumer`. Não reverta achando que o upstream corrigiu sem checar.
5. **`new_sqlite_classes` de Durable Object é migração única e irreversível**
   (erro 10074 ao reenviar). `infra/websockets.ts` pergunta à API da
   Cloudflare se a classe já existe no stage antes de incluir a migração — não
   fixe o valor. Sem `CLOUDFLARE_API_TOKEN` no ambiente, assume "já
   provisionada".
6. **Não existe componente Nuxt no SST.** O build roda como
   `command.local.Command` (`infra/utils/builder.ts`) e o
   `sst.cloudflare.Worker` espera por `dependsOn`. É o único jeito de passar a
   saída do Nitro ao Worker nativo, não um remendo a limpar.
7. **`@nuxthub/core` força o diretório de saída do Nitro para `dist`** (não
   `.output`) quando `hub: {…}` está ligado. `deployWorker` decide o nome pelo
   mesmo `app: boolean` que liga `BLOB`/`KV`/`CACHE`.
8. **Consumer de fila e DO não têm prop de alto nível**: consumer via
   `queue.subscribe(...)`; DO só por `transform.worker`, onde `args.bindings` é
   um `Output` do Pulumi (`$output(args.bindings ?? []).apply(...)`).
9. **`emails.ts`**: o pacote `nodemailer` só funciona no Worker com um patch
   (`patches/nodemailer@<versão>.patch`, `patchedDependencies`). Se o `bun
   install` resolver outra versão, a chave do patch precisa acompanhar
   (o Bun casa versão exata e ignora o patch em silêncio).
10. **Deploy chama migração e seed** para o `App`
    (`infra/utils/nuxt.ts`): `bunx drizzle-kit migrate` e
    `bun run src/database/seed/index.ts`, ambos direto no Postgres com os
    secrets `Database*`. O que roda no seu terminal também precisa alcançar o
    host do banco (IPv6/IPv4).
11. **Nada rodável localmente substitui `sst deploy`** para o que em
    `apps/functions` alcança `layers/` (ver `$fireskill-specialist-drizzle`):
    trate um deploy real, ou `bunx esbuild <handler> --bundle --platform=node`
    para cada `handler:` de `infra/*.ts`, como gate.

## 7. Bun e workspaces (por que importa no deploy)

- `bunfig.toml` fixa `linker = "hoisted"`: o linker `isolated` quebra o esbuild
  embutido do SST no Windows (`ERROR_INVALID_FUNCTION`). Não desfaça.
- `unenv` é dividido de propósito: a raiz quer v2 (bundler do SST); cada pacote
  Nuxt (`app`/`web`/`login`) quer v1 (Nitro). **Nunca** adicione `overrides`
  global de `unenv`.
- Todo pacote importado diretamente pelo **seu** código precisa ser dependência
  explícita do `package.json` daquele pacote, nunca herdado por transitividade
  (ex.: `@nuxt/ui`).
- Patches em `patches/` são amarrados à **versão exata** (hoje:
  `nodemailer@9.1.1` e `@openauthjs/openauth@0.3.9`); após regenerar o
  `bun.lock`, reconfira cada `patchedDependencies`.
- Workspaces: `apps/*`, `packages/*`, `layers/*`.
- Comandos da raiz: `bun run deploy`, `bun run app` (`sst shell -- bun
  scripts/dev.ts app`), `bun run web`, variantes `-remote`, `bun run test`,
  `bun run check:i18n`, `bun run format`.

## 8. O que NÃO existe

- CI/CD, GitHub Actions, deploy por `wrangler` fora do SST.
- Stack central, módulo Nuxt do SST, `wrangler.toml`.
- Observabilidade declarada nos Workers (ver
  `$fireskill-specialist-cloudflare-workers`, §6).

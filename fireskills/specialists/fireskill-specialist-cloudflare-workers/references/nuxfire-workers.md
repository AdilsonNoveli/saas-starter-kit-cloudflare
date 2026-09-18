# Cloudflare Workers no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. Se o código mudar, o código vence
este documento. **Deploy é SST** (`infra/*.ts`), não `wrangler.toml`: não existe
`wrangler.jsonc`/`wrangler.toml` na aplicação.

## 1. Workers que existem

| Worker (SST) | Código | Papel | Evidência |
|---|---|---|---|
| `AppWorker` | Nitro build de `apps/app` (`dist/server/index.mjs`) | App Nuxt + tRPC; preset `cloudflare-module` | `infra/app.ts`, `infra/utils/nuxt.ts`, `apps/app/nuxt.config.ts` |
| `WebWorker` | Nitro build de `apps/web` (`.output/`) | Site público; D1 `DB` para `@nuxt/content` | `infra/web.ts` |
| `Auth` | `apps/functions/src/auth.ts` + assets estáticos de `apps/login` | Emissor OpenAuth | `infra/auth.ts` |
| `Emails` | `apps/functions/src/emails.ts` | Envio de e-mail, chamado por service binding | `infra/emails.ts` |
| `Websockets` | `apps/functions/src/websockets.js` | Durable Object `Websockets` (SQLite) | `infra/websockets.ts` |
| Consumer de fila | `apps/functions/src/jobs-consumer.ts` | Processa `JobQueue` | `infra/jobs.ts` |
| Consumer de DLQ | `apps/functions/src/dlq-consumer.ts` | Grava em `deadLetterRecords` e dá ack (replay é ação humana: `admin.queue.replayDeadLetter`) | `infra/jobs.ts` |
| `Cron` | `apps/functions/src/cron.ts` | `scheduled`, `0 * * * *` (de hora em hora) | `infra/cron.ts` |

`Websockets`, `JobQueue`/`JobDLQ` só existem se `flags.websockets` /
`flags.jobsQueue` estiverem `true` em `config.ts` (ambos `true` hoje; a doc do
próprio arquivo diz "requires Workers Paid").

## 2. Runtime e compatibilidade

- Todo Worker nativo usa `COMPATIBILITY` de `infra/utils/constants.ts`:
  `date: "2025-09-01"`, `flags: ["nodejs_compat"]`. Mude a data num lugar só.
- O `nuxt.config.ts` declara `nitro.cloudflare.nodeCompat: true` apenas para
  silenciar um aviso falso do Nitro — o flag real vem do SST.
- `nitro.experimental.asyncContext: true` (depende de `nodejs_compat`) dá a
  `useEvent()` um contexto por requisição; `useDB()` depende disso.

## 3. Bindings (como o código os enxerga)

| Binding | Recurso SST | Onde é criado | Uso |
|---|---|---|---|
| `AppDB` (Hyperdrive) | `sst.cloudflare.Hyperdrive("AppDB")` | `infra/database.ts` | Postgres; `env.AppDB.connectionString` |
| `BLOB` (R2) | `sst.cloudflare.Bucket("BLOB")` | `infra/utils/nuxt.ts` | NuxtHub Blob |
| `KV` / `CACHE` (KV) | `sst.cloudflare.Kv(...)` | `infra/utils/nuxt.ts` | NuxtHub KV/Cache |
| `AuthKV` (KV) | `sst.cloudflare.Kv("AuthKV")` | `infra/auth.ts` | Só o Worker `Auth` |
| `DB` (D1) | `sst.cloudflare.D1("DB")` | `infra/web.ts` | Só o `apps/web` (`@nuxt/content`) |
| `Auth`, `Emails` (service binding) | Worker linkado em `link:` | `infra/app.ts`, `infra/auth.ts` | Chamada Worker→Worker sem rede |
| `Websockets` (DO namespace) | `transform.worker` | `infra/websockets.ts` | Classe `Websockets` |

- **`BLOB`, `KV` e `CACHE` têm esses nomes exatos porque o NuxtHub exige.**
  Renomear quebra `hubBlob()`/`hubKV()`/`hubCache()`.
- **`DB` do `apps/web` deve se chamar exatamente `DB`** (o preset
  `cloudflare` do `@nuxt/content` exige).
- **App → Auth usa service binding**, não `fetch()` na URL pública: a própria
  documentação da Cloudflare recomenda, e o comentário de `infra/app.ts`
  registra 6s+/travas observadas via URL pública de dentro de outro Worker.
- Bindings chegam a código Nitro por `event.context.cloudflare.env.<Nome>`
  (`apps/app/server/plugins/database-binding.ts`) e a Workers "puros" pelo
  segundo argumento do handler (`env`), tipado com uma `interface Environment`
  local (`jobs-consumer.ts`, `cron.ts`).

## 4. Regras de I/O que já custaram bug aqui

1. **Nunca cachear cliente de banco em variável de módulo.** Um cliente
   `postgres.js` é objeto de I/O; criado numa requisição e reusado noutra gera
   "Cannot perform I/O on behalf of a different request". Por isso `useDB()`
   (`apps/app/server/utils/db.ts`) guarda o cliente em `event.context._db`
   (escopo da requisição), e a Hyperdrive já faz o pooling.
   O `binding` (handle) pode ficar em módulo: não é objeto de I/O.
2. **Fechar o cliente ao fim da requisição.** Workers não chama `.end()` por
   você. `closeDB(event)` roda em `afterResponse` e `error`
   (`database-binding.ts`), é idempotente (zera a referência antes do `await`)
   e usa `context.waitUntil(...)` para o isolate não ser congelado no meio.
3. **`waitUntil` sempre como método:** `context.waitUntil(p)`. Extrair para
   variável (`const fn = context.waitUntil; fn(p)`) gera
   `TypeError: Illegal invocation` e derrubou o Worker inteiro com 500 em toda
   requisição (comentário em `database-binding.ts`).
4. Clientes do banco dentro de `queue()` e `scheduled()`
   (`jobs-consumer.ts`, `cron.ts`) são criados **por invocação**, com
   `postgres(env.AppDB.connectionString, { max: 5, fetch_types: false })`. Esses
   dois arquivos não chamam `.end()` hoje; ao editá-los, siga o padrão de
   `closeDB` (encerrar dentro de `ctx.waitUntil`) em vez de mover o cliente para
   escopo de módulo.
5. `fetch_types: false` é usado em todo cliente Postgres do projeto — mantenha.
6. `CF-Connecting-IP` é o IP confiável; `X-Forwarded-For` é fallback só de
   `wrangler dev` (`apps/functions/src/rate-limit.ts`).

## 5. KV, filas, cron, DO — particularidades reais

- **KV**: TTL mínimo de 60s. O `rateLimit` do Worker `Auth` usa janela fixa e
  força `Math.max(windowSeconds, 60)`. Fora do Nitro (sem NuxtHub) usa a API
  crua `kv.get(key, "json")`/`kv.put(...)`; dentro do app, usa `hubKV()`
  (`apps/app/server/utils/rate-limit.ts`).
- **Fila** (`infra/jobs.ts`): `maxConcurrency: 5`, lote de 10 / janela 5s, DLQ
  com 3 tentativas. Cada mensagem: sucesso → `message.ack()`; falha → grava
  `failed` + log no banco e `message.retry()`. O corpo da mensagem é o registro
  da tabela `jobs` (`$inferSelect`).
  - Bug do SST 4.14.0: `dlq.retryDelay` é convertido em ms em vez de segundos.
    O valor real (120s) é imposto em `transform.consumer` — não confie em
    `dlq.retryDelay`.
- **Cron**: `schedules: ["0 * * * *"]`; handler `scheduled(event, env, ctx)`.
  Hoje só grava uma linha em `logs`.
- **Durable Object** (`websockets.js`): classe `Websockets` com storage SQLite,
  usando `crossws/adapters/cloudflare-durable`; autenticação por ticket HMAC
  emitido por `apps/app/server/utils/ws-ticket.ts` (segredo `WsTicketSecret`).
  - `new_sqlite_classes` é migração **única e irreversível**: reenviá-la para
    classe já provisionada dá erro 10074. `infra/utils/durable-objects.ts`
    consulta a API da Cloudflare e só inclui a migração se a classe ainda não
    existe naquele stage. Sem `CLOUDFLARE_API_TOKEN`, assume "já provisionada".
- **Secrets/env**: valores sensíveis vão por `sst.Secret` (`infra/secret.ts`) e
  entram no Worker como `vars`/`link`; só o que é público leva o prefixo
  `NUXT_PUBLIC_`. Nunca embutir segredo em código ou em `nuxt.config`.

## 6. O que NÃO existe (não assuma)

- `wrangler.toml`/`wrangler.jsonc` da aplicação: config é SST. A referência
  `references/wrangler.md` serve para comandos do CLI (inspeção, logs, KV/R2
  ad hoc), não para editar a configuração de deploy.
- Workflows, Workers AI, Vectorize, Pipelines, Containers: nenhum é usado.
- Observabilidade declarada em código (`observability.enabled`,
  `traces.enabled`): não há bloco de observabilidade nos `sst.cloudflare.Worker`
  de `infra/`. Um comentário em `apps/app/server/trpc/trpc.ts` afirma que
  "observability is enabled on this worker", mas nenhum arquivo do repositório
  configura isso: confirme no painel da Cloudflare antes de assumir logs ou
  traces ativos. Ver `$fireskill-specialist-observability`.

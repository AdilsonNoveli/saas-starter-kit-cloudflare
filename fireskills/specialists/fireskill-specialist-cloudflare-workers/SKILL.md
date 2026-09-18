---
name: fireskill-specialist-cloudflare-workers
description: Escrever e revisar código que roda em Cloudflare Workers no Nuxfire — bindings (Hyperdrive, KV, R2, D1, Queues, Durable Objects, service bindings), waitUntil, cron, filas com DLQ, regras de I/O por requisição e compatibilidade (nodejs_compat). Use ao tocar `apps/functions/src/*`, `apps/app/server/plugins`, `server/utils/db.ts` ou qualquer código que use `env`/`event.context.cloudflare`; a definição de infraestrutura e deploy é do `$fireskill-specialist-sst`, não deste.
---

# Cloudflare Workers

> A memória sobre APIs e limites da Cloudflare envelhece. Verifique na
> documentação oficial e nos tipos gerados antes de afirmar comportamento,
> limite ou assinatura. Este especialista diz **como o Nuxfire usa** o runtime.

## Quando usar

- Acionar ao criar ou alterar handler de Worker (`fetch`, `queue`, `scheduled`),
  plugin Nitro que lê `event.context.cloudflare`, acesso a KV/R2/D1/Hyperdrive/
  Queue/Durable Object, ou chamada Worker→Worker.
- Acionar ao depurar erro que só aparece em Worker: "Cannot perform I/O on
  behalf of a different request", "Illegal invocation", resposta 500 em toda
  requisição, conexões de banco esgotadas.
- Não acionar para declarar recurso, domínio, secret ou stage: usar
  `$fireskill-specialist-sst`. Não acionar para queries e schema: usar
  `$fireskill-specialist-drizzle` e `$fireskill-specialist-postgres`.
- Combinar com `$fireskill-specialist-nuxt` (Nitro, plugins),
  `$fireskill-specialist-openauth` (Worker `Auth`),
  `$fireskill-specialist-observability` e
  `$fireskill-specialist-performance-engineering`.

## Fluxo

1. Ler [references/nuxfire-workers.md](references/nuxfire-workers.md): quais
   Workers existem, quais bindings, e as regras de I/O que já quebraram.
2. Identificar em qual Worker o código roda (App/Web = Nitro; `Auth`, `Emails`,
   `Websockets`, consumers e `Cron` = handlers puros em `apps/functions/src`).
3. Confirmar o binding no SST (`infra/*.ts`) **antes** de usá-lo no código; um
   binding que não foi linkado não existe em runtime.
4. Carregar só a referência do produto envolvido (tabela abaixo).
5. Implementar mantendo I/O por requisição e `ctx.waitUntil` para trabalho após
   a resposta.
6. Validar (seção abaixo) e, para mudança de runtime, testar em stage real: o
   ambiente local não reproduz Hyperdrive nem service bindings por completo.

## Roteamento de referências

| Situação | Ler |
|---|---|
| Qualquer Worker do projeto | `nuxfire-workers` |
| Compatibility date, tipos, secrets, logs/traces | `best-practices/configuration` |
| Streaming, promessas, estado de requisição, segurança | `best-practices/runtime-patterns` |
| Assinatura de handler, classes de plataforma, serialização | `best-practices/platform-apis` |
| Postgres via Hyperdrive | `products/hyperdrive/*` |
| KV (rate limit, cache) | `products/kv/*` |
| R2 (`BLOB`) | `products/r2/*` |
| Fila e DLQ | `products/queues/*` |
| Cron Trigger | `products/cron-triggers/*` |
| Durable Object (WebSockets) | `durable-objects/index`, `durable-objects/rules`, `products/do-storage/*` |
| Testar DO/Workers | `durable-objects/testing`, `durable-objects/workers` |
| Comandos do CLI | `wrangler` |
| Bindings em geral | `products/bindings/*` |
| Logs e traces | `products/observability/*` |

Cada `products/<x>/` traz `README`, `api`, `configuration`, `patterns` e
`gotchas`. Comece por `gotchas`.

## Regras principais

- Cliente de banco, de socket ou de qualquer objeto de I/O é **por
  requisição** e nunca em variável de módulo. Só o *handle* do binding pode ser
  global. No app, use `useDB()`; em handler puro, crie o cliente dentro do
  handler.
- Encerre o cliente Postgres ao fim da requisição, dentro de `ctx.waitUntil`
  (`closeDB`). Não confie que o runtime feche sockets.
- Chame `ctx.waitUntil(p)` / `context.waitUntil(p)` **como método**; nunca
  extraia para variável.
- Trabalho assíncrono sem `await`, sem `return` e sem `waitUntil` é descartado
  e esconde erros.
- Use service binding (`env.Auth`, `env.Emails`) para Worker→Worker; não faça
  `fetch()` na URL pública de outro Worker do mesmo projeto.
- Use o binding, não a API REST da Cloudflare, para operações que o binding
  cobre.
- `nodejs_compat` está ligado em todos os Workers via
  `infra/utils/constants.ts`; não dependa de módulo Node sem confirmar suporte.
- Tokens e IDs sensíveis: `crypto.randomUUID()`/`crypto.getRandomValues()`,
  nunca `Math.random()`; compare segredos com comparação de tempo constante.
- Corpo grande ou ilimitado: stream, não `await response.text()`.
- Segredos só por `sst.Secret`/`vars`; só o que é público usa `NUXT_PUBLIC_`.
- Mensagem de fila: `message.ack()` em sucesso, `message.retry()` em falha; a
  DLQ só registra e dá ack.
- KV: TTL mínimo 60s; janela de rate limit nunca menor que isso.
- Não tipar `Env` com `any`; no projeto, `interface Environment` local com o
  tipo `Hyperdrive` de `@cloudflare/workers-types`.
- Classe de DO estende `DurableObject`; use `this.env`/`this.ctx`.
- Migração `new_sqlite_classes` de DO é única: nunca reenviar para classe
  existente (erro 10074).

## Antipadrões

- `let db = postgres(...)` no topo do módulo, reaproveitado entre requisições.
- `const { waitUntil } = ctx` / `const fn = context.waitUntil` — perde o
  receiver e derruba o Worker.
- `fetch("https://auth.<domínio>/...")` de dentro do `App` para o `Auth`.
- Renomear `BLOB`, `KV`, `CACHE` (NuxtHub) ou `DB` (D1 do `apps/web`).
- Declarar `wrangler.toml` paralelo ao SST — duas fontes de verdade.
- Escrever `interface Env` à mão que duplica bindings em vez de tipar pelo que
  o SST realmente linkou.
- Guardar estado de requisição em variável de módulo (vaza entre usuários).
- `ctx.passThroughOnException()` como tratamento de erro.
- Confiar em `X-Forwarded-For` em produção: o IP confiável é `CF-Connecting-IP`.
- Confiar em `dlq.retryDelay` do SST 4.14.0 (bug ms/s); o atraso real é o de
  `transform.consumer`.
- Assumir Workflows, Workers AI, Vectorize ou observabilidade declarada em
  código: não existem no projeto.

## Validação

- `bun run typecheck` em `apps/app` para código Nitro; para `apps/functions`,
  `tsc` do próprio pacote quando houver script; nenhum `any` novo em `Env`.
- Testes do projeto: `bun run test` (Vitest) na raiz.
- Depois de mexer em I/O de banco: requisições em sequência no stage real sem
  "Cannot perform I/O…", e sem crescimento de conexões ociosas no Postgres.
- Depois de mexer em fila/cron: uma mensagem que sucede, uma que falha até a
  DLQ, e uma linha esperada em `logs`/`deadLetterRecords`.
- Depois de mexer em DO/WebSocket: conexão com ticket válido, com ticket
  expirado, e reconexão.
- `sst deploy` num stage de teste é o teste final; verificação local passar não
  basta para mudanças de binding, migração de DO ou compatibilidade.

## Skills relacionadas

- `$fireskill-specialist-sst` — recursos, links, secrets, stages e deploy.
- `$fireskill-specialist-nuxt` — Nitro, plugins e `useEvent()`.
- `$fireskill-specialist-drizzle` — schema e queries sobre o cliente Postgres.
- `$fireskill-specialist-openauth` — Worker de autenticação e `AuthKV`.
- `$fireskill-specialist-application-security` — segredos, HMAC, rate limit.
- `$fireskill-specialist-observability` e
  `$fireskill-specialist-performance-engineering`.

# tRPC no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento.

## 1. Versões e ligação com o Nuxt

- `@trpc/server` e `@trpc/client` **v10.45.x**, `trpc-nuxt` **0.10.22**
  (`apps/app/package.json`), com `build.transpile: ["trpc-nuxt"]`
  (`apps/app/nuxt.config.ts`). Não use API do tRPC v11 (`initTRPC` com
  `.create({ transformer })` em outro formato, `createTRPCClient`, `httpBatchStreamLink`…).
- Handler HTTP: `apps/app/server/api/trpc/[trpc].ts` →
  `createNuxtApiHandler({ router: appRouter, createContext })`. Endpoint
  `/api/trpc`.
- Cliente: `apps/app/app/composables/use-trpc-client.ts` →
  `createTRPCNuxtClient<AppRouter>` com `httpBatchLink({ url: "/api/trpc" })`.
  Um cliente por browser (`import.meta.client && client`), um novo por chamada no
  servidor (SSR). Expõe `useTrpcClient()`, `useTeamsList()`, `useTeam(id)`.
- **Não há `transformer` (superjson).** Nada no projeto o configura: `Date`,
  `Map`, `BigInt` atravessam como JSON puro (data vira string). Trate isso no
  tipo de retorno; adicionar superjson é decisão nova, nos dois lados.

## 2. Contexto (`apps/app/server/trpc/context.ts`)

`createContext(event)` devolve: `ip`, `event` (H3), `origin`, `session`
(resultado de `getUser(event)`), `sendEmail` (service binding `Emails`),
`sendWebsocketsEvent(topic, data)` (binding `Websockets`, `publish`),
`runtimeConfig`, `jobsQueue` (binding `JobQueue`). `Context` é
`inferAsyncReturnType<typeof createContext>`.
Os bindings vêm de `event.context.cloudflare.env.*` e podem ser `undefined` se a
flag da feature estiver desligada em `config.ts` (`websockets`, `jobsQueue`):
`sendWebsocketsEvent` já trata; `ctx.jobsQueue.send(...)` (usado em
`layers/admin/server/trpc/admin-queue.ts`) não.

## 3. As quatro procedures (`apps/app/server/trpc/trpc.ts`)

| Procedure | Exige | Acrescenta ao `ctx` | Use para |
|---|---|---|---|
| `publicProcedure` | nada | — | Rotas sem login (`public.addToWaitlist`) |
| `protectedProcedure` | `ctx.session.email`; se `session.mfaEnabled`, MFA de usuário válida | `user` (a sessão) | Qualquer coisa autenticada sem checagem de permissão de equipe (ex.: `teams.create`, `account.*`) |
| `abilityProcedure` | `protectedProcedure` | `allows`, `denies`, `authorize` | Tudo que age dentro de uma equipe: `await authorize(ability, ...args)` |
| `platformAdminProcedure` | `protectedProcedure` + linha ativa em `PlatformAdmin` com MFA + cookie de sessão elevada (TOTP nos últimos 30 min) | `platformAdmin` | Tudo sob `admin.*`. Grava auditoria automática de toda mutação |

- **`platformAdminProcedure` é paralela ao RBAC de equipe, não derivada de
  `abilityProcedure`**, de propósito: passar pela camada de habilidades de tenant
  é como uma permissão de tenant acabaria concedendo acesso de plataforma.
  Nunca a reconstrua sobre `abilityProcedure`.
- Falha do `platformAdminProcedure` é um `FORBIDDEN` sem mensagem, igual nos
  três casos: não revele qual gate falhou.
- `authorize` converte qualquer erro em `TRPCError FORBIDDEN` e registra
  `console.warn("authz denied", …)`.
- MFA exigida devolve `FORBIDDEN` com `message: "MFA_REQUIRED"`.

## 4. Composição de routers e layers

- `apps/app/server/trpc/routers/index.ts` monta `appRouter = router({ account,
  public: pub, ...layerRouters })` e exporta `AppRouter`, `RouterInput`,
  `RouterOutput`.
- `routers/.composition/layer-routers.ts` é **GERADO** por
  `scripts/compose-layers.ts` a cada carga do `nuxt.config.ts`. Não edite à mão;
  ele muda sozinho conforme `config.ts` (`layers.core` + `layers.features`).
- Cada layer exporta de `layers/<layer>/server/trpc/router.ts` exatamente
  `export const routers = { <chave>: <router> } satisfies Record<string, AnyRouter>`.
  **Um mapa, não um router solto**: uma layer pode ser dona de mais de uma chave
  de topo (`teams` é dona de `teams` e `invites`).
- **`satisfies`, nunca `: Record<string, AnyRouter>`.** A anotação alarga o tipo e
  o cliente perde input/output de toda chamada (`AppRouter` é inferido através
  desse objeto). Páginas derivam tipos disso
  (`RouterOutput["admin"]["teams"]["listTeams"][number]`).
- Routers de outra layer montados sob `admin.*` (`admin.plans`,
  `admin.notifications`) são exports nomeados **fora** do mapa `routers` da
  layer dona, importados por `layers/admin/server/trpc/router.ts`. Tudo de
  plataforma mora sob `admin.*`; o caminho da procedure diz se ela está atrás de
  `platformAdminProcedure`.

Mapa de namespaces hoje: `account`, `public` (app) · `teams`, `invites`
(layer-teams) · `billing`, `stripe` (layer-billing) · `notifications`
(layer-notifications) · `kanban` (layer-kanban, feature) · `admin` com
`teams`, `plans`, `queue`, `auditLog`, `notifications` (layer-admin).

## 5. Como uma layer importa o backend

Layers importam **explicitamente** as primitivas do Composition Root, sem
depender do merge de Nitro entre layers:

```ts
import { abilityProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { teams } from "@nuxfire/functions/schema";
```

Decisão registrada em `_docs/REFATORE_ARCHITETURE.md` ("Layers cuidam do
frontend; o backend usa import explícito"). Auto-imports do NuxtHub
(`hubBlob()`) e do `nuxt-authorization` (`defineAbility`) são a exceção: não têm
caminho importável.

## 6. Padrões de código reais

- **Validação**: `zod` em `.input(z.object({...}))`, com mensagens no schema
  (`.min(2, "Board name must be at least 2 characters")`).
- **Escopo de tenant**: procedures que recebem `teamIdentifier` (id **ou** slug)
  resolvem a equipe e provam associação no próprio query
  (`requireTeamMembership`, `requireBoard`, `requireColumn` em
  `layers/kanban/server/trpc/router.ts`). Habilidade responde "este usuário pode
  X na equipe T", nunca "T existe e ele pertence a T": as duas checagens são
  necessárias.
- **Isolamento entre tenants**: `moveCard` recusa mover cartão para coluna de
  outro quadro (`BAD_REQUEST`), senão quem é membro de duas equipes relocaria
  dados entre tenants.
- **Erros**: sempre `TRPCError` com `code` (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`,
  `BAD_REQUEST`, `UNAUTHORIZED`, `INTERNAL_SERVER_ERROR`). Violação de unicidade
  do Postgres é `error.code === "23505"` (postgres.js), não `P2002` do Prisma
  (`routers/public.ts`).
- **Equipe suspensa**: a única checagem está em `teams.get`, que resolve "que
  equipe é esta URL" para todo o app (`middleware/1.teams.global.ts`). Não repita
  em outras procedures.
- **Banco**: `useDB()` (escopo de requisição). Ver
  `$fireskill-specialist-cloudflare-workers` e `$fireskill-specialist-drizzle`.
- **Tempo real e e-mail**: `ctx.sendWebsocketsEvent(userId, payload)`,
  `ctx.sendEmail(authEmail, to, subject, …)`.

## 7. Cliente

- `useTrpcClient().<namespace>.<proc>.useQuery(input)` (SSR/`useAsyncData`) e
  `.mutate(input)` para mutações — ex.: `useTrpcClient().teams.create.mutate`.
- Tipos: `RouterInput` / `RouterOutput` de `~~/server/trpc/routers`.
- Não existe tratamento central de `TRPCClientError` no front hoje (0 usos de
  `TRPCClientError`); cada tela trata o erro e mostra `useToast()`.

## 8. Não existe (não assuma)

- Testes de router tRPC: nenhum `*.test.ts` sob `server/trpc`. Os testes do
  domínio estão em `shared/utils/abilities.test.ts` e `server/utils/*.test.ts`
  das layers.
- `superjson`/`transformer`, subscriptions, `httpBatchStreamLink`, tRPC v11.

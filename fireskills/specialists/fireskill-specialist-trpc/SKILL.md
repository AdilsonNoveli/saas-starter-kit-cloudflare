---
name: fireskill-specialist-trpc
description: Criar e revisar routers, procedures e o cliente tRPC v10 (trpc-nuxt) do Nuxfire — publicProcedure, protectedProcedure, abilityProcedure e platformAdminProcedure, contexto com bindings Cloudflare, composição de routers por layer (`routers` + `satisfies`) e consumo por `useTrpcClient()`. Use ao tocar `apps/app/server/trpc/`, `layers/*/server/trpc/` ou qualquer chamada `useTrpcClient()`; não cobre schema de banco (drizzle) nem definição de permissões (nuxt-authorization).
---

# tRPC (v10 via trpc-nuxt)

## Quando usar

- Acionar ao criar/alterar router ou procedure, ao escolher a base de procedure,
  ao mexer no contexto (`createContext`) ou ao consumir a API no front.
- Acionar ao adicionar uma layer com backend (mapa `routers`).
- Não acionar para tabelas e queries: `$fireskill-specialist-drizzle`; para
  definir `defineAbility`/permissões: `$fireskill-specialist-nuxt-authorization`;
  para criar a layer em si: `$fireskill-specialist-nuxfire-layers`.
- Combinar com `$fireskill-specialist-web-api-design` (contrato, erros),
  `$fireskill-specialist-application-security` (auth, tenant, MFA) e
  `$fireskill-specialist-typescript`.

## Fluxo

1. Ler [references/nuxfire-trpc.md](references/nuxfire-trpc.md).
2. Achar um router equivalente (`layers/kanban/server/trpc/router.ts` para
   feature enxuta; `layers/teams/server/trpc/teams.ts` para equipe/RBAC;
   `layers/admin/server/trpc/*` para plataforma) e seguir o padrão.
3. Escolher a base de procedure pela tabela da seção 3 da referência.
4. Para router novo, seguir [references/new-router-recipe.md](references/new-router-recipe.md).
5. Validar com o checklist da receita e a seção abaixo.

## Regras principais

- Versão é **tRPC v10** + `trpc-nuxt` 0.10; não use API da v11.
- Escolha a menor base que serve: `public` < `protected` < `ability`;
  `platformAdmin` é um eixo paralelo, nunca derivado de `abilityProcedure`.
- Toda procedure que age numa equipe: resolver a equipe pelo banco, provar
  associação do usuário e **depois** `authorize(ability, ...)`. Habilidade não
  prova existência nem pertencimento.
- Toda id recebida do cliente é cruzada com a equipe do usuário antes de leitura
  ou escrita; operação entre entidades verifica que pertencem ao mesmo pai
  (ex.: mover cartão só dentro do mesmo quadro).
- Entrada validada com `zod` em `.input()`, mensagens de erro no schema.
- Erros são `TRPCError` com `code`; unicidade do Postgres é `23505`.
- Cada layer exporta `export const routers = { chave: router } satisfies
  Record<string, AnyRouter>` — mapa, nome fixo, `satisfies` e nunca anotação.
- `routers/.composition/layer-routers.ts` é gerado: não editar.
- Layers importam `~~/server/trpc/trpc` e `~~/server/utils/db` explicitamente.
- Tudo de plataforma fica sob `admin.*`; o caminho revela o gate.
- `platformAdminProcedure` falha com `FORBIDDEN` uniforme; não diferenciar o
  motivo. Mutação de admin já gera auditoria; resolver que conhece o alvo real
  chama `recordAuditLog()` com ele.
- Bindings opcionais (`jobsQueue`, `Websockets`) podem não existir: trate.
- Sem `transformer`: retorno é JSON puro (Date vira string).
- Verificação de suspensão de equipe vive só em `teams.get`.

## Antipadrões

- `throw new Error(...)` em procedure — o cliente recebe erro genérico.
- Montar `abilityProcedure` sobre `platformAdminProcedure` ou o contrário.
- Confiar só em `authorize` sem checar que a equipe/quadro existe e pertence ao
  usuário.
- Editar `.composition/layer-routers.ts` à mão.
- Anotar `routers` como `Record<string, AnyRouter>` (o cliente perde os tipos).
- Exportar um router único (`kanbanRouter`) em vez do mapa `routers`.
- Importar de `~~/server/...` dentro do front (`app/`); o front só importa
  **tipos** (`AppRouter`, `RouterOutput`).
- Fazer `ctx.jobsQueue.send()` sem considerar a flag `jobsQueue` desligada.
- Copiar a checagem de equipe suspensa para outras procedures.
- Devolver a linha inteira do banco quando o cliente precisa de poucos campos
  (vazamento de colunas; ver `columns:` em `teams.list`).
- Assumir superjson, v11 ou testes de router existentes.

## Validação

- `bun run typecheck` em `apps/app`: a inferência de `AppRouter` precisa
  continuar completa (`trpc.<ns>.<proc>` com input e output tipados).
- Testes: `bun run test` (Vitest) na raiz; habilidades novas têm teste em
  `shared/utils/abilities.test.ts` da layer.
- Chamar a procedure autenticado, sem sessão, com usuário de outra equipe e (se
  aplicável) com MFA pendente; os quatro casos devem responder
  `OK`/`UNAUTHORIZED`/`FORBIDDEN`/`FORBIDDEN(MFA_REQUIRED)`.
- Para `admin.*`: sem sessão elevada deve dar `FORBIDDEN`; a mutação deve deixar
  linha em `AuditLog` (`apps/app/server/utils/audit-log.ts`).
- Depois de ativar/desativar uma layer em `config.ts`, confirmar que
  `layer-routers.ts` foi regenerado e que o front não chama namespace removido.

## Skills relacionadas

- `$fireskill-specialist-nuxt-authorization` — abilities e `authorize`.
- `$fireskill-specialist-drizzle` — queries e schema sob `useDB()`.
- `$fireskill-specialist-nuxfire-layers` — estrutura e registro de layers.
- `$fireskill-specialist-nuxt` — composables e SSR (`useQuery`).
- `$fireskill-specialist-cloudflare-workers` — bindings e regras de I/O.
- `$fireskill-specialist-openauth` — origem de `ctx.session`.
- `$fireskill-specialist-web-api-design` e
  `$fireskill-specialist-application-security`.

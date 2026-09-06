# Painel do Dono da Plataforma — SaaS Enterprise

> **Status: PLANEJADO — não implementado.** Este documento é o plano de
> execução para uma sessão nova (sem memória da conversa onde a auditoria foi
> feita). Antes de escrever qualquer código, leia o documento inteiro — a
> ordem das fases existe porque cada uma depende de decisões da anterior.
>
> **Revisão 2** — adiciona o padrão de UI obrigatório (`/customers` do
> template em `_docs/template-modelo`), uma análise crítica de regressão por
> fase, e a exigência explícita de fonte única de verdade para as telas de
> admin (seção "Padrão de UI"). Revisado e confirmado como seguro para
> execução por uma nova sessão — ver "Aprovação" ao final do documento.

## Como usar este documento

- Trabalhe fase por fase, na ordem. **Fase 0 e Fase 1 não são opcionais** —
  são a fundação de segurança sobre a qual tudo depois se apoia.
- A seção "Decisões assumidas" resolve perguntas que ficaram em aberto na
  auditoria original. São defaults razoáveis, não exigências do usuário —
  se ele disser algo diferente no início da conversa, isso tem prioridade
  sobre este documento.
- Ao final de cada fase, rode `bunx tsc --noEmit` (ou o typecheck do pacote
  tocado) e revise a "Verificação manual" antes de seguir para a próxima.
- Se algo aqui não bater com o que você encontrar no código (ex.: um arquivo
  já foi renomeado, uma rota já existe), **confie no código, não neste
  documento** — ele foi escrito a partir de uma auditoria pontual e o
  código pode ter mudado.

REGRAS OBRIGATÓRIAS

1. ARQUITETURA E ORGANIZAÇÃO
   - Separation of Concerns: um arquivo, uma responsabilidade
   - Componentização extrema
   - Estrutura de pastas/arquivos otimizada para manutenabilidade
   - DRY: reutilização máxima de código
   - YAGNI: não implementar o que não foi pedido
   - KISS: a solução mais simples que resolve o problema

2. QUALIDADE DE CÓDIGO
   - Tipagem forte, zero uso de "any"
   - Zero código morto ou paliativo
   - Zero funções duvidosas/sem propósito claro
   - Zero verbosidade
   - Código limpo, validado e otimizado

3. PADRÕES TÉCNICOS DO PROJETO
   - Dark mode obrigatório em toda UI
   - Notificações via `useNotification`
   - Imagens via S3

4. POSTURA DURANTE A EDIÇÃO
   - Ao editar qualquer arquivo, identificar e aplicar oportunidades de
     melhoria/correção encontradas no escopo tocado

5. SEGURANÇA — específico deste plano
   - Autoridade de plataforma **nunca** é implementada como extensão do
     RBAC de time (`Role`/`Permission` existentes). É um sistema paralelo,
     com sua própria tabela e seu próprio middleware.
   - Toda mutação em `platformAdminProcedure` grava em `AuditLog` — sem
     exceção, sem "vou adicionar depois".
   - Nenhum segredo (chave MFA, tokens) em texto plano no banco sem
     necessidade — usar o que o runtime já oferece antes de inventar
     criptografia própria.

---

## Contexto (resumo da auditoria)

A aplicação (`nuxfire`, Nuxt + SST + Cloudflare Workers + Postgres/
Drizzle) é hoje um SaaS **single-layer**: existe `Team` (tenant/empresa) com
papéis internos (Owner/Admin/Member via `Role`/`Permission`,
`packages/functions/src/database/schema.ts`), mas **nenhuma camada acima
dos times**. Não há tabela, flag ou middleware que represente "dono da
plataforma". Achados centrais:

- **Zero conceito de super-admin** em qualquer lugar do código.
- **Zero MFA** em todo o sistema.
- **`getCronLogs`** (`packages/app/server/trpc/routers/async-jobs.ts`) vaza
  logs de cron globais para qualquer membro de qualquer time.
- **Paddle hardcoded para sandbox** em
  `packages/app/app/composables/use-payments.ts:47`.
- **Sem rate limit em login** — só os webhooks de pagamento são protegidos
  (`packages/app/server/utils/rate-limit.ts`).
- **Planos só existem via seed script** — sem CRUD, sem colunas de
  limite/quota na tabela `Plan`.
- **Nenhuma query lista todos os times da plataforma** — toda query de time
  é filtrada por "times do usuário logado".
- **"Async Jobs"** é uma demo de Cloudflare Queues (`components/async-jobs/`)
  exposta como item de navegação de primeiro nível do tenant, operável por
  qualquer membro, sem checagem de papel.
- A maioria das relações do schema não tem FK real no Postgres (só
  `Permission.roleId` e `TeamMembership.roleId` têm constraint).

---

## Decisões assumidas

| Pergunta em aberto | Default assumido | Por quê |
|---|---|---|
| Fase 1 é bloqueadora ou pode ter versão mínima? | **Bloqueadora, mas mínima**: MFA (TOTP) + tabela `PlatformAdmin` + `AuditLog` são o mínimo aceitável — não dá para reduzir mais sem abrir um buraco de segurança óbvio. | Uma conta com controle total sem MFA nem log é o pior cenário possível de comprometimento. |
| Papel único ou múltiplos níveis desde o início? | **Dois papéis desde o início**: `SUPER_ADMIN` (tudo) e `SUPPORT` (somente leitura). Não mais que isso agora. | Suporte-com-leitura é o caso de uso mais comum em SaaS real e custa quase nada a mais que um enum de dois valores; qualquer coisa além disso é YAGNI até haver necessidade concreta. |
| Async Jobs: remover do tenant ou reduzir para Settings → Advanced? | **Remover do nível superior de navegação já na Fase 4**; a versão reduzida em `Settings → Advanced` é **opcional, marcada como stretch** ao final da Fase 5 — só implementar se o usuário confirmar que quer manter alguma automação self-service para o cliente. | O core do pedido do usuário é "filas no nível do dono da aplicação"; manter qualquer versão para tenant é a parte opcional, não a obrigatória. |

Se o usuário responder essas perguntas de forma diferente no início da nova
conversa, atualize esta tabela antes de prosseguir.

---

## Padrão de UI para telas de admin (`/customers` do template)

Toda tela de listagem em `/admin/*` (empresas, planos, dead-letter queue)
segue **o mesmo padrão**, copiado do template de referência —
`_docs/template-modelo/dashboard/app/pages/customers.vue` +
`_docs/template-modelo/dashboard/app/components/customers/{AddModal,
DeleteModal}.vue`. Não inventar uma variação nova por tela — cada desvio do
padrão é uma decisão que alguém vai precisar reaprender depois.

### O padrão, exatamente como está no template

- `UDashboardPanel` → `UDashboardNavbar` (título + `UDashboardSidebarCollapse`
  no `#leading` + ação principal no `#right`, ex.: um `AddModal`).
- Barra de ferramentas acima da tabela: `UInput` de busca ligado a um filtro
  de coluna, `USelect` de filtro por status/categoria, `UDropdownMenu` de
  visibilidade de colunas, botão de ação em massa (só aparece quando há
  linhas selecionadas, dentro de um modal de confirmação).
- `UTable` do Nuxt UI com colunas TanStack (`TableColumn<T>[]`): coluna de
  seleção (`UCheckbox`), colunas ordenáveis via `UButton` no header, coluna
  de status com `UBadge` (cor semântica, nunca cor "chutada"), coluna de
  ações via `UDropdownMenu` (`getRowItems(row)`).
- Rodapé: contagem "`X de Y selecionados`" + `UPagination`.
- Modais de mutação isolados em componentes próprios, nomeados como no
  template — `components/customers/AddModal.vue` vira `<CustomersAddModal>`
  pelo auto-import de componentes por pasta do Nuxt.

### Fonte única de verdade: `AdminDataTable`

O app hoje **não usa `UTable` em lugar nenhum** — a lista de membros
(`components/members/MembersListItem.vue`) usa outro padrão (linhas
avulsas), que continua correto para Members e não deve ser tocado. Mas as
três telas novas de admin (Companies, Plans, Dead Letter Queue) precisam
exatamente da mesma barra de ferramentas e do mesmo rodapé de paginação —
copiar `customers.vue` três vezes seria a duplicação que a Regra 1 (DRY)
proíbe.

Criar **um único** componente de base,
`packages/app/app/components/admin/AdminDataTable.vue`, que encapsula tudo
o que é igual entre as três telas (busca, dropdown de colunas, rodapé com
contagem + `UPagination`, wiring de `columnFilters`/`columnVisibility`/
`rowSelection`/`pagination`) e recebe por props/slots só o que muda por
domínio: `columns`, `data`, `status` (loading) e um slot para filtros extras
(ex.: `USelect` de status em Companies, de tier em Plans). Cada página de
domínio (`admin/companies/index.vue`, `admin/plans/index.vue`,
`admin/queue/index.vue`) declara só suas `columns` e consome
`<AdminDataTable :columns :data :status>` — zero repetição da lógica de
tabela entre as três.

### Convenções para adicionar uma nova entidade administrada no futuro

1. Tabela no schema + migration.
2. Router em `packages/app/server/trpc/routers/admin/<entidade>.ts`, sempre
   atrás de `platformAdminProcedure`, com os mesmos verbos quando fizerem
   sentido: `list`, `getDetail`, uma mutação de estado.
3. Página em `admin/<entidade>/index.vue` consumindo `AdminDataTable`.
4. Modais de mutação em `components/admin/<entidade>/*Modal.vue`, no mesmo
   padrão de `AddModal`/`DeleteModal` do template.

Isso é o que dá o "alto nível de compreensão" pedido: quem já entendeu
Companies entende Plans e Queue de graça, porque é literalmente a mesma
estrutura com nomes diferentes — uma única fonte de verdade para "como uma
tela de admin funciona", não três implementações parecidas.

---

## Análise crítica de regressão

Leia esta seção inteira antes de tocar em qualquer arquivo. Cada item é um
comportamento que **já funciona hoje** e que uma implementação descuidada
das fases acima pode quebrar. Cada fase abaixo referencia de volta para cá
em vez de repetir o aviso — não duplicar este conteúdo dentro de cada fase.

### Fase 0

- **Remover `getCronLogs` quebra `AsyncJobsCron.vue` imediatamente** se o
  componente continuar montado chamando um endpoint que não existe mais. A
  remoção do endpoint e a remoção/ocultação de `<AsyncJobsCron />` na
  página `async-jobs.vue` têm que entrar no mesmo commit.
- **A migração do Paddle para runtime config não pode mudar comportamento
  em ambientes já configurados.** `.env.stage`/`.env.production`
  (existentes no repo) não têm `PADDLE_CLIENT_TOKEN`/`PADDLE_ENVIRONMENT`
  hoje porque esses valores eram hardcoded. Definir o **default** de
  `runtimeConfig.public.paddleEnvironment` igual ao valor hardcoded atual
  (`"sandbox"`) até que o valor de produção seja adicionado explicitamente
  aos secrets — mudar o default para `"production"` sem isso quebraria
  checkout em todo ambiente que ainda não tiver a variável configurada.
- **O rate limit no `PasswordProvider`/`CodeProvider` não pode escopar o
  Worker de auth inteiro** — aplicar só nas rotas de verificação de
  senha/código, nunca no fluxo OAuth (GitHub/Google), que não tem o mesmo
  vetor de força bruta e não deveria ser limitado da mesma forma.
- **FKs novas podem falhar a migration se houver dado órfão em produção.**
  O próprio `MIGRATIONS.md` do projeto já documenta a estratégia correta
  (expand/contract) — seguir exatamente ela: adicionar a constraint como
  `NOT VALID` primeiro, rodar `VALIDATE CONSTRAINT` separadamente depois de
  confirmar que não há órfãos. Nunca um `ALTER TABLE ... ADD CONSTRAINT`
  direto, que trava a tabela e pode falhar o deploy inteiro se houver um
  único registro órfão.

### Fase 1

- **Nunca serializar `mfaSecret` para o cliente.** Ao estender `getUser()`
  para incluir `isPlatformAdmin` no payload de sessão, retornar um objeto
  novo e explícito (`{ isPlatformAdmin: boolean }`), nunca a linha inteira
  de `platformAdmins` — um `select *` acidental aqui vazaria o secret de
  TOTP para o navegador do próprio admin.
- **O cookie de sessão elevada precisa de nome/prefixo próprio**, diferente
  de `nuxfire-access-token`/`-refresh-token` — para não colidir
  com a lógica de `setTokens()`/`getUserSession()` já existente em
  `packages/app/server/utils/auth.ts`.

### Fase 2

- **`Team.status` com default `"ACTIVE"` é obrigatório na migration** — sem
  isso, todo time existente nasceria sem status definido e a checagem de
  "suspenso" trataria `null` de forma imprevisível, derrubando acesso de
  clientes que nunca deveriam ter sido afetados.
- **A checagem de "suspenso" entra em exatamente um lugar** — o ponto
  natural é `1.teams.global.ts` e/ou dentro de `getUser()`. Duplicar essa
  checagem em vários lugares é o oposto de fonte única de verdade e cria
  risco de um caminho esquecido continuar permitindo acesso a um time
  suspenso.

### Fase 3

- **Não apagar `server/tasks/seed.ts` antes de migrar
  `createStripeCancelConfiguration()` para outro lugar.** Essa função
  provisiona a configuração de portal do Stripe da qual o botão "Cancel
  Subscription" já existente em `settings/billing.vue` depende (via
  `billing.ts`, que lê o id cacheado no KV). Apagar o arquivo sem mover essa
  lógica quebra uma feature de billing que já está em produção.
- **Enforcement de `maxSeats` não pode afetar times já acima do limite.**
  Se um plano ganhar um `maxSeats` menor que a contagem atual de membros de
  algum time existente, a regra bloqueia *novos* convites — nunca remove
  membros existentes automaticamente.

### Fase 4

- **Grep por consumidores antes de apagar `async-jobs.ts`/
  `components/async-jobs/*`.** Confirmar que nada além da própria página
  `pages/[[team]]/async-jobs.vue` importa esses arquivos antes de remover —
  não assumir com base só neste documento.
- **O novo consumer da `JobDLQ` não reprocessa mensagens sozinho** — só
  grava em `DeadLetterRecord` para leitura humana. Um consumer que tenta
  reenviar automaticamente recria o mesmo loop de falha que a fila já
  tentou resolver 3 vezes antes de cair na DLQ.

### Fase 5

- **Renomear o label "Security" para "Danger Zone" não muda a rota.**
  Qualquer link/bookmark existente para `/[[team]]/settings/security`
  continua funcionando — só o texto exibido muda.

---

## Fase 0 — Hotfixes (baixo risco, fazer primeiro, independe do resto)

**Objetivo:** parar de sangrar antes de construir a casa nova.
**Riscos de regressão desta fase:** ver "Análise crítica de regressão → Fase 0".

1. **Corrigir vazamento cross-tenant em `getCronLogs`**
   - Arquivo: `packages/app/server/trpc/routers/async-jobs.ts`.
   - Os logs de cron (`logs.jobId = "cron"`) são globais por natureza — não
     faça essa query aceitar qualquer `teamIdentifier` de qualquer membro.
     Remova o procedure `getCronLogs` deste router (ele volta, com
     autorização correta, na Fase 4 dentro do módulo de admin). Atualize
     `AsyncJobsCron.vue` para não chamar mais esse endpoint até a Fase 4/5
     decidirem o que fazer com a tela.

2. **Tirar Paddle do sandbox hardcoded**
   - Arquivo: `packages/app/app/composables/use-payments.ts:47`.
   - Trocar o `Environment.set("sandbox")` e o client token de teste por
     valores de `useRuntimeConfig().public` (mesmo padrão já usado para a
     chave do Stripe no servidor). Adicionar `PADDLE_CLIENT_TOKEN` e
     `PADDLE_ENVIRONMENT` (`sandbox` | `production`) a `.env.example` e ao
     `runtimeConfig.public` em `packages/app/nuxt.config.ts`.

3. **Rate limit em autenticação**
   - O login/senha roda dentro do issuer OpenAuth
     (`packages/functions/src/auth.ts`), que já tem acesso a uma KV
     (`AuthKV`). Reaproveitar a mesma lógica de `packages/app/server/utils/
     rate-limit.ts` (fixed-window por IP+email) dentro do `PasswordProvider`
     e do `CodeProvider` desse Worker — não existe hoje nenhuma proteção
     contra força bruta em tentativa de login.

4. **FKs reais faltantes**
   - Nova migration (drizzle-kit generate) adicionando constraint real para:
     `Team.planId → Plan.id`, `TeamInvite.teamId/roleId/invitedById`,
     `Subscription.teamId/planId`, `Job.teamId → Team.id`.
   - Antes de aplicar: rodar uma query de verificação de órfãos em cada FK
     nova (linhas cujo valor não existe na tabela referenciada) — se houver
     dados órfãos em produção, resolver isso manualmente antes da migration,
     não silenciosamente com `ON DELETE SET NULL`.

---

## Fase 1 — Fundação de segurança da plataforma (bloqueadora)

**Objetivo:** ter uma forma segura e auditável de dizer "este usuário é dono
da plataforma" antes de expor qualquer tela nova.
**Riscos de regressão desta fase:** ver "Análise crítica de regressão → Fase 1".

### Schema novo (`packages/functions/src/database/schema.ts`)

```ts
export const platformRoleEnum = pgEnum("platform_role", ["SUPER_ADMIN", "SUPPORT"]);

export const platformAdmins = pgTable("PlatformAdmin", {
  id: text().primaryKey().$defaultFn(() => createId()),
  userId: text().notNull().references(() => users.id),
  role: platformRoleEnum().notNull(),
  mfaSecret: text(),          // TOTP secret, null até o setup ser concluído
  mfaEnabledAt: timestamp(),  // null = MFA pendente, bloqueia platformAdminProcedure
  createdAt: timestamp().notNull().defaultNow(),
  revokedAt: timestamp(),     // soft-revoke em vez de deletar (mantém rastro no audit log)
});

export const auditLogs = pgTable("AuditLog", {
  id: text().primaryKey().$defaultFn(() => createId()),
  actorUserId: text().notNull(),
  action: text().notNull(),        // ex.: "team.suspend", "plan.update"
  targetType: text().notNull(),    // "team" | "plan" | "job" | "user"
  targetId: text(),
  metadata: jsonb(),
  ip: text(),
  createdAt: timestamp().notNull().defaultNow(),
});
```

Gere a migration com `drizzle-kit generate` — não escreva SQL à mão.

### Middleware de autorização (`packages/app/server/trpc/trpc.ts`)

Novo `platformAdminProcedure`, ao lado de `publicProcedure`/
`protectedProcedure`/`abilityProcedure` (não reaproveitar `abilityProcedure`
— é um sistema propositalmente separado):

1. Exige sessão válida (igual a `protectedProcedure`).
2. Busca a linha em `platformAdmins` pelo `userId` da sessão; se não existir
   ou `revokedAt` estiver setado → `FORBIDDEN`.
3. Exige `mfaEnabledAt` setado **e** um cookie de sessão elevada válido
   (`platform_mfa_verified`, assinado, TTL curto — 30 min) — sem isso,
   `FORBIDDEN` mesmo que o usuário seja um `PlatformAdmin` válido. Isso
   força reautenticação de MFA periódica, não uma vez por sessão de login.
4. Em um `onSuccess`/wrapper, grava uma linha em `auditLogs` com
   `actorUserId`, `action` (nome do procedure), `targetType`/`targetId`
   (dos args, quando aplicável) e o IP do request. Centralizar isso em
   `packages/app/server/utils/audit-log.ts` (`recordAuditLog(...)`) para não
   duplicar a lógica em cada router.

### MFA (TOTP)

- O issuer OpenAuth não suporta MFA nativamente — implementar por fora,
  só para contas `PlatformAdmin`, sem tocar no fluxo de login normal dos
  tenants.
- Biblioteca sugerida: `otpauth` (TOTP puro em JS, sem dependência nativa —
  **validar compatibilidade com o runtime de Cloudflare Workers antes de
  instalar**, já que este projeto roda em Workers, não em Node).
- Fluxo:
  - `POST /api/admin/mfa/setup` (`abilityProcedure`-equivalente, mas só
    acessível a quem já tem uma linha em `platformAdmins` com
    `mfaEnabledAt` nulo) — gera um secret, devolve o `otpauth://` URI para
    QR code.
  - `POST /api/admin/mfa/verify` — valida o código de 6 dígitos contra o
    secret pendente; em caso de sucesso, seta `mfaEnabledAt` e emite o
    cookie de sessão elevada. Aplicar rate limit aqui também (código de 6
    dígitos é força-bruteável em minutos sem isso).

### Como conceder o primeiro `PlatformAdmin`

**Nunca por HTTP.** Criar um script standalone,
`packages/functions/src/database/grant-platform-admin.ts`, no mesmo padrão
de `seed.ts` (conexão direta via `postgres`/`drizzle`, credenciais de banco
via env vars) — roda manualmente (`bun run src/database/grant-platform-admin.ts
--email=voce@empresa.com --role=SUPER_ADMIN`), nunca automaticamente a cada
deploy (diferente do seed de Plan/Roles). Isso evita que uma variável de
ambiente esquecida vire um super-admin fantasma em todo deploy.

---

## Fase 2 — Gestão de empresas-clientes (tenants)

**Objetivo:** o núcleo do pedido original — enxergar e administrar todos os
`Team`s da plataforma.
**Riscos de regressão desta fase:** ver "Análise crítica de regressão → Fase 2".

### Schema

Adicionar `status` a `Team` (`packages/functions/src/database/schema.ts`):
`status: text().notNull().default("ACTIVE")` com valores `ACTIVE` |
`SUSPENDED` (mesmo padrão de texto usado em `Subscription.status`).

### Backend

Novo diretório `packages/app/server/trpc/routers/admin/`, router `teams.ts`:

- `listTeams` — paginado, busca por nome/slug, filtro por plano e por
  `status`. **Sem** filtrar por `teamMemberships.userId` do caller (essa é
  justamente a diferença do resto da aplicação).
- `getTeamDetail` — time + membros + assinatura + contagem de jobs.
- `suspendTeam` / `reactivateTeam` — muda `status`, grava audit log.

Todos os procedures deste router usam `platformAdminProcedure`. Registrar o
sub-router em `packages/app/server/trpc/routers/index.ts` sob um namespace
`admin` (ex.: `admin.teams.listTeams`), nunca misturado com o `teams.ts`
existente (que continua servindo o próprio tenant).

### Frontend

- `packages/app/app/layouts/admin.vue` — layout próprio, visualmente
  distinto do `dashboard.vue` do tenant (evita qualquer confusão de "em
  qual contexto eu estou").
- `packages/app/app/pages/admin/index.vue` — visão geral (contagem de
  empresas, planos, jobs pendentes).
- `packages/app/app/components/admin/AdminDataTable.vue` — componente base
  de tabela descrito em "Padrão de UI para telas de admin" (criado aqui,
  reaproveitado sem alteração nas Fases 3 e 4).
- `packages/app/app/pages/admin/companies/index.vue` — colunas TanStack
  (nome, plano, status, contagem de membros, ações) consumindo
  `<AdminDataTable>`; busca por nome/slug e filtro de `status` via slot de
  filtros extras.
- `packages/app/app/components/admin/companies/SuspendModal.vue` /
  `ReactivateModal.vue` — mesmo padrão de
  `components/customers/DeleteModal.vue` (confirmação + ação).
- `packages/app/app/pages/admin/companies/[id].vue` — detalhe do time
  (membros, assinatura, jobs) + ação de suspender/reativar.
- `packages/app/app/middleware/admin.ts` (named, não global) aplicado via
  `definePageMeta({ middleware: "admin" })` em cada página de `/admin/*` —
  redireciona quem não é `PlatformAdmin` (checagem client-side de UX;
  a segurança real está no `platformAdminProcedure` do backend).
- Estender `getUser()` (`packages/app/server/utils/auth.ts`) para incluir
  `isPlatformAdmin: boolean` no payload de sessão (join simples com
  `platformAdmins` onde `revokedAt is null`). **Não** incluir o estado de
  MFA-verificado aqui — isso é o cookie de sessão elevada da Fase 1,
  deliberadamente de vida curta.

---

## Fase 3 — Gestão de planos

**Objetivo:** o dono do SaaS cria/edita planos pela aplicação, sem depender
de script.
**Riscos de regressão desta fase:** ver "Análise crítica de regressão → Fase 3".

### Schema

Adicionar a `Plan`: `maxSeats: integer()`, `limits: jsonb()` (genérico para
quotas futuras sem precisar de migration a cada novo limite), `isArchived:
boolean().notNull().default(false)`.

### Consolidar os dois seeds

- `packages/app/server/tasks/seed.ts` (task Nitro antiga, com price IDs de
  Stripe/Paddle sandbox hardcoded) conflita com
  `packages/functions/src/database/seed.ts` (novo, deploy-time). Decidir e
  remover um dos dois — recomendação: manter só o de deploy-time
  (`database/seed.ts`) para `FREE_PLAN`/`SYSTEM_ROLES`; a criação de
  planos pagos deixa de ser seed e passa a ser uma ação manual pela nova UI
  de admin (não faz sentido hardcoded price IDs de uma conta de teste
  específica rodarem em todo deploy).
- A criação da configuração de cancelamento do Stripe
  (`createStripeCancelConfiguration`, hoje dentro do seed antigo) pode virar
  uma ação de setup na UI de admin, ou permanecer como script one-off — não
  precisa rodar a cada deploy.

### Backend

`packages/app/server/trpc/routers/admin/plans.ts` — `listPlans`,
`createPlan`, `updatePlan`, `archivePlan` (soft-delete: times e assinaturas
referenciam `planId`, nunca deletar a linha de verdade). Todos
`platformAdminProcedure` + audit log.

### Frontend

`packages/app/app/pages/admin/plans/index.vue` — colunas TanStack (nome,
tier, preço, seats, status) consumindo o mesmo `<AdminDataTable>` da Fase 2
(não recriar a tabela). `components/admin/plans/CreateEditModal.vue` (mesmo
padrão de `components/customers/AddModal.vue`, com `UForm`+zod) reaproveita
`components/pricing/PricingCard.vue` só para preview visual do plano sendo
editado.

### Enforcement de limites

Em `packages/app/server/trpc/routers/teams.ts`, no fluxo de convite/
membership, comparar `teamMemberships.length` contra `plan.maxSeats` antes
de permitir novo convite — hoje esse limite simplesmente não existe.

---

## Fase 4 — Filas no nível do dono da plataforma

**Objetivo:** tirar operação interna de infraestrutura das mãos do tenant.
**Riscos de regressão desta fase:** ver "Análise crítica de regressão → Fase 4".

1. **Restringir o que sobra em `async-jobs.ts` (tenant)** — se a Fase 5
   decidir manter alguma versão para o cliente, trocar
   `protectedProcedure` por uma ability nova (`sendJob`, só Owner/Admin do
   time). Se decidido remover totalmente (default desta plano), deletar o
   router e os componentes `components/async-jobs/*` do lado do tenant.

2. **DLQ com visibilidade real** — hoje `JobDLQ`
   (`infra/jobs.ts`) não tem nenhum consumer, então mensagens que esgotam
   retries só são visíveis pelo dashboard da Cloudflare. Adicionar:
   - Tabela nova `DeadLetterRecord` (id, mensagem original, erro, teamId,
     createdAt) em `schema.ts`.
   - `packages/functions/src/dlq-consumer.ts` — consumer que só grava a
     mensagem falha nessa tabela (não tenta reprocessar sozinho).
   - `infra/jobs.ts` — `jobsDeadLetterQueue.subscribe(...)` apontando para
     esse novo consumer (mesmo padrão de `infra/jobs.ts:32-53` já usado
     para `JobQueue`).

3. **Módulo de admin de filas** —
   `packages/app/server/trpc/routers/admin/queue.ts`
   (`platformAdminProcedure`): `getQueueStats` (contagem de jobs por status,
   cross-tenant), `getDeadLetterMessages`, `replayDeadLetter` (reenviar para
   `JobQueue`). Aqui também é o lugar certo para reintroduzir a visão de
   logs de cron removida na Fase 0 — agora com autorização correta.
   `packages/app/app/pages/admin/queue/index.vue` consome o mesmo
   `<AdminDataTable>` das Fases 2/3 para listar mensagens da DLQ; a ação
   "Replay" fica em `components/admin/queue/ReplayModal.vue`.

4. **Remover do nav do tenant** —
   `packages/app/app/layouts/dashboard.vue` (item "Async Jobs") e o atalho
   `g-j` em `packages/app/app/composables/use-dashboard.ts`.

---

## Fase 5 — Limpeza de UX/IA

**Riscos de regressão desta fase:** ver "Análise crítica de regressão → Fase 5".

1. **Renomear a aba "Security" do time** (que na verdade é excluir o time)
   para "Danger Zone" — mudar só o label em
   `packages/app/app/composables/use-team-settings-links.ts` e o título da
   página `settings/security.vue`; manter a rota como está para não quebrar
   links/bookmarks existentes.

2. **Verificar (não assumir) o estado de `settings/notifications.vue`
   (time)** antes de mexer — um plano anterior deste mesmo repositório
   (`implementation_plan_UX_UI.md`, já removido) registra que essa página
   deveria ser um redirect para `/account-settings/notifications`. Confirme
   no código atual se isso ainda é verdade antes de tratar como bug.

3. **Stretch, só se o usuário confirmar que quer manter automação
   self-service para o tenant:** nova aba `Settings → Advanced`
   (`settings/advanced.vue` + entrada em `useTeamSettingsLinks`), com uma
   versão reduzida de `AsyncJobsMessageCreator`/`AsyncJobsStatus` (sem DLQ,
   sem logs de cron), gated pela ability `sendJob` criada na Fase 4.

---

## Tabela de arquivos (consolidada)

| Arquivo | Ação | Fase |
|---|---|---|
| `packages/functions/src/database/schema.ts` | MODIFY — `platformAdmins`, `auditLogs`, `Team.status`, `Plan.maxSeats/limits/isArchived`, `DeadLetterRecord`, FKs novas | 0,1,2,3,4 |
| `packages/functions/src/database/grant-platform-admin.ts` | NEW — script manual, nunca HTTP | 1 |
| `packages/functions/src/dlq-consumer.ts` | NEW | 4 |
| `packages/functions/src/auth.ts` | MODIFY — rate limit em Password/Code provider | 0 |
| `infra/jobs.ts` | MODIFY — subscribe da `JobDLQ` | 4 |
| `packages/app/server/trpc/trpc.ts` | MODIFY — `platformAdminProcedure` | 1 |
| `packages/app/server/utils/audit-log.ts` | NEW | 1 |
| `packages/app/server/utils/auth.ts` | MODIFY — `isPlatformAdmin` na sessão | 2 |
| `packages/app/server/trpc/routers/admin/teams.ts` | NEW | 2 |
| `packages/app/server/trpc/routers/admin/plans.ts` | NEW | 3 |
| `packages/app/server/trpc/routers/admin/queue.ts` | NEW | 4 |
| `packages/app/server/trpc/routers/admin/index.ts` | NEW — agrega os 3 sub-routers acima sob o namespace `admin` | 2 |
| `packages/app/server/trpc/routers/async-jobs.ts` | MODIFY — remove `getCronLogs`; depois remove ou restringe o resto | 0,4 |
| `packages/app/server/tasks/seed.ts` | DELETE só depois de migrar `createStripeCancelConfiguration()` (ver "Análise crítica de regressão → Fase 3") | 3 |
| `packages/app/app/composables/use-payments.ts` | MODIFY — Paddle via runtime config | 0 |
| `packages/app/app/layouts/admin.vue` | NEW | 2 |
| `packages/app/app/middleware/admin.ts` | NEW | 2 |
| `packages/app/app/components/admin/AdminDataTable.vue` | NEW — fonte única de verdade da tabela de admin, padrão `_docs/template-modelo/dashboard/app/pages/customers.vue` | 2 |
| `packages/app/app/components/admin/companies/{SuspendModal,ReactivateModal}.vue` | NEW | 2 |
| `packages/app/app/components/admin/plans/CreateEditModal.vue` | NEW | 3 |
| `packages/app/app/components/admin/queue/ReplayModal.vue` | NEW | 4 |
| `packages/app/app/pages/admin/**` | NEW | 2,3,4 |
| `packages/app/app/layouts/dashboard.vue` | MODIFY — remove item "Async Jobs" | 4 |
| `packages/app/app/composables/use-dashboard.ts` | MODIFY — remove atalho `g-j` | 4 |
| `packages/app/app/composables/use-team-settings-links.ts` | MODIFY — label "Danger Zone"; (stretch) aba Advanced | 5 |
| `.env.example` | MODIFY — `PADDLE_CLIENT_TOKEN`, `PADDLE_ENVIRONMENT` | 0 |

---

## Fora de escopo (não implementar sem pedido explícito)

- Impersonation de tenant pelo dono da plataforma (feature poderosa e
  arriscada o suficiente para merecer sua própria discussão de produto e
  auditoria, não um item de linha aqui).
- Mais de dois papéis de plataforma (`SUPER_ADMIN`/`SUPPORT`) — adicionar
  granularidade fina de permissões por admin só quando houver um caso de
  uso real, não antecipadamente.
- IP allowlist para o console de admin — mencionado na auditoria como
  "opcional, recomendado", não como requisito desta primeira versão.
- Papéis de time customizados por tenant (o schema já tem `Role.teamId`
  nullable como espaço para isso, mas nenhum código usa hoje — não é parte
  deste plano).

## Verificação manual (rodar antes de considerar qualquer fase concluída)

- [ ] Um usuário sem linha em `platformAdmins` recebe `FORBIDDEN` em
      qualquer procedure `admin.*`, mesmo sabendo a URL de `/admin`.
- [ ] Um `PlatformAdmin` sem MFA configurado não consegue chamar nenhum
      procedure `admin.*` além do setup de MFA.
- [ ] Toda ação em `/admin` gera uma linha em `AuditLog` com o `actorUserId`
      correto.
- [ ] `getCronLogs` não é mais alcançável por um membro comum de time.
- [ ] Checkout via Paddle usa o ambiente/token corretos por `NODE_ENV`
      (sandbox em dev, produção em prod) — não mais hardcoded.
- [ ] Tentativas repetidas de login/código incorreto são bloqueadas após N
      tentativas.
- [ ] Suspender uma empresa em `/admin/companies/[id]` efetivamente impede
      login/acesso dos membros daquele time (decidir e implementar o
      comportamento exato de "suspenso" no middleware de auth do tenant).
- [ ] Dark mode funcional em todas as telas novas de `/admin`.
- [ ] As três telas de listagem (`companies`, `plans`, `queue`) usam o
      mesmo `AdminDataTable` — nenhuma reimplementa a barra de ferramentas
      ou o rodapé de paginação por conta própria.

---

## Aprovação

Este plano passou por uma revisão crítica dedicada a três perguntas antes
de ser considerado pronto para execução:

1. **Alguma fase quebra algo que já funciona?** — Sim, em pontos pontuais
   (listados em "Análise crítica de regressão"), todos com mitigação
   explícita amarrada à mesma fase que introduz o risco. Nenhum deles é
   bloqueador de arquitetura — são cuidados de sequenciamento.
2. **Existe uma única fonte de verdade para cada decisão repetida?** — Sim:
   uma tabela de admins (`platformAdmins`), um middleware
   (`platformAdminProcedure`), um gravador de auditoria
   (`recordAuditLog`), e um componente de tabela (`AdminDataTable`) para as
   três telas de listagem. Nenhuma dessas responsabilidades está duplicada
   em mais de um lugar no plano.
3. **Uma pessoa nova consegue entender a estrutura sem contexto extra?** —
   Sim: a seção "Convenções para adicionar uma nova entidade administrada"
   documenta o padrão replicável, e a "Tabela de arquivos" mapeia 1:1 cada
   arquivo à fase e ao motivo da mudança.

**Confirmado: seguro e enterprise-grade para avançar em uma nova
conversa**, começando pela Fase 0.

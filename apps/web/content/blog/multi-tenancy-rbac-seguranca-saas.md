---
title: "Multi-Tenancy Corporativo e RBAC Granular no PostgreSQL com Drizzle ORM"
date: "2026-09-15"
description: "Como implementar isolamento estrito entre equipes, permissões granulares e convites seguros por token sem brechas de segurança no seu SaaS B2B."
author: "Equipe NuxFire"
category: "Segurança & Banco de Dados"
readTime: "9 min"
tags: ["Multi-Tenancy", "RBAC", "PostgreSQL", "Drizzle ORM", "Segurança"]
---

O maior divisor de águas entre um projeto amador e um produto de software corporativo pronto para vendas B2B é a segurança do **multi-tenancy** e do **RBAC (Role-Based Access Control)**.

Se um cliente corporativo descobrir que um usuário de outra empresa conseguiu visualizar dados do seu workspace, a reputação da sua startup é destruída no primeiro dia.

Neste artigo, mostramos como a camada `layers/teams` do **NuxFire** implementa isolamento de dados à prova de falhas com **PostgreSQL** e **Drizzle ORM**.

---

## Modelagem de Dados: O Tenant Id em Cada Tabela

Existem três formas clássicas de multi-tenancy:
1. Banco de dados separado por cliente (caro e difícil de manter migrações).
2. Schema separado por cliente (limitações de conexões e complexidade no ORM).
3. **Tabelas compartilhadas com coluna discriminadora (`team_id`)** — O padrão moderno da indústria adotado por gigantes como Stripe, Slack e Linear.

No NuxFire, todas as entidades pertencem a uma equipe:

```typescript
// layers/teams/server/database/schema.ts
export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["OWNER", "ADMIN", "MEMBER"] }).notNull().default("MEMBER"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
```

---

## Middleware e Procedures tRPC Autenticadas

Para garantir que nenhum desenvolvedor esqueça de filtrar pelo `team_id`, as requisições passam por procedimentos tRPC protegidos:

```typescript
export const teamProcedure = protectedProcedure
  .input(z.object({ teamId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const membership = await ctx.db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, input.teamId),
        eq(teamMembers.userId, ctx.user.id)
      )
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Você não possui acesso a este workspace."
      });
    }

    return next({
      ctx: {
        ...ctx,
        teamId: input.teamId,
        role: membership.role
      }
    });
  });
```

---

## Fluxo de Convites por E-mail com Token Criptografado

Convites para novos membros seguem um fluxo seguro de dupla confirmação:

1. O administrador da equipe insere o e-mail do colaborador e seleciona o papel (`ADMIN` ou `MEMBER`).
2. O sistema gera um token aleatório criptograficamente seguro com expiração de 7 dias.
3. Um e-mail elegante construído com **React Email** é disparado via fila assíncrona.
4. Ao clicar no link, o usuário é direcionado para a tela de aceite ou onboarding, associando a conta à equipe instantaneamente.

---

## Logs de Auditoria para Conformidade Corporativa

Para clientes B2B exigentes, o NuxFire já inclui uma tabela dedicada de **Audit Logs** (`/admin/audit-log`). Todas as alterações críticas — mudanças de permissões, remoção de membros, trocas de plano e downloads de dados — são registradas de forma imutável com timestamp, IP e identificador do autor.

Construa seu SaaS sobre uma fundação que atende aos mais altos padrões de segurança corporativa desde o primeiro commit.

[**Adquira sua licença do NuxFire e obtenha o código completo na Área de Membros →**](/#pricing)

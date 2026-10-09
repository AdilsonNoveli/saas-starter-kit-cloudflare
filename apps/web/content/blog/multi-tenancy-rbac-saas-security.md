---
title: "Enterprise Multi-Tenancy and Granular RBAC on PostgreSQL with Drizzle ORM"
date: "2026-09-15"
description: "How to implement strict isolation between teams, granular permissions and secure token-based invitations with no security gaps in your B2B SaaS."
author: "Nuxfire Team"
category: "Security & Databases"
readTime: "9 min"
tags: ["Multi-Tenancy", "RBAC", "PostgreSQL", "Drizzle ORM", "Security"]
image: "/images/blog/multi-tenancy-rbac-postgresql-en.svg"
lang: en
ogImage: "/images/blog/multi-tenancy-rbac-postgresql-en.png"
translations:
  en: multi-tenancy-rbac-saas-security
  pt-br: multi-tenancy-rbac-seguranca-saas
  es: multi-tenancy-rbac-seguridad-saas
---

The biggest dividing line between an amateur project and enterprise software ready for B2B sales is the security of **multi-tenancy** and **RBAC (Role-Based Access Control)**.

If an enterprise customer discovers that a user from another company was able to view data from their workspace, your startup's reputation is destroyed on day one.

In this article, we show how the `layers/teams` layer of **Nuxfire** implements failure-proof data isolation with **PostgreSQL** and **Drizzle ORM**.

---

## Data Modeling: The Tenant Id on Every Table

There are three classic forms of multi-tenancy:
1. A separate database per customer (expensive and hard to keep migrations in sync).
2. A separate schema per customer (connection limits and complexity in the ORM).
3. **Shared tables with a discriminator column (`team_id`)** — The modern industry standard adopted by giants like Stripe, Slack and Linear.

In Nuxfire, every entity belongs to a team:

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

## Middleware and Authenticated tRPC Procedures

To make sure no developer forgets to filter by `team_id`, requests go through protected tRPC procedures:

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
        message: "You do not have access to this workspace."
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

## Email Invitation Flow with an Encrypted Token

Invitations for new members follow a secure double-confirmation flow:

1. The team administrator enters the collaborator's email and selects the role (`ADMIN` or `MEMBER`).
2. The system generates a cryptographically secure random token that expires in 7 days.
3. A polished email built with **React Email** is sent through an asynchronous queue.
4. When they click the link, the user is taken to the accept or onboarding screen, linking the account to the team instantly.

---

## Audit Logs for Enterprise Compliance

For demanding B2B customers, Nuxfire already includes a dedicated **Audit Logs** table (`/admin/audit-log`). All critical changes — permission changes, member removals, plan changes and data downloads — are recorded immutably with a timestamp, IP and the author's identifier.

Build your SaaS on a foundation that meets the highest enterprise security standards from the very first commit.

[**Get your Nuxfire license and secure immediate access to the code and the VIP Group →**](/#pricing)

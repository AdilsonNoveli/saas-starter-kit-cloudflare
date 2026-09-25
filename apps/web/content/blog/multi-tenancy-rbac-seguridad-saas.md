---
title: "Multi-Tenancy Corporativo y RBAC Granular en PostgreSQL con Drizzle ORM"
date: "2026-09-15"
description: "Cómo implementar un aislamiento estricto entre equipos, permisos granulares e invitaciones seguras por token sin brechas de seguridad en tu SaaS B2B."
author: "Equipo Nuxfire"
category: "Seguridad y Bases de Datos"
readTime: "9 min"
tags: ["Multi-Tenancy", "RBAC", "PostgreSQL", "Drizzle ORM", "Seguridad"]
image: "/images/blog/multi-tenancy-rbac-postgresql-es.svg"
lang: es
ogImage: "/images/blog/multi-tenancy-rbac-postgresql-es.png"
translations:
  en: multi-tenancy-rbac-saas-security
  pt-br: multi-tenancy-rbac-seguranca-saas
  es: multi-tenancy-rbac-seguridad-saas
---

La mayor línea divisoria entre un proyecto amateur y un producto de software corporativo listo para las ventas B2B es la seguridad del **multi-tenancy** y del **RBAC (Role-Based Access Control)**.

Si un cliente corporativo descubre que un usuario de otra empresa pudo ver datos de su workspace, la reputación de tu startup queda destruida el primer día.

En este artículo mostramos cómo la capa `layers/teams` de **Nuxfire** implementa un aislamiento de datos a prueba de fallos con **PostgreSQL** y **Drizzle ORM**.

---

## Modelado de Datos: el Tenant Id en Cada Tabla

Existen tres formas clásicas de multi-tenancy:
1. Una base de datos separada por cliente (cara y difícil de mantener en las migraciones).
2. Un schema separado por cliente (límites de conexiones y complejidad en el ORM).
3. **Tablas compartidas con una columna discriminadora (`team_id`)** — El estándar moderno de la industria adoptado por gigantes como Stripe, Slack y Linear.

En Nuxfire, todas las entidades pertenecen a un equipo:

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

## Middleware y Procedures tRPC Autenticadas

Para garantizar que ningún desarrollador olvide filtrar por `team_id`, las peticiones pasan por procedimientos tRPC protegidos:

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
        message: "No tienes acceso a este workspace."
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

## Flujo de Invitaciones por Correo con Token Cifrado

Las invitaciones a nuevos miembros siguen un flujo seguro de doble confirmación:

1. El administrador del equipo ingresa el correo del colaborador y selecciona el rol (`ADMIN` o `MEMBER`).
2. El sistema genera un token aleatorio criptográficamente seguro que expira en 7 días.
3. Un correo elegante construido con **React Email** se envía mediante una cola asíncrona.
4. Al hacer clic en el enlace, el usuario es dirigido a la pantalla de aceptación o de onboarding, y la cuenta queda asociada al equipo al instante.

---

## Registros de Auditoría para el Cumplimiento Corporativo

Para los clientes B2B exigentes, Nuxfire ya incluye una tabla dedicada de **Audit Logs** (`/admin/audit-log`). Todos los cambios críticos — cambios de permisos, eliminación de miembros, cambios de plan y descargas de datos — se registran de forma inmutable con marca de tiempo, IP e identificador del autor.

Construye tu SaaS sobre una base que cumple los más altos estándares de seguridad corporativa desde el primer commit.

[**Adquiere tu licencia de Nuxfire y asegura el acceso inmediato al código y al Grupo VIP →**](/es#pricing)

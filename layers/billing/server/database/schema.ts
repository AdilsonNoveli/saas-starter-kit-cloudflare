import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// `Team` lives in the teams layer. `Subscription` below holds a foreign key to
// it, and `Team.planId`/`teamRelations` in that same file hold references back
// to `Plan`/`Subscription` here — a real, deliberate two-file cycle, the second
// one in this schema (core-schema.ts <-> layers/teams was the first, Fase 3
// passo 1a). It is safe for exactly the same reason: every reference crossing
// the boundary sits inside a Drizzle callback — `.references(() => teams.id)`
// and `relations(t, ({ one }) => ...)` — so neither module dereferences the
// other's exports while it is still evaluating. Nothing below may read an
// imported binding at module top level, or the cycle turns into a TDZ crash at
// import time.
//
// Package specifier, not a relative path: this is a layer importing a peer
// layer, exactly like layers/kanban's own `Team` FK does, so
// `@nuxfire/layer-teams` is a declared dependency in this layer's package.json.
// (The parenthetical that used to sit here — "core-schema.ts reaches into
// layers by relative path instead" — described a real state of the code that
// was also a real `sst deploy` failure, fixed in d0dac0a. EVERY cross-file
// schema import in this repo is a package specifier now, core-schema.ts and the
// barrel included; see nuxfire-layers.md.)
import { teams } from "@nuxfire/layer-teams/server/database/schema";

export const benefits = pgTable("Benefit", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const benefitsRelations = relations(benefits, ({ many }) => ({
  BenefitsOnPlan: many(benefitsOnPlan),
}));

export const benefitsOnPlan = pgTable(
  "BenefitsOnPlan",
  {
    planId: text("planId").notNull(),
    benefitId: text("benefitId").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.planId, table.benefitId] })],
);

export const benefitsOnPlanRelations = relations(benefitsOnPlan, ({ one }) => ({
  plan: one(plans, {
    fields: [benefitsOnPlan.planId],
    references: [plans.id],
  }),
  benefit: one(benefits, {
    fields: [benefitsOnPlan.benefitId],
    references: [benefits.id],
  }),
}));

export const plans = pgTable("Plan", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: text("tier").default("FREE").notNull(),
  price: text("price").notNull(),
  period: text("period").notNull(),
  provider: text("provider"),
  providerPriceId: text("providerPriceId"),
  // The Stripe Product behind providerPriceId, kept separate from it because
  // Prices are immutable on Stripe: changing amount/currency/interval creates
  // a new Price under the *same* Product rather than a new Product each time,
  // which is what this column makes possible. Null for plans not managed by
  // Stripe's catalog (Paddle, or a plan with a hand-pasted providerPriceId).
  providerProductId: text("providerProductId"),
  // unitAmount/currency exist so the app can create/update the Stripe Price
  // itself instead of an operator hand-pasting a price ID from the Stripe
  // Dashboard. In minor units (e.g. cents) and lowercase ISO 4217, matching
  // Stripe's own `unit_amount`/`currency` parameters exactly — both null for
  // plans not managed this way (Free tier, Paddle, legacy hand-pasted prices).
  unitAmount: integer("unitAmount"),
  currency: text("currency"),
  // null = unlimited seats. Nullable rather than a sentinel like 0 or -1, so
  // "this plan has no seat limit" and "this plan allows zero members" stay
  // distinguishable, and every plan that existed before this column keeps
  // behaving exactly as it did.
  maxSeats: integer("maxSeats"),
  // Open-ended bag for future quotas (storage, jobs, API calls). A jsonb
  // column means adding the next limit is a code change, not a migration.
  limits: jsonb("limits"),
  // Where a buyer lands after paying, chosen per plan in the admin:
  // "NEW_TEAM" (a team of their own, they become its Owner) or "EXISTING_TEAM"
  // (they join `buyerTeamId`). Text with a default rather than a pgEnum, like
  // Subscription.status: the set of destinations is the kind of value that
  // gains members. The default keeps every plan that existed before this
  // column behaving as "a team per buyer".
  buyerTeamMode: text("buyerTeamMode").notNull().default("NEW_TEAM"),
  // Only meaningful for "EXISTING_TEAM". `set null` rather than the default
  // `no action`: deleting that team must not be blocked by a plan pointing at
  // it, and a plan left without a destination is refused by whoever consumes
  // it, not silently pointed somewhere else.
  //
  // The `AnyPgColumn` annotation is required, not decoration: `Team.planId`
  // already points back at `Plan`, so this makes the two tables reference each
  // other directly, and without an explicit return type TypeScript cannot infer
  // either of them ("implicitly has type any ... in its own initializer").
  buyerTeamId: text("buyerTeamId").references((): AnyPgColumn => teams.id, {
    onDelete: "set null",
  }),
  // Plans are archived, never deleted: Team.planId and Subscription.planId are
  // real foreign keys, so a physical delete would break rows that still point
  // here.
  isArchived: boolean("isArchived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const plansRelations = relations(plans, ({ many }) => ({
  benefits: many(benefitsOnPlan),
}));

export const subscriptions = pgTable("Subscription", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  teamId: text("teamId")
    .notNull()
    .references(() => teams.id),
  status: text("status").default("ACTIVE").notNull(),
  provider: text("provider").notNull(),
  providerSubscriptionId: text("providerSubscriptionId").notNull(),
  planId: text("planId")
    .notNull()
    .references(() => plans.id),
  currentPeriodStart: timestamp("currentPeriodStart", { withTimezone: true }),
  currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  providerMetadata: jsonb("providerMetadata"),
  customerEmail: text("customerEmail"),
  lastPaymentDate: timestamp("lastPaymentDate", { withTimezone: true }),
  nextPaymentDate: timestamp("nextPaymentDate", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  team: one(teams, {
    fields: [subscriptions.teamId],
    references: [teams.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

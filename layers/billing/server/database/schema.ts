import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// `Team` lives in the teams layer (base). This import is one-way: `Subscription`
// below holds a real foreign key to `teams.id`, and `teamBillingRelations`
// (bottom of this file) declares the reverse query relation
// (`db.query.teams.findFirst({ with: { subscriptions: ... } })`) from this side
// too — `teams`' own schema.ts does not import this layer at all (SPEC-0005: a
// base layer must never import a feature layer). Before SPEC-0005 this was a
// real two-file cycle (`Team.planId`/`teamRelations` held the reverse
// references); Drizzle merges relation entries per table by name across every
// `relations()` call it finds, regardless of which file declares them, so
// splitting the declaration here changed nothing about how a query resolves.
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
// `User` lives in core-schema.ts, which never imports this layer, so this is
// a plain one-way import — no cycle to guard against, unlike `teams` above.
import { users } from "@nuxfire/functions/database/core-schema";

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
  // Whether this is the plan advertised on apps/web's landing page Buy CTA.
  // At most one plan holds this at a time — the admin toggles it in
  // /admin/plans, and setting it on one plan clears every other plan's flag
  // in the same transaction (admin-plans.ts). apps/web reads this live
  // (via a Cloudflare service binding to apps/app, layers/billing/server/api/public/offer.get.ts)
  // instead of a deploy-time env var, so changing the offer never needs a
  // redeploy of the landing page.
  isPublicOffer: boolean("isPublicOffer").notNull().default(false),
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

// No `teams`-side relation back to `subscriptions`/`plan` (SPEC-0005):
// Drizzle's relational query builder merges relation entries per table
// across every `relations()` call it finds at RUNTIME, but its TypeScript
// inference does not — a second `relations(teams, ...)` call in this file
// silently dropped `teamRelations`' own `memberships`/`roles`/`jobs` from the
// inferred type of every `db.query.teams.findFirst()` call in the app (found
// via `bunx vue-tsc --noEmit -p server/tsconfig.json`, not assumed). Querying
// from `subscriptions` (the relation above already covers it) instead of
// nesting through `teams` avoids needing a team-side declaration at all — see
// `getBillingInfo` in `server/trpc/billing.ts`.

// A buyer with no team yet (or not yet a member of `Plan.buyerTeamId`) pays
// before creating an account (SPEC-0004): this row is what the checkout
// webhook has to hold onto until an authenticated claim can resolve
// `Plan.buyerTeamMode` into a real team/membership and hand the row's
// `providerSubscriptionId` to the existing `upsertSubscription` write path.
export const pendingPurchases = pgTable(
  "PendingPurchase",
  {
    id: text("id")
      .$default(() => cuid())
      .primaryKey()
      .notNull(),
    email: text("email").notNull(),
    planId: text("planId")
      .notNull()
      .references(() => plans.id),
    provider: text("provider").notNull(),
    // Stripe Checkout Session id, or the Paddle checkout's transaction id —
    // set at checkout start, before either provider has confirmed a
    // subscription. Unique so a client retry after a network error reuses the
    // same row instead of leaving an orphaned duplicate.
    providerCheckoutId: text("providerCheckoutId").notNull().unique(),
    // Both null until the provider confirms the subscription; a delayed
    // payment method (Stripe boleto/SEPA) can leave a checkout "completed"
    // with no confirmed subscription yet.
    providerCustomerId: text("providerCustomerId"),
    providerSubscriptionId: text("providerSubscriptionId"),
    // "PENDING" | "CLAIMED" | "EXPIRED" | "REJECTED" — plain text with a
    // default, like every other status-like column in this schema, not a
    // pgEnum.
    status: text("status").notNull().default("PENDING"),
    // Set only when status becomes "REJECTED" (an EXISTING_TEAM destination
    // that stopped being valid before claim).
    failureReason: text("failureReason"),
    // Guards against sending the claim e-mail twice when the provider
    // redelivers the confirmation event.
    claimEmailSentAt: timestamp("claimEmailSentAt", { withTimezone: true }),
    claimedAt: timestamp("claimedAt", { withTimezone: true }),
    claimedByUserId: text("claimedByUserId").references(() => users.id),
    // `set null`, like `Plan.buyerTeamId`: deleting the resulting team must
    // never be blocked by a purchase record that only exists for audit.
    resultTeamId: text("resultTeamId").references(
      (): AnyPgColumn => teams.id,
      { onDelete: "set null" },
    ),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Claim looks a row up by id, but re-derives identity by e-mail
    // (comparing against the authenticated session) on every claim/admin
    // read — worth an index once purchase volume grows past a handful.
    index("PendingPurchase_email_idx").on(table.email),
    // The admin listing (`listPendingPurchases`) filters by status.
    index("PendingPurchase_status_idx").on(table.status),
  ],
);

export const pendingPurchaseRelations = relations(pendingPurchases, ({ one }) => ({
  plan: one(plans, {
    fields: [pendingPurchases.planId],
    references: [plans.id],
  }),
  claimedBy: one(users, {
    fields: [pendingPurchases.claimedByUserId],
    references: [users.id],
  }),
  resultTeam: one(teams, {
    fields: [pendingPurchases.resultTeamId],
    references: [teams.id],
  }),
}));

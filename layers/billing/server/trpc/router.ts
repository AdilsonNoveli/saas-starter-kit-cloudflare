import type { AnyRouter } from "@trpc/server";
import { billingRouter } from "./billing";
import { stripeRouter } from "./stripe";

/**
 * This layer's contribution to `appRouter`, keyed by the top-level name each
 * router is mounted under.
 *
 * Two keys, not one — `billing` and `stripe` are separate top-level namespaces
 * in the live API (`trpc.stripe.createStripeCheckoutSession.mutate()`, not
 * `trpc.billing.stripe.*`), and extracting a domain into a layer must not
 * reshape the client-facing surface. Same reason `layers/teams` owns both
 * `teams` and `invites`, and the reason every layer exports a `routers` map
 * rather than a single `<name>Router` binding.
 *
 * `satisfies`, never a `: Record<string, AnyRouter>` annotation: the annotation
 * would widen the procedures away and every `trpc.billing.*` / `trpc.stripe.*`
 * call would lose its input and output types on the client, since `AppRouter`
 * is inferred straight through this object. `satisfies` keeps the literal type
 * and still makes `tsc` reject a wrong shape here rather than at Nuxt build
 * time.
 */
export const routers = {
  billing: billingRouter,
  stripe: stripeRouter,
} satisfies Record<string, AnyRouter>;

/**
 * Deliberately OUTSIDE `routers`, and that is the whole point.
 *
 * `routers` is spread into `appRouter` at the top level by the generated
 * `.composition/layer-routers.ts`. This router is not a top-level namespace: it
 * is mounted by `@nuxfire/layer-admin/server/trpc/router` under `admin.plans`,
 * which is the path the client already calls (`trpc.admin.plans.listPlans`).
 * Adding it to the map above would silently republish it as `trpc.plans.*` and
 * break every existing call site.
 *
 * So the code lives in this layer (it is Plan/Benefit CRUD and Stripe catalog
 * sync — billing domain, merely admin-gated) while the admin layer owns the
 * mount point. A named export is how a layer offers a router it does not own
 * the mount point for. (That aggregator lived in
 * `packages/app/server/trpc/routers/admin/index.ts` when this comment was first
 * written; Fase 3 passo 4 moved it into `layers/admin` — and this import needed
 * no change at all, because it was always a package specifier.)
 */
export { adminPlansRouter } from "./admin-plans";
